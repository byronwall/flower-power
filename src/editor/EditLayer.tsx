import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import { bounds } from "../render/geometry";
import { lookOf, type ViewTime } from "../render/look";
import { label } from "./Inspector";
import { crowding, matureRadius } from "./spacing";
import type { View } from "../render/paint";
import { itemOf, newId, pointsOf, snap, withPoints, type Collection, type Editor, type Item, type Ref } from "./state";

type Props = { editor: Editor; view: View; time: ViewTime };
type Drag = { ref: Ref; start: Point; orig: Point[]; vertex: number | null; moved: boolean; resize: boolean };
type Single = Extract<Property["plantings"][number], { type: "single" }>;

const STRUCTURE_HEIGHT: Record<string, number> = { deck: 2, pergola: 9, shed: 9, "raised-bed": 1.5 };

const ptsAttr = (pts: Point[]) => pts.map((p) => p.join(",")).join(" ");

// Item names as a person says them, for hover labels.
function nameOf(col: Ref["col"], item: any) {
  if (col === "house") return "House";
  if (col === "plantings") return plantsById.get(item.plantId)?.commonName ?? item.plantId;
  return label(item.kind);
}

function areaOf(pts: Point[], closed: boolean, r: number) {
  if (pts.length === 1) return Math.PI * r * r;
  if (!closed) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return len * 2;
  }
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

type Hit = { col: Ref["col"]; id: string; item: any; r: number; area: number };

export function EditLayer(props: Props) {
  let root!: SVGGElement;
  const ed = props.editor;
  const [drag, setDrag] = createSignal<Drag | null>(null);
  const [draft, setDraft] = createSignal<Point[]>([]);
  const [cursor, setCursor] = createSignal<Point | null>(null);
  const [hover, setHover] = createSignal<Ref | null>(null);
  const px = (n: number) => n / props.view.scale;

  const toFt = (e: PointerEvent | MouseEvent): Point => {
    const m = root.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return snap([p.x, p.y]);
  };

  function startDrag(e: PointerEvent, ref: Ref, vertex: number | null = null, resize = false) {
    if (ed.tool().mode !== "select" || e.button !== 0) return;
    e.stopPropagation();
    ed.setSelected(ref);
    const item = itemOf(ed.property(), ref);
    if (!item) return;
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Pointer already released.
    }
    setDrag({ ref, start: toFt(e), orig: pointsOf(item), vertex, moved: false, resize });
  }

  function onMove(e: PointerEvent) {
    const p = toFt(e);
    setCursor(p);
    const d = drag();
    if (!d) return;
    const dx = p[0] - d.start[0];
    const dy = p[1] - d.start[1];
    if (!d.moved && Math.hypot(dx, dy) < px(3)) return;
    if (!d.moved) {
      ed.checkpoint();
      setDrag({ ...d, moved: true });
    }
    if (d.resize) {
      // Resize a single plant from its edge: the new radius is the pointer's distance from its center.
      const item = itemOf(ed.property(), d.ref) as Single;
      const base = baseRadius(item);
      const scale = Math.round(Math.min(4, Math.max(0.2, Math.hypot(p[0] - item.at[0], p[1] - item.at[1]) / base)) * 20) / 20;
      ed.updateItem(d.ref, (x) => ({ ...x, scale: scale === 1 ? undefined : scale }), true);
      return;
    }
    const pts = d.vertex === null ? d.orig.map(([x, y]) => snap([x + dx, y + dy])) : d.orig.map((q, i) => (i === d.vertex ? p : q));
    ed.updateItem(d.ref, (item) => withPoints(item, pts), true);
  }

  function onBackground(e: PointerEvent) {
    const t = ed.tool();
    if (t.mode === "select") return;
    const p = toFt(e);
    if (t.shape === "point") return finish([p]);
    setDraft([...draft(), p]);
  }

  function finish(pts = draft()) {
    const t = ed.tool();
    setDraft([]);
    if (t.mode !== "draw") return;
    const need = t.shape === "outline" ? 3 : t.shape === "path" ? 2 : 1;
    if (pts.length < need) return;
    ed.add(t.col, build(ed.property(), t.col, t.kind, pts, t));
    ed.setTool({ mode: "select" });
  }

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (ed.tool().mode !== "draw") return;
      if (e.key === "Enter") finish();
      if (e.key === "Escape") {
        setDraft([]);
        ed.setTool({ mode: "select" });
      }
    };
    window.addEventListener("keydown", key);
    onCleanup(() => window.removeEventListener("keydown", key));
  });

  const isSel = (col: string, id: string) => ed.selected()?.col === col && ed.selected()?.id === id;

  // Radius drawn for a plant now, and the radius before any resize, both in July.
  const plantRadius = (item: Property["plantings"][number]) => {
    const plant = plantsById.get(item.plantId);
    const look = plant && lookOf(plant, { ...props.time, month: 7 }, item.existing, item.type === "single" ? item.scale ?? 1 : 1);
    return Math.max(look ? look.spreadFt / 2 : 1, px(8));
  };
  const baseRadius = (item: Single) => {
    const plant = plantsById.get(item.plantId);
    const look = plant && lookOf(plant, { ...props.time, month: 7 }, item.existing, 1);
    return look ? look.spreadFt / 2 : 1;
  };

  // Every editable thing, biggest first, so a small plant on top of a bed or under a tree stays clickable.
  const cols: Collection[] = ["surfaces", "structures", "edges", "fences", "plantings", "features"];
  const hits = createMemo<Hit[]>(() => {
    const p = ed.property();
    const list: Hit[] = [{ col: "house", id: "house", item: p.house, r: 0, area: areaOf(p.house.outline, true, 0) }];
    for (const col of cols)
      for (const item of p[col] as (Item & { id: string })[]) {
        const r = col === "plantings" ? plantRadius(item as Property["plantings"][number]) : 1.6;
        list.push({ col, id: item.id, item, r, area: areaOf(pointsOf(item), "outline" in item, r) });
      }
    return list.sort((a, b) => b.area - a.area);
  });
  const singleIds = createMemo(
    () => ed.property().plantings.filter((x) => x.type === "single").map((x) => x.id),
    undefined,
    { equals: (a, b) => a.length === b.length && a.every((k, i) => k === b[i]) },
  );
  // Stable keys, so dragging one thing does not rebuild every target (and drop the pointer capture).
  const hitById = createMemo(() => new Map(hits().map((h) => [`${h.col}:${h.id}`, h])));
  const hitKeys = createMemo(() => hits().map((h) => `${h.col}:${h.id}`), undefined, { equals: (a, b) => a.length === b.length && a.every((k, i) => k === b[i]) });

  const Shape = (props: { k: string }) => {
    const p = { get col() { return hitById().get(props.k)!.col; }, get id() { return hitById().get(props.k)!.id; }, get item() { return hitById().get(props.k)!.item; }, get r() { return hitById().get(props.k)!.r; } };
    const pts = () => pointsOf(p.item);
    const ref = () => ({ col: p.col, id: p.id }) as Ref;
    const cls = () => `hit${isSel(p.col, p.id) ? " selected" : ""}`;
    const on = {
      onPointerDown: (e: PointerEvent) => startDrag(e, ref()),
      onPointerEnter: () => setHover(ref()),
      onPointerLeave: () => setHover((h) => (h?.id === p.id && h.col === p.col ? null : h)),
    };
    return (
      <Show
        when={"outline" in p.item}
        fallback={
          <Show when={"path" in p.item} fallback={<circle class={cls()} cx={pts()[0][0]} cy={pts()[0][1]} r={p.r} {...on} />}>
            <polyline class={`${cls()} line`} points={ptsAttr(pts())} stroke-width={Math.max(px(12), 0.8)} {...on} />
          </Show>
        }
      >
        <polygon class={cls()} points={ptsAttr(pts())} {...on} />
      </Show>
    );
  };

  const sel = () => {
    const s = ed.selected();
    const item = s && itemOf(ed.property(), s);
    return s && item ? { ref: s, item: item as any, pts: pointsOf(item), closed: "outline" in item } : null;
  };
  const selSingle = () => {
    const s = sel();
    return s && s.ref.col === "plantings" && s.item.type === "single" ? (s.item as Single) : null;
  };

  // The hover label: name, plus size for plants. Hidden while dragging so it does not trail the pointer.
  const hoverInfo = () => {
    const h = hover();
    if (!h || drag()?.moved || ed.tool().mode !== "select") return null;
    const item = itemOf(ed.property(), h) as any;
    if (!item) return null;
    const pts = pointsOf(item);
    const b = bounds(pts);
    const r = h.col === "plantings" && item.type === "single" ? plantRadius(item) : h.col === "features" ? 1.6 : 0;
    let text = nameOf(h.col, item);
    if (h.col === "plantings") {
      const plant = plantsById.get(item.plantId);
      if (item.type === "single" && plant) text += ` · ${Math.round(plant.size.spreadFt * (item.scale ?? 1))} ft wide grown`;
      else if (item.type !== "single") text += item.type === "row" ? " · row" : " · bed";
    }
    return { text, x: b.minX + b.w / 2, y: b.minY - r };
  };

  const crowded = () => {
    const s = selSingle();
    return s ? crowding(ed.property(), s.id) : [];
  };

  const ghostInfo = () => {
    const g = ed.ghost();
    const plant = g && plantsById.get(g.plantId);
    if (!g || !plant) return null;
    const look = lookOf(plant, { ...props.time, month: 7 }, false);
    return { at: g.at, r: (look?.spreadFt ?? plant.size.spreadFt) / 2, mature: plant.size.spreadFt / 2, name: plant.commonName };
  };

  return (
    <g
      ref={root}
      class={`edit-layer ${ed.tool().mode === "draw" ? "drawing" : ""}`}
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onDblClick={() => finish()}
    >
      <rect class="edit-bg" x={-2000} y={-2000} width={4000} height={4000} onPointerDown={onBackground} />
      <For each={hitKeys()}>{(k) => <Show when={hitById().get(k)}><Shape k={k} /></Show>}</For>
      {/* Trunk grips: the middle of any single plant always grabs that plant, even over a smaller bed. */}
      <For each={singleIds()}>
        {(id) => {
          const pl = () => ed.property().plantings.find((x) => x.id === id) as Single | undefined;
          return (
            <Show when={pl()}>
              {(p) => (
                <circle
                  class="hit trunk"
                  cx={p().at[0]}
                  cy={p().at[1]}
                  r={Math.min(plantRadius(p()), Math.max(px(9), plantRadius(p()) * 0.22))}
                  onPointerDown={(e) => startDrag(e, { col: "plantings", id })}
                  onPointerEnter={() => setHover({ col: "plantings", id })}
                  onPointerLeave={() => setHover(null)}
                />
              )}
            </Show>
          );
        }}
      </For>

      <For each={crowded()}>
        {(c) => (
          <g class="crowd">
            <circle cx={c.at[0]} cy={c.at[1]} r={c.r} />
          </g>
        )}
      </For>

      <Show when={sel()}>
        {(s) => (
          <g class="selection">
            <Show
              when={s().pts.length > 1}
              fallback={
                <Show when={selSingle()} fallback={<circle class="sel-ring" cx={s().pts[0][0]} cy={s().pts[0][1]} r={2.2} />}>
                  {(pl) => {
                    const r = () => plantRadius(pl());
                    const mature = () => matureRadius(pl());
                    const at = () => pl().at;
                    return (
                      <>
                        {/* Full-grown size, when the plant is still young in the year shown. */}
                        <Show when={mature() > r() + px(3)}>
                          <circle class="grow-ring" cx={at()[0]} cy={at()[1]} r={mature()} />
                        </Show>
                        <circle class="sel-ring" classList={{ crowded: crowded().length > 0 }} cx={at()[0]} cy={at()[1]} r={r()} />
                        {/* Small plants get one handle; four would crowd the ring. */}
                        <For each={r() / px(1) < 24 ? [0] : [0, 1, 2, 3]}>
                          {(i) => {
                            const a = (i * Math.PI) / 2;
                            return (
                              <circle
                                class={`handle resize ${i % 2 ? "ns" : "ew"}`}
                                cx={at()[0] + Math.cos(a) * r()}
                                cy={at()[1] + Math.sin(a) * r()}
                                r={px(5)}
                                onPointerDown={(e) => startDrag(e, s().ref, null, true)}
                              />
                            );
                          }}
                        </For>
                        <Show when={drag()?.resize && drag()?.moved}>
                          <text class="plan-label" x={at()[0]} y={at()[1] - r() - px(10)} font-size={String(px(13))} text-anchor="middle">
                            {Math.round((plantsById.get(pl().plantId)?.size.spreadFt ?? 0) * (pl().scale ?? 1))} ft wide when grown
                          </text>
                        </Show>
                      </>
                    );
                  }}
                </Show>
              }
            >
              {s().closed ? <polygon class="sel-line" points={ptsAttr(s().pts)} /> : <polyline class="sel-line" points={ptsAttr(s().pts)} />}
              <For each={s().pts}>
                {(p, i) => <circle class="handle" cx={p[0]} cy={p[1]} r={px(5)} onPointerDown={(e) => startDrag(e, s().ref, i())} />}
              </For>
            </Show>
          </g>
        )}
      </Show>

      <Show when={ghostInfo()}>
        {(g) => (
          <g class="drop-ghost">
            <circle class="grow-ring" cx={g().at[0]} cy={g().at[1]} r={g().mature} />
            <circle class="ghost-now" cx={g().at[0]} cy={g().at[1]} r={g().r} />
            <text class="plan-label" x={g().at[0]} y={g().at[1] - g().mature - px(8)} font-size={String(px(13))} text-anchor="middle">
              {g().name} · {Math.round(g().mature * 2)} ft wide grown
            </text>
          </g>
        )}
      </Show>

      <Show when={hoverInfo()}>
        {(h) => (
          <text class="plan-label" x={h().x} y={h().y - px(8)} font-size={String(px(13))} text-anchor="middle">
            {h().text}
          </text>
        )}
      </Show>

      <Show when={draft().length > 0}>
        <polyline class="draft" points={ptsAttr([...draft(), ...(cursor() ? [cursor()!] : [])])} />
        <For each={draft()}>{(p) => <circle class="handle" cx={p[0]} cy={p[1]} r={px(4)} />}</For>
      </Show>
    </g>
  );
}

function build(p: Property, col: Collection, kind: string, pts: Point[], tool: { plantId?: string; type?: "single" | "region" | "row" }): Item {
  const id = newId(p, col === "plantings" ? tool.plantId ?? "plant" : kind);
  switch (col) {
    case "surfaces": return { id, kind, outline: pts } as Item;
    case "structures": return { id, kind, outline: pts, heightFt: STRUCTURE_HEIGHT[kind] ?? 2 } as Item;
    case "edges": return { id, kind, path: pts } as Item;
    case "fences": return { id, kind, heightFt: kind === "solid" ? 6 : 4, path: pts } as Item;
    case "features": return { id, kind, at: pts[0] } as Item;
    case "plantings": {
      const plantId = tool.plantId!;
      if (tool.type === "region") return { id, type: "region", plantId, outline: pts, seed: Math.floor(Math.random() * 10000) };
      if (tool.type === "row") return { id, type: "row", plantId, path: pts };
      return { id, type: "single", plantId, at: pts[0] };
    }
  }
}
