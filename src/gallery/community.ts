import type { Planting, Point, Property } from "../model/property";
import { rng } from "../render/geometry";

// A garden someone has made public. The property is already the cleaned public copy.
export type GalleryGarden = {
  id: string;
  title: string;
  owner: string;
  // Days since it was made public. New gardens have small numbers.
  ageDays: number;
  stars: { sum: number; count: number };
  saves: number;
  property: Property;
  basedOn?: { id: string; title: string };
};

// Plant groups that look good together, so each made-up garden has a clear idea.
const THEMES = [
  {
    name: "Pollinator",
    nouns: ["meadow", "border", "patch", "garden"],
    beds: ["purple-coneflower", "black-eyed-susan", "wild-bergamot", "butterfly-weed", "little-bluestem", "catmint"],
    shrubs: ["ninebark", "winterberry", "annabelle-hydrangea"],
    trees: ["serviceberry", "eastern-redbud"],
  },
  {
    name: "Shade",
    nouns: ["retreat", "woodland", "nook", "garden"],
    beds: ["hosta", "christmas-fern", "coral-bells", "wild-ginger"],
    shrubs: ["annabelle-hydrangea", "boxwood"],
    trees: ["flowering-dogwood", "red-maple"],
  },
  {
    name: "Cottage",
    nouns: ["garden", "yard", "beds", "corner"],
    beds: ["zinnia", "dahlia", "catmint", "daylily", "coral-bells", "creeping-phlox"],
    shrubs: ["knock-out-rose", "annabelle-hydrangea", "boxwood"],
    trees: ["eastern-redbud", "serviceberry"],
  },
  {
    name: "Prairie",
    nouns: ["yard", "meadow", "lawn", "planting"],
    beds: ["prairie-dropseed", "little-bluestem", "purple-coneflower", "black-eyed-susan", "butterfly-weed"],
    shrubs: ["ninebark"],
    trees: ["red-maple", "serviceberry"],
  },
  {
    name: "Tidy",
    nouns: ["yard", "garden", "front", "borders"],
    beds: ["daylily", "hosta", "creeping-phlox", "coral-bells"],
    shrubs: ["boxwood", "green-giant-arborvitae", "knock-out-rose"],
    trees: ["flowering-dogwood", "eastern-redbud"],
  },
] as const;

const ADJECTIVES = ["Sunny", "Quiet", "Backyard", "Little", "Easy", "Busy", "Hilltop", "Corner", "Front", "Family", "Fishers", "Carmel", "Bloomington", "Zionsville", "Broad Ripple"];
const FIRST = ["Maya", "Jordan", "Sam", "Priya", "Luis", "Grace", "Omar", "Ellie", "Theo", "Nia", "Hank", "Rosa", "Ben", "Ava", "Kenji", "Dana", "Ruth", "Eli", "June", "Marco"];
const FEATURES = ["birdbath", "feeder", "bench", "fire-pit", "water-feature"] as const;

type NoId<T> = T extends unknown ? Omit<T, "id"> : never;

const r1 = (n: number) => Math.round(n * 10) / 10;

// A rough rounded outline inside a box, so beds don't look like drawn rectangles.
function bed(r: () => number, x: number, y: number, w: number, h: number): Point[] {
  const j = (n: number) => (r() - 0.5) * n;
  return [
    [x + j(1), y + j(1)],
    [x + w * 0.5 + j(2), y + j(1.5)],
    [x + w + j(1), y + j(1)],
    [x + w + j(1.5), y + h * 0.5 + j(1)],
    [x + w + j(1), y + h + j(1)],
    [x + w * 0.5 + j(2), y + h + j(1.5)],
    [x + j(1), y + h + j(1)],
    [x + j(1.5), y + h * 0.5 + j(1)],
  ].map(([a, b]) => [r1(a), r1(b)] as Point);
}

const rect = (x: number, y: number, w: number, h: number): Point[] => [
  [r1(x), r1(y)],
  [r1(x + w), r1(y)],
  [r1(x + w), r1(y + h)],
  [r1(x), r1(y + h)],
];

// One made-up garden. The street is at the bottom of the plan, like the sample lot.
export function makeGarden(seed: number): GalleryGarden {
  const r = rng(seed * 7919 + 13);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const theme = pick(THEMES);
  const id = `g${seed}`;
  // How much people like it. Loved gardens are also fuller, so the top of the wall looks it.
  const quality = Math.min(9.7, Math.max(3, 7.1 + (r() + r() + r() - 1.5) * 2.4));
  const rich = (quality - 5) / 4.7; // about 0 for plain gardens, 1 for the best

  const W = Math.round(between(60, 100));
  const H = Math.round(between(105, 150));
  const houseW = between(0.5, 0.64) * W;
  const houseD = between(30, 40);
  const houseX = between(8, W - houseW - 8);
  const houseY = H - between(24, 34) - houseD;
  const driveLeft = houseX > W - houseX - houseW;
  const driveX = driveLeft ? Math.max(2, houseX - 14) : Math.min(W - 16, houseX + houseW);

  const plantings: Planting[] = [];
  const surfaces: Property["surfaces"] = [
    { id: "driveway", kind: "driveway", outline: rect(driveX, houseY + houseD * 0.4, 14, H - houseY - houseD * 0.4) },
    { id: "walk", kind: pick(["path", "stepping-stones"] as const), outline: rect(houseX + houseW * 0.4, houseY + houseD, 4, H - houseY - houseD) },
  ];
  let n = 0;
  const add = (p: NoId<Planting>) => plantings.push({ ...p, id: `p${n++}` } as Planting);

  // Patio or deck behind the house.
  const patioW = between(14, 24);
  const patioX = houseX + between(2, houseW - patioW - 2);
  const patioY = houseY - between(10, 16);
  surfaces.push({ id: "patio", kind: pick(["patio", "patio", "gravel", "stepping-stones"] as const), outline: rect(patioX, patioY, patioW, houseY - patioY) });

  // A long bed along the back fence, split into drifts of different plants.
  const backD = between(7, 13);
  const backX = between(3, 8);
  const backW = W - backX * 2;
  surfaces.push({ id: "back-bed", kind: "mulch", outline: bed(r, backX - 1, 2, backW + 2, backD + 2) });
  const drifts = 2 + Math.floor(r() * 3);
  for (let i = 0; i < drifts; i++) {
    const x = backX + (backW / drifts) * i;
    add({ type: "region", plantId: pick(theme.beds), outline: bed(r, x + 0.5, 3, backW / drifts - 1, backD), seed: Math.floor(r() * 1000) });
  }

  // A side bed along one fence, sometimes.
  if (r() < 0.7) {
    const left = r() < 0.5;
    const sx = left ? 3 : W - 11;
    const sy = backD + between(8, 14);
    const sh = Math.max(8, houseY - sy - between(4, 14));
    surfaces.push({ id: "side-bed", kind: "mulch", outline: bed(r, sx - 1, sy - 1, 10, sh + 2) });
    add({ type: "region", plantId: pick(theme.beds), outline: bed(r, sx, sy, 8, sh), seed: Math.floor(r() * 1000) });
  }

  // Island beds in the lawn: more in better-loved gardens.
  const islands = Math.floor(rich * 2.2 + r() * 0.9);
  for (let i = 0; i < islands; i++) {
    const iw = between(10, 18), ih = between(6, 10);
    const ix = between(12, W - iw - 12), iy = between(backD + 12, Math.max(backD + 13, patioY - ih - 6));
    surfaces.push({ id: `island-${i}`, kind: "mulch", outline: bed(r, ix - 1.5, iy - 1.5, iw + 3, ih + 3) });
    add({ type: "region", plantId: pick(theme.beds), outline: bed(r, ix, iy, iw * 0.55, ih), seed: Math.floor(r() * 1000) });
    add({ type: "region", plantId: pick(theme.beds), outline: bed(r, ix + iw * 0.55, iy, iw * 0.45, ih), seed: Math.floor(r() * 1000) });
  }

  // A foundation bed across the front of the house, in most gardens people like.
  if (r() < 0.3 + rich * 0.7) {
    const fx = houseX + 1, fw = houseW * 0.38, fy = houseY + houseD + 1;
    surfaces.push({ id: "front-bed", kind: "mulch", outline: rect(fx - 1, fy - 0.5, fw + 1, 6) });
    add({ type: "region", plantId: pick(theme.beds), outline: rect(fx, fy + 2.5, fw - 1, 2.5), seed: Math.floor(r() * 1000) });
  }

  // Beds hugging the patio, in the better gardens.
  if (r() < rich) {
    surfaces.push({ id: "patio-bed", kind: "mulch", outline: bed(r, patioX - 7, patioY - 1, 6, houseY - patioY + 1) });
    add({ type: "region", plantId: pick(theme.beds), outline: bed(r, patioX - 6.5, patioY, 5, houseY - patioY - 1), seed: Math.floor(r() * 1000) });
  }

  // Trees in the back corners and one out front.
  const trees = 1 + Math.floor(r() * 3);
  for (let i = 0; i < trees; i++) {
    const at: Point = i === 2 ? [r1(between(6, W - 6)), r1(H - between(6, 12))] : [r1(i === 0 ? between(8, 16) : W - between(8, 16)), r1(backD + between(8, 20))];
    add({ type: "single", plantId: pick(theme.trees), at });
  }

  // A shrub row along the foundation or a side fence.
  const shrub = pick(theme.shrubs);
  if (!surfaces.some((s) => s.id === "front-bed")) add({ type: "row", plantId: shrub, path: [[r1(houseX + 2), r1(houseY + houseD + 2)], [r1(houseX + houseW * 0.38), r1(houseY + houseD + 2)]] });
  else {
    const x = r() < 0.5 ? 2.5 : W - 2.5;
    add({ type: "row", plantId: shrub, path: [[x, r1(backD + 6)], [x, r1(backD + between(18, 34))]] });
  }
  // A few single shrubs near the patio.
  for (let i = 0; i < 1 + Math.floor(r() * 3); i++) add({ type: "single", plantId: pick(theme.shrubs), at: [r1(patioX - 3 + i * (patioW + 6) / 2), r1(patioY - 3)] });

  const fenceKind = pick(["solid", "semi-open", "open"] as const);
  const features: Property["features"] = [];
  for (let i = 0; i < Math.floor(r() * 3); i++) features.push({ id: `f${i}`, kind: pick(FEATURES), at: [r1(between(14, W - 14)), r1(between(backD + 10, patioY - 4))] });

  const property: Property = {
    id,
    name: "",
    units: "ft",
    headingDeg: pick([0, 0, 90, 180, 270]),
    lot: { outline: rect(0, 0, W, H) },
    house: { outline: rect(houseX, houseY, houseW, houseD), heightFt: Math.round(between(16, 28)) },
    fences: [
      { id: "fence-back", kind: fenceKind, heightFt: 6, path: [[0, 0], [W, 0]] },
      { id: "fence-west", kind: fenceKind, heightFt: 5, path: [[0, 0], [0, r1(houseY + houseD * 0.5)]] },
      { id: "fence-east", kind: fenceKind, heightFt: 5, path: [[W, 0], [W, r1(houseY + houseD * 0.5)]] },
    ],
    surfaces,
    structures: r() < 0.35 ? [{ id: "shed", kind: "shed", outline: rect(W - 12, backD + 4, 9, 11), heightFt: 9 }] : [],
    edges: [],
    features,
    plantings,
  };

  const title = `${pick(ADJECTIVES)} ${theme.name.toLowerCase()} ${pick(theme.nouns)}`;
  property.name = title[0].toUpperCase() + title.slice(1);

  // Ratings: most gardens are liked, a few are loved. Newer gardens have fewer ratings.
  const ageDays = Math.floor(r() ** 1.6 * 420);
  const count = Math.floor((0.12 + ageDays / 420) * r() * 140 * (quality / 7) ** 2);
  // Real ratings scatter, so even loved gardens rarely average a perfect 10.
  const sum = Math.min(count * 10, Math.round(count * (quality - r() * 0.4)));
  const saves = Math.floor(count * (quality / 10) ** 3 * between(0.6, 2.2));

  return { id, title: property.name, owner: `${pick(FIRST)} ${String.fromCharCode(65 + Math.floor(r() * 26))}.`, ageDays, stars: { sum, count }, saves, property };
}

export function makeCommunity(size = 500): GalleryGarden[] {
  return Array.from({ length: size }, (_, i) => makeGarden(i + 1));
}

// Demo: a well-loved new garden one rating short of ranking. Your rating makes it rankable,
// and simulated neighbors then carry it into the top 10.
export const DEMO_ID = "demo-rising";

export function makeDemoGarden(): GalleryGarden {
  const g = makeGarden(528);
  const title = "Rising star meadow";
  return {
    ...g,
    id: DEMO_ID,
    title,
    owner: "Lena W.",
    ageDays: 0,
    stars: { sum: 38, count: 4 },
    saves: 24,
    property: { ...g.property, id: DEMO_ID, name: title },
  };
}
