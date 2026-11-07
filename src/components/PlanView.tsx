import { createEffect, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { paint, type View } from "../render/paint";

type Props = {
  property: Property;
  time: ViewTime;
  // Extra SVG drawn in plan feet, above the painting. The editor uses it.
  overlay?: (view: View) => JSX.Element;
};

const PAD = 48;

export function PlanView(props: Props) {
  let box!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  const [size, setSize] = createSignal({ w: 0, h: 0 });

  onMount(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box);
    onCleanup(() => ro.disconnect());
  });

  const view = (): View => {
    const { w, h } = size();
    const lot = bounds(props.property.lot.outline);
    const scale = Math.max(0.1, Math.min((w - PAD * 2) / lot.w, (h - PAD * 2) / lot.h));
    return { scale, offX: (w - lot.w * scale) / 2 - lot.minX * scale, offY: (h - lot.h * scale) / 2 - lot.minY * scale };
  };

  createEffect(() => {
    const { w, h } = size();
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    paint(canvas, props.property, props.time, view());
  });

  return (
    <div class="plan-view" ref={box}>
      <canvas ref={canvas} style={{ width: `${size().w}px`, height: `${size().h}px` }} />
      <svg class="plan-overlay" width={size().w} height={size().h}>
        <g transform={`translate(${view().offX} ${view().offY}) scale(${view().scale})`}>{props.overlay?.(view())}</g>
        <PlanMarks property={props.property} view={view()} height={size().h} />
      </svg>
    </div>
  );
}

// North arrow and scale bar, drawn in screen pixels like the title block of a site plan.
function PlanMarks(props: { property: Property; view: View; height: number }) {
  const bar = () => {
    const target = 160 / props.view.scale;
    const ft = [5, 10, 20, 25, 50, 100].find((v) => v >= target / 2) ?? 100;
    return { ft, px: ft * props.view.scale };
  };
  return (
    <g class="plan-marks" transform={`translate(24 ${props.height - 28})`}>
      <g transform={`translate(${bar().px * 2 + 48} -14) rotate(${-props.property.headingDeg})`}>
        <circle r="13" />
        <path d="M0 -11 L5 6 L0 2 L-5 6 Z" />
        <text y="-17" text-anchor="middle">N</text>
      </g>
      <rect width={bar().px} height="5" class="bar-dark" />
      <rect x={bar().px} width={bar().px} height="5" class="bar-light" />
      <text y="-6">0</text>
      <text x={bar().px} y="-6" text-anchor="middle">{bar().ft}</text>
      <text x={bar().px * 2} y="-6" text-anchor="middle">{bar().ft * 2} ft</text>
    </g>
  );
}
