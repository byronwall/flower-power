import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Design, Dial, Goals, Review } from "../model/design";
import { plantSchema, type Plant } from "../model/plant";
import type { Point, Property } from "../model/property";
import { checkOps, designPrompt, designSchemaJson, reviewPrompt, reviewSchemaJson, toReview, type RawDesign, type Style, type SunAt } from "./designShape";
import { respond, type Usage } from "./openai";

// The design engine: a short review of the yard, then one design per style, made in parallel. Server and scripts only.

// Read from disk on each call, since the library grows while the app runs. Files that do not parse yet are skipped.
export async function loadPlants(): Promise<Plant[]> {
  const dir = join(process.cwd(), "data/plants");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const all = await Promise.all(files.map(async (f) => plantSchema.safeParse(JSON.parse(await readFile(join(dir, f), "utf8").catch(() => "null")))));
  return all.flatMap((r) => (r.success ? [r.data] : []));
}

export async function reviewYard(property: Property, plants: Plant[], goals: Goals, sun?: SunAt) {
  const { instructions, text } = reviewPrompt(property, plants, goals, sun);
  const run = await respond<Parameters<typeof toReview>[0]>({ feature: "design-review", instructions, parts: [{ type: "input_text", text }], schema: reviewSchemaJson });
  return { review: toReview(run.data), usage: run.usage, ms: run.ms };
}

export type MakeOpts = { dial: Dial; styles: Style[]; scope?: Point[]; sun?: SunAt; review?: Review };

export async function makeDesigns(property: Property, plants: Plant[], goals: Goals, opts: MakeOpts) {
  const byId = new Map(plants.map((p) => [p.id, p]));
  const runs = await Promise.allSettled(
    opts.styles.map(async (style) => {
      const ask = { goals, dial: opts.dial, style, scope: opts.scope, review: opts.review, sun: opts.sun };
      const { instructions, text } = designPrompt(property, plants, ask);
      const run = await respond<RawDesign>({ feature: "design", instructions, parts: [{ type: "input_text", text }], schema: designSchemaJson(plants.map((p) => p.id)) });
      const id = `${style}-${Date.now().toString(36)}`;
      const { ops, dropped } = checkOps(property, byId, run.data.ops, ask, id);
      const design: Design = { id, name: run.data.name, style, dial: opts.dial, goals, scope: opts.scope, review: opts.review, summary: run.data.summary, ops, dropped };
      return { design, raw: run.data, usage: run.usage, ms: run.ms, dir: run.dir };
    }),
  );
  const ok = runs.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const errors = runs.flatMap((r) => (r.status === "rejected" ? [String((r.reason as Error).message)] : []));
  return { designs: ok.map((r) => r.design), runs: ok, errors, usage: sum(ok.map((r) => r.usage)) };
}

export const sum = (u: Usage[]): Usage => ({
  input_tokens: u.reduce((a, x) => a + x.input_tokens, 0),
  output_tokens: u.reduce((a, x) => a + x.output_tokens, 0),
  total_tokens: u.reduce((a, x) => a + x.total_tokens, 0),
});
