import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import { lookOf, type ViewTime } from "../render/look";
import type { View } from "../render/paint";
import { itemOf, newId, pointsOf, snap, withPoints, type Collection, type Editor, type Item, type Ref } from "./state";

type Props = { editor: Editor; view: View; time: ViewTime };
type Drag = { ref: Ref; start: Point; orig: Point[]; vertex: number | null; moved: boolean };

const STRUCTURE_HEIGHT: Record<string, number> = { deck: 2, pergola: 9, shed: 9, "raised-bed": 1.5 };

const ptsAttr = (pts: Point[]) => pts.map((p) => p.join(",")).join(" ");

export function EditLayer(props: Props) {
  let root!: SVGGElement;
  const ed = props.editor;
  const [drag, setDrag] = createSignal<Drag | null>(null);
  const [draft, setDraft] = createSignal<Point[]>([]);
  const [cursor, setCursor] = createSignal<Point | null>(null);
  const px = (n: number) => n / props.view.scale;

  const toFt = (e: PointerEvent | MouseEvent): Point => {
    const m = root.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return snap([p.x, p.y]);
  };

  function startDrag(e: PointerEvent, ref: Ref, vertex: number | null = null) {
    if (ed.tool().mode !== "select") return;
    e.stopPropagation();
    ed.setSelected(ref);
    const item = itemOf(ed.property(), ref);
    if (!item) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ ref, start: toFt(e), orig: pointsOf(item), vertex, moved: false });
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
    const pts = d.vertex === null ? d.orig.map(([x, y]) => snap([x + dx, y + dy])) : d.orig.map((q, i) => (i === d.vertex ? p : q));
    ed.updateItem(d.ref, (item) => withPoints(item, pts), true);
  }

  function onBackground(e: PointerEvent) {
    const t = ed.tool();
    if (t.mode === "select") return ed.setSelected(null);
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

  const Shape = (p: { col: Ref["col"]; id: string; item: object; r?: number }) => {
    const pts = () => pointsOf(p.item);
    const ref = () => ({ col: p.col, id: p.id }) as Ref;
    const cls = () => `hit${isSel(p.col, p.id) ? " selected" : ""}`;
    return (
      <Show
        when={"outline" in p.item}
        fallback={
          <Show
            when={"path" in p.item}
            fallback={<circle class={cls()} cx={pts()[0][0]} cy={pts()[0][1]} r={p.r ?? 1.5} onPointerDown={(e) => startDrag(e, ref())} />}
          >
            <polyline class={`${cls()} line`} points={ptsAttr(pts())} stroke-width={Math.max(px(12), 0.8)} onPointerDown={(e) => startDrag(e, ref())} />
          </Show>
        }
      >
        <polygon class={cls()} points={ptsAttr(pts())} onPointerDown={(e) => startDrag(e, ref())} />
      </Show>
    );
  };

  const plantRadius = (item: Property["plantings"][number]) => {
    const plant = plantsById.get(item.plantId);
    const look = plant && lookOf(plant, { ...props.time, month: 7 }, item.existing);
    return Math.max(look ? look.spreadFt / 2 : 1, px(8));
  };

  const cols: Collection[] = ["surfaces", "structures", "edges", "fences", "plantings", "features"];
  const sel = () => {
    const s = ed.selected();
    const item = s && itemOf(ed.property(), s);
    return s && item ? { ref: s, pts: pointsOf(item), closed: "outline" in item } : null;
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
      <Shape col="house" id="house" item={ed.property().house} />
      <For each={cols}>
        {(col) => (
          <For each={ed.property()[col] as (Item & { id: string })[]}>
            {(item) => <Shape col={col} id={item.id} item={item} r={col === "plantings" ? plantRadius(item as Property["plantings"][number]) : 1.6} />}
          </For>
        )}
      </For>
      <Show when={sel()}>
        {(s) => (
          <g class="selection">
            <Show
              when={s().pts.length > 1}
              fallback={<circle class="sel-ring" cx={s().pts[0][0]} cy={s().pts[0][1]} r={s().ref.col === "plantings" ? plantRadius(itemOf(ed.property(), s().ref) as never) + px(4) : 2.2} />}
            >
              {s().closed ? <polygon class="sel-line" points={ptsAttr(s().pts)} /> : <polyline class="sel-line" points={ptsAttr(s().pts)} />}
              <For each={s().pts}>
                {(p, i) => <circle class="handle" cx={p[0]} cy={p[1]} r={px(5)} onPointerDown={(e) => startDrag(e, s().ref, i())} />}
              </For>
            </Show>
          </g>
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
