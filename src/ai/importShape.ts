import { fenceKinds, propertySchema, structureKinds, surfaceKinds, type Point, type Property } from "../model/property";

// The image import's schema, prompt, and conversion. Pure code, so the browser can rescale a result.
// The model answers in a 0-1000 grid over the aerial, so the API's own image resizing does not matter.
// Code converts the grid to feet, clamps shapes to the lot, and checks the result.

type GridPt = { x: number; y: number };
export type ImportRaw = {
  imageWidthFt: number;
  scaleBasis: string;
  lot: GridPt[];
  house: { outline: GridPt[]; heightFt: number };
  surfaces: { kind: (typeof surfaceKinds)[number]; outline: GridPt[] }[];
  structures: { kind: (typeof structureKinds)[number]; outline: GridPt[]; heightFt: number }[];
  fences: { kind: (typeof fenceKinds)[number]; heightFt: number; path: GridPt[] }[];
  plants: { plantId: string; at: GridPt; note: string }[];
  beds: { plantId: string; outline: GridPt[] }[];
  notes: string;
};

export type LibraryPlant = { id: string; commonName: string; category: string };
export type Image = { name: string; mime: string; data: Buffer; width: number; height: number };
export type Aerial = { name: string; width: number; height: number };

const pt = { type: "object", additionalProperties: false, required: ["x", "y"], properties: { x: { type: "number" }, y: { type: "number" } } };
const pts = { type: "array", items: pt };
const obj = (properties: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export function schema(plantIds: string[]) {
  const plantId = { type: "string", enum: plantIds };
  return obj({
    imageWidthFt: { type: "number", description: "How many feet the full width of the aerial covers." },
    scaleBasis: { type: "string", description: "What the scale estimate is based on, such as car lengths or street width." },
    lot: { ...pts, description: "Corners of the subject lot, clockwise." },
    house: obj({ outline: pts, heightFt: { type: "number" } }),
    surfaces: { type: "array", items: obj({ kind: { type: "string", enum: surfaceKinds }, outline: pts }) },
    structures: { type: "array", items: obj({ kind: { type: "string", enum: structureKinds }, outline: pts, heightFt: { type: "number" } }) },
    fences: { type: "array", items: obj({ kind: { type: "string", enum: fenceKinds }, heightFt: { type: "number" }, path: pts }) },
    plants: { type: "array", description: "Trees and large shrubs, one per trunk.", items: obj({ plantId, at: pt, note: { type: "string" } }) },
    beds: { type: "array", description: "Planting beds, each with its main plant.", items: obj({ plantId, outline: pts }) },
    notes: { type: "string" },
  });
}

export function instructions(plants: LibraryPlant[]) {
  return `You trace a residential lot in Indiana from an aerial image, for a garden planning app.

The first image is a straight-down aerial with north up. Any other images are ground-level listing photos of the same property. Use them only to identify plants and beds.

The subject property is the lot that contains the center of the aerial. Trace only that lot and what is on it.

Coordinates: give every point on a 0-1000 grid over the aerial. (0,0) is the top-left corner and (1000,1000) is the bottom-right. x grows to the right and y grows down.

Scale: estimate how many feet the full aerial width covers. Use objects of known size: cars are about 15 ft long and 6 ft wide, residential streets are about 30 ft from curb to curb, sidewalks are about 5 ft wide, and a one-car garage door is about 9 ft wide. Say what you used.

Lot: use fences, driveways, mow lines, hedges, and the spacing of neighbor houses. Lots in this area are often 50 to 100 ft wide and 120 to 200 ft deep. The lot runs from the street edge of the front yard to the back line.

Trace:
- house: the main roof outline. Give its roof ridge height in feet.
- surfaces: driveway, patio, path, lawn areas, gravel, and mulch.
- structures: detached garage or shed (as shed), deck, pergola, and raised beds.
- fences: as paths along the fence line.
- plants: each tree or large shrub, at its trunk or crown center. Pick the closest match from the plant list, by category first, then by look.
- beds: planting beds along the house and elsewhere, each with the closest match for its main plant.

Aerials are often taken in early spring, with bare trees. A bare tree shows as a gray web of branches and a long branch shadow. Count it as a tree.
Fences are thin lines and are easy to miss. When a listing photo shows a fence, find its line in the aerial and trace it.
Use the listing photos to confirm trees, fences, and beds, then place each one where it is in the aerial.

Use 4 to 12 points per outline. Skip anything that neither the aerial nor the photos show. Do not invent features.

Plant list (id: name, category):
${plants.map((p) => `${p.id}: ${p.commonName}, ${p.category}`).join("\n")}`;
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "import";

const round = (n: number) => Math.round(n * 10) / 10;

function area(o: Point[]) {
  let a = 0;
  for (let i = 0; i < o.length; i++) {
    const [x1, y1] = o[i];
    const [x2, y2] = o[(i + 1) % o.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

// Grid points to feet, measured from the lot's top-left. Shapes are clamped to the lot's box.
export function toProperty(raw: ImportRaw, opts: { id: string; name: string; aerial: Aerial }): Property {
  const ftPerPx = raw.imageWidthFt / opts.aerial.width;
  const px = (g: GridPt): Point => [(g.x / 1000) * opts.aerial.width, (g.y / 1000) * opts.aerial.height];
  const lotPx = raw.lot.map(px);
  const minX = Math.min(...lotPx.map((p) => p[0]));
  const minY = Math.min(...lotPx.map((p) => p[1]));
  const lot = lotPx.map(([x, y]): Point => [round((x - minX) * ftPerPx), round((y - minY) * ftPerPx)]);
  const w = Math.max(...lot.map((p) => p[0]));
  const h = Math.max(...lot.map((p) => p[1]));
  const inLot = ([x, y]: Point) => x >= 0 && y >= 0 && x <= w && y <= h;
  const ft = (g: GridPt): Point => {
    const [x, y] = px(g);
    return [round(Math.min(w, Math.max(0, (x - minX) * ftPerPx))), round(Math.min(h, Math.max(0, (y - minY) * ftPerPx)))];
  };
  const rawFt = (g: GridPt): Point => {
    const [x, y] = px(g);
    return [(x - minX) * ftPerPx, (y - minY) * ftPerPx];
  };
  // Clamping can fold a shape onto the lot edge, so tiny or degenerate shapes are dropped.
  const shape = (o: GridPt[]) => {
    const pts = o.map(ft).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    return pts.length >= 3 && area(pts) >= 4 ? pts : null;
  };
  const line = (o: GridPt[]) => {
    const pts = o.map(ft);
    return pts.length >= 2 ? pts : null;
  };

  const house = shape(raw.house.outline) ?? [[w / 2 - 15, h / 2 - 15], [w / 2 + 15, h / 2 - 15], [w / 2 + 15, h / 2 + 15], [w / 2 - 15, h / 2 + 15]];
  const p: Property = {
    id: opts.id,
    name: opts.name,
    units: "ft",
    headingDeg: 0,
    lot: { outline: lot },
    house: { outline: house, heightFt: raw.house.heightFt > 0 ? raw.house.heightFt : 20 },
    fences: [],
    surfaces: [],
    structures: [],
    edges: [],
    features: [],
    plantings: [],
    underlay: { file: opts.aerial.name, sizePx: [opts.aerial.width, opts.aerial.height], ftPerPx: round4(ftPerPx), originFt: [round(-minX * ftPerPx), round(-minY * ftPerPx)] },
  };
  raw.surfaces.forEach((s, i) => {
    const o = shape(s.outline);
    if (o) p.surfaces.push({ id: `${s.kind}-${i + 1}`, kind: s.kind, outline: o });
  });
  raw.structures.forEach((s, i) => {
    const o = shape(s.outline);
    if (o) p.structures.push({ id: `${s.kind}-${i + 1}`, kind: s.kind, outline: o, heightFt: s.heightFt > 0 ? s.heightFt : 10 });
  });
  raw.fences.forEach((f, i) => {
    const path = line(f.path);
    if (path) p.fences.push({ id: `fence-${i + 1}`, kind: f.kind, heightFt: f.heightFt > 0 ? f.heightFt : 6, path });
  });
  raw.plants.forEach((t, i) => {
    const at = rawFt(t.at);
    if (inLot(at)) p.plantings.push({ id: `${t.plantId}-${i + 1}`, type: "single", plantId: t.plantId, at: [round(at[0]), round(at[1])], existing: true, guess: true });
  });
  raw.beds.forEach((b, i) => {
    const o = shape(b.outline);
    if (o) p.plantings.push({ id: `bed-${i + 1}`, type: "region", plantId: b.plantId, outline: o, seed: 1000 + i, existing: true, guess: true });
  });
  return propertySchema.parse(p);
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
