import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { paint } from "../render/paint";

// A small painted plan for project cards. PlanView pads too much for a card.
export default function Thumb(props: { property: Property; time?: ViewTime }) {
  let box!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  const [size, setSize] = createSignal({ w: 0, h: 0 });

  onMount(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box);
    onCleanup(() => ro.disconnect());
  });

  createEffect(() => {
    const { w, h } = size();
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const lot = bounds(props.property.lot.outline);
    const scale = Math.min((w - 16) / lot.w, (h - 16) / lot.h);
    paint(canvas, props.property, props.time ?? { month: 6, year: 3 }, { scale, offX: (w - lot.w * scale) / 2 - lot.minX * scale, offY: (h - lot.h * scale) / 2 - lot.minY * scale });
  });

  return (
    <div class="plan-thumb" ref={box}>
      <canvas ref={canvas} style={{ width: `${size().w}px`, height: `${size().h}px` }} />
    </div>
  );
}
