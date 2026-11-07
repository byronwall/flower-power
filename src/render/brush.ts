import type { Point } from "../model/property";
import { rng } from "./geometry";

// Low-level watercolor and ink marks. All sizes are in feet; `px` converts screen pixels to feet.
export type Brush = {
  ctx: CanvasRenderingContext2D;
  px: (n: number) => number;
};

export const INK = "#33342c";

// Color strings are built thousands of times a paint, so both helpers remember their answers.
const rgbaMemo = new Map<string, string>();
export function rgba(hex: string, a: number) {
  const key = hex + a;
  let out = rgbaMemo.get(key);
  if (out) return out;
  const n = parseInt(hex.slice(1), 16);
  out = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  if (rgbaMemo.size > 4000) rgbaMemo.clear();
  rgbaMemo.set(key, out);
  return out;
}

// amount < 0 darkens toward ink, amount > 0 lightens toward paper.
const shadeMemo = new Map<string, string>();
export function shade(hex: string, amount: number) {
  const key = hex + amount;
  const hit = shadeMemo.get(key);
  if (hit) return hit;
  const out = mix(hex, amount);
  if (shadeMemo.size > 4000) shadeMemo.clear();
  shadeMemo.set(key, out);
  return out;
}

function mix(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? [40, 44, 36] : [250, 247, 236];
  const k = Math.abs(amount);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (target[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Splits edges into short pieces and nudges each point, so shapes look hand-made.
export function roughen(pts: Point[], step: number, amount: number, r: () => number, closed = true): Point[] {
  const out: Point[] = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const parts = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < parts; k++) {
      const t = k / parts;
      out.push([x0 + (x1 - x0) * t + (r() - 0.5) * amount, y0 + (y1 - y0) * t + (r() - 0.5) * amount]);
    }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}

export function trace(ctx: CanvasRenderingContext2D, pts: Point[], closed = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}

export function circlePts([cx, cy]: Point, r: number, n: number, jitter: number, rand: () => number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - jitter / 2 + rand() * jitter);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

// Layered transparent fills with a darker rim, like pigment pooling at the edge of a wash.
export function wash(b: Brush, pts: Point[], color: string, seed: number, opts: { alpha?: number; layers?: number; wobble?: number; rim?: number } = {}) {
  const { ctx } = b;
  const r = rng(seed);
  const alpha = opts.alpha ?? 0.22;
  const layers = opts.layers ?? 3;
  const wobble = opts.wobble ?? b.px(4);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  let last = pts;
  for (let i = 0; i < layers; i++) {
    last = roughen(pts, Math.max(wobble * 1.5, b.px(6)), wobble, r);
    trace(ctx, last);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
  }
  if ((opts.rim ?? 0.25) > 0) {
    trace(ctx, last);
    ctx.strokeStyle = rgba(shade(color, -0.2), opts.rim ?? 0.25);
    ctx.lineWidth = b.px(1.4);
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  ctx.restore();
}

export function blob(b: Brush, at: Point, radius: number, color: string, seed: number, opts: { alpha?: number; layers?: number; jitter?: number; rim?: number } = {}) {
  const r = rng(seed);
  const n = Math.max(10, Math.min(28, Math.round(b.ctx.getTransform().a * radius * 0.6)));
  wash(b, circlePts(at, radius, n, opts.jitter ?? 0.22, r), color, seed + 1, {
    alpha: opts.alpha,
    layers: opts.layers,
    wobble: radius * 0.08,
    rim: opts.rim ?? 0,
  });
}

// A slightly wobbly pen line.
export function ink(b: Brush, pts: Point[], seed: number, opts: { width?: number; alpha?: number; closed?: boolean; color?: string; dash?: number[] } = {}) {
  const { ctx } = b;
  const r = rng(seed);
  const closed = opts.closed ?? false;
  const line = roughen(pts, b.px(14), b.px(0.9), r, closed);
  ctx.save();
  trace(ctx, line, closed);
  ctx.strokeStyle = rgba(opts.color ?? INK, opts.alpha ?? 0.85);
  ctx.lineWidth = opts.width ?? b.px(1.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.stroke();
  ctx.restore();
}

export function dots(b: Brush, at: Point, radius: number, count: number, size: number, color: string, alpha: number, seed: number) {
  const { ctx } = b;
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = rgba(color, alpha);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    ctx.beginPath();
    ctx.arc(at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d, size * (0.6 + r() * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function clipTo(ctx: CanvasRenderingContext2D, pts: Point[], draw: () => void) {
  ctx.save();
  trace(ctx, pts);
  ctx.clip();
  draw();
  ctx.restore();
}

// Paper grain, made once and tiled in screen space.
let grain: HTMLCanvasElement | null = null;
export function paperGrain() {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = grain.height = 256;
  const g = grain.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 236 + Math.floor((r() + r() + r()) / 3 * 22) - 4;
    img.data[i] = v;
    img.data[i + 1] = v - 2;
    img.data[i + 2] = v - 8;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}
