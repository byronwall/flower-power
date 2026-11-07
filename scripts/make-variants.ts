import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchAerial } from "./fetch-aerial";

// Builds robustness cases from base listings: other zoom levels, an aerial not centered on the house,
// no photos, and a non-square screenshot crop. Truth comes from the base truth by geometry,
// so run scripts/fetch-parcels.ts first.
// Usage: pnpm tsx scripts/make-variants.ts [tag ...]

type V = { base: string; tag: string; meters?: number; w?: number; h?: number; east?: number; north?: number; photos?: boolean | string[]; ext?: string };
const variants: V[] = [
  { base: "ralston", tag: "offcenter", east: 8 },
  { base: "cherbourg", tag: "offcenter", east: -10, north: -8 },
  { base: "kessler", tag: "zoom60", meters: 60 },
  { base: "steinmeier", tag: "zoom60", meters: 60 },
  { base: "circle", tag: "zoom160", meters: 160 },
  { base: "wexford", tag: "zoom160", meters: 160 },
  { base: "circle", tag: "nophotos", photos: false },
  { base: "newjersey", tag: "nophotos", photos: false },
  { base: "e71st", tag: "crop", w: 1280, h: 800, meters: 125, ext: "png" },
  { base: "indianola", tag: "crop", w: 1180, h: 720, meters: 90, ext: "png" },
  // Image count: the aerial alone, plus the front photo, plus front and two back yard photos.
  ...([["kessler", "05", "06"], ["circle", "04", "05"], ["newjersey", "04", "05"], ["ralston", "02", "03"], ["cherbourg", "02", "03"], ["steinmeier", "03", "04"]] as const).flatMap(([base, a, b]): V[] => [
    { base, tag: "img1", photos: false },
    { base, tag: "img2", photos: ["00"] },
    { base, tag: "img4", photos: ["00", a, b] },
  ]),
];

const root = join(process.cwd(), "tmp/listings");
const only = process.argv.slice(2);
for (const v of variants.filter((v) => !only.length || only.includes(v.tag))) {
  const src = join(root, v.base);
  const meta = JSON.parse(await readFile(join(src, "meta.json"), "utf8"));
  const truth = JSON.parse(await readFile(join(src, "truth.json"), "utf8"));
  const dir = join(root, `${v.base}@${v.tag}`);
  await mkdir(dir, { recursive: true });
  const east = v.east ?? 0;
  const north = v.north ?? 0;
  const lat = meta.lat + north / 111320;
  const lon = meta.lon + east / (111320 * Math.cos((meta.lat * Math.PI) / 180));
  const w = v.w ?? 1024;
  const h = v.h ?? w;
  const ftPerPx = await fetchAerial({ lat, lon, out: join(dir, `aerial.${v.ext ?? "jpg"}`), meters: v.meters ?? 100, w, h });
  // Base box in feet from the base center, shifted by the offset, then into the new pixels.
  const fx = (p: number) => (((p - 512) * truth.ftPerPx - east * 3.28084) / ftPerPx) + w / 2;
  const fy = (p: number) => (((p - 512) * truth.ftPerPx + north * 3.28084) / ftPerPx) + h / 2;
  const [x0, y0, x1, y1] = truth.houseBoxPx;
  const houseBoxPx = [fx(x0), fy(y0), fx(x1), fy(y1)].map(Math.round);
  const move = (r?: number[][]) => r?.map(([x, y]) => [Math.round(fx(x) * 10) / 10, Math.round(fy(y) * 10) / 10]);
  await writeFile(join(dir, "truth.json"), JSON.stringify({ ...truth, base: v.base, variant: v.tag, ftPerPx: +ftPerPx.toFixed(4), houseBoxPx, lotPx: move(truth.lotPx), buildingPx: move(truth.buildingPx) }));
  if (v.photos === true || v.photos === undefined) await cp(join(src, "photos"), join(dir, "photos"), { recursive: true });
  if (Array.isArray(v.photos)) {
    await mkdir(join(dir, "photos"), { recursive: true });
    for (const f of v.photos) await cp(join(src, "photos", `${f}.jpg`), join(dir, "photos", `${f}.jpg`));
  }
  console.log(`${v.base}@${v.tag}: ${w}x${h}, ${ftPerPx.toFixed(4)} ft/px, house ${houseBoxPx}`);
}
