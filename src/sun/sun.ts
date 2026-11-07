import { plantsById } from "../model/library";
import { fenceShade, type Point, type Property } from "../model/property";
import { bounds, centroid } from "../render/geometry";
import { expand } from "../render/look";
import { seasonPath, type SunSeason } from "./solar";

export type SunClass = "full" | "part" | "shade";
export type SunOpts = { season?: SunSeason; cellFt?: number };

// Average direct-sun hours per day for each cell, row by row. NaN marks cells under the house or shed.
export type SunGrid = { minX: number; minY: number; cell: number; cols: number; rows: number; hours: Float32Array };

// Light that passes through a canopy. Deciduous trees leaf out in May and drop leaves in November.
function canopyLight(evergreen: boolean, month: number) {
  if (evergreen) return 0.15;
  const leaf = month >= 5 && month <= 10 ? 1 : month === 4 ? 0.5 : 0;
  return 1 - leaf * 0.7;
}

const MIN_ALT = 10;

// Share of light that gets through a structure's roof or walls.
const structureLight: Record<string, number> = { pergola: 0.5 };

type Caster =
  | { kind: "prism"; outline: Point[]; h: number; light: number; own?: Uint8Array }
  | { kind: "wall"; a: Point; b: Point; h: number; light: number }
  | { kind: "disk"; at: Point; r: number; h: number; evergreen: boolean };

export function classOf(hours: number): SunClass | "unknown" {
  if (Number.isNaN(hours)) return "unknown";
  return hours >= 6 ? "full" : hours >= 3 ? "part" : "shade";
}

// Calls fn for each cell whose center lies inside the polygon. Scanline fill, clipped to the grid.
function fillPoly(g: SunGrid, poly: Point[], fn: (i: number) => void) {
  const xs: number[] = [];
  const b = bounds(poly);
  const r0 = Math.max(0, Math.ceil((b.minY - g.minY) / g.cell - 0.5));
  const r1 = Math.min(g.rows - 1, Math.floor((b.maxY - g.minY) / g.cell - 0.5));
  for (let r = r0; r <= r1; r++) {
    const y = g.minY + (r + 0.5) * g.cell;
    xs.length = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - g.minX) / g.cell - 0.5));
      const c1 = Math.min(g.cols - 1, Math.floor((xs[k + 1] - g.minX) / g.cell - 0.5));
      for (let c = c0; c <= c1; c++) fn(r * g.cols + c);
    }
  }
}

// Cells within r of the segment a-b: the shadow of an upright cylinder.
function fillCapsule(g: SunGrid, a: Point, b: Point, rad: number, fn: (i: number) => void) {
  const [ax, ay] = a;
  const dx = b[0] - ax, dy = b[1] - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const c0 = Math.max(0, Math.floor((Math.min(ax, b[0]) - rad - g.minX) / g.cell));
  const c1 = Math.min(g.cols - 1, Math.ceil((Math.max(ax, b[0]) + rad - g.minX) / g.cell));
  const r0 = Math.max(0, Math.floor((Math.min(ay, b[1]) - rad - g.minY) / g.cell));
  const r1 = Math.min(g.rows - 1, Math.ceil((Math.max(ay, b[1]) + rad - g.minY) / g.cell));
  for (let r = r0; r <= r1; r++) {
    const y = g.minY + (r + 0.5) * g.cell;
    for (let c = c0; c <= c1; c++) {
      const x = g.minX + (c + 0.5) * g.cell;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      const ex = x - ax - t * dx, ey = y - ay - t * dy;
      if (ex * ex + ey * ey <= rad * rad) fn(r * g.cols + c);
    }
  }
}

function casters(p: Property, g: SunGrid): Caster[] {
  const out: Caster[] = [{ kind: "prism", outline: p.house.outline, h: p.house.heightFt, light: 0 }];
  for (const s of p.structures) {
    const c: Caster = { kind: "prism", outline: s.outline, h: s.heightFt, light: structureLight[s.kind] ?? 0 };
    // People stand on decks and plant in raised beds, so those cast shade only around themselves.
    if (s.kind === "deck" || s.kind === "raised-bed") {
      c.own = new Uint8Array(g.cols * g.rows);
      fillPoly(g, s.outline, (i) => (c.own![i] = 1));
    }
    out.push(c);
  }
  for (const f of p.fences)
    for (let i = 1; i < f.path.length; i++)
      out.push({ kind: "wall", a: f.path[i - 1], b: f.path[i], h: f.heightFt, light: 1 - fenceShade[f.kind] });
  for (const pl of p.plantings) {
    const plant = plantsById.get(pl.plantId);
    if (!plant || (plant.category !== "tree" && plant.category !== "shrub")) continue;
    for (const inst of expand(pl, plant))
      out.push({ kind: "disk", at: inst.at, r: plant.size.spreadFt / 2, h: plant.size.heightFt, evergreen: plant.evergreen });
  }
  return out;
}

function compute(p: Property, season: SunSeason, cellFt: number): SunGrid {
  const b = bounds(p.lot.outline);
  const cols = Math.max(1, Math.ceil(b.w / cellFt));
  const rows = Math.max(1, Math.ceil(b.h / cellFt));
  const g: SunGrid = { minX: b.minX, minY: b.minY, cell: cellFt, cols, rows, hours: new Float32Array(cols * rows) };
  const list = casters(p, g);
  const n = cols * rows;
  const light = new Float32Array(n);
  const stamp = new Int32Array(n);
  let id = 0;
  const { days, path } = seasonPath(season);

  for (const sun of path) {
    // Sun this low is weak, and neighbors' houses and trees off the lot usually block it.
    if (sun.altDeg < MIN_ALT) continue;
    light.fill(1);
    // Ground distance a 1 ft tall object's shadow reaches, pointing away from the sun on the plan.
    const per = 1 / Math.tan(sun.altDeg * (Math.PI / 180));
    const th = (sun.azDeg - p.headingDeg) * (Math.PI / 180);
    const ux = -Math.sin(th) * per, uy = Math.cos(th) * per;

    for (const c of list) {
      id++;
      const dx = ux * c.h, dy = uy * c.h;
      const t = c.kind === "disk" ? canopyLight(c.evergreen, sun.month) : c.light;
      const own = c.kind === "prism" ? c.own : undefined;
      // Each caster dims a cell once, even where its pieces overlap.
      const dim = (i: number) => {
        if (stamp[i] === id || own?.[i]) return;
        stamp[i] = id;
        light[i] *= t;
      };
      if (c.kind === "disk") {
        fillCapsule(g, c.at, [c.at[0] + dx, c.at[1] + dy], c.r, dim);
      } else if (c.kind === "wall") {
        fillPoly(g, [c.a, c.b, [c.b[0] + dx, c.b[1] + dy], [c.a[0] + dx, c.a[1] + dy]], dim);
      } else {
        // A prism's shadow is its footprint, the footprint moved by the shadow vector, and each wall swept between them.
        const o = c.outline;
        const moved = o.map(([x, y]): Point => [x + dx, y + dy]);
        fillPoly(g, o, dim);
        fillPoly(g, moved, dim);
        for (let i = 0, j = o.length - 1; i < o.length; j = i++) fillPoly(g, [o[j], o[i], moved[i], moved[j]], dim);
      }
    }
    for (let i = 0; i < n; i++) g.hours[i] += light[i] * sun.hours;
  }

  for (let i = 0; i < n; i++) g.hours[i] /= days;
  const solid = (i: number) => (g.hours[i] = NaN);
  fillPoly(g, p.house.outline, solid);
  for (const s of p.structures) if (s.kind === "shed") fillPoly(g, s.outline, solid);
  return g;
}

// Edits make a new property object, so a cache per object stays correct.
const cache = new WeakMap<Property, Map<string, SunGrid>>();

export function sunHours(p: Property, opts: SunOpts = {}): SunGrid {
  const season = opts.season ?? "growing";
  const cellFt = opts.cellFt ?? 2;
  const key = `${season}:${cellFt}`;
  let m = cache.get(p);
  if (!m) cache.set(p, (m = new Map()));
  let g = m.get(key);
  if (!g) m.set(key, (g = compute(p, season, cellFt)));
  return g;
}

export function hoursAt(g: SunGrid, [x, y]: Point) {
  const c = Math.floor((x - g.minX) / g.cell);
  const r = Math.floor((y - g.minY) / g.cell);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return NaN;
  return g.hours[r * g.cols + c];
}

// Full is 6 or more hours of direct sun, part is 3 to 6, shade is under 3. Matches a plant's `sun` list.
export function sunClassAt(p: Property, at: Point, opts?: SunOpts): SunClass | "unknown" {
  return classOf(hoursAt(sunHours(p, opts), at));
}

// The class that covers the most of an area, such as a bed outline.
export function sunClassOfArea(p: Property, outline: Point[], opts?: SunOpts): SunClass | "unknown" {
  const g = sunHours(p, opts);
  const count = { full: 0, part: 0, shade: 0, unknown: 0 };
  fillPoly(g, outline, (i) => count[classOf(g.hours[i])]++);
  if (count.full + count.part + count.shade === 0) return classOf(hoursAt(g, centroid(outline)));
  return (["full", "part", "shade"] as const).reduce((best, k) => (count[k] > count[best] ? k : best));
}
