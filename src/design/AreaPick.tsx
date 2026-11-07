import { createSignal, Show } from "solid-js";
import type { Point } from "../model/property";

// Drag a box on the plan to pick an area for rework. Drawn in plan feet inside PlanView's overlay.
export function AreaPick(props: { onPick: (scope: Point[]) => void }) {
  let root!: SVGGElement;
  const [start, setStart] = createSignal<Point | null>(null);
  const [end, setEnd] = createSignal<Point | null>(null);
  const toFt = (e: PointerEvent): Point => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(root.getScreenCTM()!.inverse());
    return [Math.round(p.x), Math.round(p.y)];
  };
  const box = () => {
    const a = start(), b = end();
    if (!a || !b) return null;
    return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
  };
  return (
    <g ref={root} class="area-pick">
      <rect
        class="area-pick-catch"
        x={-5000}
        y={-5000}
        width={10000}
        height={10000}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          setStart(toFt(e));
          setEnd(toFt(e));
        }}
        onPointerMove={(e) => start() && setEnd(toFt(e))}
        onPointerUp={() => {
          const b = box();
          setStart(null);
          if (b && b.w >= 4 && b.h >= 4) props.onPick([[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]);
        }}
      />
      <Show when={box()}>{(b) => <rect class="ghost-scope" x={b().x} y={b().y} width={b().w} height={b().h} />}</Show>
    </g>
  );
}
