import { z } from "zod";
import { edgeKinds, featureKinds, fenceKinds, plantingSchema, structureKinds, surfaceKinds, type Point, type Property } from "./property";

// A design is a list of edit ops on the property as it is. Applying the ops gives the design's plan.
// diff(before, after) finds the ops between two plans, so a hand edit can be saved as ops too.

const point = z.tuple([z.number(), z.number()]);
const outline = z.array(point).min(3);
const path = z.array(point).min(2);
const id = z.string().min(1);

export const dials = ["light", "refresh", "redo"] as const;
export type Dial = (typeof dials)[number];

// property.ts imports this file for its `designs` list, so the schemas that use property.ts are built on first use.
function build() {
  const feature = z.object({ id, kind: z.enum(featureKinds), at: point });
  const surface = z.object({ id, kind: z.enum(surfaceKinds), outline });
  const structure = z.object({ id, kind: z.enum(structureKinds), outline, heightFt: z.number().positive() });
  const edge = z.object({ id, kind: z.enum(edgeKinds), path });
  const fence = z.object({ id, kind: z.enum(fenceKinds), heightFt: z.number().positive(), path });
  // Anything that is not a planting. Kinds never repeat across lists.
  const thing = z.union([feature, edge, surface, structure, fence]);
  const item = z.union([plantingSchema, thing]);
  const reason = z.string().default("");
  const op = z.discriminatedUnion("op", [
    z.object({ op: z.literal("keep"), id, reason }),
    z.object({ op: z.literal("remove"), id, reason }),
    // Swaps an item for another in the same list, usually a planting with a new plantId.
    z.object({ op: z.literal("replace"), id, item, reason }),
    z.object({ op: z.literal("move"), id, at: point, reason }),
    z.object({ op: z.literal("add"), item: plantingSchema, reason }),
    z.object({ op: z.literal("reshape"), id, outline: outline.optional(), path: path.optional(), reason }),
    z.object({ op: z.literal("addFeature"), item: thing, reason }),
  ]);
  const design = z.object({
    id,
    name: z.string(),
    style: z.string(),
    dial: z.enum(dials),
    goals: goalsSchema,
    // An outline in feet. Area rework only changes what is inside it.
    scope: outline.optional(),
    review: reviewSchema.optional(),
    summary: z.string().optional(),
    ops: z.array(op),
    // Proposed ops a person has not accepted or rejected yet. They draw as ghosts over the plan.
    pending: z.array(op).optional(),
    // What validation dropped, so a person can see why.
    dropped: z.array(z.string()).optional(),
  });
  return { thing, op, design };
}
let built: ReturnType<typeof build> | undefined;
const schemas = () => (built ??= build());

export const goalsSchema = z.object({
  text: z.string(),
  // Quick picks: feelings, colors, wildlife and safety, such as "calm", "purple", "songbirds", "safe for dogs".
  chips: z.array(z.string()),
  favorites: z.array(z.string()).default([]),
  // A person must opt in before a design adds a patio, deck, path or other big hardscape.
  hardscape: z.boolean().default(false),
});

const spot = z.object({ note: z.string(), at: point.nullable() });
export const reviewSchema = z.object({
  summary: z.string(),
  works: z.array(spot),
  doesnt: z.array(spot),
  empty: z.array(spot),
});

type Built = ReturnType<typeof build>;
export const opSchema = z.lazy(() => schemas().op) as unknown as Built["op"];
export const designSchema = z.lazy(() => schemas().design) as unknown as Built["design"];
export const thingSchema = z.lazy(() => schemas().thing) as unknown as Built["thing"];

export type Op = z.infer<typeof opSchema>;
export type Goals = z.infer<typeof goalsSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Design = z.infer<typeof designSchema>;
export type Thing = z.infer<typeof thingSchema>;

export const lists = ["plantings", "features", "edges", "surfaces", "structures", "fences"] as const;
export type List = (typeof lists)[number];
type Item = Property[List][number];

// Which list a thing belongs in, by its kind.
export function listOf(item: { kind?: string; type?: string }): List {
  if (item.type) return "plantings";
  const k = item.kind as never;
  if (featureKinds.includes(k)) return "features";
  if (edgeKinds.includes(k)) return "edges";
  if (surfaceKinds.includes(k)) return "surfaces";
  if (structureKinds.includes(k)) return "structures";
  return "fences";
}

export function find(p: Property, itemId: string): { list: List; item: Item; index: number } | null {
  for (const list of lists) {
    const index = (p[list] as Item[]).findIndex((x) => x.id === itemId);
    if (index >= 0) return { list, item: p[list][index], index };
  }
  return null;
}

const clone = <T>(v: T): T => structuredClone(v);

// Items keep their order. Added items go at the end of their list. Ops on unknown ids do nothing.
export function applyOps(p: Property, ops: Op[]): Property {
  const out = clone(p);
  for (const o of ops) {
    if (o.op === "add" || o.op === "addFeature") {
      (out[listOf(o.item)] as Item[]).push(clone(o.item));
      continue;
    }
    if (o.op === "keep") continue;
    const hit = find(out, o.id);
    if (!hit) continue;
    const arr = out[hit.list] as Item[];
    if (o.op === "remove") arr.splice(hit.index, 1);
    else if (o.op === "replace") arr[hit.index] = clone(o.item);
    else if (o.op === "move") arr[hit.index] = moveTo(hit.item, o.at);
    else if (o.op === "reshape") {
      const next: any = clone(hit.item);
      if (o.outline && "outline" in next) next.outline = clone(o.outline);
      if (o.path && "path" in next) next.path = clone(o.path);
      arr[hit.index] = next;
    }
  }
  return out;
}

// A point item jumps to the point. A shape slides so its box center lands on the point.
function moveTo(item: Item, at: Point): Item {
  const next: any = clone(item);
  if ("at" in next) {
    next.at = [...at];
    return next;
  }
  const pts: Point[] = next.outline ?? next.path;
  const c = center(pts);
  const shift = (q: Point): Point => [round(q[0] + at[0] - c[0]), round(q[1] + at[1] - c[1])];
  if (next.outline) next.outline = next.outline.map(shift);
  if (next.path) next.path = next.path.map(shift);
  return next;
}

export function center(pts: Point[]): Point {
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const round = (n: number) => Math.round(n * 10) / 10;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The ops that turn `before` into `after`, matched by id across all item lists.
// A change to only `at` is a move, to only the outline or path a reshape, and anything else a replace.
export function diff(before: Property, after: Property): Op[] {
  const ops: Op[] = [];
  for (const list of lists) {
    const a = before[list] as Item[];
    const b = after[list] as Item[];
    const next = new Map(b.map((x) => [x.id, x]));
    const prev = new Set(a.map((x) => x.id));
    for (const x of a) {
      const y = next.get(x.id);
      if (!y) {
        ops.push({ op: "remove", id: x.id, reason: "" });
        continue;
      }
      if (same(x, y)) continue;
      const changed = Object.keys({ ...x, ...y }).filter((k) => !same((x as any)[k], (y as any)[k]));
      if (changed.length === 1 && changed[0] === "at") ops.push({ op: "move", id: x.id, at: (y as any).at, reason: "" });
      else if (changed.every((k) => k === "outline" || k === "path")) ops.push({ op: "reshape", id: x.id, outline: (y as any).outline, path: (y as any).path, reason: "" });
      else ops.push({ op: "replace", id: x.id, item: y as any, reason: "" });
    }
    for (const y of b) {
      if (prev.has(y.id)) continue;
      ops.push(list === "plantings" ? { op: "add", item: y as any, reason: "" } : { op: "addFeature", item: y as any, reason: "" });
    }
  }
  return ops;
}

// The plan a design shows: the property with the design's ops applied.
export function shown(p: Property, d: Design | undefined) {
  return d ? applyOps(p, d.ops) : p;
}
