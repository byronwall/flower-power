import { createEffect, createSignal } from "solid-js";
import type { Plant } from "../model/plant";
import type { ViewTime } from "../render/look";
import { drawPortrait, showcaseMonth } from "../render/portrait";

// A side-view illustration of the plant at full size. `best` draws it in the month it looks
// its best (for browsing); otherwise it follows the month shown on the plan.
export function PlantPicture(props: { plant: Plant; time: ViewTime; size: number; best?: boolean; class?: string }) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  createEffect(() => {
    const c = canvas();
    if (!c) return;
    const month = props.best ? showcaseMonth(props.plant) : props.time.month;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.height = Math.round(props.size * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPortrait(ctx, props.size, props.plant, month);
  });
  return (
    <canvas
      class={props.class ?? "thumb"}
      ref={setCanvas}
      style={{ width: `${props.size}px`, height: `${props.size}px` }}
      role="img"
      aria-label={`Illustration of ${props.plant.commonName}`}
    />
  );
}
