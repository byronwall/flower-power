import type { Point } from "../model/property";

export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function bounds(pts: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function inside([x, y]: Point, poly: Point[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function centroid(pts: Point[]): Point {
  const b = bounds(pts);
  return [b.minX + b.w / 2, b.minY + b.h / 2];
}

// Evenly spaced points along a path, including both ends when they fit.
export function along(path: Point[], spacing: number): Point[] {
  const out: Point[] = [];
  let carry = spacing / 2;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    let d = carry;
    while (d <= len) {
      const t = d / len;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      d += spacing;
    }
    carry = d - len;
  }
  return out.length ? out : [path[0]];
}

// Natural fill: a jittered grid inside the outline, with gaps kept near the spacing.
export function scatter(outline: Point[], spacing: number, seed: number): Point[] {
  const r = rng(seed);
  const b = bounds(outline);
  const rowH = spacing * 0.87;
  const out: Point[] = [];
  for (let row = 0, y = b.minY + rowH / 2; y <= b.maxY; row++, y += rowH) {
    const shift = row % 2 ? spacing / 2 : 0;
    for (let x = b.minX + spacing / 2 + shift - spacing / 2; x <= b.maxX; x += spacing) {
      const p: Point = [x + (r() - 0.5) * spacing * 0.45, y + (r() - 0.5) * spacing * 0.45];
      if (inside(p, outline)) out.push(p);
    }
  }
  if (!out.length) out.push(centroid(outline));
  return out;
}
