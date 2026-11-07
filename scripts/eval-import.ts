import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { importLayout } from "../src/ai/import";
import type { ImportRaw } from "../src/ai/importShape";
import { loadPlantList, readImage } from "../src/ai/files";
import { model } from "../src/ai/openai";

// Runs the image import on each listing in tmp/listings that has a truth.json, scores it, and writes an overlay page.
// Usage: pnpm tsx scripts/eval-import.ts [--runs 2] [listing ...]

type Truth = { name: string; ftPerPx: number; lotFt2?: number; houseBoxPx: [number, number, number, number]; expect: { driveway?: boolean; minPlants: number; minBeds: number; fence?: boolean } };

const args = process.argv.slice(2);
const runs = Number(args[args.indexOf("--runs") + 1]) || 1;
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--runs");
const root = join(process.cwd(), "tmp/listings");
const out = join(process.cwd(), "tmp/import-eval");
await mkdir(out, { recursive: true });

const plants = await loadPlantList();
const names = (await readdir(root)).filter((n) => !only.length || only.includes(n));
const rows: Record<string, unknown>[] = [];

for (const name of names) {
  const dir = join(root, name);
  const truth: Truth = JSON.parse(await readFile(join(dir, "truth.json"), "utf8").catch(() => "null"));
  if (!truth) continue;
  const aerial = await readImage(join(dir, "aerial.jpg"));
  const photoFiles = (await readdir(join(dir, "photos")).catch(() => [])).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  const photos = await Promise.all(photoFiles.map((f) => readImage(join(dir, "photos", f))));

  for (let r = 1; r <= runs; r++) {
    try {
      const res = await importLayout({ name: truth.name, aerial, photos, plants });
      const s = score(res.raw, truth, aerial.width, aerial.height);
      const row = { listing: name, run: r, ...s, plantings: res.property.plantings.length, tokens: res.usage.total_tokens, sec: Math.round(res.ms / 1000) };
      rows.push(row);
      await writeFile(join(out, `${name}-${r}.json`), JSON.stringify({ row, raw: res.raw, property: res.property, model: res.model }, null, 2));
      await writeFile(join(out, `${name}-${r}.html`), overlay(res.raw, truth, `../listings/${name}/aerial.jpg`, row));
      console.log(JSON.stringify(row));
    } catch (e) {
      rows.push({ listing: name, run: r, pass: false, error: (e as Error).message });
      console.log(`${name} run ${r} failed: ${(e as Error).message}`);
    }
  }
}

const passed = rows.filter((r) => r.pass).length;
console.log(`\n${model()}: ${passed} of ${rows.length} runs pass.`);
console.table(rows.map(({ listing, run, pass, scaleErr, houseIoU, lotErr, plants, beds, fails, tokens, sec }: any) => ({ listing, run, pass, scaleErr, houseIoU, lotErr, plants, beds, fails, tokens, sec })));
await writeFile(join(out, "summary.json"), JSON.stringify({ model: model(), rows }, null, 2));

function score(raw: ImportRaw, t: Truth, w: number, h: number) {
  const px = (g: { x: number; y: number }) => [(g.x / 1000) * w, (g.y / 1000) * h] as const;
  const scaleErr = Math.abs(raw.imageWidthFt / w - t.ftPerPx) / t.ftPerPx;
  const hs = raw.house.outline.map(px);
  const box = [Math.min(...hs.map((p) => p[0])), Math.min(...hs.map((p) => p[1])), Math.max(...hs.map((p) => p[0])), Math.max(...hs.map((p) => p[1]))];
  const houseIoU = iou(box, t.houseBoxPx);
  const centroid = [hs.reduce((a, p) => a + p[0], 0) / hs.length, hs.reduce((a, p) => a + p[1], 0) / hs.length] as const;
  const houseInLot = inside(centroid, raw.lot.map(px));
  const driveway = raw.surfaces.some((s) => s.kind === "driveway");
  // Lot area from the model's own scale, against the listing's lot size.
  const lotFt2 = area(raw.lot.map(px)) * (raw.imageWidthFt / w) ** 2;
  const lotErr = t.lotFt2 ? Math.abs(lotFt2 - t.lotFt2) / t.lotFt2 : 0;
  const fails: string[] = [];
  if (scaleErr > 0.25) fails.push("scale");
  if (houseIoU < 0.5) fails.push("house");
  if (!houseInLot) fails.push("lot");
  if (lotErr > 0.35) fails.push("lot size");
  if (t.expect.driveway !== undefined && driveway !== t.expect.driveway) fails.push("driveway");
  if (t.expect.fence && !raw.fences.length) fails.push("fence");
  if (raw.plants.length < t.expect.minPlants) fails.push("plants");
  if (raw.beds.length < t.expect.minBeds) fails.push("beds");
  return { pass: !fails.length, scaleErr: +scaleErr.toFixed(2), houseIoU: +houseIoU.toFixed(2), houseInLot, lotErr: +lotErr.toFixed(2), plants: raw.plants.length, beds: raw.beds.length, fails: fails.join(" ") };
}

function area(o: (readonly [number, number])[]) {
  let a = 0;
  for (let i = 0; i < o.length; i++) a += o[i][0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * o[i][1];
  return Math.abs(a / 2);
}

function iou(a: number[], b: number[]) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const ar = (r: number[]) => (r[2] - r[0]) * (r[3] - r[1]);
  return inter / (ar(a) + ar(b) - inter);
}

function inside([x, y]: readonly [number, number], poly: (readonly [number, number])[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// An SVG over the aerial on the same 0-1000 grid, with the truth house box in white.
function overlay(raw: ImportRaw, t: Truth, img: string, row: object) {
  const pts = (o: { x: number; y: number }[]) => o.map((p) => `${p.x},${p.y}`).join(" ");
  const poly = (o: { x: number; y: number }[], c: string, fill = "none") => `<polygon points="${pts(o)}" fill="${fill}" stroke="${c}" stroke-width="4"/>`;
  const [x0, y0, x1, y1] = t.houseBoxPx.map((v) => (v / 1024) * 1000);
  return `<!doctype html><meta charset="utf-8"><title>${t.name}</title><body style="margin:0;font:14px sans-serif">
<pre style="margin:8px">${JSON.stringify(row)}\n${raw.scaleBasis}\n${raw.notes}</pre>
<svg viewBox="0 0 1000 1000" width="900" height="900">
<image href="${img}" width="1000" height="1000"/>
<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="white" stroke-dasharray="8 6" stroke-width="3"/>
${poly(raw.lot, "#ffd400")}
${poly(raw.house.outline, "#ff3b30", "rgba(255,59,48,.2)")}
${raw.surfaces.map((s) => poly(s.outline, s.kind === "lawn" ? "#34c759" : "#0a84ff")).join("\n")}
${raw.structures.map((s) => poly(s.outline, "#af52de")).join("\n")}
${raw.fences.map((f) => `<polyline points="${pts(f.path)}" fill="none" stroke="#ff9500" stroke-width="5"/>`).join("\n")}
${raw.beds.map((b) => poly(b.outline, "#bf5af2", "rgba(191,90,242,.25)")).join("\n")}
${raw.plants.map((p) => `<circle cx="${p.at.x}" cy="${p.at.y}" r="10" fill="#30d158" stroke="#000"/><text x="${p.at.x + 12}" y="${p.at.y + 5}" fill="#fff" stroke="#000" stroke-width=".5" font-size="18">${p.plantId}</text>`).join("\n")}
</svg></body>`;
}
