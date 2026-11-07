import { createSignal } from "solid-js";
import type { Point, Property } from "../model/property";

// Every editable thing lives in one of these lists, or is the house.
export type Collection = "surfaces" | "structures" | "edges" | "fences" | "features" | "plantings";
export type Ref = { col: Collection; id: string } | { col: "house"; id: "house" };

// A drawing tool creates a new object of one kind from clicked points.
export type Tool =
  | { mode: "select" }
  | { mode: "draw"; col: Collection; kind: string; shape: "outline" | "path" | "point"; plantId?: string; type?: "single" | "region" | "row" };

export type Item = Property[Collection][number];

export function itemOf(p: Property, ref: Ref): (Item & { id: string }) | Property["house"] | undefined {
  if (ref.col === "house") return p.house;
  return (p[ref.col] as Item[]).find((x) => x.id === ref.id);
}

// The points that define an object's shape, whatever field holds them.
export function pointsOf(item: object): Point[] {
  if ("outline" in item) return item.outline as Point[];
  if ("path" in item) return item.path as Point[];
  if ("at" in item) return [item.at as Point];
  return [];
}

export function withPoints<T extends object>(item: T, pts: Point[]): T {
  if ("outline" in item) return { ...item, outline: pts };
  if ("path" in item) return { ...item, path: pts };
  if ("at" in item) return { ...item, at: pts[0] };
  return item;
}

const round = (n: number) => Math.round(n * 10) / 10;
export const snap = ([x, y]: Point): Point => [round(x), round(y)];

export function createEditor(initial: Property) {
  const [property, setProperty] = createSignal(initial);
  const [selected, setSelected] = createSignal<Ref | null>(null);
  const [tool, setTool] = createSignal<Tool>({ mode: "select" });
  const [dirty, setDirty] = createSignal(false);
  // A plant being dragged in from the gallery, and where it would land.
  const [ghost, setGhost] = createSignal<{ plantId: string; at: Point } | null>(null);
  const past: Property[] = [];
  const future: Property[] = [];
  // Bumped whenever history changes, so buttons can show whether undo/redo apply.
  const [hist, setHist] = createSignal(0);
  const bump = () => setHist(hist() + 1);
  const canUndo = () => (hist(), past.length > 0);
  const canRedo = () => (hist(), future.length > 0);

  // `live` updates skip history, so a drag records one undo step at its start.
  function update(fn: (p: Property) => Property, live = false) {
    if (!live) {
      past.push(property());
      future.length = 0;
      bump();
    }
    setProperty(fn(property()));
    setDirty(true);
  }

  function checkpoint() {
    past.push(property());
    future.length = 0;
    bump();
  }

  function updateItem(ref: Ref, fn: (item: any) => any, live = false) {
    update((p) => {
      if (ref.col === "house") return { ...p, house: fn(p.house) };
      return { ...p, [ref.col]: (p[ref.col] as Item[]).map((x) => (x.id === ref.id ? fn(x) : x)) };
    }, live);
  }

  function add(col: Collection, item: Item) {
    update((p) => ({ ...p, [col]: [...(p[col] as Item[]), item] }));
    setSelected({ col, id: item.id });
  }

  function remove(ref: Ref) {
    if (ref.col === "house") return;
    update((p) => ({ ...p, [ref.col]: (p[ref.col] as Item[]).filter((x) => x.id !== ref.id) }));
    setSelected(null);
  }

  function undo() {
    const prev = past.pop();
    if (!prev) return;
    future.push(property());
    bump();
    setProperty(prev);
    setDirty(true);
  }

  function redo() {
    const next = future.pop();
    if (!next) return;
    past.push(property());
    bump();
    setProperty(next);
    setDirty(true);
  }

  function load(p: Property) {
    past.length = 0;
    future.length = 0;
    bump();
    setProperty(p);
    setSelected(null);
    setDirty(false);
  }

  return { property, selected, setSelected, tool, setTool, ghost, setGhost, dirty, setDirty, update, updateItem, checkpoint, add, remove, undo, redo, canUndo, canRedo, load };
}

export type Editor = ReturnType<typeof createEditor>;

// A plant dropped from the gallery: one plant, or a round region a few plants wide to reshape.
export function droppedPlanting(p: Property, plant: { id: string; placement: string; size: { spacingFt: number } }, at: Point): Property["plantings"][number] {
  const id = newId(p, plant.id);
  if (plant.placement !== "region") return { id, type: "single", plantId: plant.id, at };
  const r = Math.max(2, plant.size.spacingFt * 1.8);
  const outline: Point[] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return snap([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r * 0.75]);
  });
  return { id, type: "region", plantId: plant.id, outline, seed: Math.floor(Math.random() * 10000) };
}

export function newId(p: Property, prefix: string) {
  const used = new Set([...p.surfaces, ...p.structures, ...p.edges, ...p.fences, ...p.features, ...p.plantings].map((x) => x.id));
  let i = 1;
  while (used.has(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}

// Stretches every point and the underlay by `k` around the plan's origin, for a scale fix after an import.
// Heights and plant spacing are real sizes, so they stay the same.
export function scaleProperty(p: Property, k: number): Property {
  const pts = (list: Point[]) => list.map(([x, y]) => snap([x * k, y * k]));
  const each = <T extends object>(items: T[]) => items.map((x) => withPoints(x, pts(pointsOf(x))));
  return {
    ...p,
    lot: { outline: pts(p.lot.outline) },
    house: { ...p.house, outline: pts(p.house.outline) },
    fences: each(p.fences),
    surfaces: each(p.surfaces),
    structures: each(p.structures),
    edges: each(p.edges),
    features: each(p.features),
    plantings: each(p.plantings),
    underlay: p.underlay && { ...p.underlay, ftPerPx: Math.round(p.underlay.ftPerPx * k * 10000) / 10000, originFt: snap([p.underlay.originFt[0] * k, p.underlay.originFt[1] * k]) },
  };
}
