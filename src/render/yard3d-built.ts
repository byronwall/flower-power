import * as THREE from "three";
import type { Point } from "../model/property";
import { Kit, T } from "./yard3d-kit";

// Buildings and hardscape for the 3D yard: walls with windows and a door, hip roofs worked
// out from any outline, and small garden features. Plan (x, y) is scene (x, z), less `center`.

export type Frame = { center: Point };

export function shapeOf(outline: Point[], f: Frame) {
  const s = new THREE.Shape();
  outline.forEach(([x, y], i) => (i ? s.lineTo(x - f.center[0], -(y - f.center[1])) : s.moveTo(x - f.center[0], -(y - f.center[1]))));
  return s;
}

// A flat (depth 0) or raised slab from an outline, standing on `lift`.
export function slabGeo(outline: Point[], f: Frame, depth: number, lift = 0) {
  const g = depth > 0 ? new THREE.ExtrudeGeometry(shapeOf(outline, f), { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(shapeOf(outline, f));
  g.rotateX(-Math.PI / 2);
  g.translate(0, lift, 0);
  return g;
}

function area(pts: Point[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// The inward miter offset of a polygon, the way a bevel moves its corners.
function offset(pts: Point[], d: number): Point[] {
  const sg = area(pts) > 0 ? 1 : -1;
  const n = pts.length;
  const normal = (a: Point, b: Point) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [(-dy / l) * sg, (dx / l) * sg];
  };
  return pts.map((p, i) => {
    const n1 = normal(pts[(i - 1 + n) % n], p), n2 = normal(p, pts[(i + 1) % n]);
    let bx = n1[0] + n2[0], by = n1[1] + n2[1];
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    const k = d / Math.max(0.2, bx * n1[0] + by * n1[1]);
    return [p[0] + bx * k, p[1] + by * k] as Point;
  });
}

// How far the outline can shrink before an edge flips: where a hip roof's slopes meet.
function ridgeInset(pts: Point[]) {
  const ok = (d: number) => {
    const o = offset(pts, d);
    return o.every((q, i) => {
      const a = pts[i], b = pts[(i + 1) % pts.length], qb = o[(i + 1) % o.length];
      return (qb[0] - q[0]) * (b[0] - a[0]) + (qb[1] - q[1]) * (b[1] - a[1]) > 1e-3;
    });
  };
  let lo = 0, hi = 200;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Remove repeated and straight-through corners, which make the roof bevel fold.
function clean(pts: Point[]) {
  const out: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.01 && Math.abs(cross) > 1e-6) out.push(b);
  }
  return out.length >= 3 ? out : pts;
}

// A hip roof over an outline: eaves at `base` with an overhang, slopes rising at `pitch`
// (rise per run) to a ridge. Returns the rise so the caller can size the walls.
export function hipRoof(kit: Kit, outline: Point[], f: Frame, base: number, maxRise: number, color: THREE.ColorRepresentation, overhang = 1.5, pitch = 0.5) {
  const pts = clean(outline);
  const inset = ridgeInset(pts) * 0.96;
  const rise = Math.min(maxRise, (inset + overhang) * pitch);
  const g = new THREE.ExtrudeGeometry(shapeOf(pts, f), {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: rise,
    bevelSize: inset + overhang,
    bevelOffset: -inset,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  // The lower bevel tucks up under the eaves into the walls, like a soffit.
  g.translate(0, base, 0);
  kit.addGeo(g, color, 0);
  g.dispose();
  return rise + 0.4;
}

// Walls on a foundation with a hip roof, windows on every long wall and a door on the wall
// nearest `door`. Height is to the ridge.
export function house(walls: Kit, glass: Kit, outline: Point[], f: Frame, heightFt: number, roofColor: string, door: Point | null) {
  const pts = clean(outline);
  const inset = ridgeInset(pts) * 0.96;
  const rise = Math.min(heightFt * 0.45, (inset + 1.5) * 0.5) + 0.4;
  const wallH = Math.max(8, heightFt - rise);
  walls.addGeo(slabGeo(pts, f, 1.4, 0), "#b9ad9c");
  walls.addGeo(slabGeo(pts, f, wallH - 1.4, 1.4), "#ece4d6", 0.12);
  hipRoof(walls, pts, f, wallH, heightFt - wallH, roofColor);

  // Windows: one row on a one-story house, two rows when the walls are tall.
  const sg = area(pts) > 0 ? 1 : -1;
  const rows = wallH > 15 ? [wallH * 0.28, wallH * 0.7] : [wallH * 0.45];
  let doorAt = -1, best = Infinity;
  if (door)
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const d = Math.hypot((a[0] + b[0]) / 2 - door[0], (a[1] + b[1]) / 2 - door[1]);
      if (d < best && Math.hypot(b[0] - a[0], b[1] - a[1]) > 8) [best, doorAt] = [d, i];
    });
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 7) return;
    const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
    const out: Point = [dy * sg, -dx * sg]; // outward normal in plan
    const ang = -Math.atan2(dy, dx);
    const n = Math.max(1, Math.floor((len - 4) / 11));
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      const px = a[0] + dx * len * t - f.center[0] + out[0] * 0.12, pz = a[1] + dy * len * t - f.center[1] + out[1] * 0.12;
      const isDoor = i === doorAt && j === Math.floor(n / 2);
      if (isDoor) {
        walls.add(T.box, "#f3efe6", [px, 3.75, pz], [4.2, 7.5, 0.5], [0, ang, 0]);
        walls.add(T.box, "#4d6a5a", [px + out[0] * 0.08, 3.5, pz + out[1] * 0.08], [3.2, 7, 0.5], [0, ang, 0], 0.15);
        walls.add(T.box, "#b9ad9c", [px + out[0] * 1.2, 0.35, pz + out[1] * 1.2], [5, 0.7, 2.4], [0, ang, 0]);
        if (rows.length === 1) continue;
      }
      for (const [k, y] of rows.entries()) {
        if (isDoor && k === 0) continue;
        walls.add(T.box, "#f3efe6", [px, y, pz], [3.8, 5, 0.45], [0, ang, 0]);
        glass.add(T.box, "#33424d", [px + out[0] * 0.06, y + 0.1, pz + out[1] * 0.06], [3.1, 4.3, 0.45], [0, ang, 0], 0.4);
        walls.add(T.box, "#f3efe6", [px + out[0] * 0.25, y - 2.5, pz + out[1] * 0.25], [4.2, 0.3, 0.5], [0, ang, 0]);
      }
    }
  });
}

export function feature(kit: Kit, kind: string, at: [number, number, number]) {
  const [x, y, z] = at;
  const add = (t: typeof T.box, color: string, p: [number, number, number], s: [number, number, number], dark?: number) => kit.add(t, color, [x + p[0], y + p[1], z + p[2]], s, [0, 0, 0], dark);
  if (kind === "birdbath") {
    add(T.post, "#bdb6a8", [0, 0, 0], [0.9, 0.4, 0.9]);
    add(T.post, "#c9c2b3", [0, 0.4, 0], [0.32, 2, 0.32]);
    add(T.post, "#d3ccbe", [0, 2.4, 0], [1.4, 0.35, 1.4]);
    add(T.post, "#86aec4", [0, 2.62, 0], [1.15, 0.15, 1.15], 0);
  } else if (kind === "fire-pit") {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      kit.add(T.box, i % 2 ? "#8a8278" : "#7a7268", [x + Math.cos(a) * 2, 0.45, z + Math.sin(a) * 2], [1.1, 0.9, 0.7], [0, -a + Math.PI / 2, 0]);
    }
    add(T.post, "#3a332e", [0, 0, 0], [1.75, 0.6, 1.75]);
    add(T.cone, "#c76b2f", [0, 0.6, 0], [0.6, 0.8, 0.6], 0);
  } else if (kind === "bench") {
    add(T.box, "#9b744f", [0, 1.55, 0], [5, 0.25, 1.6]);
    add(T.box, "#8a6644", [0, 2.6, -0.75], [5, 1.1, 0.2]);
    add(T.box, "#5b544c", [-2.1, 0.75, 0], [0.25, 1.5, 1.5]);
    add(T.box, "#5b544c", [2.1, 0.75, 0], [0.25, 1.5, 1.5]);
  } else if (kind === "feeder") {
    add(T.post, "#4f4841", [0, 0, 0], [0.12, 5.2, 0.12]);
    add(T.box, "#b08a5c", [0, 4.6, 0], [0.9, 0.8, 0.9]);
    add(T.cone, "#7b5a3c", [0, 5, 0], [0.9, 0.6, 0.9]);
  } else {
    add(T.post, "#86aec4", [0, 0, 0], [2.4, 0.18, 2.4], 0);
    add(T.lumps[0], "#a9a297", [0, 0.6, 0], [0.8, 0.9, 0.8]);
    add(T.lumps[1], "#9c958a", [0.9, 0.3, 0.4], [0.5, 0.5, 0.5]);
  }
}
