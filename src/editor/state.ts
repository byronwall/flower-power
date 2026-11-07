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
  const past: Property[] = [];
  const future: Property[] = [];

  // `live` updates skip history, so a drag records one undo step at its start.
  function update(fn: (p: Property) => Property, live = false) {
    if (!live) {
      past.push(property());
      future.length = 0;
    }
    setProperty(fn(property()));
    setDirty(true);
  }

  function checkpoint() {
    past.push(property());
    future.length = 0;
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
    setProperty(prev);
    setDirty(true);
  }

  function redo() {
    const next = future.pop();
    if (!next) return;
    past.push(property());
    setProperty(next);
    setDirty(true);
  }

  function load(p: Property) {
    past.length = 0;
    future.length = 0;
    setProperty(p);
    setSelected(null);
    setDirty(false);
  }

  return { property, selected, setSelected, tool, setTool, dirty, setDirty, update, updateItem, checkpoint, add, remove, undo, redo, load };
}

export type Editor = ReturnType<typeof createEditor>;

export function newId(p: Property, prefix: string) {
  const used = new Set([...p.surfaces, ...p.structures, ...p.edges, ...p.fences, ...p.features, ...p.plantings].map((x) => x.id));
  let i = 1;
  while (used.has(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}
