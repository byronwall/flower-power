import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Adds county truth to each base listing: the parcel outline and the main building footprint, from
// Indianapolis MapIndy, in aerial pixels. Listings without meta.json (no center point) are placed by
// matching the building's box to the hand-labeled house box.
// Usage: pnpm tsx scripts/fetch-parcels.ts [listing ...]

const api = "https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer";
type Ring = [number, number][];

async function query(layer: number, params: Record<string, string>) {
  const q = new URLSearchParams({ outFields: "STNUMBER,FULL_STNAME,ESTSQFT,ACREAGE", returnGeometry: "true", outSR: "3857", f: "json", ...params });
  const res = await fetch(`${api}/${layer}/query?${q}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.features as { attributes: Record<string, unknown>; geometry: { rings: Ring[] } }[];
}

const area = (r: Ring) => Math.abs(r.reduce((a, p, i) => a + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);
const merc = (lat: number, lon: number): [number, number] => [(lon * Math.PI * 6378137) / 180, 6378137 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
const toLat = (y: number) => (Math.atan(Math.exp(y / 6378137)) * 360) / Math.PI - 90;

const root = join(process.cwd(), "tmp/listings");
const only = process.argv.slice(2);
for (const name of (await readdir(root)).filter((n) => !n.includes("@") && (!only.length || only.includes(n)))) {
  const dir = join(root, name);
  const truth = JSON.parse(await readFile(join(dir, "truth.json"), "utf8"));
  const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8").catch(() => "null"));
  const [num, ...street] = truth.name.toUpperCase().split(" ");
  const parcels = meta
    ? await query(10, { geometry: merc(meta.lat, meta.lon).join(","), geometryType: "esriGeometryPoint", inSR: "3857", spatialRel: "esriSpatialRelIntersects" })
    : await query(10, { where: `STNUMBER='${num}' AND FULL_STNAME LIKE '%${street[street.length - 2] ?? street[0]}%'` });
  if (!parcels.length) {
    console.log(`${name}: no parcel`);
    continue;
  }
  const parcel = parcels.sort((a, b) => area(b.geometry.rings[0]) - area(a.geometry.rings[0]))[0];
  const ring = parcel.geometry.rings[0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const env = { xmin: Math.min(...xs), ymin: Math.min(...ys), xmax: Math.max(...xs), ymax: Math.max(...ys), spatialReference: { wkid: 3857 } };
  const buildings = await query(8, { geometry: JSON.stringify(env), geometryType: "esriGeometryEnvelope", inSR: "3857", spatialRel: "esriSpatialRelIntersects", outFields: "*" });
  // The largest building whose center is inside the parcel; the envelope also catches neighbors.
  const center0 = (r: Ring): [number, number] => [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];
  const building = buildings
    .map((f) => f.geometry.rings[0])
    .filter((r) => inside(center0(r), ring))
    .sort((a, b) => area(b) - area(a))[0];

  // Mercator meters per aerial pixel: ground ft/px in meters, stretched by 1/cos(lat).
  const lat = meta?.lat ?? toLat((env.ymin + env.ymax) / 2);
  const mpp = (truth.ftPerPx / 3.28084) / Math.cos((lat * Math.PI) / 180);
  let center: [number, number];
  if (meta) center = merc(meta.lat, meta.lon);
  else {
    if (!building) throw new Error(`${name}: no building to place the parcel`);
    const bx = building.map((p) => p[0]);
    const by = building.map((p) => p[1]);
    const [x0, y0, x1, y1] = truth.houseBoxPx;
    // The building box center sits at the labeled box center.
    center = [(Math.min(...bx) + Math.max(...bx)) / 2 - ((x0 + x1) / 2 - 512) * mpp, (Math.min(...by) + Math.max(...by)) / 2 + ((y0 + y1) / 2 - 512) * mpp];
  }
  const px = (r: Ring) => r.map(([x, y]) => [Math.round((512 + (x - center[0]) / mpp) * 10) / 10, Math.round((512 - (y - center[1]) / mpp) * 10) / 10]);
  const parcelFt2 = Math.round(area(px(ring) as Ring) * truth.ftPerPx ** 2);
  const out = { ...truth, lotPx: px(ring), buildingPx: building ? px(building) : undefined, parcelFt2 };
  await writeFile(join(dir, "truth.json"), JSON.stringify(out));
  console.log(`${name}: parcel ${parcelFt2} ft² (Zillow ${truth.lotFt2}), ${ring.length} pts, building ${building ? "yes" : "no"}`);
}

function inside([x, y]: [number, number], poly: Ring) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
