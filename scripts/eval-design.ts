import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPlants, makeDesigns, reviewYard, sum } from "../src/ai/design";
import { bloomColors as bloomNames, checkOps, hardscape, type RawDesign, type Style } from "../src/ai/designShape";
import { toProperty, type ImportRaw } from "../src/ai/importShape";
import { readImage } from "../src/ai/files";
import { model, type Usage } from "../src/ai/openai";
import { applyOps, find, type Design, type Dial, type Goals, type Review } from "../src/model/design";
import type { Plant } from "../src/model/plant";
import { propertySchema, type Planting, type Point, type Property } from "../src/model/property";
import { inside } from "../src/render/geometry";

// Runs the design engine on fixture cases, scores each case, and writes tmp/design-eval/latest.json for /dev/designs.
// Usage: pnpm tsx scripts/eval-design.ts [case ...]        call the model
//        pnpm tsx scripts/eval-design.ts --rescore          check the saved answers again, with no calls

const STYLES: Style[] = ["cottage", "prairie", "modern", "formal"];

// The least new bed area each dial should bring, in square feet.
const minArea: Record<Dial, number> = { light: 80, refresh: 250, redo: 500 };

const goalSets: Record<string, Goals> = {
  peaceful: { text: "A peaceful place to sit in the evening, soft colors, nothing fussy.", chips: ["calm", "blue", "white", "purple"], favorites: [], hardscape: false },
  wildlife: { text: "I want songbirds and butterflies all season.", chips: ["songbirds", "butterflies", "native"], favorites: [], hardscape: false },
  safe: { text: "Low effort. Safe for our kids and our two dogs.", chips: ["low effort", "safe for kids", "safe for dogs"], favorites: [], hardscape: false },
  patio: { text: "Somewhere to grill and eat outside with friends, with flowers around it.", chips: ["colorful", "pollinators"], favorites: [], hardscape: true },
};

type Case = { id: string; lot: string; goals: keyof typeof goalSets; dial: Dial; styles?: Style[]; scope?: Point[] };
const cases: Case[] = [
  { id: "sample-peaceful-refresh", lot: "sample", goals: "peaceful", dial: "refresh" },
  { id: "sample-wildlife-light", lot: "sample", goals: "wildlife", dial: "light" },
  { id: "sample-safe-redo", lot: "sample", goals: "safe", dial: "redo" },
  { id: "lot-a-wildlife-refresh", lot: "a", goals: "wildlife", dial: "refresh" },
  { id: "lot-b-peaceful-light", lot: "b", goals: "peaceful", dial: "light" },
  { id: "lot-b-safe-redo", lot: "b", goals: "safe", dial: "redo" },
  { id: "lot-a-patio-refresh", lot: "a", goals: "patio", dial: "refresh", styles: ["cottage", "modern", "formal"] },
  // The backyard strip between the back fence and the patio on the sample lot.
  { id: "sample-area-wildlife", lot: "sample", goals: "wildlife", dial: "refresh", styles: ["cottage", "prairie", "modern"], scope: [[0, 20], [80, 20], [80, 45], [0, 45]] },
];

const args = process.argv.slice(2);
const rescore = args.includes("--rescore");
const only = args.filter((a) => !a.startsWith("--"));
const out = join(process.cwd(), "tmp/design-eval");
await mkdir(out, { recursive: true });

const plants = await loadPlants();
const byId = new Map(plants.map((p) => [p.id, p]));
const lots = await loadLots();
const prev = rescore ? JSON.parse(await readFile(join(out, "latest.json"), "utf8")) : null;

type CaseResult = { case: Case; property: Property; review: Review | null; designs: (Design & { raw: RawDesign })[]; score: ReturnType<typeof score>; usage: Usage; errors: string[] };
const results: CaseResult[] = [];
const todo = cases.filter((c) => !only.length || only.includes(c.id));

// Three cases at a time keeps about 15 calls in flight.
for (let i = 0; i < todo.length; i += 3) {
  const batch = await Promise.all(todo.slice(i, i + 3).map((c) => runCase(c)));
  results.push(...batch);
  for (const r of batch) console.log(JSON.stringify({ case: r.case.id, ...r.score.summary, tokens: r.usage.total_tokens, errors: r.errors.length }));
}

async function runCase(c: Case): Promise<CaseResult> {
  const property = lots[c.lot];
  const goals = goalSets[c.goals];
  const styles = c.styles ?? STYLES;
  if (rescore) {
    const old = prev.results.find((r: CaseResult) => r.case.id === c.id);
    const designs = old.designs.map((d: Design & { raw: RawDesign }) => {
      const ask = { goals, dial: c.dial, style: d.style as Style, scope: c.scope };
      return { ...d, ...checkOps(property, byId, d.raw.ops, ask, d.id), raw: d.raw };
    });
    return { case: c, property, review: old.review, designs, score: score(c, property, designs), usage: old.usage, errors: old.errors };
  }
  const errors: string[] = [];
  const rv = c.scope ? null : await reviewYard(property, plants, goals).catch((e) => (errors.push(e.message), null));
  const made = await makeDesigns(property, plants, goals, { dial: c.dial, styles, scope: c.scope, review: rv?.review });
  errors.push(...made.errors);
  const designs = made.runs.map((r) => ({ ...r.design, raw: r.raw }));
  const usage = sum([...(rv ? [rv.usage] : []), made.usage]);
  return { case: c, property, review: rv?.review ?? null, designs, score: score(c, property, designs), usage, errors };
}

const usage = sum(results.map((r) => r.usage));
const calls = results.reduce((a, r) => a + r.designs.length + (r.review ? 1 : 0) + r.errors.length, 0);
const passed = results.filter((r) => r.score.summary.pass).length;
console.log(`\n${model()}: ${passed} of ${results.length} cases pass. ${rescore ? "Rescored, no calls." : `${calls} calls, ${usage.total_tokens} tokens (${usage.input_tokens} in, ${usage.output_tokens} out).`}`);
console.table(results.map((r) => ({ case: r.case.id, ...r.score.summary })));

// A rescore of some cases keeps the other cases from the saved file.
const merged = prev ? prev.results.map((r: CaseResult) => results.find((x) => x.case.id === r.case.id) ?? r) : results;
if (!prev && only.length) {
  const old = JSON.parse(await readFile(join(out, "latest.json"), "utf8").catch(() => '{"results":[]}'));
  for (const r of old.results) if (!merged.some((x: CaseResult) => x.case.id === r.case.id)) merged.push(r);
}
const file = { model: model(), at: new Date().toISOString(), plants: plants.length, results: merged };
await writeFile(join(out, "latest.json"), JSON.stringify(file));
if (!rescore) await writeFile(join(out, `${file.at.replace(/[:.]/g, "-")}.json`), JSON.stringify(file));

// ---------- scoring ----------

function score(c: Case, base: Property, designs: Design[]) {
  const goals = goalSets[c.goals];
  const rows = designs.map((d) => {
    const raw = (d as Design & { raw: RawDesign }).raw;
    const changes = d.ops.filter((o) => o.op !== "keep");
    const newPlants = d.ops.flatMap((o) => (o.op === "add" || o.op === "replace") && "plantId" in o.item ? [o.item.plantId] : []);
    const after = applyOps(base, d.ops);
    return {
      style: d.style,
      name: d.name,
      raw: raw.ops.length,
      kept: d.ops.length,
      changes: changes.length,
      adds: d.ops.filter((o) => o.op === "add").length,
      removes: d.ops.filter((o) => o.op === "remove" || o.op === "replace").length,
      features: d.ops.filter((o) => o.op === "addFeature").length,
      // Square feet of planting the design adds, replaces, or reshapes.
      area: Math.round(touched(base, after)),
      fit: newPlants.length ? newPlants.filter((id) => fits(c.goals, byId.get(id)!)).length / newPlants.length : 0,
      plantSet: [...new Set(newPlants)],
      dialBad: dialViolations(c.dial, base, after, d),
      hardBad: d.ops.filter((o) => o.op === "addFeature" && hardscape.has(o.item.kind) && !goals.hardscape).length,
      scopeBad: c.scope ? scopeViolations(c.scope, base, after) : 0,
      safetyBad: c.goals === "safe" ? newPlants.filter((id) => byId.get(id)!.thorns || byId.get(id)!.toxicToPets).length : 0,
      dropped: d.dropped ?? [],
    };
  });
  const pairs: number[] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) pairs.push(jaccard(rows[i].plantSet, rows[j].plantSet));
  const raw = rows.reduce((a, r) => a + r.raw, 0);
  const kept = rows.reduce((a, r) => a + r.kept, 0);
  const overlap = pairs.length ? Math.max(...pairs) : 0;
  const meanOverlap = pairs.length ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 0;
  const bad = rows.reduce((a, r) => a + r.dialBad + r.hardBad + r.scopeBad + r.safetyBad, 0);
  const area = rows.length ? Math.min(...rows.map((r) => r.area)) : 0;
  const fit = rows.length ? rows.reduce((a, r) => a + r.fit, 0) / rows.length : 0;
  const want = (c.styles ?? STYLES).length;
  const fails: string[] = [];
  if (rows.length < Math.min(3, want)) fails.push("designs");
  if (kept / Math.max(1, raw) < 0.75) fails.push("survival");
  if (meanOverlap > 0.3 || overlap > 0.5) fails.push("overlap");
  if (bad) fails.push("rules");
  if (fit < 0.6) fails.push("fit");
  if (rows.some((r) => r.changes < (c.scope ? 3 : 6))) fails.push("thin");
  if (area < (c.scope ? 60 : minArea[c.dial])) fails.push("timid");
  return {
    summary: { pass: !fails.length, designs: rows.length, survival: +(kept / Math.max(1, raw)).toFixed(2), meanOverlap: +meanOverlap.toFixed(2), maxOverlap: +overlap.toFixed(2), fit: +fit.toFixed(2), area: rows.map((r) => r.area).join("/"), changes: rows.map((r) => r.changes).join("/"), removes: rows.map((r) => r.removes).join("/"), bad, fails: fails.join(" ") },
    rows,
  };
}

// Footprint of each planting: a bed's area, a row's length times the plant's spread, one plant's crown.
function footprint(x: Planting) {
  const spread = byId.get(x.plantId)?.size.spreadFt ?? 2;
  if (x.type === "region") return polyArea(x.outline);
  if (x.type === "row") return x.path.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - x.path[i - 1][0], q[1] - x.path[i - 1][1]) : 0), 0) * spread;
  return Math.PI * (Math.min(spread, 12) / 2) ** 2;
}

function touched(base: Property, after: Property) {
  const before = new Map(base.plantings.map((x) => [x.id, JSON.stringify(x)]));
  return after.plantings.filter((x) => before.get(x.id) !== JSON.stringify(x)).reduce((a, x) => a + footprint(x), 0);
}

function polyArea(o: Point[]) {
  let a = 0;
  for (let i = 0; i < o.length; i++) a += o[i][0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * o[i][1];
  return Math.abs(a / 2);
}

function fits(goal: string, p: Plant) {
  if (goal === "wildlife") return p.wildlife.some((w) => w === "birds" || w === "butterflies") || (p.nativeToIndiana && p.wildlife.length > 0);
  if (goal === "safe") return !p.thorns && !p.toxicToPets && p.effort <= 2;
  if (goal === "patio") return p.wildlife.includes("pollinators") || !!p.bloom;
  // Peaceful: soft bloom colors or calm foliage.
  const soft = ["blue", "white", "purple", "pink"];
  return !p.bloom || p.bloom.colors.length === 0 || soft.some((c) => bloomNames(p).includes(c)) || p.category === "grass";
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return A.size + B.size - inter ? inter / (A.size + B.size - inter) : 0;
}

// Checked on the result, apart from the validator: items the dial should have kept, and are gone or changed.
function dialViolations(dial: Dial, base: Property, after: Property, d: Design) {
  let n = 0;
  let gone = 0;
  for (const x of base.plantings) {
    const y = find(after, x.id)?.item as Planting | undefined;
    const changed = !y || y.plantId !== x.plantId || JSON.stringify(y) !== JSON.stringify(x);
    const tree = byId.get(x.plantId)?.category === "tree";
    if (!y || y.plantId !== x.plantId) gone++;
    if (dial === "light" && changed && !(y && y.type === "region" && y.plantId === x.plantId)) n++;
    if (dial === "refresh" && tree && (!y || y.plantId !== x.plantId)) n++;
  }
  if (dial === "refresh" && gone > Math.max(2, Math.ceil(base.plantings.length * 0.4))) n++;
  for (const list of ["fences", "structures"] as const) if (after[list].length < base[list].length) n++;
  if (d.ops.some((o) => o.op === "remove" && find(base, o.id)?.list === "surfaces")) n++;
  return n;
}

function scopeViolations(scope: Point[], base: Property, after: Property) {
  const pts = (x: any): Point[] => (x.at ? [x.at] : x.outline ?? x.path);
  const center = (p: Point[]): Point => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
  const sameIds = (a: any[], b: any[]) => {
    const m = new Map(b.map((x) => [x.id, JSON.stringify(x)]));
    return a.filter((x) => m.get(x.id) !== JSON.stringify(x));
  };
  let n = 0;
  for (const list of ["plantings", "features", "edges", "surfaces"] as const) {
    const changed = [...sameIds(base[list], after[list]), ...sameIds(after[list], base[list])];
    for (const x of changed) if (!inside(center(pts(x)), scope)) n++;
  }
  return n;
}

// ---------- fixtures ----------

// The sample lot, and the newest import of each distinct aerial in data/ai-runs, renamed so no address shows.
async function loadLots(): Promise<Record<string, Property>> {
  const sample = propertySchema.parse(JSON.parse(await readFile("data/properties/sample-lot.json", "utf8")));
  const root = join(process.cwd(), "data/ai-runs");
  const dirs = (await readdir(root)).filter((d) => d.endsWith("-import")).sort().reverse();
  const seen = new Map<string, Property>();
  for (const d of dirs) {
    const res = JSON.parse(await readFile(join(root, d, "response.json"), "utf8").catch(() => "null"));
    const text = res?.output?.find((o: any) => o.type === "message")?.content?.[0]?.text;
    if (!text) continue;
    const img = await readImage(join(root, d, "aerial.jpg")).catch(() => null);
    if (!img) continue;
    const h = createHash("md5").update(img.data).digest("hex");
    if (seen.has(h)) continue;
    const letter = String.fromCharCode(97 + seen.size);
    const p = toProperty(JSON.parse(text) as ImportRaw, { id: `lot-${letter}`, name: `Imported lot ${letter.toUpperCase()}`, aerial: img });
    delete p.underlay;
    seen.set(h, p);
  }
  const imported = [...seen.values()];
  return { sample, a: imported[0], b: imported[1] ?? imported[0] };
}
