import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Downloads an Esri World Imagery aerial centered on a point, at an exact ground scale.
// Usage: pnpm tsx scripts/fetch-aerial.ts <lat> <lon> <out.jpg|out.png> [meters=100] [px=1024] [heightPx=px]
// Web Mercator stretches ground distance by 1/cos(lat), so the box is widened by that factor.

export async function fetchAerial(o: { lat: number; lon: number; out: string; meters?: number; w?: number; h?: number }) {
  const meters = o.meters ?? 100;
  const w = o.w ?? 1024;
  const h = o.h ?? w;
  const R = 6378137;
  const x = (o.lon * Math.PI * R) / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + (o.lat * Math.PI) / 360));
  const half = meters / 2 / Math.cos((o.lat * Math.PI) / 180);
  const halfY = (half * h) / w;
  const format = o.out.endsWith(".png") ? "png" : "jpg";
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${x - half},${y - halfY},${x + half},${y + halfY}&bboxSR=3857&imageSR=3857&size=${w},${h}&format=${format}&f=image`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Esri returned ${res.status}`);
  await writeFile(o.out, Buffer.from(await res.arrayBuffer()));
  return (meters * 3.28084) / w;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [lat, lon, out, meters = "100", px = "1024", hpx] = process.argv.slice(2);
  if (!out) throw new Error("Usage: fetch-aerial.ts <lat> <lon> <out> [meters] [px] [heightPx]");
  const ftPerPx = await fetchAerial({ lat: +lat, lon: +lon, out, meters: +meters, w: +px, h: hpx ? +hpx : undefined });
  console.log(`${out}: ${meters} m over ${px} px = ${ftPerPx.toFixed(4)} ft/px`);
}
