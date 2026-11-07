import { applyOps, center, find, listOf, type Dial, type Goals, type Op, type Review, type Thing } from "../model/design";
import type { Plant } from "../model/plant";
import { edgeKinds, featureKinds, structureKinds, surfaceKinds, type Planting, type Point, type Property } from "../model/property";
import { bounds, inside } from "../render/geometry";

// The design engine's schemas, prompts, and checks. Pure code, so the browser and the eval can use it.
// The model sees the plan in feet, a coarse text map, and a plant table. Code checks every op it returns.

export type Sun = "full" | "part" | "shade" | "unknown";
export type SunAt = (at: Point) => Sun;

export const styles = {
  cottage: "Cottage: loose, layered, abundant flowers, mixed drifts, soft edges, color through the seasons.",
  prairie: "Naturalistic prairie: Indiana natives, grasses with perennials in big repeating drifts, wildlife first, little lawn.",
  modern: "Clean modern: few species in bold repeated blocks, crisp straight edges, strong structure, calm palette, lots of foliage texture.",
  formal: "Formal: symmetry on the house and paths, clipped shrubs and hedges in rows, framed beds, a clear central axis.",
  woodland: "Woodland: layered shade garden under trees, ferns and shade perennials, understory trees and shrubs, a quiet path feel.",
} as const;
export type Style = keyof typeof styles;

// Hardscape a person must opt into. Lawn, mulch, stepping stones, edging, and raised beds are not.
export const hardscape = new Set<string>(["patio", "path", "gravel", "driveway", "deck", "pergola", "shed", "seat-wall"]);
const hard = new Set(["patio", "path", "gravel", "driveway"]);

// What each dial allows. Trees are never removed or replaced below "redo".
export const dialRules: Record<Dial, { remove: boolean; trees: boolean; share: number; grow: boolean }> = {
  light: { remove: false, trees: false, share: 0, grow: true },
  refresh: { remove: true, trees: false, share: 0.4, grow: false },
  redo: { remove: true, trees: true, share: 1, grow: false },
};

const dialText: Record<Dial, string> = {
  light:
    "Light touch: keep everything that is there. Do not remove, replace, or move any existing item. Add plants and beds in empty ground, and grow existing beds outward. Add 6 to 15 things.",
  refresh:
    "Refresh: keep the trees, the structure, and the best plants. You may remove or replace up to 40% of the existing plantings, but never a tree. Reshape beds as needed. Add enough that the yard feels renewed.",
  redo:
    "Redo: start fresh on the plantings. You may remove or replace any planting, trees included, when it serves the design, with a reason. Keep the house, fences, driveway, and hard surfaces.",
};

// ---------- colors and tags ----------

export function colorName(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  if (l > 0.85 || (s < 0.2 && l > 0.6)) return "white";
  if (s < 0.2) return l < 0.3 ? "dark" : "gray";
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return l > 0.7 ? "pink" : "red";
  if (h < 40) return "orange";
  if (h < 70) return "yellow";
  if (h < 170) return "green";
  if (h < 250) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

export const bloomColors = (p: Plant) => [...new Set(p.bloom?.colors.map(colorName) ?? [])];

// ---------- what the model sees ----------

const r1 = (n: number) => Math.round(n);
const pts = (o: Point[]) => o.map(([x, y]) => [r1(x), r1(y)]);

function area(o: Point[]) {
  let a = 0;
  for (let i = 0; i < o.length; i++) a += o[i][0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * o[i][1];
  return Math.abs(a / 2);
}

export function plantTable(plants: Plant[]) {
  const head = "id | name | category | height x spread ft | sun | bloom months: colors | wildlife | flags | effort 1-3";
  const rows = plants.map((p) => {
    const flags = [p.nativeToIndiana && "native", p.evergreen && "evergreen", p.thorns && "thorns", p.toxicToPets && "toxic-to-pets", p.placement !== "either" && `place-as-${p.placement}`].filter(Boolean).join(" ");
    const bloom = p.bloom ? `${p.bloom.months.join(",")}: ${bloomColors(p).join(",")}` : "-";
    return `${p.id} | ${p.commonName} | ${p.category} | ${p.size.heightFt} x ${p.size.spreadFt} | ${p.sun.join(",")} | ${bloom} | ${p.wildlife.join(",") || "-"} | ${flags || "-"} | ${p.effort}`;
  });
  return [head, ...rows].join("\n");
}

export function planSummary(p: Property, plants: Map<string, Plant>) {
  const b = bounds(p.lot.outline);
  const planting = (x: Planting) => {
    const pl = plants.get(x.plantId);
    const base = { id: x.id, plant: x.plantId, category: pl?.category ?? "unknown", ...(x.existing ? { existing: true } : {}), ...(x.guess ? { guessed: true } : {}) };
    if (x.type === "single") return { ...base, at: pts([x.at])[0], spreadFt: pl?.size.spreadFt };
    if (x.type === "region") return { ...base, bed: pts(x.outline), areaSqFt: r1(area(x.outline)) };
    return { ...base, row: pts(x.path) };
  };
  return JSON.stringify({
    lotFt: { width: r1(b.w), depth: r1(b.h), outline: pts(p.lot.outline) },
    north: northText(p.headingDeg),
    house: { outline: pts(p.house.outline) },
    plantings: p.plantings.map(planting),
    surfaces: p.surfaces.map((s) => ({ id: s.id, kind: s.kind, outline: pts(s.outline) })),
    structures: p.structures.map((s) => ({ id: s.id, kind: s.kind, outline: pts(s.outline) })),
    fences: p.fences.map((f) => ({ id: f.id, kind: f.kind, heightFt: f.heightFt, path: pts(f.path) })),
    edges: p.edges.map((e) => ({ id: e.id, kind: e.kind, path: pts(e.path) })),
    features: p.features.map((f) => ({ id: f.id, kind: f.kind, at: pts([f.at])[0] })),
  });
}

function northText(deg: number) {
  const dirs = ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"];
  return `north is ${dirs[Math.round(((360 - deg) % 360) / 45) % 8]} on the plan`;
}

// A coarse picture of the lot, one character per cell, so the model can find open ground.
export function textMap(p: Property, sun?: SunAt, cell = 5) {
  const b = bounds(p.lot.outline);
  const cols = Math.ceil(b.w / cell);
  const rows = Math.ceil(b.h / cell);
  const lines = [`     x→ ${Array.from({ length: cols }, (_, i) => (i % 2 ? " " : String((i * cell) % 100).padStart(2, "0")[0])).join("")}`];
  for (let j = 0; j < rows; j++) {
    let line = "";
    for (let i = 0; i < cols; i++) {
      const at: Point = [b.minX + (i + 0.5) * cell, b.minY + (j + 0.5) * cell];
      line += mapChar(p, at, sun);
    }
    lines.push(`y=${String(j * cell).padStart(3)} ${line}`);
  }
  return lines.join("\n");
}

function mapChar(p: Property, at: Point, sun?: SunAt) {
  if (!inside(at, p.lot.outline)) return " ";
  if (inside(at, p.house.outline)) return "H";
  for (const s of p.structures) if (inside(at, s.outline)) return "S";
  for (const s of p.surfaces) if (hard.has(s.kind) && inside(at, s.outline)) return s.kind === "driveway" ? "D" : "P";
  for (const x of p.plantings) {
    if (x.type === "single" && Math.hypot(x.at[0] - at[0], x.at[1] - at[1]) < 3) return "T";
    if (x.type === "region" && inside(at, x.outline)) return "b";
    if (x.type === "row" && x.path.some((q, i) => i > 0 && segDist(at, x.path[i - 1], q) < 3)) return "b";
  }
  for (const f of p.features) if (Math.hypot(f.at[0] - at[0], f.at[1] - at[1]) < 3) return "f";
  const s = sun?.(at);
  return s === "shade" ? "," : s === "part" ? ":" : ".";
}

const mapLegend = (sun: boolean) =>
  `Map legend, 5 ft cells: H house, S structure, D driveway, P patio or path, T existing tree or shrub trunk, b existing bed or row, f feature, ${sun ? "'.' open ground in full sun, ':' open ground in part sun, ',' open ground in shade" : "'.' open ground (lawn or mulch)"}.`;

// ---------- the model's answer ----------

const pt = { type: "object", additionalProperties: false, required: ["x", "y"], properties: { x: { type: "number" }, y: { type: "number" } } };
const nul = (s: object) => ({ anyOf: [s, { type: "null" }] });
const obj = (properties: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const spot = obj({ note: { type: "string" }, at: nul(pt) });

export const reviewSchemaJson = obj({
  summary: { type: "string", description: "Two or three plain sentences." },
  works: { type: "array", items: spot },
  doesnt: { type: "array", items: spot },
  empty: { type: "array", items: spot, description: "Empty or underused spots, each with a point in feet." },
});

export const thingKinds = [...featureKinds, ...edgeKinds, ...surfaceKinds, ...structureKinds];

export type RawOp = {
  op: "keep" | "remove" | "replace" | "move" | "add" | "reshape" | "addFeature";
  id: string | null;
  plantId: string | null;
  kind: string | null;
  at: { x: number; y: number } | null;
  outline: { x: number; y: number }[] | null;
  path: { x: number; y: number }[] | null;
  reason: string;
};
export type RawDesign = { name: string; summary: string; ops: RawOp[] };

export function designSchemaJson(plantIds: string[]) {
  return obj({
    name: { type: "string", description: "A short evocative name, 2 to 4 words." },
    summary: { type: "string", description: "Two sentences on the idea and how it meets the goals." },
    ops: {
      type: "array",
      items: obj({
        op: { type: "string", enum: ["keep", "remove", "replace", "move", "add", "reshape", "addFeature"] },
        id: { type: ["string", "null"], description: "The existing item for keep, remove, replace, move, and reshape." },
        plantId: { anyOf: [{ type: "string", enum: plantIds }, { type: "null" }] },
        kind: { anyOf: [{ type: "string", enum: thingKinds }, { type: "null" }] },
        at: nul(pt),
        outline: nul({ type: "array", items: pt }),
        path: nul({ type: "array", items: pt }),
        reason: { type: "string" },
      }),
    },
  });
}

// ---------- prompts ----------

export type Ask = { goals: Goals; dial: Dial; style: Style; scope?: Point[]; review?: Review; sun?: SunAt };

const goalText = (g: Goals, plants: Map<string, Plant>) =>
  [
    g.text && `In their words: "${g.text}"`,
    g.chips.length && `Picked: ${g.chips.join(", ")}`,
    g.favorites.length && `Favorite plants: ${g.favorites.map((id) => plants.get(id)?.commonName ?? id).join(", ")}`,
    g.hardscape ? "They are open to new hardscape such as a patio, path, or pergola." : "They did not ask for hardscape. Do not add patios, paths, decks, pergolas, sheds, gravel, or seat walls.",
  ]
    .filter(Boolean)
    .join("\n");

const coords = "Coordinates are in feet from the lot's top-left corner. x grows to the right and y grows down.";

export function reviewPrompt(p: Property, plants: Plant[], goals: Goals, sun?: SunAt) {
  const byId = new Map(plants.map((x) => [x.id, x]));
  const instructions = `You are a garden designer in Indiana (zone 5b to 6b). You give a homeowner a short, honest review of their yard as it is, before any redesign.

Be specific and plain. Name items by what they are, not by id. Say what works, what does not, and where the empty or underused ground is. Weigh it against their goals. Do not flatter. 2 to 5 points per list. Each point is one sentence. Give a point in feet for each item where a place makes sense, else null.

${coords}`;
  const text = `Goals:\n${goalText(goals, byId)}\n\nPlan:\n${planSummary(p, byId)}\n\n${mapLegend(!!sun)}\n${textMap(p, sun)}\n\nPlants in the yard:\n${plantTable(usedPlants(p, byId))}`;
  return { instructions, text };
}

const usedPlants = (p: Property, byId: Map<string, Plant>) => [...new Set(p.plantings.map((x) => x.plantId))].map((id) => byId.get(id)).filter((x): x is Plant => !!x);

export function designPrompt(p: Property, plants: Plant[], ask: Ask) {
  const byId = new Map(plants.map((x) => [x.id, x]));
  const instructions = `You are a garden designer in Indiana (zone 5b to 6b). You make one design for a homeowner's yard, in one style, as a list of edit ops on their plan.

Style: ${styles[ask.style]}
Commit to the style. Choose plants, bed shapes, and features that make this design look clearly different from a design in another style.

Change level: ${dialText[ask.dial]}

${coords}

Ops:
- keep {id}: an existing item stays. List keeps only for items that matter to the design.
- remove {id}: take out an existing item.
- replace {id, plantId}: swap an existing planting for another plant in the same place.
- move {id, at}: move an existing plant or feature.
- add {plantId, at}: one plant at a point. Use this for trees, shrubs, and accent plants.
- add {plantId, outline}: a bed area filled with one plant, as a drift. Build a mixed bed from several adjacent drifts, tall plants at the back.
- add {plantId, path}: a row of one plant along a line, such as a hedge or an edge.
- reshape {id, outline}: a new outline for an existing bed (a region planting). Lawn becomes bed simply by adding a bed on it.
- addFeature {kind, at}: a feature (${featureKinds.join(", ")}). addFeature {kind, path} for bed edging (${edgeKinds.join(", ")}). addFeature {kind, outline} for a surface or structure.
Every op needs a one-sentence reason a homeowner would understand. Leave unused fields null.

Placement rules, which code checks:
- Every point and outline is inside the lot, and not on the house, driveway, patio, path, or a structure. Use the map to find open ground ('.').
- Keep plants apart by their spread: two shrubs or two trees sit at least the average of their spreads apart. Keep new trees at least half their spread from the house.
- New beds do not overlap existing beds; reshape the existing bed instead.
- Match each plant's sun to its place. Under or just north of a big tree, or on the north side of the house, is part sun or shade.
- Use only plant ids from the table. Prefer plants whose wildlife, color, and safety fit the goals. If they want kids or pets safe, use no plants with thorns or toxic-to-pets.
- Beds use outlines of 4 to 8 points. A drift is usually 20 to 150 sq ft.

Aim for 12 to 30 ops that together make a complete, buildable design.`;
  const scope = ask.scope ? `\n\nRework only this area: ${JSON.stringify(pts(ask.scope))}. Every op must be inside it. Do not touch anything outside it. Aim for 5 to 15 ops.` : "";
  const review = ask.review ? `\n\nReview of the yard as it is:\n${[ask.review.summary, ...ask.review.doesnt.map((s) => `Problem: ${s.note}`), ...ask.review.empty.map((s) => `Empty: ${s.note}${s.at ? ` near ${r1(s.at[0])},${r1(s.at[1])}` : ""}`)].join("\n")}` : "";
  const text = `Goals:\n${goalText(ask.goals, byId)}${scope}${review}\n\nPlan:\n${planSummary(p, byId)}\n\n${mapLegend(!!ask.sun)}\n${textMap(p, ask.sun)}\n\nPlant table:\n${plantTable(plants)}`;
  return { instructions, text };
}

// ---------- checks ----------

const P = (g: { x: number; y: number }): Point => [Math.round(g.x * 10) / 10, Math.round(g.y * 10) / 10];

type AddOp = Extract<Op, { op: "add" | "addFeature" }>;
type Ctx = { base: Property; plants: Map<string, Plant>; ask: Ask };

// Turns the model's ops into checked ops. Each dropped op leaves a note that says why.
export function checkOps(base: Property, plants: Map<string, Plant>, raw: RawOp[], ask: Ask, prefix: string) {
  const ctx: Ctx = { base, plants, ask };
  const ops: Op[] = [];
  const dropped: string[] = [];
  const touched = new Set<string>();
  const rule = dialRules[ask.dial];
  const startCount = base.plantings.length;
  let removals = 0;
  let n = 0;
  let state = base;

  for (const r of raw) {
    const label = `${r.op} ${r.id ?? r.plantId ?? r.kind ?? ""}`.trim();
    const no = (why: string) => void dropped.push(`${label}: ${why}`);
    const hit = r.id ? find(state, r.id) : null;
    const original = r.id ? find(base, r.id) : null;

    if (r.op === "keep") {
      if (hit) ops.push({ op: "keep", id: hit.item.id, reason: r.reason });
      continue;
    }
    if (r.op === "add" || r.op === "addFeature") {
      const op = r.op === "add" ? makeAdd(r, `${prefix}-${++n}`, ctx) : makeThing(r, `${prefix}-${++n}`, ctx);
      if (typeof op === "string") {
        no(op);
        continue;
      }
      const why = placeProblem(state, op.item, ctx);
      if (why) {
        no(why);
        continue;
      }
      ops.push(op);
      state = applyOps(state, [op]);
      continue;
    }

    // The rest change an existing item.
    if (!hit) {
      no(`there is no item "${r.id}"`);
      continue;
    }
    if (touched.has(hit.item.id)) {
      no("this item already has an op");
      continue;
    }
    if (ask.scope && !inScope(itemPoints(hit.item), ask.scope)) {
      no("outside the area being reworked");
      continue;
    }
    const tree = hit.list === "plantings" && plants.get((hit.item as Planting).plantId)?.category === "tree";
    const wasThere = !!original;

    if (r.op === "remove" || r.op === "replace") {
      if (wasThere && !rule.remove) {
        no(`"${ask.dial}" keeps every existing item`);
        continue;
      }
      if (wasThere && tree && !rule.trees) {
        no(`"${ask.dial}" keeps existing trees`);
        continue;
      }
      if (!["plantings", "features", "edges"].includes(hit.list)) {
        no("designs only remove plantings, features, and edging");
        continue;
      }
      if (wasThere && hit.list === "plantings" && removals + 1 > Math.max(2, Math.ceil(startCount * rule.share))) {
        no(`"${ask.dial}" allows at most ${Math.round(rule.share * 100)}% of plantings to go`);
        continue;
      }
    }

    let op: Op;
    if (r.op === "remove") op = { op: "remove", id: hit.item.id, reason: r.reason };
    else if (r.op === "replace") {
      if (hit.list !== "plantings") {
        no("only plantings can be replaced");
        continue;
      }
      const pl = r.plantId ? plants.get(r.plantId) : undefined;
      if (!pl) {
        no(`unknown plant "${r.plantId}"`);
        continue;
      }
      const item = { ...(hit.item as Planting), plantId: pl.id, existing: undefined, guess: undefined } as Planting;
      delete item.existing;
      delete item.guess;
      op = { op: "replace", id: hit.item.id, item, reason: r.reason };
    } else if (r.op === "move") {
      if (!r.at) {
        no("a move needs a point");
        continue;
      }
      if (wasThere && (tree || !rule.remove) && hit.list === "plantings") {
        no(tree ? "established trees cannot be moved" : `"${ask.dial}" keeps existing plants where they are`);
        continue;
      }
      op = { op: "move", id: hit.item.id, at: P(r.at), reason: r.reason };
    } else {
      // reshape
      const isBed = hit.list === "plantings" && (hit.item as Planting).type === "region";
      const isSoft = hit.list === "surfaces" && ["lawn", "mulch"].includes((hit.item as Thing).kind);
      if (hit.list === "edges" && r.path && r.path.length >= 2) op = { op: "reshape", id: hit.item.id, path: r.path.map(P), reason: r.reason };
      else if ((isBed || isSoft) && r.outline && r.outline.length >= 3) {
        const outline = r.outline.map(P);
        if (wasThere && rule.grow && isBed && area(outline) < area((hit.item as { outline: Point[] }).outline) * 0.95) {
          no(`"${ask.dial}" only grows existing beds`);
          continue;
        }
        op = { op: "reshape", id: hit.item.id, outline, reason: r.reason };
      } else {
        no("only beds, lawn, mulch, and edging can be reshaped, with a new outline or path");
        continue;
      }
    }

    // Check the changed item where it lands, against everything else.
    if (op.op !== "remove") {
      const next = find(applyOps(state, [op]), hit.item.id)!.item;
      const others = applyOps(state, [{ op: "remove", id: hit.item.id, reason: "" }]);
      const why = placeProblem(others, next, ctx);
      if (why) {
        no(why);
        continue;
      }
    }
    if (wasThere && hit.list === "plantings" && (op.op === "remove" || op.op === "replace")) removals++;
    touched.add(hit.item.id);
    ops.push(op);
    state = applyOps(state, [op]);
  }
  return { ops, dropped };
}

function makeAdd(r: RawOp, id: string, ctx: Ctx): AddOp | string {
  const pl = r.plantId ? ctx.plants.get(r.plantId) : undefined;
  if (!pl) return `unknown plant "${r.plantId}"`;
  let item: Planting;
  if (r.outline && r.outline.length >= 3) {
    if (pl.placement === "single" || pl.category === "tree") return `${pl.commonName} goes in one at a time, not as a bed`;
    item = { id, type: "region", plantId: pl.id, outline: r.outline.map(P), seed: hash(id) };
  } else if (r.path && r.path.length >= 2) item = { id, type: "row", plantId: pl.id, path: r.path.map(P) };
  else if (r.at) item = { id, type: "single", plantId: pl.id, at: P(r.at) };
  else return "an add needs a point, an outline, or a path";
  return { op: "add", item, reason: r.reason };
}

function makeThing(r: RawOp, id: string, ctx: Ctx): AddOp | string {
  const kind = r.kind as never;
  if (!r.kind || !thingKinds.includes(kind)) return `unknown feature kind "${r.kind}"`;
  if (hardscape.has(r.kind) && !ctx.ask.goals.hardscape) return `${r.kind} is hardscape the person did not ask for`;
  let item: Thing;
  if (featureKinds.includes(kind)) {
    if (!r.at) return "a feature needs a point";
    item = { id, kind, at: P(r.at) };
  } else if (edgeKinds.includes(kind)) {
    if (!r.path || r.path.length < 2) return "edging needs a path";
    item = { id, kind, path: r.path.map(P) };
  } else if (surfaceKinds.includes(kind)) {
    if (!r.outline || r.outline.length < 3) return "a surface needs an outline";
    item = { id, kind, outline: r.outline.map(P) };
  } else {
    if (!r.outline || r.outline.length < 3) return "a structure needs an outline";
    item = { id, kind, outline: r.outline.map(P), heightFt: kind === "raised-bed" ? 1.5 : 10 };
  }
  return { op: "addFeature", item, reason: r.reason };
}

function itemPoints(item: any): Point[] {
  return item.at ? [item.at] : item.outline ?? item.path;
}

// Inside the scope when the item's points, or most of its area, are inside.
function inScope(p: Point[], scope: Point[]) {
  if (p.length < 3) return p.every((q) => inside(q, scope) || nearEdge(q, scope, 1));
  const cells = sample(p);
  return cells.filter((q) => inside(q, scope)).length >= cells.length * 0.9;
}

function nearEdge(q: Point, poly: Point[], d: number) {
  for (let i = 0; i < poly.length; i++) if (segDist(q, poly[i], poly[(i + 1) % poly.length]) <= d) return true;
  return false;
}

function segDist([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export const distToPoly = (q: Point, poly: Point[]) => (inside(q, poly) ? 0 : Math.min(...poly.map((a, i) => segDist(q, a, poly[(i + 1) % poly.length]))));

// Points on a 2 ft grid inside an outline.
function sample(o: Point[]) {
  const b = bounds(o);
  const out: Point[] = [];
  for (let x = b.minX + 1; x < b.maxX; x += 2) for (let y = b.minY + 1; y < b.maxY; y += 2) if (inside([x, y], o)) out.push([x, y]);
  return out.length ? out : [center(o)];
}

function blocked(p: Property, q: Point) {
  if (inside(q, p.house.outline)) return "the house";
  for (const s of p.structures) if (s.kind !== "raised-bed" && inside(q, s.outline)) return `the ${s.kind}`;
  for (const s of p.surfaces) if (hard.has(s.kind) && inside(q, s.outline)) return `the ${s.kind}`;
  return null;
}

// Why an item cannot go where it is, or null when it can.
function placeProblem(p: Property, item: Planting | Thing, ctx: Ctx): string | null {
  const isPlant = "plantId" in item;
  const pl = isPlant ? ctx.plants.get(item.plantId) : undefined;
  const isHard = !isPlant && (hardscape.has(item.kind) || listOf(item) === "structures");
  const lotPad = 0.5;
  const pts = itemPoints(item);
  for (const q of pts) if (!inside(q, p.lot.outline) && !nearEdge(q, p.lot.outline, lotPad)) return "outside the lot";
  if (ctx.ask.scope && !inScope(pts, ctx.ask.scope)) return "outside the area being reworked";

  // Ground checks: points for points and paths, a grid for outlines.
  const cells = pts.length >= 3 && "outline" in item ? sample(pts) : pts;
  if (!isHard) {
    const hits = cells.map((q) => blocked(p, q)).filter(Boolean);
    if (hits.length > cells.length * 0.1) return `on ${hits[0]}`;
  } else if (cells.some((q) => inside(q, p.house.outline))) return "on the house";

  if (!pl || !isPlant) return null;
  const plant = item as Planting;
  const at = plant.type === "single" ? plant.at : center(pts);

  // Sun at the plant, or at the bed's center.
  const sun = ctx.ask.sun?.(at) ?? "unknown";
  if (sun !== "unknown" && !pl.sun.includes(sun)) return `${pl.commonName} needs ${pl.sun.join(" or ")} sun, but this spot is ${sun}`;

  if (plant.type === "single") {
    if (pl.category === "tree" && distToPoly(plant.at, p.house.outline) < Math.min(pl.size.spreadFt / 2, 15)) return `${pl.commonName} is too close to the house`;
    for (const o of p.plantings) {
      if (o.type !== "single") continue;
      const op = ctx.plants.get(o.plantId);
      if (!op) continue;
      const d = Math.hypot(o.at[0] - plant.at[0], o.at[1] - plant.at[1]);
      const bigA = pl.category === "tree", bigB = op.category === "tree";
      // Two plants of the same layer need room. A small plant may sit under a tree, but not on its trunk.
      const need = bigA === bigB ? ((pl.size.spreadFt + op.size.spreadFt) / 2) * 0.7 : Math.min(pl.size.spreadFt, op.size.spreadFt) / 2 + 1.5;
      if (d < need) return `too close to ${o.id} (${Math.round(d)} ft apart, needs ${Math.round(need)})`;
    }
  }
  if (plant.type === "region") {
    const mine = sample(plant.outline);
    for (const o of p.plantings) {
      if (o.type !== "region") continue;
      const shared = mine.filter((q) => inside(q, o.outline)).length;
      if (shared > mine.length * 0.2) return `overlaps the bed ${o.id}`;
    }
    if (area(plant.outline) < 4) return "the bed is too small";
  }
  return null;
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}

export function toReview(raw: { summary: string; works: RawSpot[]; doesnt: RawSpot[]; empty: RawSpot[] }): Review {
  const s = (x: RawSpot) => ({ note: x.note, at: x.at ? P(x.at) : null });
  return { summary: raw.summary, works: raw.works.map(s), doesnt: raw.doesnt.map(s), empty: raw.empty.map(s) };
}
type RawSpot = { note: string; at: { x: number; y: number } | null };
