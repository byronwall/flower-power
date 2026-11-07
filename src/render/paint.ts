import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import type { Plant } from "../model/plant";
import { blob, circlePts, clipTo, dots, ink, INK, paperGrain, rgba, shade, trace, wash, type Brush } from "./brush";
import { bounds, hashString, rng } from "./geometry";
import type { Weather } from "./life";
import { sweepPath, lightOf, roofImage, type Light } from "./light";
import { expand, lookOf, seasonOf, type Look, type ViewTime } from "./look";
import { drawPlant } from "./plants";

export type View = { scale: number; offX: number; offY: number };

const LAWN = { spring: "#9cbc68", summer: "#8fb35e", fall: "#a8b366", winter: "#bdbb8f" } as const;
const PAPER = "#f4f0e6";
const SHADOW = "#4d5866";

export type PaintOpts = { weather?: Weather };

// How strongly the sun shows: full on a clear day, faint under cloud or rain.
const SUN: Record<Weather, number> = { sunny: 1, cloudy: 0.35, rain: 0.25, snow: 0.7 };

export function paint(canvas: HTMLCanvasElement, property: Property, time: ViewTime, view: View, opts: PaintOpts = {}) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offX, dpr * view.offY);
  const b: Brush = { ctx, px: (n) => n / view.scale };
  const season = seasonOf(time.month);
  const weather = opts.weather ?? "sunny";
  const snow = weather === "snow";
  const sun = { ...lightOf(time.month, property.headingDeg), k: SUN[weather] };
  const s = (id: string) => hashString(property.id + id);
  const lot = property.lot.outline;

  // Ground: the whole lot is lawn unless a surface covers it.
  wash(b, lot, LAWN[season], s("lot"), { alpha: 0.22, layers: 3, rim: 0.12 });
  clipTo(ctx, lot, () => {
    lawnTone(b, lot, LAWN[season], s("tone"));
    if (season !== "winter") mowStripes(b, lot, LAWN[season]);
    grassTexture(b, lot, LAWN[season], s("grass"));
  });

  for (const sf of property.surfaces) surface(b, sf.kind, sf.outline, LAWN[season], s(sf.id));
  if (snow) clipTo(ctx, lot, () => snowCover(b, lot, s("snow")));
  if (weather === "rain") clipTo(ctx, lot, () => wet(b, lot));

  for (const st of property.structures) structure(b, st.kind, st.outline, s(st.id));
  for (const e of property.edges) edge(b, e.kind, e.path, s(e.id));
  for (const f of property.fences) fence(b, f.kind, f.path, f.heightFt, s(f.id));

  house(b, property.house.outline, s("house"), sun, snow);

  // Buildings cast real shadows: the sun for this month at 2 pm, so winter shadows run long.
  // They fall on the ground only, never on the roofs that cast them.
  const roofs = [property.house.outline, ...property.structures.filter((st) => st.kind !== "pergola").map((st) => st.outline)];
  except(ctx, lot, roofs, () => {
    castShadow(b, property.house.outline, property.house.heightFt, sun, snow, 1);
    for (const st of property.structures) castShadow(b, st.outline, st.heightFt, sun, snow, st.kind === "pergola" ? 0.45 : 1);
  });

  // Plants: all shadows first, then plants from shortest to tallest so trees overhang beds.
  const items = property.plantings.flatMap((p) => {
    const plant = plantsById.get(p.plantId);
    if (!plant) return [];
    return expand(p, plant).flatMap((inst) => {
      const look = lookOf(plant, time, inst.existing, inst.scale);
      return look ? [{ inst, plant, look }] : [];
    });
  });
  items.sort((a, z) => a.look.heightFt - z.look.heightFt);
  // Leaves and shadows land on the lot; past the property line is only paper.
  clipTo(ctx, lot, () => {
    if (time.month === 10 || time.month === 11) {
      for (const { inst, plant, look } of items) if (sheds(plant)) leafLitter(b, inst.at, look, plant.foliage.fall!, inst.seed, time.month === 11 ? 1.6 : 0.8);
    }
    for (const { inst, plant, look } of items) castPlant(b, plant, inst.at, look, sun, snow, inst.seed);
  });
  for (const { inst, plant, look } of items) {
    drawPlant(b, plant, inst.at, look, inst.seed);
    volume(b, plant, inst.at, look, sun);
  }

  for (const f of property.features) feature(b, f.kind, f.at, s(f.id));

  // Property line: the dash-dot line used on site plans.
  ink(b, lot, s("lot-line"), {
    closed: true,
    alpha: 0.7,
    width: b.px(1.3),
    dash: [b.px(14), b.px(4), b.px(2), b.px(4)],
  });

  // Paper grain over everything, so the washes sit in the paper, and a soft darkening toward the edges.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ctx.createPattern(paperGrain(), "repeat")!;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  const { width: cw, height: ch } = canvas;
  const edgeTone = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.62);
  edgeTone.addColorStop(0, "rgba(255,255,255,0)");
  edgeTone.addColorStop(1, "rgba(214,202,178,0.55)");
  ctx.fillStyle = edgeTone;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

type Sun = Light & { k: number };

// Draws only outside the holes (and inside the lot), with an even-odd clip.
function except(ctx: CanvasRenderingContext2D, lot: Point[], holes: Point[][], draw: () => void) {
  const box = bounds(lot);
  ctx.save();
  trace(ctx, lot);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(box.minX - 200, box.minY - 200, box.w + 400, box.h + 400);
  for (const h of holes) {
    h.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.clip("evenodd");
  draw();
  ctx.restore();
}

// Large soft patches of lighter and darker grass, so the lawn is not one flat color.
function lawnTone(b: Brush, outline: Point[], color: string, seed: number) {
  const box = bounds(outline);
  const r = rng(seed);
  const n = Math.round((box.w * box.h) / 260) + 4;
  for (let i = 0; i < n; i++) {
    const at: Point = [box.minX + r() * box.w, box.minY + r() * box.h];
    blob(b, at, 5 + r() * 9, shade(color, r() < 0.5 ? -0.18 : 0.2), seed + i, { alpha: 0.07, layers: 1, jitter: 0.5 });
  }
}

// Faint mowing stripes, 3 ft wide, across the lot.
function mowStripes(b: Brush, outline: Point[], color: string) {
  const { ctx } = b;
  const box = bounds(outline);
  ctx.save();
  ctx.fillStyle = rgba(shade(color, 0.35), 0.07);
  for (let y = box.minY, i = 0; y < box.maxY; y += 3, i++) if (i % 2) ctx.fillRect(box.minX, y, box.w, 3);
  ctx.restore();
}

// A blanket of snow with the odd patch of grass and paving showing through.
function snowCover(b: Brush, outline: Point[], seed: number) {
  const { ctx } = b;
  const box = bounds(outline);
  ctx.save();
  ctx.fillStyle = "rgba(251,250,246,0.8)";
  ctx.fillRect(box.minX, box.minY, box.w, box.h);
  ctx.restore();
  const r = rng(seed);
  for (let i = 0; i < Math.round((box.w * box.h) / 180); i++) {
    blob(b, [box.minX + r() * box.w, box.minY + r() * box.h], 1 + r() * 3, "#b9c4cf", seed + i, { alpha: 0.12, layers: 1, jitter: 0.6 });
  }
}

// Rain darkens everything on the ground a little.
function wet(b: Brush, outline: Point[]) {
  const { ctx } = b;
  const box = bounds(outline);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(150,160,172,0.22)";
  ctx.fillRect(box.minX, box.minY, box.w, box.h);
  ctx.restore();
}

// Paper-colored base so a surface or roof hides the lawn wash under it.
function knockout(b: Brush, outline: Point[]) {
  b.ctx.save();
  trace(b.ctx, outline);
  b.ctx.fillStyle = PAPER;
  b.ctx.fill();
  b.ctx.restore();
}

function grassTexture(b: Brush, outline: Point[], color: string, seed: number) {
  const { ctx } = b;
  const box = bounds(outline);
  const r = rng(seed);
  const n = Math.round((box.w * box.h) / 3);
  ctx.save();
  ctx.strokeStyle = rgba(shade(color, -0.35), 0.18);
  ctx.lineWidth = b.px(0.8);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = box.minX + r() * box.w;
    const y = box.minY + r() * box.h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 0.4, y - 0.35 - r() * 0.3);
  }
  ctx.stroke();
  ctx.restore();
}

function castShadow(b: Brush, outline: Point[], heightFt: number, sun: Sun, snow: boolean, density: number) {
  const { ctx } = b;
  const len = heightFt * sun.reach;
  const color = snow ? "#6f86a8" : SHADOW;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  // Two passes, the second a little shorter, give the shadow a soft far edge.
  for (const [k, a] of [[1, 0.1], [0.9, 0.08]] as const) {
    ctx.beginPath();
    sweepPath(ctx, outline, [sun.dir[0] * len * k, sun.dir[1] * len * k]);
    ctx.fillStyle = rgba(color, a * density * sun.k * (snow ? 1.6 : 1.4));
    ctx.fill("nonzero");
  }
  ctx.restore();
}

// A deciduous plant: it has fall color and nothing in winter.
function sheds(plant: Plant) {
  return plant.render.form === "canopy" && !!plant.foliage.fall && !plant.foliage.winter;
}

// Fallen leaves in the tree's fall colors, thickest under the crown and drifting downwind.
function leafLitter(b: Brush, at: Point, look: Look, color: string, seed: number, amount: number) {
  const r = look.spreadFt / 2;
  const center: Point = [at[0] + r * 0.15, at[1] + r * 0.1];
  dots(b, center, r * 1.3, Math.round(r * r * 1.4 * amount), Math.max(0.1, b.px(0.9)), color, 0.4, seed + 301);
  dots(b, center, r * 1.45, Math.round(r * r * 0.5 * amount), Math.max(0.08, b.px(0.8)), shade(color, -0.3), 0.4, seed + 302);
}

// A plant's shadow: the crown's outline thrown along the sun, stretched by how low the sun is.
function castPlant(b: Brush, plant: Plant, at: Point, look: Look, sun: Sun, snow: boolean, seed: number) {
  const bare = !look.foliage && !look.bloom;
  if (bare && plant.render.form !== "canopy") return;
  const r = look.spreadFt / 2;
  const crown = plant.render.form === "canopy" ? 0.6 : 0.5;
  const off = Math.min(look.heightFt * sun.reach * crown, r * 1.2 + look.heightFt * 0.9);
  const stretch = 1 + Math.min(0.9, sun.reach * 0.3);
  const [dx, dy] = sun.dir;
  const c: Point = [at[0] + dx * off, at[1] + dy * off];
  const rand = rng(seed + 5);
  const pts = circlePts([0, 0], r * 0.95, 18, 0.18, rand).map(([x, y]) => {
    const along = (x * dx + y * dy) * stretch, across = -x * dy + y * dx;
    return [c[0] + along * dx - across * dy, c[1] + along * dy + across * dx] as Point;
  });
  const color = snow ? "#6f86a8" : SHADOW;
  // Bare branches let most light through.
  const alpha = (bare ? 0.04 : 0.1) * sun.k * (snow ? 1.4 : 1);
  wash(b, pts, color, seed + 6, { alpha, layers: 2, rim: 0, wobble: r * 0.06 });
  if (plant.render.form === "canopy" && look.heightFt > 6) {
    // The trunk's thin shadow from the base out to the crown's.
    ink(b, [at, c], seed + 7, { color, alpha: 0.18 * sun.k, width: Math.max(b.px(1), r * 0.06) });
  }
}

// Light from the sun side and shade on the far side, so crowns read as round.
function volume(b: Brush, plant: Plant, at: Point, look: Look, sun: Sun) {
  const form = plant.render.form;
  if (!look.foliage || !(form === "canopy" || form === "mound" || form === "columnar")) return;
  const r = look.spreadFt / 2;
  if (r / b.px(1) < 4) return;
  const { ctx } = b;
  const [dx, dy] = sun.dir;
  ctx.save();
  ctx.beginPath();
  ctx.arc(at[0], at[1], r * 0.97, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  const dark = ctx.createRadialGradient(at[0] - dx * r * 0.5, at[1] - dy * r * 0.5, r * 0.6, at[0] - dx * r * 0.3, at[1] - dy * r * 0.3, r * 1.5);
  dark.addColorStop(0, rgba(shade(look.foliage, -0.5), 0));
  dark.addColorStop(1, rgba(shade(look.foliage, -0.5), 0.45 * sun.k));
  ctx.fillStyle = dark;
  ctx.fillRect(at[0] - r, at[1] - r, r * 2, r * 2);
  ctx.globalCompositeOperation = "source-over";
  const lit = ctx.createRadialGradient(at[0] - dx * r * 0.4, at[1] - dy * r * 0.4, 0, at[0] - dx * r * 0.4, at[1] - dy * r * 0.4, r * 0.7);
  lit.addColorStop(0, rgba(shade(look.foliage, 0.6), 0.28 * sun.k));
  lit.addColorStop(1, rgba(shade(look.foliage, 0.6), 0));
  ctx.fillStyle = lit;
  ctx.fillRect(at[0] - r, at[1] - r, r * 2, r * 2);
  ctx.restore();
}

function surface(b: Brush, kind: Property["surfaces"][number]["kind"], outline: Point[], lawn: string, seed: number) {
  const { ctx } = b;
  const box = bounds(outline);
  if (kind !== "lawn" && kind !== "stepping-stones") knockout(b, outline);
  switch (kind) {
    case "lawn":
      wash(b, outline, lawn, seed, { alpha: 0.25 });
      return;
    case "mulch":
      wash(b, outline, "#a5815a", seed, { alpha: 0.26, rim: 0.3 });
      clipTo(ctx, outline, () => dots(b, [box.minX + box.w / 2, box.minY + box.h / 2], Math.hypot(box.w, box.h) / 2, Math.round(box.w * box.h * 1.4), b.px(0.9), "#6e5236", 0.35, seed + 1));
      return;
    case "gravel":
      wash(b, outline, "#d6cfbf", seed, { alpha: 0.3, rim: 0.25 });
      clipTo(ctx, outline, () => dots(b, [box.minX + box.w / 2, box.minY + box.h / 2], Math.hypot(box.w, box.h) / 2, Math.round(box.w * box.h * 3), b.px(0.8), "#7d776a", 0.4, seed + 1));
      ink(b, outline, seed + 2, { closed: true, alpha: 0.45, width: b.px(0.9) });
      return;
    case "driveway":
      wash(b, outline, "#c5c4be", seed, { alpha: 0.32, rim: 0.2 });
      ink(b, outline, seed + 2, { closed: true, alpha: 0.6 });
      return;
    case "path":
      wash(b, outline, "#d8ccb4", seed, { alpha: 0.4, rim: 0.25 });
      ink(b, outline, seed + 2, { closed: true, alpha: 0.6 });
      return;
    case "patio":
      wash(b, outline, "#cdbfa6", seed, { alpha: 0.4, rim: 0.25 });
      clipTo(ctx, outline, () => flagstones(b, box, seed + 1));
      ink(b, outline, seed + 2, { closed: true, alpha: 0.75, width: b.px(1.4) });
      return;
    case "stepping-stones":
      steppingStones(b, box, seed);
      return;
    case "pond": {
      // Deep in the middle, lighter at the edge, with a ring of stones. Fish are animated on top.
      wash(b, outline, "#6f9fb4", seed, { alpha: 0.5, rim: 0.5 });
      const inner = outline.map(([x, y]) => [box.minX + box.w / 2 + (x - box.minX - box.w / 2) * 0.62, box.minY + box.h / 2 + (y - box.minY - box.h / 2) * 0.62] as Point);
      wash(b, inner, "#3f6f86", seed + 3, { alpha: 0.35, layers: 2 });
      ink(b, outline, seed + 2, { closed: true, alpha: 0.55, width: b.px(1.6), color: "#5a6a6a" });
      const r = rng(seed + 9);
      for (let i = 0; i < outline.length; i++) {
        const [x1, y1] = outline[i], [x2, y2] = outline[(i + 1) % outline.length];
        const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 1.4));
        for (let j = 0; j < n; j++) {
          const t = (j + r()) / n;
          ctx.fillStyle = r() < 0.5 ? "rgba(150,146,136,0.85)" : "rgba(176,170,158,0.85)";
          ctx.beginPath();
          ctx.ellipse(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.55 + r() * 0.3, 0.4 + r() * 0.2, r() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }
  }
}

function flagstones(b: Brush, box: ReturnType<typeof bounds>, seed: number) {
  const r = rng(seed);
  const cell = 2.6;
  for (let y = box.minY; y < box.maxY; y += cell) {
    for (let x = box.minX - r() * cell; x < box.maxX; x += cell * (0.8 + r() * 0.6)) {
      const w = cell * (0.75 + r() * 0.5);
      const pts: Point[] = [
        [x + r() * 0.3, y + r() * 0.3],
        [x + w - r() * 0.3, y + r() * 0.3],
        [x + w - r() * 0.3, y + cell - r() * 0.3],
        [x + r() * 0.3, y + cell - r() * 0.3],
      ];
      if (r() < 0.35) wash(b, pts, "#b8a88c", seed + Math.round(x * 13 + y * 7), { alpha: 0.16, layers: 1, rim: 0 });
      ink(b, pts, seed + Math.round(x * 31 + y * 17), { closed: true, alpha: 0.3, width: b.px(0.8) });
    }
  }
}

function steppingStones(b: Brush, box: ReturnType<typeof bounds>, seed: number) {
  const r = rng(seed);
  const horizontal = box.w >= box.h;
  const len = horizontal ? box.w : box.h;
  const n = Math.max(1, Math.floor(len / 2.4));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const at: Point = horizontal ? [box.minX + t * box.w, box.minY + box.h / 2 + (r() - 0.5) * 0.6] : [box.minX + box.w / 2 + (r() - 0.5) * 0.6, box.minY + t * box.h];
    blob(b, at, 0.85, "#bdb6a8", seed + i, { alpha: 0.45, layers: 2, rim: 0.4, jitter: 0.3 });
  }
}

function structure(b: Brush, kind: Property["structures"][number]["kind"], outline: Point[], seed: number) {
  const { ctx } = b;
  const box = bounds(outline);
  if (kind !== "pergola") knockout(b, outline);
  const lines = (step: number, color: string, alpha: number, vertical = box.h > box.w) => {
    clipTo(ctx, outline, () => {
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = b.px(0.9);
      ctx.beginPath();
      if (vertical) for (let x = box.minX; x <= box.maxX; x += step) { ctx.moveTo(x, box.minY); ctx.lineTo(x, box.maxY); }
      else for (let y = box.minY; y <= box.maxY; y += step) { ctx.moveTo(box.minX, y); ctx.lineTo(box.maxX, y); }
      ctx.stroke();
    });
  };
  switch (kind) {
    case "deck":
      wash(b, outline, "#c39a6b", seed, { alpha: 0.4 });
      lines(0.8, "#6b4a2c", 0.35);
      ink(b, outline, seed + 1, { closed: true, width: b.px(1.5) });
      return;
    case "pergola":
      lines(2, "#7a5a3a", 0.75);
      ink(b, outline, seed + 1, { closed: true, width: b.px(1.6), alpha: 0.7 });
      return;
    case "shed":
      wash(b, outline, "#b5a089", seed, { alpha: 0.5, rim: 0.3 });
      lines(0.7, INK, 0.18, box.w > box.h);
      ink(b, outline, seed + 1, { closed: true, width: b.px(2) });
      return;
    case "raised-bed": {
      wash(b, outline, "#7a5c43", seed, { alpha: 0.38, rim: 0 });
      trace(ctx, outline);
      ctx.strokeStyle = rgba("#8a6a48", 0.85);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ink(b, outline, seed + 1, { closed: true, width: b.px(1.2) });
      return;
    }
  }
}

// The roof plan: hip roof planes lit by the sun, with ridges and shingle courses.
function house(b: Brush, outline: Point[], seed: number, sun: Sun, snow: boolean) {
  const { ctx } = b;
  const box = bounds(outline);
  knockout(b, outline);
  const pxPerFt = ctx.getTransform().a;
  const img = roofImage(outline, sun, pxPerFt, snow ? "#eeeeea" : "#cbbda8", INK);
  const res = (img.width - 2) / box.w;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, box.minX - 1 / res, box.minY - 1 / res, img.width / res, img.height / res);
  ctx.restore();
  wash(b, outline, snow ? "#c9d3dc" : "#b7aa98", seed + 1, { alpha: 0.14, layers: 2, rim: 0.3 });
  ink(b, outline, seed + 2, { closed: true, width: b.px(2.6), alpha: 0.9 });
}

function fence(b: Brush, kind: Property["fences"][number]["kind"], path: Point[], heightFt: number, seed: number) {
  const { ctx } = b;
  const off = Math.min(2.5, heightFt * 0.18) * (kind === "solid" ? 1 : kind === "semi-open" ? 0.6 : 0.2);
  if (off > 0.2) {
    ctx.save();
    trace(ctx, path.map(([x, y]) => [x + off * 0.6, y + off * 0.6] as Point), false);
    ctx.strokeStyle = rgba(SHADOW, 0.14);
    ctx.lineWidth = off * 1.4;
    ctx.stroke();
    ctx.restore();
  }
  if (kind === "solid") {
    ctx.save();
    trace(ctx, path, false);
    ctx.strokeStyle = rgba("#8c6e50", 0.85);
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ctx.restore();
    ink(b, path, seed, { width: b.px(1.4), alpha: 0.9 });
    return;
  }
  if (kind === "semi-open") {
    ink(b, path, seed, { width: b.px(1.3), color: "#6e5638", alpha: 0.9 });
    ticks(b, path, 0.9, 0.55);
    return;
  }
  // Open: two thin rails and posts.
  ink(b, path, seed, { width: b.px(0.9), alpha: 0.6, dash: [b.px(6), b.px(3)] });
  posts(b, path, 8);
}

function ticks(b: Brush, path: Point[], step: number, len: number) {
  const { ctx } = b;
  ctx.save();
  ctx.strokeStyle = rgba("#6e5638", 0.7);
  ctx.lineWidth = b.px(1);
  ctx.beginPath();
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
    for (let t = 0; t <= d; t += step) {
      const x = x0 + ((x1 - x0) * t) / d, y = y0 + ((y1 - y0) * t) / d;
      ctx.moveTo(x - nx * len / 2, y - ny * len / 2);
      ctx.lineTo(x + nx * len / 2, y + ny * len / 2);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function posts(b: Brush, path: Point[], step: number) {
  const { ctx } = b;
  ctx.save();
  ctx.fillStyle = rgba(INK, 0.75);
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 0; t <= d + 0.01; t += step) {
      const x = x0 + ((x1 - x0) * t) / d, y = y0 + ((y1 - y0) * t) / d;
      ctx.fillRect(x - 0.3, y - 0.3, 0.6, 0.6);
    }
  }
  ctx.restore();
}

function edge(b: Brush, kind: Property["edges"][number]["kind"], path: Point[], seed: number) {
  const { ctx } = b;
  if (kind === "edging") return ink(b, path, seed, { width: b.px(1.3), alpha: 0.7, color: "#4a4a3e" });
  if (kind === "border") {
    ctx.save();
    trace(ctx, path, false);
    ctx.strokeStyle = rgba("#a0634a", 0.55);
    ctx.lineWidth = 0.7;
    ctx.setLineDash([0.9, 0.15]);
    ctx.stroke();
    ctx.restore();
    return ink(b, path, seed, { width: b.px(0.8), alpha: 0.5 });
  }
  // Seat wall: a wide stone band with ink on both sides.
  ctx.save();
  trace(ctx, path, false);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 1.4 + b.px(2.4);
  ctx.stroke();
  ctx.strokeStyle = "#cfc6b4";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  castLine(b, path);
}

function castLine(b: Brush, path: Point[]) {
  const { ctx } = b;
  ctx.save();
  trace(ctx, path.map(([x, y]) => [x + 0.5, y + 0.4] as Point), false);
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = rgba(SHADOW, 0.1);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function feature(b: Brush, kind: Property["features"][number]["kind"], at: Point, seed: number) {
  const { ctx } = b;
  const ring = (r: number, width: number, alpha = 0.85) => {
    ctx.beginPath();
    ctx.arc(at[0], at[1], r, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(INK, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  };
  switch (kind) {
    case "birdbath":
      blob(b, [at[0] + 0.4, at[1] + 0.4], 1.3, SHADOW, seed, { alpha: 0.15, layers: 1 });
      blob(b, at, 1.3, "#cfc8b8", seed + 1, { alpha: 0.6, layers: 2 });
      blob(b, at, 0.85, "#7fb0c4", seed + 2, { alpha: 0.55, layers: 2 });
      ring(1.3, b.px(1.2));
      return;
    case "feeder":
      ctx.fillStyle = rgba("#9a7a52", 0.7);
      ctx.fillRect(at[0] - 0.5, at[1] - 0.5, 1, 1);
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.lineWidth = b.px(1.1);
      ctx.strokeRect(at[0] - 0.5, at[1] - 0.5, 1, 1);
      dots(b, at, 1.4, 10, b.px(0.9), "#7a5a32", 0.6, seed);
      return;
    case "bench":
      ctx.save();
      ctx.fillStyle = rgba("#b08a5e", 0.65);
      ctx.fillRect(at[0] - 2.5, at[1] - 0.8, 5, 1.6);
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.lineWidth = b.px(1.2);
      ctx.strokeRect(at[0] - 2.5, at[1] - 0.8, 5, 1.6);
      ctx.lineWidth = b.px(0.7);
      ctx.beginPath();
      for (const y of [-0.27, 0.27]) { ctx.moveTo(at[0] - 2.5, at[1] + y); ctx.lineTo(at[0] + 2.5, at[1] + y); }
      ctx.stroke();
      ctx.restore();
      return;
    case "fire-pit":
      blob(b, at, 2, "#9e978a", seed, { alpha: 0.5, layers: 2 });
      blob(b, at, 1.2, "#d9773a", seed + 1, { alpha: 0.45, layers: 2 });
      dots(b, at, 0.9, 8, b.px(1.2), "#3a2a20", 0.6, seed + 2);
      ring(2, b.px(1.3));
      ring(1.2, b.px(0.9), 0.6);
      return;
    case "water-feature":
      blob(b, at, 3, "#7fb0c4", seed, { alpha: 0.45, layers: 3, rim: 0.4 });
      for (const r of [0.8, 1.6]) ring(r, b.px(0.7), 0.35);
      return;
  }
}
