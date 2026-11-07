import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import { blob, clipTo, dots, ink, INK, paperGrain, rgba, shade, trace, wash, type Brush } from "./brush";
import { bounds, hashString, rng } from "./geometry";
import { expand, lookOf, seasonOf, type ViewTime } from "./look";
import { drawPlant, plantShadow } from "./plants";

export type View = { scale: number; offX: number; offY: number };

const LAWN = { spring: "#9cbc68", summer: "#8fb35e", fall: "#a8b366", winter: "#bdbb8f" } as const;
const SHADOW = "#4d5866";

export function paint(canvas: HTMLCanvasElement, property: Property, time: ViewTime, view: View) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#f4f0e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offX, dpr * view.offY);
  const b: Brush = { ctx, px: (n) => n / view.scale };
  const season = seasonOf(time.month);
  const s = (id: string) => hashString(property.id + id);

  // Ground: the whole lot is lawn unless a surface covers it.
  wash(b, property.lot.outline, LAWN[season], s("lot"), { alpha: 0.22, layers: 3, rim: 0.12 });
  clipTo(ctx, property.lot.outline, () => grassTexture(b, property.lot.outline, LAWN[season], s("grass")));

  for (const sf of property.surfaces) surface(b, sf.kind, sf.outline, LAWN[season], s(sf.id));

  // Height hints: buildings and walls cast a soft shadow down and to the right.
  castShadow(b, property.house.outline, property.house.heightFt, s("house-shadow"));
  for (const st of property.structures) castShadow(b, st.outline, st.heightFt, s(st.id + "shadow"));
  for (const st of property.structures) structure(b, st.kind, st.outline, s(st.id));

  for (const e of property.edges) edge(b, e.kind, e.path, s(e.id));
  for (const f of property.fences) fence(b, f.kind, f.path, f.heightFt, s(f.id));

  house(b, property.house.outline, s("house"));

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
  for (const { inst, look } of items) plantShadow(b, inst.at, look, inst.seed);
  for (const { inst, plant, look } of items) drawPlant(b, plant, inst.at, look, inst.seed);

  for (const f of property.features) feature(b, f.kind, f.at, s(f.id));

  // Property line: the dash-dot line used on site plans.
  ink(b, property.lot.outline, s("lot-line"), {
    closed: true,
    alpha: 0.7,
    width: b.px(1.3),
    dash: [b.px(14), b.px(4), b.px(2), b.px(4)],
  });

  // Paper grain over everything, so the washes sit in the paper.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ctx.createPattern(paperGrain(), "repeat")!;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Paper-colored base so a surface or roof hides the lawn wash under it.
function knockout(b: Brush, outline: Point[]) {
  b.ctx.save();
  trace(b.ctx, outline);
  b.ctx.fillStyle = "#f4f0e6";
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

function castShadow(b: Brush, outline: Point[], heightFt: number, seed: number) {
  const off = Math.min(6, heightFt * 0.22);
  const moved = outline.map(([x, y]) => [x + off, y + off * 0.8] as Point);
  wash(b, moved, SHADOW, seed, { alpha: 0.12, layers: 2, rim: 0 });
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

function house(b: Brush, outline: Point[], seed: number) {
  const { ctx } = b;
  const box = bounds(outline);
  knockout(b, outline);
  wash(b, outline, "#e3dccf", seed, { alpha: 0.5, layers: 2, rim: 0 });
  wash(b, outline, "#b7aa98", seed + 1, { alpha: 0.18, layers: 2, rim: 0.3 });
  // Roof hatch at 45 degrees.
  clipTo(ctx, outline, () => {
    ctx.strokeStyle = rgba(INK, 0.16);
    ctx.lineWidth = b.px(0.9);
    ctx.beginPath();
    for (let d = -box.h; d < box.w; d += 1.4) {
      ctx.moveTo(box.minX + d, box.maxY);
      ctx.lineTo(box.minX + d + box.h, box.minY);
    }
    ctx.stroke();
  });
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
