import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { paint } from "../render/paint";

// Watercolor thumbnails for the wall. Painting a garden takes a few milliseconds, so they are
// painted a few per frame, nearest the viewer's attention first, and kept once made.
export const THUMB_TIME: ViewTime = { month: 6, year: 3 };
// Tiles are portrait, because most lots are deeper than they are wide.
export const ASPECT = 0.68;
const SIZES = [192, 640] as const;
export type Level = 0 | 1;

const cache = new Map<string, HTMLCanvasElement>();
const queued = new Map<string, { property: Property; level: Level; priority: number }>();
let frame = 0;
let onPainted: (() => void) | null = null;
let heldUntil = 0;

const key = (id: string, level: Level) => `${id}@${level}`;

// Sizes are the picture's height in device pixels.
export function levelFor(tileHeightPx: number): Level {
  return tileHeightPx * (window.devicePixelRatio || 1) > SIZES[0] * 1.3 ? 1 : 0;
}

// The sharpest picture painted so far, at or below the wanted level.
export function thumb(id: string, level: Level) {
  for (let l = level; l >= 0; l--) {
    const c = cache.get(key(id, l as Level));
    if (c) return c;
  }
  return undefined;
}

export function want(property: Property, level: Level, priority: number) {
  const k = key(property.id, level);
  if (cache.has(k)) return;
  const q = queued.get(k);
  if (!q || q.priority > priority) queued.set(k, { property, level, priority });
}

// Forget requests for tiles that scrolled away, so the queue follows the viewer.
export function clearWanted() {
  queued.clear();
}

// While the viewer pans or zooms, give every frame to drawing the wall.
export function hold(ms: number) {
  heldUntil = performance.now() + ms;
}

export function startPainting(redraw: () => void) {
  onPainted = redraw;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    if (!queued.size || performance.now() < heldUntil) return;
    const start = performance.now();
    let painted = 0;
    const jobs = [...queued.entries()].sort((a, b) => a[1].priority - b[1].priority);
    for (const [k, job] of jobs) {
      if (painted && performance.now() - start > 12) break;
      queued.delete(k);
      cache.set(k, render(job.property, SIZES[job.level]));
      painted++;
    }
    if (painted) onPainted?.();
  };
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    onPainted = null;
  };
}

function render(property: Property, size: number) {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  // paint() scales by the device pixel ratio itself, so the view is in CSS pixels.
  const h = size / dpr, w = h * ASPECT;
  canvas.width = Math.round(size * ASPECT);
  canvas.height = size;
  const lot = bounds(property.lot.outline);
  const pad = h * 0.03;
  const scale = Math.min((w - pad * 2) / lot.w, (h - pad * 2) / lot.h);
  paint(canvas, property, THUMB_TIME, { scale, offX: (w - lot.w * scale) / 2 - lot.minX * scale, offY: (h - lot.h * scale) / 2 - lot.minY * scale });
  return canvas;
}
