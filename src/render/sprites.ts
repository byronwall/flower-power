import type { Plant } from "../model/plant";
import type { Point } from "../model/property";
import type { Brush } from "./brush";
import type { Look } from "./look";
import { drawPlant } from "./plants";

// Plants drawn once to small canvases and stamped onto the plan, so a bed of fifty coneflowers
// costs a few image copies instead of hundreds of washes. Each sprite has two canvases: one with
// the multiply washes (stamped with multiply, so the ground still shows through as before) and one
// with the dots, ink, and blooms (stamped normally, so flowers keep their color).
type Sprite = { m: HTMLCanvasElement; s: HTMLCanvasElement; half: number };

const VARIANTS = 6;
const sprites = new Map<string, Sprite>();

// Sizes snap to 6% steps, so a growing plant or a small zoom reuses the same sprite.
const snap = (v: number) => Math.exp(Math.round(Math.log(v) / 0.06) * 0.06);

export function stampPlant(b: Brush, plant: Plant, at: Point, look: Look, seed: number) {
  const { ctx } = b;
  const r = look.spreadFt / 2;
  const pxPerFt = ctx.getTransform().a;
  const rq = snap(Math.max(r, 0.05));
  const pq = snap(pxPerFt);
  const v = seed % VARIANTS;
  const key = `${plant.id}|${look.foliage}|${look.bloom}|${look.fruit}|${rq.toFixed(4)}|${pq.toFixed(3)}|${v}`;
  let sp = sprites.get(key);
  if (!sp) {
    sp = build(plant, { ...look, spreadFt: rq * 2 }, rq, pq, pxPerFt * b.px(1), v);
    if (sprites.size > 2000) sprites.clear();
    sprites.set(key, sp);
  }
  const k = r / rq;
  const size = sp.half * 2 * k;
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(((seed >>> 3) % 360) * (Math.PI / 180));
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(sp.m, -sp.half * k, -sp.half * k, size, size);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(sp.s, -sp.half * k, -sp.half * k, size, size);
  ctx.restore();
}

// `pxPerScreenPx` is device pixels per CSS pixel, which the brush's line widths are set in.
function build(plant: Plant, look: Look, r: number, pxPerFt: number, pxPerScreenPx: number, variant: number): Sprite {
  const half = r * 1.35 + 6 / pxPerFt;
  const n = Math.max(2, Math.ceil(half * 2 * pxPerFt));
  const make = () => {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d")!;
    g.setTransform(pxPerFt, 0, 0, pxPerFt, n / 2, n / 2);
    return [c, g] as const;
  };
  const [m, mg] = make();
  const [s, sg] = make();
  // Paths and state go to both canvases; each fill or stroke goes to one, by blend mode.
  const split = new Proxy(mg, {
    get(target, p) {
      if (p === "fill" || p === "stroke") {
        return (...a: unknown[]) => {
          const g = mg.globalCompositeOperation === "multiply" ? mg : sg;
          (g[p] as (...x: unknown[]) => void)(...a);
        };
      }
      const val = Reflect.get(target, p);
      if (typeof val !== "function") return val;
      if (p === "getTransform" || p === "createRadialGradient" || p === "createLinearGradient") return val.bind(mg);
      return (...a: unknown[]) => {
        val.apply(mg, a);
        (Reflect.get(sg, p) as (...x: unknown[]) => unknown).apply(sg, a);
      };
    },
    set(_, p, val) {
      Reflect.set(mg, p, val);
      Reflect.set(sg, p, val);
      return true;
    },
  });
  const brush: Brush = { ctx: split, px: (x) => (x * pxPerScreenPx) / pxPerFt };
  drawPlant(brush, plant, [0, 0], look, variant * 7919 + 13);
  return { m, s, half: n / 2 / pxPerFt };
}
