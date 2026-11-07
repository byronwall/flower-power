import type { Plant } from "../model/plant";
import type { Point } from "../model/property";
import { blob, dots, ink, INK, rgba, shade, type Brush } from "./brush";
import { rng } from "./geometry";
import type { Look } from "./look";

// Soft shadow to the lower right. Taller plants cast longer shadows, which hints at height on a flat plan.
export function plantShadow(b: Brush, at: Point, look: Look, seed: number) {
  if (!look.foliage && !look.bloom) return;
  const r = look.spreadFt / 2;
  const off = Math.min(r * 0.7, look.heightFt * 0.12 + 0.2);
  blob(b, [at[0] + off, at[1] + off * 0.8], r * 0.95, "#4d5866", seed + 5, { alpha: 0.08, layers: 2 });
}

export function drawPlant(b: Brush, plant: Plant, at: Point, look: Look, seed: number) {
  const r = look.spreadFt / 2;
  // Trees keep their branches in winter; other plants with nothing showing get a faint marker.
  if (!look.foliage && !look.bloom && plant.render.form !== "canopy") return dormant(b, plant, at, r, seed);
  switch (plant.render.form) {
    case "canopy": return canopy(b, at, r, look, seed);
    case "columnar": return columnar(b, at, r, look, seed);
    case "grass": return grass(b, at, r, look, seed);
    case "rosette": return rosette(b, at, r, look, seed);
    case "mat": return mat(b, at, r, look, seed);
    case "upright": return upright(b, at, r, look, seed);
    default: return mound(b, at, r, look, seed);
  }
}

function scatterAt(at: Point, radius: number, r: () => number): Point {
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(r()) * radius;
  return [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d];
}

// Cloud-like scalloped outline, the usual symbol for a tree canopy on a landscape plan.
function scallop(b: Brush, at: Point, r: number, seed: number, alpha: number) {
  const rand = rng(seed);
  const { ctx } = b;
  const lobes = Math.max(7, Math.min(20, Math.round(r * 1.1)));
  ctx.save();
  ctx.beginPath();
  const start = rand() * Math.PI * 2;
  for (let i = 0; i <= lobes; i++) {
    const a = start + (i / lobes) * Math.PI * 2;
    const rr = r * (0.9 + rand() * 0.08);
    const x = at[0] + Math.cos(a) * rr;
    const y = at[1] + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const mid = a - Math.PI / lobes;
      const bulge = r * (1.06 + rand() * 0.05);
      ctx.quadraticCurveTo(at[0] + Math.cos(mid) * bulge, at[1] + Math.sin(mid) * bulge, x, y);
    }
  }
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = b.px(1.1);
  ctx.stroke();
  ctx.restore();
}

function blooms(b: Brush, at: Point, r: number, look: Look, seed: number, density: number, size: number) {
  if (look.bloom) {
    const per = Math.max(3, Math.round(r * r * density));
    look.bloom.forEach((c, i) => dots(b, at, r * 0.85, Math.ceil(per / look.bloom!.length), size, c, 0.85, seed + 40 + i));
    look.bloom.forEach((c, i) => dots(b, at, r * 0.85, Math.ceil(per / look.bloom!.length / 3), size * 0.5, shade(c, -0.35), 0.6, seed + 60 + i));
  }
  if (look.fruit) dots(b, at, r * 0.8, Math.max(4, Math.round(r * r * density * 0.6)), size * 0.7, look.fruit, 0.9, seed + 80);
}

function canopy(b: Brush, at: Point, r: number, look: Look, seed: number) {
  const rand = rng(seed);
  if (look.foliage) {
    const f = look.foliage;
    blob(b, at, r, f, seed, { alpha: 0.2, layers: 3, rim: 0.18 });
    for (let i = 0; i < 6; i++) blob(b, scatterAt(at, r * 0.55, rand), r * (0.2 + rand() * 0.15), shade(f, -0.15), seed + 10 + i, { alpha: 0.1, layers: 1 });
    for (let i = 0; i < 5; i++) blob(b, scatterAt([at[0] - r * 0.25, at[1] - r * 0.25], r * 0.4, rand), r * 0.2, shade(f, 0.25), seed + 30 + i, { alpha: 0.18, layers: 1 });
    scallop(b, at, r, seed + 3, 0.5);
  } else {
    // Bare winter tree: branches seen from above.
    const n = 7 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.4;
      const end: Point = [at[0] + Math.cos(a) * r * 0.9, at[1] + Math.sin(a) * r * 0.9];
      ink(b, [at, [at[0] + Math.cos(a + 0.15) * r * 0.5, at[1] + Math.sin(a + 0.15) * r * 0.5], end], seed + i, { alpha: 0.45, width: b.px(1) });
      const fork: Point = [at[0] + Math.cos(a - 0.4) * r * 0.75, at[1] + Math.sin(a - 0.4) * r * 0.75];
      ink(b, [[at[0] + Math.cos(a) * r * 0.45, at[1] + Math.sin(a) * r * 0.45], fork], seed + 50 + i, { alpha: 0.35, width: b.px(0.8) });
    }
    ink(b, circleLine(at, r * 0.95), seed + 99, { alpha: 0.25, closed: true, dash: [b.px(3), b.px(4)] });
  }
  blooms(b, at, r, look, seed, 0.9, Math.max(r * 0.05, b.px(1.5)));
  b.ctx.fillStyle = rgba(INK, 0.75);
  b.ctx.beginPath();
  b.ctx.arc(at[0], at[1], Math.max(0.3, r * 0.04), 0, Math.PI * 2);
  b.ctx.fill();
}

function columnar(b: Brush, at: Point, r: number, look: Look, seed: number) {
  const f = look.foliage ?? "#4a6b40";
  blob(b, at, r, f, seed, { alpha: 0.4, layers: 3, rim: 0.3 });
  const rand = rng(seed);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rand() * 0.2;
    ink(b, [[at[0] + Math.cos(a) * r * 0.15, at[1] + Math.sin(a) * r * 0.15], [at[0] + Math.cos(a) * r * 0.85, at[1] + Math.sin(a) * r * 0.85]], seed + i, {
      color: shade(f, -0.35),
      alpha: 0.4,
      width: b.px(0.9),
    });
  }
  ink(b, circleLine(at, r), seed + 7, { alpha: 0.55, closed: true });
}

function mound(b: Brush, at: Point, r: number, look: Look, seed: number) {
  const rand = rng(seed);
  if (look.foliage) {
    blob(b, at, r, look.foliage, seed, { alpha: 0.3, layers: 3, rim: 0.2 });
    for (let i = 0; i < 4; i++) blob(b, scatterAt(at, r * 0.45, rand), r * 0.35, shade(look.foliage, -0.2), seed + 10 + i, { alpha: 0.16, layers: 1 });
    dots(b, at, r * 0.85, Math.round(r * r * 6) + 6, Math.max(r * 0.05, b.px(0.8)), shade(look.foliage, -0.35), 0.35, seed + 20);
    scallop(b, at, r, seed + 3, 0.32);
  }
  blooms(b, at, r, look, seed, 5, Math.max(r * 0.09, b.px(1.4)));
}

function upright(b: Brush, at: Point, r: number, look: Look, seed: number) {
  if (look.foliage) {
    blob(b, at, r * 0.9, look.foliage, seed, { alpha: 0.24, layers: 2 });
    dots(b, at, r * 0.7, 7, Math.max(r * 0.07, b.px(1)), shade(look.foliage, -0.3), 0.55, seed + 2);
  }
  if (look.bloom) {
    const heads = 5 + Math.round(r * 2);
    look.bloom.forEach((c, i) => {
      dots(b, at, r * 0.8, Math.ceil(heads / look.bloom!.length), Math.max(r * 0.17, b.px(1.8)), c, 0.8, seed + 30 + i);
    });
    dots(b, at, r * 0.8, heads, Math.max(r * 0.06, b.px(0.9)), "#3b2a1f", 0.5, seed + 30);
  }
  if (look.fruit) dots(b, at, r * 0.7, 5, Math.max(r * 0.08, b.px(1)), look.fruit, 0.8, seed + 50);
}

function grass(b: Brush, at: Point, r: number, look: Look, seed: number) {
  const rand = rng(seed);
  const f = look.foliage ?? "#a89a72";
  blob(b, at, r * 0.7, f, seed, { alpha: 0.2, layers: 1 });
  const blades = 18 + Math.round(r * 8);
  for (let i = 0; i < blades; i++) {
    const a = rand() * Math.PI * 2;
    const len = r * (0.55 + rand() * 0.45);
    const bend = (rand() - 0.5) * 0.5;
    ink(b, [at, [at[0] + Math.cos(a + bend) * len * 0.55, at[1] + Math.sin(a + bend) * len * 0.55], [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len]], seed + i, {
      color: shade(f, -0.25),
      alpha: 0.55,
      width: b.px(0.9),
    });
  }
  blooms(b, at, r, look, seed, 3, Math.max(r * 0.07, b.px(1.1)));
}

function rosette(b: Brush, at: Point, r: number, look: Look, seed: number) {
  const { ctx } = b;
  const rand = rng(seed);
  if (look.foliage) {
    const leaves = 7 + Math.floor(rand() * 3);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * Math.PI * 2 + rand() * 0.3;
      ctx.save();
      ctx.translate(at[0] + Math.cos(a) * r * 0.45, at[1] + Math.sin(a) * r * 0.45);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(i % 2 ? look.foliage : shade(look.foliage, 0.1), 0.24);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(look.foliage, -0.45), 0.22);
      ctx.lineWidth = b.px(0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, 0);
      ctx.lineTo(r * 0.4, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  blooms(b, at, r, look, seed, 2.5, Math.max(r * 0.08, b.px(1.2)));
}

function mat(b: Brush, at: Point, r: number, look: Look, seed: number) {
  if (look.foliage) {
    blob(b, at, r * 1.05, look.foliage, seed, { alpha: 0.24, layers: 2, jitter: 0.35 });
    dots(b, at, r * 0.95, Math.round(r * r * 10) + 6, Math.max(r * 0.04, b.px(0.7)), shade(look.foliage, -0.3), 0.35, seed + 4);
  }
  blooms(b, at, r * 1.05, look, seed, 10, Math.max(r * 0.05, b.px(1)));
}

// A plant with nothing above ground this season: a small faded mark so it can still be found and edited.
function dormant(b: Brush, plant: Plant, at: Point, r: number, seed: number) {
  if (plant.lifecycle === "annual" || plant.lifecycle === "tender-perennial") return;
  dots(b, at, r * 0.35, 4, Math.max(r * 0.06, b.px(1)), "#9a8460", 0.5, seed);
  ink(b, circleLine(at, Math.max(r * 0.5, 0.3)), seed + 1, { alpha: 0.22, closed: true, dash: [b.px(2), b.px(3)] });
}

function circleLine(at: Point, r: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    out.push([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r]);
  }
  return out;
}
