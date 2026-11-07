import type { Plant, Season } from "../model/plant";
import { hashString, rng } from "./geometry";
import { monthNames, seasonOf } from "./look";

// A side-view illustration of a plant at full size, for previews. The plan stays top-down;
// this is how the plant looks standing in front of it, in the month shown.
// Light comes from the upper left, so every leaf, petal and trunk is shaded the same way.

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- color ----------

function rgbOf(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbaOf(hex: string, a: number) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function hexOf(c: number[]) {
  return `#${c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
export function mix(a: string, b: string, t: number) {
  const A = rgbOf(a), B = rgbOf(b);
  return hexOf(A.map((v, i) => v + (B[i] - v) * t));
}
// l in -1..1. Positive is in sun, negative in shade.
function lit(color: string, l: number) {
  return l >= 0 ? mix(color, "#fff8dc", l * 0.42) : mix(color, "#17231a", -l * 0.62);
}
const pick = <T>(xs: readonly T[], r: Rand) => xs[Math.floor(r() * xs.length) % xs.length];

// ---------- what each plant looks like, beyond its form ----------

type TreeCrown = "oval" | "spreading" | "tiered" | "multistem";
type Flower = "tuft" | "daisy" | "cone" | "zinnia" | "dahlia" | "shaggy" | "umbel" | "rose" | "ball" | "cluster" | "spike" | "lily" | "bells" | "star" | "tiny" | "blossom";
type Style = {
  crown?: TreeCrown;
  bark?: string;
  flower?: Flower;
  center?: string;
  leaf?: "broad" | "small" | "needle" | "scale";
  grass?: "upright" | "fountain" | "strap";
  rosette?: "hosta" | "fern" | "heuchera";
  mat?: "carpet" | "ginger";
};

// Details a person would recognize the plant by. Plants not listed fall back to their form.
const STYLES: Record<string, Style> = {
  "red-maple": { crown: "oval", bark: "#85837b", flower: "tuft" },
  "eastern-redbud": { crown: "spreading", bark: "#4b3b34", flower: "tuft" },
  "flowering-dogwood": { crown: "tiered", bark: "#5b4a3f", flower: "blossom" },
  serviceberry: { crown: "multistem", bark: "#8e8b84", flower: "blossom" },
  "green-giant-arborvitae": { leaf: "scale" },
  boxwood: { leaf: "small" },
  "annabelle-hydrangea": { flower: "ball" },
  "knock-out-rose": { flower: "rose" },
  ninebark: { flower: "cluster" },
  winterberry: { flower: "tiny", leaf: "small" },
  catmint: { flower: "spike", leaf: "small" },
  "black-eyed-susan": { flower: "daisy", center: "#3b2414" },
  "purple-coneflower": { flower: "cone", center: "#9a4f1e" },
  zinnia: { flower: "zinnia", center: "#d9a522" },
  dahlia: { flower: "dahlia" },
  "wild-bergamot": { flower: "shaggy" },
  "butterfly-weed": { flower: "umbel" },
  daylily: { grass: "strap", flower: "lily" },
  "little-bluestem": { grass: "upright" },
  "prairie-dropseed": { grass: "fountain" },
  hosta: { rosette: "hosta", flower: "bells" },
  "christmas-fern": { rosette: "fern" },
  "coral-bells": { rosette: "heuchera", flower: "bells" },
  "creeping-phlox": { mat: "carpet", flower: "star", leaf: "needle" },
  "wild-ginger": { mat: "ginger", flower: "bells" },
  // Indiana list: flowers drawn in their own shapes.
  "rudbeckia-hirta": { flower: "daisy", center: "#3b2414" },
  "new-england-aster": { flower: "daisy", center: "#e8b21f" },
  "smooth-blue-aster": { flower: "daisy", center: "#e8b21f" },
  "common-sunflower": { flower: "daisy", center: "#4a2c18" },
  "common-milkweed": { flower: "umbel" },
  "swamp-milkweed": { flower: "umbel" },
  "sweet-joe-pye-weed": { flower: "umbel" },
  "golden-alexanders": { flower: "umbel" },
  "nodding-onion": { flower: "umbel" },
  "canada-goldenrod": { flower: "umbel" },
  "rattlesnake-master": { flower: "shaggy" },
  "prairie-blazing-star": { flower: "shaggy" },
  "dense-blazing-star": { flower: "shaggy" },
  "cardinal-flower": { flower: "shaggy" },
  "great-blue-lobelia": { flower: "shaggy" },
  peony: { flower: "dahlia" },
  "ostrich-fern": { rosette: "fern" },
  "sensitive-fern": { rosette: "fern" },
  "american-elderberry": { flower: "cluster" },
  "arrowwood-viburnum": { flower: "cluster" },
  "american-cranberrybush": { flower: "cluster" },
  buttonbush: { flower: "ball" },
  "bigleaf-hydrangea": { flower: "ball" },
  "carolina-rose": { flower: "rose" },
  "common-lilac": { flower: "spike" },
  "tulip-tree": { crown: "oval", flower: "blossom" },
  "sugar-maple": { crown: "oval", bark: "#7d756a" },
  "river-birch": { crown: "multistem", bark: "#c8b8a4" },
  "american-sycamore": { crown: "spreading", bark: "#d8d0c0" },
  "white-oak": { crown: "spreading", bark: "#8a8478" },
  "bur-oak": { crown: "spreading", bark: "#5e544a" },
  "eastern-white-pine": { leaf: "needle" },
};

// ---------- the plant in a given month ----------

export type Portrait = { month: number; season: Season; tone: Season; foliage: string | null; bloom: string[] | null; fruit: string | null; dormant: boolean };

export function portraitOf(plant: Plant, month: number): Portrait {
  const season = seasonOf(month);
  const foliage = plant.foliage[season];
  const bloom = plant.bloom?.months.includes(month) ? plant.bloom.colors : null;
  const fruit = plant.fruit?.months.includes(month) ? plant.fruit.color : null;
  const woody = plant.lifecycle === "woody";
  return { month, season, tone: plant.evergreen && season === "fall" ? "summer" : season, foliage, bloom, fruit, dormant: !foliage && !bloom && !woody };
}

// The month a plant looks its best, for gallery thumbnails.
export function showcaseMonth(plant: Plant) {
  const b = plant.bloom?.months;
  if (b?.length) {
    const m = b[Math.floor((b.length - 1) / 2)];
    if (plant.foliage[seasonOf(m)] || plant.category === "tree") return m;
  }
  return 7;
}

export function captionOf(plant: Plant, month: number) {
  const p = portraitOf(plant, month);
  const m = monthNames[month - 1];
  if (p.dormant) return plant.lifecycle === "annual" ? `Not in the garden in ${m}; planted each spring` : `Resting underground in ${m}; returns in spring`;
  if (!p.foliage && !p.bloom) return p.fruit ? `Bare branches and berries in ${m}` : `Bare branches in ${m}`;
  if (p.bloom) return `In bloom in ${m}`;
  if (p.season === "fall") return `Fall color in ${m}`;
  return `Full grown, in ${m}`;
}

// ---------- the scene ----------

export function drawPortrait(ctx: Ctx, S: number, plant: Plant, month: number) {
  const st = STYLES[plant.id] ?? {};
  const p = portraitOf(plant, month);
  const r = rng(hashString(plant.id) + 11);
  const gy = S * 0.85;

  sky(ctx, S, gy, p.season);
  ground(ctx, S, gy, p.tone, r);

  const W = plant.size.spreadFt, H = plant.size.heightFt;
  const k = Math.min((S * 0.82) / W, (S * 0.72) / H);
  const g: Geo = { x: S / 2, gy, w: W * k, h: H * k, k, S, leaf: clamp(S * 0.016, 1.3, 6) };

  shadow(ctx, g);
  if (p.dormant) dormant(ctx, g, plant, r);
  else {
    switch (plant.render.form) {
      case "canopy": tree(ctx, g, p, st, r); break;
      case "columnar": columnar(ctx, g, p, st, r); break;
      case "grass": grassForm(ctx, g, p, st, r); break;
      case "rosette": rosette(ctx, g, p, st, r); break;
      case "mat": matForm(ctx, g, p, st, r); break;
      case "upright": upright(ctx, g, p, st, r, plant); break;
      default: shrub(ctx, g, p, st, r);
    }
  }
  if (H >= 8 && S >= 120) person(ctx, g);
  if (p.season === "winter") frost(ctx, S, gy, r);
}

type Geo = { x: number; gy: number; w: number; h: number; k: number; S: number; leaf: number };

function sky(ctx: Ctx, S: number, gy: number, season: Season) {
  const tops: Record<Season, [string, string]> = {
    spring: ["#d6e8ef", "#f3f1e4"],
    summer: ["#c7def0", "#f1efe0"],
    fall: ["#dcdfe0", "#f3e9d6"],
    winter: ["#d9dfe3", "#eef0ee"],
  };
  const [a, b] = tops[season];
  const grad = ctx.createLinearGradient(0, 0, 0, gy);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  // Distant tree line, faint, for depth.
  const hill = { spring: "#b9c9a6", summer: "#a9bf98", fall: "#c9b394", winter: "#c4c9c6" }[season];
  ctx.fillStyle = mix(hill, b, 0.45);
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (let x = 0; x <= S; x += S / 40) ctx.lineTo(x, gy - S * (0.05 + 0.025 * Math.sin(x / S * 9) + 0.015 * Math.sin(x / S * 23 + 1)));
  ctx.lineTo(S, gy);
  ctx.fill();
}

function ground(ctx: Ctx, S: number, gy: number, season: Season, r: Rand) {
  const turf = { spring: "#93b264", summer: "#86a556", fall: "#99a05e", winter: "#e8ebe6" }[season];
  const grad = ctx.createLinearGradient(0, gy, 0, S);
  grad.addColorStop(0, lit(turf, 0.1));
  grad.addColorStop(1, lit(turf, -0.25));
  ctx.fillStyle = grad;
  ctx.fillRect(0, gy, S, S - gy);
  if (season === "winter") return;
  ctx.lineWidth = Math.max(0.5, S / 400);
  for (let i = 0; i < S * 0.9; i++) {
    const x = r() * S, y = gy + r() * (S - gy), h = (S / 120) * (0.6 + r()) * (0.6 + (y - gy) / (S - gy));
    ctx.strokeStyle = lit(turf, (r() - 0.5) * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * h * 0.6, y - h);
    ctx.stroke();
  }
}

function frost(ctx: Ctx, S: number, gy: number, r: Rand) {
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < S * 0.25; i++) {
    ctx.beginPath();
    ctx.arc(r() * S, gy + r() * (S - gy), Math.max(0.4, S / 500) * (0.5 + r()), 0, TAU);
    ctx.fill();
  }
}

function shadow(ctx: Ctx, g: Geo) {
  const rx = Math.max(g.w * 0.6, g.S * 0.06), ry = Math.max(4, (g.S - g.gy) * 0.35);
  const cx = g.x + rx * 0.15;
  const grad = ctx.createRadialGradient(cx, g.gy, 0, cx, g.gy, rx);
  grad.addColorStop(0, "rgba(30,40,25,0.32)");
  grad.addColorStop(1, "rgba(30,40,25,0)");
  ctx.save();
  ctx.translate(cx, g.gy);
  ctx.scale(1, ry / rx);
  ctx.translate(-cx, -g.gy);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, g.gy, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A 6 ft person, so big plants read at their true size.
function person(ctx: Ctx, g: Geo) {
  const h = 5.8 * g.k;
  let x = g.x + g.w / 2 + h * 0.45;
  if (x + h * 0.2 > g.S - 4) x = g.x - g.w / 2 - h * 0.45;
  ctx.fillStyle = "rgba(70,74,68,0.55)";
  const y = g.gy;
  ctx.beginPath();
  ctx.arc(x, y - h * 0.92, h * 0.075, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - h * 0.11, y - h * 0.82);
  ctx.lineTo(x + h * 0.11, y - h * 0.82);
  ctx.lineTo(x + h * 0.09, y - h * 0.45);
  ctx.lineTo(x + h * 0.06, y);
  ctx.lineTo(x + h * 0.01, y);
  ctx.lineTo(x, y - h * 0.42);
  ctx.lineTo(x - h * 0.01, y);
  ctx.lineTo(x - h * 0.06, y);
  ctx.lineTo(x - h * 0.09, y - h * 0.45);
  ctx.closePath();
  ctx.fill();
}

// ---------- foliage masses ----------

type Shape = "ellipse" | "cone" | "dome";
type Mass = { cx: number; cy: number; rx: number; ry: number; shape?: Shape; flat?: number; lobes?: number };

function inside(m: Mass, u: number, v: number, ph: number) {
  if (m.flat != null && v > m.flat) return false;
  if (m.shape === "cone") {
    const t = (v + 1) / 2;
    if (t < 0 || t > 1) return false;
    const w = t < 0.88 ? 0.06 + (t / 0.88) * 0.94 : 1 - ((t - 0.88) / 0.12) * 0.25;
    return Math.abs(u) < w * (1 + 0.05 * Math.sin(v * 23 + ph));
  }
  const th = Math.atan2(v, u), lobes = m.lobes ?? 5;
  const rr = 1 + 0.09 * Math.sin(lobes * th + ph) + 0.05 * Math.sin((lobes * 2 + 1) * th + ph * 1.7);
  return u * u + v * v < rr * rr * 0.9;
}

// Thousands of small leaves, shaded by where they sit in the mass and by clumps within it.
function foliage(ctx: Ctx, m: Mass, palette: string[], r: Rand, leafPx: number, opts: { density?: number; kind?: Style["leaf"]; body?: boolean } = {}) {
  const density = opts.density ?? 1, kind = opts.kind ?? "broad";
  const ph = r() * TAU, f1 = (3 + r() * 3) / Math.max(m.rx, 1), f2 = (3 + r() * 3) / Math.max(m.ry, 1);
  const sample = (): [number, number, number, number] => {
    for (let i = 0; i < 40; i++) {
      const u = r() * 2 - 1, v = r() * 2 - 1;
      if (inside(m, u, v, ph)) return [m.cx + u * m.rx, m.cy + v * m.ry, u, v];
    }
    return [m.cx, m.cy, 0, 0];
  };
  const LV = 9;
  const tones = palette.map((c) => Array.from({ length: LV }, (_, i) => lit(c, (i / (LV - 1)) * 2 - 1)));

  if (opts.body !== false && density > 0.4) {
    // Dark inner body, so gaps between leaves read as depth rather than sky.
    const nb = Math.round((Math.PI * m.rx * m.ry) / (leafPx * leafPx * 9));
    for (let i = 0; i < nb; i++) {
      const [x, y, u, v] = sample();
      ctx.fillStyle = tones[0][Math.round(clamp(2.2 - u - v * 1.2, 0, 3))];
      ctx.beginPath();
      ctx.ellipse(x, y, leafPx * 2.4, leafPx * 2, 0, 0, TAU);
      ctx.fill();
    }
  }

  const n = Math.round((density * Math.PI * m.rx * m.ry) / (leafPx * leafPx * 0.6));
  const leaves: { x: number; y: number; l: number; c: number; a: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, u, v] = sample();
    const clump = Math.sin(x * f1 + ph) * Math.cos(y * f2 - ph) * 0.45;
    const rim = Math.sqrt(u * u + v * v);
    const l = clamp(0.1 - u * 0.42 - v * 0.55 + clump + (r() - 0.5) * 0.35 + (rim > 0.75 ? -u * 0.15 : -0.1), -1, 1);
    leaves.push({ x, y, l, c: Math.floor(r() * palette.length), a: r() * TAU, s: 0.7 + r() * 0.6 });
  }
  leaves.sort((a, b) => a.l - b.l);
  for (const lf of leaves) {
    ctx.fillStyle = tones[lf.c][Math.round(((lf.l + 1) / 2) * (LV - 1))];
    ctx.beginPath();
    const s = leafPx * lf.s;
    if (kind === "needle") ctx.ellipse(lf.x, lf.y, s * 0.9, s * 0.22, lf.a, 0, TAU);
    else if (kind === "scale") ctx.ellipse(lf.x, lf.y, s * 0.35, s * 0.9, (lf.a - Math.PI) * 0.15, 0, TAU);
    else if (kind === "small") ctx.ellipse(lf.x, lf.y, s * 0.6, s * 0.4, lf.a, 0, TAU);
    else ctx.ellipse(lf.x, lf.y, s, s * 0.58, lf.a, 0, TAU);
    ctx.fill();
  }
}

// Seasonal palette: a few related colors so a crown never looks like one flat green.
function paletteOf(color: string, season: Season, r: Rand): string[] {
  if (season === "fall") return [color, mix(color, "#e38b2c", 0.45), mix(color, "#f0c44a", 0.3), mix(color, "#7a2a1c", 0.3)];
  return [color, mix(color, "#9ab85a", 0.18 + r() * 0.1), mix(color, "#2f5a33", 0.2)];
}

// ---------- branches ----------

type Seg = { x1: number; y1: number; x2: number; y2: number; w: number; d: number };

function branches(x: number, y: number, ang: number, len: number, w: number, depth: number, spread: number, r: Rand, out: Seg[], d = 0) {
  if (depth === 0 || len < 1) return;
  const bend = (r() - 0.5) * 0.35;
  const x2 = x + Math.cos(ang + bend) * len, y2 = y + Math.sin(ang + bend) * len;
  out.push({ x1: x, y1: y, x2, y2, w, d });
  const kids = depth > 3 ? 2 + (r() < 0.45 ? 1 : 0) : 2;
  for (let i = 0; i < kids; i++) {
    const t = kids === 1 ? 0 : i / (kids - 1) - 0.5;
    const a = ang + bend + t * spread * (0.8 + r() * 0.5) + (r() - 0.5) * 0.25;
    // Branches lean back up toward the light.
    const up = a + (-Math.PI / 2 - a) * 0.12;
    branches(x2, y2, up, len * (0.68 + r() * 0.12), w * 0.66, depth - 1, spread, r, out, d + 1);
  }
}

function drawSegs(ctx: Ctx, segs: Seg[], bark: string, maxDepth = 99, alpha = 1) {
  ctx.lineCap = "round";
  ctx.globalAlpha = alpha;
  for (const s of segs) {
    if (s.d > maxDepth) continue;
    ctx.strokeStyle = lit(bark, -0.25 - s.d * 0.04);
    ctx.lineWidth = Math.max(0.5, s.w);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Sunlit edge on thicker limbs.
    if (s.w > 2.5) {
      ctx.strokeStyle = lit(bark, 0.3);
      ctx.lineWidth = s.w * 0.3;
      ctx.beginPath();
      ctx.moveTo(s.x1 - s.w * 0.25, s.y1);
      ctx.lineTo(s.x2 - s.w * 0.25, s.y2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function trunk(ctx: Ctx, x: number, base: number, top: number, w: number, lean: number, bark: string) {
  const grad = ctx.createLinearGradient(x - w, 0, x + w, 0);
  grad.addColorStop(0, lit(bark, 0.25));
  grad.addColorStop(0.45, bark);
  grad.addColorStop(1, lit(bark, -0.55));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, base);
  ctx.quadraticCurveTo(x - w * 0.5, base - w * 0.6, x - w * 0.42, base - w);
  ctx.lineTo(x + lean - w * 0.28, top);
  ctx.lineTo(x + lean + w * 0.28, top);
  ctx.lineTo(x + w * 0.42, base - w);
  ctx.quadraticCurveTo(x + w * 0.5, base - w * 0.6, x + w * 0.75, base);
  ctx.closePath();
  ctx.fill();
  // Bark texture.
  ctx.strokeStyle = lit(bark, -0.5);
  ctx.lineWidth = Math.max(0.4, w * 0.06);
  ctx.globalAlpha = 0.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.2, base - w * 0.5);
    ctx.lineTo(x + lean * 0.8 + i * w * 0.12, top + (base - top) * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- trees ----------

function tree(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const bark = st.bark ?? "#6b5d4e";
  const crown = st.crown ?? "oval";
  const trunkFrac = crown === "tiered" || crown === "spreading" ? 0.26 : 0.3;
  const top = g.gy - g.h, crownH = g.h * (1 - trunkFrac * 0.7);
  const ccy = top + crownH / 2;
  const tw = Math.max(2, g.w * 0.07);
  const forkY = g.gy - g.h * trunkFrac;

  const masses: Mass[] =
    crown === "spreading"
      ? [
          { cx: g.x - g.w * 0.24, cy: ccy + crownH * 0.08, rx: g.w * 0.28, ry: crownH * 0.36, lobes: 4 },
          { cx: g.x + g.w * 0.24, cy: ccy + crownH * 0.06, rx: g.w * 0.28, ry: crownH * 0.36, lobes: 4 },
          { cx: g.x, cy: ccy - crownH * 0.06, rx: g.w * 0.34, ry: crownH * 0.42, lobes: 5 },
        ]
      : crown === "tiered"
        ? [0, 1, 2].map((i) => ({ cx: g.x + (r() - 0.5) * g.w * 0.06, cy: top + crownH * (0.2 + i * 0.3), rx: g.w * (0.32 + i * 0.09), ry: crownH * 0.17, lobes: 6 }))
        : [{ cx: g.x, cy: ccy, rx: g.w / 2, ry: crownH / 2, lobes: 5 }];

  const segs: Seg[] = [];
  const stems = crown === "multistem" ? [-0.18, 0, 0.16] : [0];
  const spread = crown === "spreading" ? 1.25 : crown === "tiered" ? 1.35 : crown === "multistem" ? 0.75 : 0.85;
  for (const s of stems) {
    const lean = s * g.w * 0.5;
    const w = stems.length > 1 ? tw * 0.6 : tw;
    trunk(ctx, g.x + s * g.w * 0.08, g.gy, forkY, w, lean, bark);
    branches(g.x + s * g.w * 0.08 + lean, forkY, -Math.PI / 2 + s * 1.2, (forkY - top) * 0.36, w * 0.75, 6, spread, r, segs);
  }

  const bare = !p.foliage;
  const blooming = !!p.bloom;
  // Trees that flower in early spring do it on bare wood (maple, redbud) or with only a haze of new leaves.
  const leafDensity = bare ? 0 : blooming ? (st.flower === "tuft" ? 0 : 0.22) : 1;

  if (leafDensity < 0.5) drawSegs(ctx, segs, bark);
  else drawSegs(ctx, segs, bark, 2);

  if (p.foliage && leafDensity > 0) {
    const pal = paletteOf(p.foliage, p.tone, r);
    for (const m of masses) foliage(ctx, m, blooming ? pal.map((c) => mix(c, "#c8dc8a", 0.4)) : pal, r, g.leaf, { density: leafDensity });
    if (leafDensity >= 0.5) {
      // A few limbs showing through the lower crown.
      drawSegs(ctx, segs.filter((s) => s.d === 1 || s.d === 2).slice(0, 4), bark, 2, 0.55);
    }
  }

  const tips = segs.filter((s) => s.d >= 3);
  if (p.bloom) {
    const tuft = st.flower === "tuft";
    // Flowers along the outer twigs and the branches that carry them.
    const wood = segs.filter((s) => s.d >= (tuft ? 2 : 3));
    const n = Math.round(wood.length * (tuft ? 5 : 1.6));
    for (let i = 0; i < n; i++) {
      const s = pick(wood, r), t = r();
      const x = s.x1 + (s.x2 - s.x1) * t + (r() - 0.5) * g.leaf * 1.2, y = s.y1 + (s.y2 - s.y1) * t + (r() - 0.5) * g.leaf * 1.2;
      if (tuft) berries(ctx, x, y, g.leaf * 0.28, pick(p.bloom, r), 3, r);
      else blossom(ctx, x, y, g.leaf * (0.75 + r() * 0.5), pick(p.bloom, r), r);
    }
  }
  if (p.fruit) {
    for (let i = 0; i < tips.length * 0.7; i++) {
      const s = pick(tips, r);
      berries(ctx, s.x2 + (r() - 0.5) * g.leaf * 3, s.y2 + (r() - 0.5) * g.leaf * 3, g.leaf * 0.38, p.fruit, 2 + Math.floor(r() * 3), r);
    }
  }
  if (p.season === "fall" && p.foliage) fallenLeaves(ctx, g, paletteOf(p.foliage, "fall", r), r);
}

function fallenLeaves(ctx: Ctx, g: Geo, pal: string[], r: Rand) {
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    const x = g.x + Math.cos(a) * d * g.w * 0.6, y = g.gy + 2 + Math.abs(Math.sin(a)) * d * (g.S - g.gy) * 0.6;
    ctx.fillStyle = lit(pick(pal, r), (r() - 0.5) * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y, g.leaf * 0.7, g.leaf * 0.35, r() * TAU, 0, TAU);
    ctx.fill();
  }
}

// ---------- columnar evergreens ----------

function columnar(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const color = p.foliage ?? "#3d6b3e";
  ctx.fillStyle = "#4a3c30";
  ctx.fillRect(g.x - g.w * 0.03, g.gy - g.h * 0.06, g.w * 0.06, g.h * 0.06);
  const m: Mass = { cx: g.x, cy: g.gy - g.h * 0.52, rx: g.w / 2, ry: g.h * 0.48, shape: "cone" };
  foliage(ctx, m, paletteOf(color, "summer", r), r, g.leaf * 0.65, { kind: st.leaf ?? "scale", density: 1.5, body: false });
}

// ---------- shrubs ----------

function shrub(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const m: Mass = { cx: g.x, cy: g.gy - g.h * 0.5, rx: g.w / 2, ry: g.h * 0.56, flat: 0.82, lobes: 6 };
  const bark = "#5e4c3c";
  const base = m.cy + m.ry * 0.82;
  const stems: Seg[] = [];
  const nStems = 9;
  for (let i = 0; i < nStems; i++) {
    const a = -Math.PI / 2 + (i / (nStems - 1) - 0.5) * 1.6;
    branches(g.x + (r() - 0.5) * g.w * 0.12, g.gy, a, g.h * 0.32, Math.max(1, g.w * 0.018), 4, 0.7, r, stems);
  }
  if (!p.foliage) {
    drawSegs(ctx, stems, bark);
  } else {
    ctx.strokeStyle = lit(bark, -0.3);
    ctx.lineWidth = Math.max(0.8, g.w * 0.014);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(g.x + (r() - 0.5) * g.w * 0.15, g.gy);
      ctx.lineTo(g.x + (r() - 0.5) * g.w * 0.5, base - g.h * 0.05);
      ctx.stroke();
    }
    foliage(ctx, m, paletteOf(p.foliage, p.tone, r), r, g.leaf * (st.leaf === "small" ? 0.7 : 1), { kind: st.leaf });
  }

  if (p.bloom) {
    const style = st.flower ?? "cluster";
    const count = style === "ball" ? 11 : style === "rose" ? 26 : style === "spike" ? 70 : style === "tiny" ? 60 : 40;
    const spots = surface(m, count, r, style === "spike" ? 0.2 : 0.55);
    for (const [x, y, l] of spots) {
      const c = pick(p.bloom, r);
      if (style === "ball") hydrangea(ctx, x, y, g.leaf * 3.4, c, l, r);
      else if (style === "rose") rose(ctx, x, y, g.leaf * 1.5, c, l);
      else if (style === "spike") spike(ctx, x, y, g.leaf * 4, g.leaf * 0.45, c, l, r);
      else if (style === "tiny") berries(ctx, x, y, g.leaf * 0.35, c, 4, r);
      else cluster(ctx, x, y, g.leaf * 1.6, c, l, r);
    }
  }
  if (p.fruit) {
    const tips = stems.filter((s) => s.d >= 2);
    const spots: [number, number][] = p.foliage ? surface(m, 70, r, 0.6).map(([x, y]) => [x, y]) : tips.map((s) => [s.x2, s.y2]);
    for (const [x, y] of spots) berries(ctx, x, y, g.leaf * 0.42, p.fruit, 3 + Math.floor(r() * 4), r);
  }
}

// Points on the visible, sunward part of a mass, with how lit each one is.
function surface(m: Mass, n: number, r: Rand, depth: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const a = -Math.PI * (0.05 + r() * 0.9) + (r() < 0.25 ? Math.PI * 0.5 * (r() - 0.5) : 0);
    const d = 1 - r() * depth;
    const u = Math.cos(a) * d * 0.92, v = Math.sin(a) * d * 0.92;
    if (m.flat != null && v > m.flat - 0.1) continue;
    out.push([m.cx + u * m.rx, m.cy + v * m.ry, clamp(0.2 - u * 0.5 - v * 0.4, -1, 1)]);
  }
  return out.sort((a, b) => a[1] - b[1]);
}

// ---------- upright perennials and annuals ----------

function upright(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand, plant: Plant) {
  const color = p.foliage ?? "#5a8040";
  const pal = paletteOf(color, p.tone, r);
  // A leafy clump at the base, as these plants actually look from the side.
  foliage(ctx, { cx: g.x, cy: g.gy - g.h * 0.16, rx: g.w * 0.5, ry: g.h * 0.19, flat: 0.75, lobes: 7 }, pal, r, g.leaf * 1.1, { density: 1 });

  const n = clamp(Math.round(g.w / (g.leaf * 1.8)), 9, 22);
  const tips: [number, number, number][] = [];
  const stems: { bx: number; cx: number; cy: number; tx: number; ty: number }[] = [];
  for (let i = 0; i < n; i++) {
    const bx = g.x + (r() - 0.5) * g.w * 0.3;
    const tx = g.x + (i / (n - 1) - 0.5) * g.w * 0.9 + (r() - 0.5) * g.leaf * 2;
    const ty = g.gy - g.h * (0.68 + r() * 0.32);
    stems.push({ bx, cx: (bx + tx) / 2 + (r() - 0.5) * g.w * 0.1, cy: (g.gy + ty) / 2, tx, ty });
  }
  for (const s of stems) {
    ctx.strokeStyle = lit(color, -0.35);
    ctx.lineWidth = Math.max(0.7, g.leaf * 0.28);
    ctx.beginPath();
    ctx.moveTo(s.bx, g.gy - 1);
    ctx.quadraticCurveTo(s.cx, s.cy, s.tx, s.ty);
    ctx.stroke();
  }
  // Leafy middle, so stems read as a full plant rather than bare sticks.
  foliage(ctx, { cx: g.x, cy: g.gy - g.h * 0.4, rx: g.w * 0.4, ry: g.h * 0.24, lobes: 6 }, pal, r, g.leaf * 0.8, { density: 0.3, body: false });
  for (const s of stems) {
    for (let j = 3; j < 9; j++) {
      const t = j / 9.5;
      const x = (1 - t) * (1 - t) * s.bx + 2 * (1 - t) * t * s.cx + t * t * s.tx;
      const y = (1 - t) * (1 - t) * g.gy + 2 * (1 - t) * t * s.cy + t * t * s.ty;
      const side = j % 2 ? 1 : -1;
      leafShape(ctx, x, y, -Math.PI / 2 + side * (0.8 + r() * 0.5), g.leaf * (3 - t * 1.8), pick(pal, r), side < 0 ? 0.3 : -0.15);
    }
    const side = (s.tx - g.x) / g.w;
    tips.push([s.tx, s.ty, side]);
    // Side shoots carry a second, lower flower.
    if (r() < 0.6) {
      const t = 0.75, x = (1 - t) * (1 - t) * s.bx + 2 * (1 - t) * t * s.cx + t * t * s.tx, y = (1 - t) * (1 - t) * g.gy + 2 * (1 - t) * t * s.cy + t * t * s.ty;
      const ex = x + (side >= 0 ? 1 : -1) * g.leaf * (2 + r() * 2), ey = y - g.leaf * (2 + r() * 2);
      ctx.strokeStyle = lit(color, -0.3);
      ctx.lineWidth = Math.max(0.5, g.leaf * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(ex, y, ex, ey);
      ctx.stroke();
      tips.push([ex, ey, side]);
    }
  }
  tips.sort((a, b) => b[1] - a[1]);

  const style = st.flower ?? "daisy";
  const fr = g.leaf * (style === "dahlia" ? 3.2 : style === "umbel" ? 2.2 : style === "shaggy" ? 2 : 2) * clamp(g.k / 60, 0.9, 1.6);
  for (const [x, y, side] of tips) {
    if (p.bloom) {
      const c = pick(p.bloom, r);
      const l = clamp(0.25 - side * 0.6, -0.6, 0.7);
      if (style === "cone") daisy(ctx, x, y, fr, c, st.center ?? "#8a4a22", l, r, { droop: 0.55, cone: true });
      else if (style === "zinnia") daisy(ctx, x, y, fr, c, st.center ?? "#d0a020", l, r, { layers: 3 });
      else if (style === "dahlia") dahlia(ctx, x, y, fr, c, l, r);
      else if (style === "shaggy") shaggy(ctx, x, y, fr, c, l, r);
      else if (style === "umbel") umbel(ctx, x, y, fr, c, l, r);
      else daisy(ctx, x, y, fr, c, st.center ?? "#3b2414", l, r, {});
    } else if (plant.bloom && p.season === "fall" && (style === "daisy" || style === "cone")) {
      // Seed heads left standing for the birds.
      ctx.fillStyle = "#3a2a1c";
      ctx.beginPath();
      ctx.ellipse(x, y, fr * 0.35, fr * 0.3, 0, 0, TAU);
      ctx.fill();
    }
  }
}

function leafShape(ctx: Ctx, x: number, y: number, ang: number, len: number, color: string, l: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = lit(color, l);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0);
  ctx.fill();
  ctx.strokeStyle = lit(color, l + 0.35);
  ctx.lineWidth = Math.max(0.3, len * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

// ---------- grasses ----------

function blade(ctx: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0 - w, y0);
  ctx.quadraticCurveTo(cx - w * 0.6, cy, x1, y1);
  ctx.quadraticCurveTo(cx + w * 0.6, cy, x0 + w, y0);
  ctx.closePath();
  ctx.fill();
}

function grassForm(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const color = p.foliage ?? "#b9a07a";
  const pal = paletteOf(color, p.tone, r);
  const kind = st.grass ?? "upright";
  const n = kind === "strap" ? 34 : 110;
  const blades: { l: number; draw: () => void }[] = [];
  for (let i = 0; i < n; i++) {
    const side = r() * 2 - 1;
    const x0 = g.x + side * g.w * 0.1;
    let cx: number, cy: number, x1: number, y1: number;
    if (kind === "upright") {
      x1 = g.x + side * g.w * 0.5 * (0.5 + r() * 0.6);
      y1 = g.gy - g.h * (0.6 + r() * 0.4);
      cx = (x0 + x1) / 2;
      cy = (g.gy + y1) / 2;
    } else {
      const reach = kind === "strap" ? 0.65 : 0.55;
      x1 = g.x + side * g.w * reach * (0.5 + r() * 0.5);
      y1 = g.gy - g.h * (0.12 + (1 - Math.abs(side)) * 0.55 + r() * 0.15);
      cx = g.x + side * g.w * 0.2;
      cy = g.gy - g.h * (0.85 + r() * 0.3) * (kind === "strap" ? 0.85 : 1);
    }
    const w = (kind === "strap" ? g.leaf * 0.9 : g.leaf * 0.3) * (0.8 + r() * 0.4);
    const l = clamp(0.15 - side * 0.45 + (r() - 0.5) * 0.6, -0.9, 0.8);
    const c = lit(pick(pal, r), l);
    blades.push({ l, draw: () => blade(ctx, x0, g.gy, cx, cy, x1, y1, w, c) });
  }
  blades.sort((a, b) => a.l - b.l).forEach((b) => b.draw());

  if (kind === "strap" && p.bloom) {
    // Daylily scapes rise above the leaves, each with a few trumpets.
    for (let i = 0; i < 6; i++) {
      const tx = g.x + (i / 5 - 0.5) * g.w * 0.7, ty = g.gy - g.h * (0.95 + r() * 0.2);
      ctx.strokeStyle = lit(color, -0.3);
      ctx.lineWidth = Math.max(0.7, g.leaf * 0.3);
      ctx.beginPath();
      ctx.moveTo(g.x + (r() - 0.5) * g.w * 0.1, g.gy - g.h * 0.2);
      ctx.quadraticCurveTo(tx, g.gy - g.h * 0.6, tx, ty);
      ctx.stroke();
      lily(ctx, tx, ty, g.leaf * 2.6, pick(p.bloom, r), clamp(0.3 - (i / 5 - 0.5), -0.5, 0.8), r);
    }
  } else if (p.bloom || p.fruit) {
    // Airy seed or flower sprays above the clump.
    const c = p.fruit ?? pick(p.bloom!, r);
    ctx.fillStyle = c;
    for (let i = 0; i < 260; i++) {
      const side = r() * 2 - 1;
      const x = g.x + side * g.w * 0.55 * Math.sqrt(r());
      const y = g.gy - g.h * (0.75 + r() * 0.4) + Math.abs(side) * g.h * 0.25;
      ctx.globalAlpha = 0.35 + r() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, g.leaf * 0.28), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- rosettes: hosta, fern, coral bells ----------

function rosette(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const color = p.foliage ?? "#5a8a48";
  const pal = paletteOf(color, p.tone, r);
  const kind = st.rosette ?? "hosta";
  if (kind === "fern") return fern(ctx, g, pal, r);

  // Flower stalks first, so leaves sit in front of their bases.
  if (p.bloom) {
    const stalks = kind === "hosta" ? 5 : 9;
    for (let i = 0; i < stalks; i++) {
      const tx = g.x + (i / (stalks - 1) - 0.5) * g.w * 0.55, ty = g.gy - g.h * (0.85 + r() * 0.2);
      ctx.strokeStyle = kind === "hosta" ? lit(color, -0.2) : "#6a4a42";
      ctx.lineWidth = Math.max(0.5, g.leaf * (kind === "hosta" ? 0.3 : 0.15));
      ctx.beginPath();
      ctx.moveTo(g.x + (r() - 0.5) * g.w * 0.1, g.gy - g.h * 0.2);
      ctx.quadraticCurveTo(tx, g.gy - g.h * 0.55, tx, ty);
      ctx.stroke();
      const len = g.h * (kind === "hosta" ? 0.3 : 0.25);
      for (let j = 0; j < (kind === "hosta" ? 7 : 12); j++) {
        const y = ty + (j / 7) * len, x = tx + (r() - 0.5) * g.leaf * (kind === "hosta" ? 1.2 : 2);
        bell(ctx, x, y, g.leaf * (kind === "hosta" ? 0.9 : 0.45), pick(p.bloom, r), r);
      }
    }
  }

  const n = kind === "hosta" ? 16 : 46;
  const leaves: { x: number; y: number; a: number; s: number; l: number; c: string }[] = [];
  for (let i = 0; i < n; i++) {
    const t = r() * 2 - 1;
    const back = r();
    const x = g.x + t * g.w * 0.36;
    const y = g.gy - g.h * (kind === "hosta" ? 0.18 + back * 0.32 : 0.06 + back * 0.26 * (1 - Math.abs(t) * 0.6));
    leaves.push({ x, y, a: t * 0.9, s: g.w * (kind === "hosta" ? 0.2 : 0.17) * (0.8 + r() * 0.35) * (1.1 - back * 0.3), l: clamp((kind === "hosta" ? 0.2 : 0) - t * 0.5 - back * 0.45 + (r() - 0.5) * 0.4, -0.85, 0.7), c: pick(pal, r) });
  }
  leaves.sort((a, b) => a.y - b.y);
  for (const lf of leaves) {
    // Petiole from the crown; coral bells' leaves sit too close to show theirs.
    if (kind === "hosta") ctx.strokeStyle = lit(lf.c, -0.2);
    if (kind === "hosta") {
      ctx.lineWidth = Math.max(0.6, lf.s * 0.06);
      ctx.beginPath();
      ctx.moveTo(g.x, g.gy - 1);
      ctx.lineTo(lf.x, lf.y + lf.s * 0.3);
      ctx.stroke();
    }
    if (kind === "hosta") heartLeaf(ctx, lf.x, lf.y, lf.s, lf.a, lf.c, lf.l, true);
    else roundLeaf(ctx, lf.x, lf.y, lf.s, lf.c, lf.l, r);
  }
}

function heartLeaf(ctx: Ctx, x: number, y: number, s: number, tilt: number, color: string, l: number, veins: boolean, squash = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.rotate(tilt);
  const grad = ctx.createLinearGradient(-s * 0.5, -s, s * 0.5, s * 0.3);
  grad.addColorStop(0, lit(color, l + 0.25));
  grad.addColorStop(1, lit(color, l - 0.3));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.75, s * 0.1, -s * 0.55, -s * 0.75, 0, -s * 1.05);
  ctx.bezierCurveTo(s * 0.55, -s * 0.75, s * 0.75, s * 0.1, 0, s * 0.3);
  ctx.fill();
  if (veins) {
    ctx.strokeStyle = lit(color, l - 0.45);
    ctx.lineWidth = Math.max(0.3, s * 0.025);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.25);
    ctx.lineTo(0, -s * 0.95);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const yy = s * (0.1 - i * 0.25);
        ctx.moveTo(0, yy);
        ctx.quadraticCurveTo(side * s * 0.3, yy - s * 0.1, side * s * (0.45 - i * 0.07), yy - s * 0.35);
      }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function roundLeaf(ctx: Ctx, x: number, y: number, s: number, color: string, l: number, r: Rand) {
  ctx.fillStyle = lit(color, l);
  ctx.beginPath();
  const lobes = 7, ph = r() * TAU;
  for (let i = 0; i <= lobes * 4; i++) {
    const a = (i / (lobes * 4)) * TAU;
    const rr = s * (0.5 + 0.06 * Math.abs(Math.sin((a * lobes) / 2 + ph)));
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fill();
  ctx.strokeStyle = lit(color, l - 0.4);
  ctx.lineWidth = Math.max(0.3, s * 0.03);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.6;
    ctx.moveTo(x, y + s * 0.2);
    ctx.lineTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.3);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fern(ctx: Ctx, g: Geo, pal: string[], r: Rand) {
  const n = 16;
  const L = Math.max(g.h, g.w * 0.55);
  const fronds = Array.from({ length: n }, (_, i) => {
    const th = (i / (n - 1) - 0.5) * 2.7 + (r() - 0.5) * 0.18;
    return { th, len: L * (0.82 + r() * 0.25) * (1 - Math.abs(th) * 0.08), c: pick(pal, r), l: clamp(0.2 - Math.sin(th) * 0.6 + (r() - 0.5) * 0.4, -0.8, 0.8) };
  });
  // Outer fronds are behind; the upright middle ones in front.
  fronds.sort((a, b) => Math.abs(b.th) - Math.abs(a.th));
  for (const f of fronds) {
    const sx = Math.sin(f.th), cy0 = Math.cos(f.th);
    const cx = g.x + sx * f.len * 0.45, cy = g.gy - f.len * (0.55 + cy0 * 0.35);
    const x1 = g.x + sx * f.len * 0.95, y1 = g.gy - f.len * (cy0 * 0.75 - Math.abs(sx) * 0.05) - f.len * 0.08;
    ctx.strokeStyle = lit(f.c, f.l - 0.35);
    ctx.lineWidth = Math.max(0.5, g.leaf * 0.22);
    ctx.beginPath();
    ctx.moveTo(g.x, g.gy);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    const steps = 20;
    for (let j = 3; j <= steps; j++) {
      const t = j / steps;
      const x = (1 - t) * (1 - t) * g.x + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * g.gy + 2 * (1 - t) * t * cy + t * t * y1;
      const dx = 2 * (1 - t) * (cx - g.x) + 2 * t * (x1 - cx), dy = 2 * (1 - t) * (cy - g.gy) + 2 * t * (y1 - cy);
      const a = Math.atan2(dy, dx);
      const len = g.leaf * 2.6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7) + g.leaf * 0.25;
      for (const side of [-1, 1]) {
        ctx.fillStyle = lit(f.c, f.l + side * 0.12 + (r() - 0.5) * 0.15);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + side * (1.15 + t * 0.25));
        ctx.beginPath();
        ctx.ellipse(len / 2, 0, len / 2, Math.max(0.6, g.leaf * 0.34), 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// ---------- mats ----------

function matForm(ctx: Ctx, g: Geo, p: Portrait, st: Style, r: Rand) {
  const color = p.foliage ?? "#6c8f4c";
  const pal = paletteOf(color, p.tone, r);
  if ((st.mat ?? "carpet") === "ginger") {
    // A low colony of heart-shaped leaves on short stalks, flowers hidden at the base.
    const leaves = Array.from({ length: 30 }, () => {
      const u = r() * 2 - 1, back = r();
      return { x: g.x + u * g.w * 0.38, y: g.gy - g.h * (0.22 + back * 0.4 * (1 - u * u * 0.6)), u, c: pick(pal, r) };
    });
    // Deep shade under the leaves.
    const shade = ctx.createRadialGradient(g.x, g.gy, 0, g.x, g.gy, g.w * 0.45);
    shade.addColorStop(0, lit(color, -0.75));
    shade.addColorStop(1, rgbaOf(lit(color, -0.6), 0));
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(g.x, g.gy, g.w * 0.45, g.h * 0.5, 0, Math.PI, TAU);
    ctx.fill();
    leaves.sort((a, b) => a.y - b.y);
    if (p.bloom) for (let i = 0; i < 6; i++) bell(ctx, g.x + (r() - 0.5) * g.w * 0.6, g.gy - g.h * 0.12, g.leaf * 1.1, pick(p.bloom, r), r);
    for (const lf of leaves) {
      ctx.strokeStyle = lit(lf.c, -0.6);
      ctx.lineWidth = Math.max(0.4, g.leaf * 0.14);
      ctx.beginPath();
      ctx.moveTo(lf.x - lf.u * g.leaf, g.gy);
      ctx.lineTo(lf.x, lf.y);
      ctx.stroke();
      // Leaves are held flat, so from the side they are seen foreshortened.
      heartLeaf(ctx, lf.x, lf.y, g.w * 0.17, Math.PI / 2 + lf.u * 0.6 + (r() - 0.5) * 1.2, lf.c, clamp(0.25 - lf.u * 0.4 + (r() - 0.5) * 0.3, -0.7, 0.7), true, 0.42);
    }
    return;
  }
  const m: Mass = { cx: g.x, cy: g.gy - g.h * 0.45, rx: g.w / 2, ry: g.h * 0.6, flat: 0.75, lobes: 8 };
  foliage(ctx, m, pal, r, g.leaf * 0.8, { kind: st.leaf ?? "needle", density: 1.1 });
  if (p.bloom) for (const [x, y, l] of surface(m, 160, r, 0.7)) star(ctx, x, y, g.leaf * 0.9, pick(p.bloom, r), l);
}

// ---------- dormant ----------

function dormant(ctx: Ctx, g: Geo, plant: Plant, r: Rand) {
  const w = Math.max(g.w * 0.6, g.S * 0.15);
  ctx.fillStyle = "#6a5240";
  ctx.beginPath();
  ctx.ellipse(g.x, g.gy, w / 2, (g.S - g.gy) * 0.3, 0, Math.PI, TAU);
  ctx.fill();
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = lit("#6a5240", (r() - 0.5) * 0.8);
    ctx.fillRect(g.x + (r() - 0.5) * w * 0.9, g.gy - r() * (g.S - g.gy) * 0.25, 1.5, 1);
  }
  if (plant.lifecycle === "annual" || plant.lifecycle === "tender-perennial") return;
  // Dried stubs where last year's stems were cut back.
  ctx.strokeStyle = "#a08a62";
  ctx.lineWidth = Math.max(0.8, g.leaf * 0.3);
  for (let i = 0; i < 9; i++) {
    const x = g.x + (r() - 0.5) * w * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, g.gy - 1);
    ctx.lineTo(x + (r() - 0.5) * g.leaf, g.gy - g.leaf * (1.5 + r() * 2));
    ctx.stroke();
  }
}

// ---------- flowers and fruit ----------

function petal(ctx: Ctx, x: number, y: number, a: number, len: number, wid: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.35, -wid, len * 0.85, -wid * 0.8, len, 0);
  ctx.bezierCurveTo(len * 0.85, wid * 0.8, len * 0.35, wid, 0, 0);
  ctx.fill();
  ctx.restore();
}

// A daisy seen slightly from the side: petals foreshortened into an ellipse.
function daisy(ctx: Ctx, x: number, y: number, rad: number, color: string, center: string, l: number, r: Rand, o: { droop?: number; cone?: boolean; layers?: number }) {
  const layers = o.layers ?? 1;
  for (let k = 0; k < layers; k++) {
    const n = 13 + k * 3, len = rad * (1 - k * 0.22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 0.2 + r() * 0.1;
      const dx = Math.cos(a), dy = Math.sin(a) * 0.5 + (o.droop ?? 0.08);
      const ang = Math.atan2(dy, dx), L = len * Math.hypot(dx, dy);
      const front = Math.sin(a) > 0;
      petal(ctx, x, y, ang, L, rad * 0.22, lit(color, l + (front ? 0.05 : -0.25) - dx * 0.15 - k * 0.08));
    }
  }
  const cr = rad * (o.cone ? 0.38 : 0.3);
  const grad = ctx.createRadialGradient(x - cr * 0.4, y - cr * 0.5, 0, x, y, cr * 1.3);
  grad.addColorStop(0, lit(center, 0.35));
  grad.addColorStop(1, lit(center, -0.5));
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (o.cone) ctx.ellipse(x, y - cr * 0.35, cr, cr * 0.95, 0, 0, TAU);
  else ctx.ellipse(x, y, cr, cr * 0.7, 0, 0, TAU);
  ctx.fill();
}

function dahlia(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  for (let k = 0; k < 5; k++) {
    const n = 16 - k * 2, len = rad * (1 - k * 0.18);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 0.4 + r() * 0.08;
      petal(ctx, x, y - k * rad * 0.06, Math.atan2(Math.sin(a) * 0.62, Math.cos(a)), len * Math.hypot(Math.cos(a), Math.sin(a) * 0.62), rad * 0.24, lit(color, l - 0.3 + k * 0.12 - Math.cos(a) * 0.1));
    }
  }
}

function shaggy(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.5, rad * 0.13);
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI * (0.05 + r() * 0.9) + (r() < 0.3 ? Math.PI : 0);
    const len = rad * (0.6 + r() * 0.5);
    ctx.strokeStyle = lit(color, l - Math.cos(a) * 0.2 + (r() - 0.5) * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.3, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.7 + len * 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = lit(color, l - 0.4);
  ctx.beginPath();
  ctx.ellipse(x, y, rad * 0.3, rad * 0.25, 0, 0, TAU);
  ctx.fill();
}

function umbel(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  for (let i = 0; i < 30; i++) {
    const u = r() * 2 - 1, v = r();
    const px = x + u * rad, py = y - v * rad * 0.45 * (1 - u * u);
    star(ctx, px, py, rad * 0.2, color, clamp(l - u * 0.3 + v * 0.3, -1, 1));
  }
}

function star(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number) {
  ctx.fillStyle = lit(color, l);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? rad * 0.45 : rad;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
  }
  ctx.fill();
  ctx.fillStyle = lit(color, l - 0.5);
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.15, 0, TAU);
  ctx.fill();
}

function rose(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number) {
  const grad = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4, 0, x, y, rad);
  grad.addColorStop(0, lit(color, l + 0.3));
  grad.addColorStop(1, lit(color, l - 0.35));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rad, rad * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = lit(color, l - 0.55);
  ctx.lineWidth = Math.max(0.4, rad * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.55, 0.3, 4.2);
  ctx.moveTo(x + rad * 0.25, y);
  ctx.arc(x, y, rad * 0.25, 0, 3.5);
  ctx.stroke();
}

function hydrangea(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  const n = Math.max(12, Math.round(rad * 3.5));
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    const u = Math.cos(a) * d, v = Math.sin(a) * d;
    const fl = clamp(l + 0.15 - u * 0.45 - v * 0.55, -1, 1);
    star(ctx, x + u * rad, y + v * rad * 0.85, rad * 0.24, color, fl * 0.8 - 0.05);
  }
}

function cluster(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * rad;
    ctx.fillStyle = lit(color, l - Math.cos(a) * 0.3 * (d / rad) - 0.05);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, rad * 0.3, 0, TAU);
    ctx.fill();
  }
}

function spike(ctx: Ctx, x: number, y: number, len: number, rad: number, color: string, l: number, r: Rand) {
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = lit(color, l + (r() - 0.5) * 0.4 - i * 0.03);
    ctx.beginPath();
    ctx.arc(x + (r() - 0.5) * rad, y - (i / 7) * len, rad * (1 - i * 0.08), 0, TAU);
    ctx.fill();
  }
}

function bell(ctx: Ctx, x: number, y: number, rad: number, color: string, r: Rand) {
  ctx.fillStyle = lit(color, (r() - 0.5) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - rad * 0.4, y);
  ctx.quadraticCurveTo(x - rad * 0.5, y + rad * 1.1, x - rad * 0.7, y + rad * 1.2);
  ctx.lineTo(x + rad * 0.7, y + rad * 1.2);
  ctx.quadraticCurveTo(x + rad * 0.5, y + rad * 1.1, x + rad * 0.4, y);
  ctx.closePath();
  ctx.fill();
}

function lily(ctx: Ctx, x: number, y: number, rad: number, color: string, l: number, r: Rand) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + r() * 0.2 - Math.PI / 2;
    petal(ctx, x, y, Math.atan2(Math.sin(a) * 0.7, Math.cos(a)), rad, rad * 0.32, lit(color, l + (Math.sin(a) > 0 ? 0 : -0.25) - Math.cos(a) * 0.15));
  }
  ctx.fillStyle = lit(color, -0.4);
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.18, 0, TAU);
  ctx.fill();
}

// Five-petal blossom for flowering trees; tiny tufts for red maple's wind-pollinated flowers.
function blossom(ctx: Ctx, x: number, y: number, rad: number, color: string, r: Rand) {
  const l = (r() - 0.4) * 0.6;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + r();
    ctx.fillStyle = lit(color, l + Math.sin(a) * -0.2);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * rad * 0.45, y + Math.sin(a) * rad * 0.4, rad * 0.42, 0, TAU);
    ctx.fill();
  }
}

function berries(ctx: Ctx, x: number, y: number, rad: number, color: string, n: number, r: Rand) {
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * rad * 4, by = y + (r() - 0.5) * rad * 3;
    const grad = ctx.createRadialGradient(bx - rad * 0.35, by - rad * 0.35, 0, bx, by, rad);
    grad.addColorStop(0, lit(color, 0.55));
    grad.addColorStop(1, lit(color, -0.35));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(0.6, rad), 0, TAU);
    ctx.fill();
  }
}
