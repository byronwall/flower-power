import type { Point } from "../model/property";
import { declination, LAT } from "../sun/solar";
import { bounds, inside } from "./geometry";

// The light on the plan: the real sun for the month at 2 pm solar time, turned to the plan's heading.
// `dir` is the unit vector a shadow points along, in plan feet. `reach` is shadow length per foot of height.
export type Light = { dir: Point; reach: number; altDeg: number };

const rad = Math.PI / 180;

export function lightOf(month: number, headingDeg: number): Light {
  const day = Math.round((month - 0.5) * 30.44);
  const phi = LAT * rad;
  const dec = declination(day) * rad;
  const h = 30 * rad;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / rad + 180;
  // A shadow points away from the sun. Compass bearings turn by the heading of the plan's top edge.
  const rel = (az + 180 - headingDeg) * rad;
  return { dir: [Math.sin(rel), -Math.cos(rel)], reach: Math.min(3.2, 1 / Math.tan(alt)), altDeg: alt / rad };
}

function area(pts: Point[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

// The ground a prism of this outline and height shades: the outline swept along the shadow.
// Every piece goes into one path wound the same way, so a nonzero fill is their union.
export function sweepPath(ctx: CanvasRenderingContext2D, outline: Point[], [dx, dy]: Point) {
  const add = (pts: Point[]) => {
    const p = area(pts) < 0 ? [...pts].reverse() : pts;
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  };
  add(outline);
  add(outline.map(([x, y]) => [x + dx, y + dy]));
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    add([a, b, [b[0] + dx, b[1] + dy], [a[0] + dx, a[1] + dy]]);
  }
}

// A hip roof seen from above. Each roof plane belongs to the wall edge nearest to it (its eave),
// so ridges and valleys appear where two planes meet. Planes facing the sun are light, the rest dark,
// and shingle courses run parallel to each eave. Drawn to a small canvas and cached per zoom step.
const roofCache = new Map<string, HTMLCanvasElement>();
// Which plane each pixel belongs to depends only on the outline and resolution, not on the sun.
const faceCache = new Map<string, { face: Int16Array; dist: Float32Array }>();

export function roofImage(outline: Point[], light: Light, pxPerFt: number, base: string, ink: string) {
  const res = Math.min(12, Math.max(3, 2 ** (Math.round(Math.log2(pxPerFt) * 2) / 2)));
  const shape = `${outline.join(";")}|${res}`;
  // The sun's direction moves little from month to month, so 10 degree steps share one image.
  const step = Math.PI / 18;
  const ang = Math.round(Math.atan2(light.dir[1], light.dir[0]) / step) * step;
  const dir: Point = [Math.cos(ang), Math.sin(ang)];
  const key = `${shape}|${ang.toFixed(3)}|${base}`;
  const hit = roofCache.get(key);
  if (hit) return hit;
  const box = bounds(outline);
  const w = Math.ceil(box.w * res) + 2, h = Math.ceil(box.h * res) + 2;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  const ccw = area(outline) > 0;
  const edges = outline.map((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    // Outward normal, so the plane's downhill side faces this way.
    const nx = ccw ? uy : -uy, ny = ccw ? -ux : ux;
    const lit = -(nx * dir[0] + ny * dir[1]);
    return { a, b, ux, uy, len, nx, ny, lit };
  });
  // The inward bisector at each corner. A roof plane spans from its eave back to the bisectors at
  // the eave's two ends, which is how a hip roof meets at hips, ridges, and valleys.
  const bis = outline.map((p, i) => {
    const e0 = edges[(i - 1 + edges.length) % edges.length], e1 = edges[i];
    let dx = -(e0.nx + e1.nx), dy = -(e0.ny + e1.ny);
    const l = Math.hypot(dx, dy);
    if (l < 1e-6) [dx, dy] = [-e1.nx, -e1.ny];
    else [dx, dy] = [dx / l, dy / l];
    return { p, dx, dy };
  });
  const side = (o: Point, dx: number, dy: number, x: number, y: number) => dx * (y - o[1]) - dy * (x - o[0]);
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [br, bg, bb] = parse(base);
  const [ir, ig, ib] = parse(ink);
  let faces = faceCache.get(shape);
  if (!faces) {
    faces = { face: new Int16Array(w * h).fill(-1), dist: new Float32Array(w * h) };
    fillFaces(faces.face, faces.dist);
    if (faceCache.size > 16) faceCache.clear();
    faceCache.set(shape, faces);
  }
  const { face, dist } = faces;
  function fillFaces(face: Int16Array, dist: Float32Array) {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const x = box.minX + (px - 1 + 0.5) / res, y = box.minY + (py - 1 + 0.5) / res;
        if (!inside([x, y], outline)) continue;
        // The nearest eave whose plane reaches this point. Fall back to the nearest edge if none does.
        let best = -1, bestLine = Infinity, near = -1, nearSeg = Infinity, nearLine = 0;
        for (let e = 0; e < edges.length; e++) {
          const E = edges[e];
          const rx = x - E.a[0], ry = y - E.a[1];
          const line = Math.abs(rx * E.uy - ry * E.ux);
          const t = Math.max(0, Math.min(E.len, rx * E.ux + ry * E.uy));
          const seg = Math.hypot(rx - E.ux * t, ry - E.uy * t);
          if (seg < nearSeg) [near, nearSeg, nearLine] = [e, seg, line];
          const A = bis[e], B = bis[(e + 1) % edges.length];
          const inA = side(A.p, A.dx, A.dy, x, y) * side(A.p, A.dx, A.dy, E.b[0], E.b[1]) >= 0;
          const inB = side(B.p, B.dx, B.dy, x, y) * side(B.p, B.dx, B.dy, E.a[0], E.a[1]) >= 0;
          if (inA && inB && line < bestLine) [best, bestLine] = [e, line];
        }
        if (best < 0) [best, bestLine] = [near, nearLine];
        face[py * w + px] = best;
        dist[py * w + px] = bestLine;
      }
    }
  }
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = py * w + px;
      const f = face[i];
      if (f < 0) continue;
      const E = edges[f];
      let k = 1 + E.lit * 0.16;
      // Shingle courses: a faint line every 1.1 ft up the slope.
      const course = (dist[i] / 1.1) % 1;
      if (course < 0.9 / res && res >= 5) k -= 0.07;
      let r = br * k, gg = bg * k, b = bb * k, a = 255;
      const right = px + 1 < w ? face[i + 1] : f, down = py + 1 < h ? face[i + w] : f;
      if ((right >= 0 && right !== f) || (down >= 0 && down !== f)) {
        // Ridge or valley: an ink line where two planes meet.
        r = ir; gg = ig; b = ib; a = 150;
      }
      const d = img.data;
      d[i * 4] = r;
      d[i * 4 + 1] = gg;
      d[i * 4 + 2] = b;
      d[i * 4 + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  if (roofCache.size > 24) roofCache.clear();
  roofCache.set(key, c);
  return c;
}

