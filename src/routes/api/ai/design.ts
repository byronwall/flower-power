import { readFile } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import { loadPlants, makeDesigns, reviewYard } from "../../../ai/design";
import { checkOps, styles, type RawDesign, type Style } from "../../../ai/designShape";
import { dials, goalsSchema, type Design } from "../../../model/design";
import { propertySchema } from "../../../model/property";
import { z } from "zod";

// The design engine for the editor. JSON body: { action: "review" | "designs", property, goals, dial, styles?, scope? }.
// AI_FAKE=1 replays saved answers from the newest design eval, checked again against this property, with no API call.

const body = z.object({
  action: z.enum(["review", "designs"]),
  property: propertySchema,
  goals: goalsSchema,
  dial: z.enum(dials).default("refresh"),
  styles: z.array(z.enum(Object.keys(styles) as [Style, ...Style[]])).default(["cottage", "prairie", "modern", "formal"]),
  scope: z.array(z.tuple([z.number(), z.number()])).min(3).optional(),
});

export async function POST({ request }: APIEvent) {
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const b = parsed.data;
  const plants = await loadPlants();
  try {
    if (process.env.AI_FAKE) return Response.json(await fake(b, plants));
    if (b.action === "review") return Response.json(await reviewYard(b.property, plants, b.goals));
    const res = await makeDesigns(b.property, plants, b.goals, { dial: b.dial, styles: b.styles, scope: b.scope });
    if (!res.designs.length) return Response.json({ error: res.errors.join(" ") || "No designs came back." }, { status: 502 });
    return Response.json({ designs: res.designs, errors: res.errors, usage: res.usage });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function fake(b: z.infer<typeof body>, plants: Awaited<ReturnType<typeof loadPlants>>) {
  await new Promise((r) => setTimeout(r, 1500));
  const file = JSON.parse(await readFile("tmp/design-eval/latest.json", "utf8"));
  const results: { case: { lot: string; dial: string; scope?: unknown }; review: unknown; designs: (Design & { raw: RawDesign })[] }[] = file.results;
  const pick = results.find((r) => !!r.case.scope === !!b.scope && r.case.dial === b.dial && r.review !== undefined) ?? results[0];
  if (b.action === "review") return { review: (results.find((r) => r.review) ?? pick).review };
  const byId = new Map(plants.map((p) => [p.id, p]));
  const designs = pick.designs.map((d) => {
    const id = `${d.style}-${Date.now().toString(36)}`;
    const ask = { goals: b.goals, dial: b.dial, style: d.style as Style, scope: b.scope };
    const { ops, dropped } = checkOps(b.property, byId, d.raw.ops, ask, id);
    return { id, name: d.name, style: d.style, dial: b.dial, goals: b.goals, scope: b.scope, summary: d.summary, ops, dropped } satisfies Design;
  });
  return { designs, errors: [] };
}
