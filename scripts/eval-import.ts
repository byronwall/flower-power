import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { importLayout } from "../src/ai/import";
import type { ImportRaw } from "../src/ai/importShape";
import { loadPlantList, readImage } from "../src/ai/files";
import { model } from "../src/ai/openai";

// Runs the image import on each case in tmp/listings that has a truth.json, scores it, and writes
// tmp/import-eval/<iteration>/ with one JSON per run and summary.json for the /dev/eval page.
// Usage: pnpm tsx scripts/eval-import.ts --iter base [--runs 3] [--jobs 6] [case ...]
// --rescore scores the saved runs of an iteration again against the current truth, with no API calls.
// A case name with no "@" also matches its variants, so "circle" runs circle and circle@zoom160.

export type Truth = {
  name: string;
  tags?: string[];
  base?: string;
  variant?: string;
  ftPerPx: number;
  lotFt2?: number;
  trees?: [number, number];
  houseBoxPx: [number, number, number, number];
  lotPx?: [number, number][];
  buildingPx?: [number, number][];
  parcelFt2?: number;
  expect: { driveway?: boolean; minPlants: number; minBeds: number; fence?: boolean; structure?: boolean };
};

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const runs = Number(opt("--runs", "3"));
const jobs = Number(opt("--jobs", "6"));
const iter = opt("--iter", "scratch");
const rescore = args.includes("--rescore");
const only = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const root = join(process.cwd(), "tmp/listings");
const out = join(process.cwd(), "tmp/import-eval", iter);
await mkdir(out, { recursive: true });

const plants = await loadPlantList();
// The image-count study (@img1, @img2, @img4) runs only when named, as in: eval-import.ts img1 img2 img4.
const study = /@(img\d|ground|drone)$/;
const names = (await readdir(root)).filter((n) => (only.length ? only.some((o) => n === o || n.split("@")[0] === o || n.endsWith(`@${o}`)) : !study.test(n))).sort();
const tasks: { name: string; run: number }[] = [];
const cases: Record<string, { truth: Truth; aerialFile: string; dir: string }> = {};
for (const name of names) {
  const dir = join(root, name);
  const truth: Truth | null = JSON.parse(await readFile(join(dir, "truth.json"), "utf8").catch(() => "null"));
  if (!truth) continue;
  const aerialFile = (await readdir(dir)).find((f) => /^aerial\.(jpe?g|png)$/.test(f))!;
  cases[name] = { truth, aerialFile, dir };
  for (let r = 1; r <= runs; r++) tasks.push({ name, run: r });
}

const rows: Row[] = [];
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => {
  while (next < tasks.length) {
    const { name, run } = tasks[next++];
    const { truth, aerialFile, dir } = cases[name];
    const aerial = await readImage(join(dir, aerialFile));
    const photoFiles = (await readdir(join(dir, "photos")).catch(() => [])).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
    const photos = await Promise.all(photoFiles.map((f) => readImage(join(dir, "photos", f))));
    try {
      if (rescore) {
        const saved = JSON.parse(await readFile(join(out, `${name}-${run}.json`), "utf8").catch(() => "null"));
        if (saved) {
          const row = { ...saved.row, ...score(saved.raw, truth, aerial.width, aerial.height) };
          rows.push(row);
          await writeFile(join(out, `${name}-${run}.json`), JSON.stringify({ ...saved, row, truth }, null, 2));
        } else rows.push({ case: name, run, pass: false, fails: "error", error: "no saved run", calls: 1 } as Row);
        continue;
      }
      const res = await importLayout({ name: truth.name, aerial, photos, plants });
      const s = score(res.raw, truth, aerial.width, aerial.height);
      const row: Row = { case: name, run, ...s, tokens: res.usage.total_tokens, inTokens: res.usage.input_tokens, outTokens: res.usage.output_tokens, calls: (res as { calls?: number }).calls ?? 1, sec: Math.round(res.ms / 1000) };
      rows.push(row);
      await writeFile(join(out, `${name}-${run}.json`), JSON.stringify({ row, truth, raw: res.raw, property: res.property, model: res.model, aerial: { file: aerialFile, width: aerial.width, height: aerial.height }, photos: photoFiles.length }, null, 2));
      console.log(JSON.stringify(row));
    } catch (e) {
      rows.push({ case: name, run, pass: false, fails: "error", error: (e as Error).message, calls: 1 } as Row);
      console.log(`${name} run ${run} failed: ${(e as Error).message}`);
    }
  }
}));

rows.sort((a, b) => a.case.localeCompare(b.case) || a.run - b.run);
const ok = rows.filter((r) => !r.error);
const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const stat = (k: "scaleErr" | "houseIoU" | "lotErr" | "lotShapeErr" | "lotIoU", worst: "max" | "min") => ({
  median: +med(ok.map((r) => r[k])).toFixed(3),
  worst: +(worst === "max" ? Math.max(...ok.map((r) => r[k])) : Math.min(...ok.map((r) => r[k]))).toFixed(3),
});
const byCase = Object.keys(cases).map((c) => {
  const rs = ok.filter((r) => r.case === c);
  return { case: c, passed: rows.filter((r) => r.case === c && r.pass).length, runs: rows.filter((r) => r.case === c).length, scaleMed: +med(rs.map((r) => r.scaleErr)).toFixed(2), scaleWorst: Math.max(...rs.map((r) => r.scaleErr)), iouMed: +med(rs.map((r) => r.houseIoU)).toFixed(2), iouWorst: Math.min(...rs.map((r) => r.houseIoU)), lotMed: +med(rs.map((r) => r.lotErr)).toFixed(2), lotWorst: Math.max(...rs.map((r) => r.lotErr)) };
});
const summary = {
  iter,
  model: model(),
  at: new Date().toISOString(),
  passed: rows.filter((r) => r.pass).length,
  runs: rows.length,
  calls: rows.reduce((a, r) => a + (r.calls ?? 1), 0),
  tokens: { input: ok.reduce((a, r) => a + r.inTokens, 0), output: ok.reduce((a, r) => a + r.outTokens, 0) },
  scaleErr: stat("scaleErr", "max"),
  houseIoU: stat("houseIoU", "min"),
  lotErr: stat("lotErr", "max"),
  lotShapeErr: stat("lotShapeErr", "max"),
  lotIoU: stat("lotIoU", "min"),
  byCase,
  rows,
};
await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2));
console.table(byCase);
console.log(`\n${iter} · ${model()}: ${summary.passed} of ${summary.runs} runs pass. Scale err median ${summary.scaleErr.median}, worst ${summary.scaleErr.worst}. House IoU median ${summary.houseIoU.median}, worst ${summary.houseIoU.worst}. Lot err median ${summary.lotErr.median}, worst ${summary.lotErr.worst}. Lot err at true scale median ${summary.lotShapeErr.median}, worst ${summary.lotShapeErr.worst}. Lot IoU median ${summary.lotIoU.median}, worst ${summary.lotIoU.worst}. ${summary.calls} calls, ${summary.tokens.input} in / ${summary.tokens.output} out tokens.`);

type Row = ReturnType<typeof score> & { case: string; run: number; tokens: number; inTokens: number; outTokens: number; calls: number; sec: number; error?: string };

function score(raw: ImportRaw, t: Truth, w: number, h: number) {
  const px = (g: { x: number; y: number }) => [(g.x / 1000) * w, (g.y / 1000) * h] as const;
  const scaleErr = Math.abs(raw.imageWidthFt / w - t.ftPerPx) / t.ftPerPx;
  const hs = raw.house.outline.map(px);
  const box = [Math.min(...hs.map((p) => p[0])), Math.min(...hs.map((p) => p[1])), Math.max(...hs.map((p) => p[0])), Math.max(...hs.map((p) => p[1]))];
  const houseIoU = iou(box, t.houseBoxPx);
  const centroid = [hs.reduce((a, p) => a + p[0], 0) / hs.length, hs.reduce((a, p) => a + p[1], 0) / hs.length] as const;
  const houseInLot = inside(centroid, raw.lot.map(px));
  const driveway = raw.surfaces.some((s) => s.kind === "driveway");
  // Lot area from the model's own scale, against the listing's lot size.
  const lotFt2 = area(raw.lot.map(px)) * (raw.imageWidthFt / w) ** 2;
  const lotErr = t.lotFt2 ? Math.abs(lotFt2 - t.lotFt2) / t.lotFt2 : 0;
  // The same lot at the true scale: how well the lot is traced once a person fixes the scale.
  const lotShapeErr = t.lotFt2 ? Math.abs(area(raw.lot.map(px)) * t.ftPerPx ** 2 - t.lotFt2) / t.lotFt2 : 0;
  // Overlap with the county parcel, counted on a 4 px raster.
  const lotIoU = t.lotPx ? polyIoU(raw.lot.map(px), t.lotPx, w, h) : NaN;
  const treesOk = !t.trees || (raw.plants.length >= t.trees[0] && raw.plants.length <= t.trees[1]);
  const fails: string[] = [];
  if (scaleErr > 0.25) fails.push("scale");
  if (houseIoU < 0.5) fails.push("house");
  if (!houseInLot) fails.push("lot");
  // Lots only need to be close: the person corrects the lot lines (Byron, 2026-11-07).
  if (lotErr > 0.5) fails.push("lot size");
  if (t.expect.driveway !== undefined && driveway !== t.expect.driveway) fails.push("driveway");
  if (t.expect.fence && !raw.fences.length) fails.push("fence");
  if (t.expect.structure && !raw.structures.some((s) => s.kind === "shed")) fails.push("structure");
  if (raw.plants.length < t.expect.minPlants) fails.push("plants");
  if (raw.beds.length < t.expect.minBeds) fails.push("beds");
  return { pass: !fails.length, scaleErr: +scaleErr.toFixed(3), houseIoU: +houseIoU.toFixed(3), houseInLot, lotErr: +lotErr.toFixed(3), lotShapeErr: +lotShapeErr.toFixed(3), lotIoU: +lotIoU.toFixed(3), plants: raw.plants.length, treesOk, beds: raw.beds.length, fails: fails.join(" ") };
}

function area(o: (readonly [number, number])[]) {
  let a = 0;
  for (let i = 0; i < o.length; i++) a += o[i][0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * o[i][1];
  return Math.abs(a / 2);
}

function iou(a: number[], b: number[]) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const ar = (r: number[]) => (r[2] - r[0]) * (r[3] - r[1]);
  return inter / (ar(a) + ar(b) - inter);
}

function polyIoU(a: (readonly [number, number])[], b: (readonly [number, number])[], w: number, h: number) {
  let both = 0;
  let either = 0;
  for (let y = 2; y < h; y += 4)
    for (let x = 2; x < w; x += 4) {
      const ia = inside([x, y], a);
      const ib = inside([x, y], b);
      if (ia && ib) both++;
      if (ia || ib) either++;
    }
  return either ? both / either : 0;
}

function inside([x, y]: readonly [number, number], poly: (readonly [number, number])[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
