import { createEffect, onMount } from "solid-js";
import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { paint } from "../render/paint";

// A small still painting of a plan, for design cards. Cheaper than a PlanView: no camera, no overlay.
export function Thumb(props: { property: Property; time: ViewTime; width: number; height: number }) {
  let canvas!: HTMLCanvasElement;
  const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(props.width * dpr);
    canvas.height = Math.round(props.height * dpr);
    const b = bounds(props.property.lot.outline);
    const scale = Math.min((props.width - 8) / b.w, (props.height - 8) / b.h);
    paint(canvas, props.property, props.time, { scale, offX: (props.width - b.w * scale) / 2 - b.minX * scale, offY: (props.height - b.h * scale) / 2 - b.minY * scale });
  };
  onMount(() => createEffect(draw));
  return <canvas ref={canvas} class="design-thumb" style={{ width: `${props.width}px`, height: `${props.height}px` }} />;
}
