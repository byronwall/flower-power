import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { loadPlantList, readImage, toImage } from "../../../ai/files";
import { importLayout } from "../../../ai/import";
import { slug, toProperty, type ImportRaw } from "../../../ai/importShape";
import { unauthorized, userDir } from "../../../server/auth";

// Runs are dev data and stay in the global data/ai-runs. Images go to the logged-in user's folder.
const runsDir = () => join(process.cwd(), "data/ai-runs");

// Lists saved import runs, newest first, so the dev page can replay one with no API call.
export async function GET({ request }: APIEvent) {
  if (!userDir(request)) return unauthorized();
  const runs = (await readdir(runsDir()).catch(() => [])).filter((d) => d.endsWith("-import")).sort().reverse();
  return Response.json(runs);
}

// Form fields: name, aerial (one image), photos (any number). Or replay (a run folder name) to rebuild a past result.
export async function POST({ request }: APIEvent) {
  const user = userDir(request);
  if (!user) return unauthorized();
  const images = join(user, "images");
  const form = await request.formData();
  const name = String(form.get("name") || "Imported lot");
  const id = slug(name);
  await mkdir(images, { recursive: true });
  try {
    const replay = form.get("replay");
    if (typeof replay === "string" && replay) return Response.json(await replayRun(replay, id, name, images));

    const file = form.get("aerial");
    if (!(file instanceof File)) return Response.json({ error: "Add an aerial image." }, { status: 400 });
    if (process.env.AI_FAKE === "1") return Response.json(await replayRun(await fakeRun(Buffer.from(await file.arrayBuffer())), id, name, images));
    const aerial = toImage(`${id}-aerial${file.type === "image/png" ? ".png" : ".jpg"}`, Buffer.from(await file.arrayBuffer()));
    const photos = await Promise.all(
      form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).map(async (f, i) => toImage(`${id}-photo-${i + 1}.jpg`, Buffer.from(await f.arrayBuffer()))),
    );
    await writeFile(join(images, aerial.name), aerial.data);
    const plants = await loadPlantList();
    const res = await importLayout({ name, aerial, photos, plants });
    const run = res.dir.split("/").pop();
    return Response.json({ run, raw: res.raw, property: res.property, aerial: { name: aerial.name, width: aerial.width, height: aerial.height }, usage: res.usage, ms: res.ms, model: res.model });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// AI_FAKE=1 answers from a saved run with no API call: the newest run with the same aerial, else the newest run.
async function fakeRun(aerial: Buffer) {
  const runs = (await readdir(runsDir()).catch(() => [])).filter((d) => d.endsWith("-import")).sort().reverse();
  if (!runs.length) throw new Error("AI_FAKE is on, but data/ai-runs has no saved runs.");
  await new Promise((r) => setTimeout(r, 2500));
  for (const run of runs) {
    const same = await readFile(join(runsDir(), run, "aerial.jpg")).then((b) => b.equals(aerial), () => false);
    if (same) return run;
  }
  return runs[0];
}

async function replayRun(run: string, id: string, name: string, images: string) {
  if (!/^[\w.-]+$/.test(run)) throw new Error("Bad run name.");
  const dir = join(runsDir(), run);
  const response = JSON.parse(await readFile(join(dir, "response.json"), "utf8"));
  const text = response.output.find((o: any) => o.type === "message").content[0].text;
  const raw: ImportRaw = JSON.parse(text);
  const aerialFile = (await readdir(dir)).find((f) => /aerial\.(jpe?g|png)$/.test(f));
  if (!aerialFile) throw new Error("That run has no aerial image.");
  const img = await readImage(join(dir, aerialFile));
  const aerial = { name: `${id}-aerial${aerialFile.endsWith(".png") ? ".png" : ".jpg"}`, width: img.width, height: img.height };
  await copyFile(join(dir, aerialFile), join(images, aerial.name));
  return { run, raw, property: toProperty(raw, { id, name, aerial }), aerial, usage: response.usage, ms: 0, model: response.model };
}
