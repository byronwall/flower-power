import { createEffect, createSignal } from "solid-js";
import type { Plant } from "../model/plant";
import { lookOf, type ViewTime } from "../render/look";
import { drawPlant } from "../render/plants";

// The plant as the plan painter draws it, at mature size and the month shown.
// A plant with nothing showing that month (dormant) is drawn as it looks in July.
export function PlantPicture(props: { plant: Plant; time: ViewTime; size: number; class?: string }) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  createEffect(() => {
    const c = canvas();
    if (c) draw(c, props.plant, props.time.month, props.size);
  });
  return <canvas class={props.class ?? "thumb"} ref={setCanvas} style={{ width: `${props.size}px`, height: `${props.size}px` }} />;
}

function draw(canvas: HTMLCanvasElement, plant: Plant, month: number, size: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#f4f0e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const look = lookOf(plant, { month, year: 5 }, true) ?? lookOf(plant, { month: 7, year: 5 }, true)!;
  const scale = (size * 0.8) / look.spreadFt;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (dpr * size) / 2, (dpr * size) / 2);
  drawPlant({ ctx, px: (n) => n / scale }, plant, [0, 0], look, 17);
}
