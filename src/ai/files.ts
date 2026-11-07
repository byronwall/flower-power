import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Image, LibraryPlant } from "./importShape";

// Node-side helpers for the import: image size without an image library, and the plant list from disk.

export function imageSize(b: Buffer): { width: number; height: number } {
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // JPEG: walk the segments to the frame header (SOF0-SOF15, except DHT, JPG and DAC).
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("Only JPEG and PNG images are supported.");
}

export function toImage(name: string, data: Buffer): Image {
  const mime = data.readUInt32BE(0) === 0x89504e47 ? "image/png" : "image/jpeg";
  return { name: basename(name), mime, data, ...imageSize(data) };
}

export async function readImage(path: string) {
  return toImage(path, await readFile(path));
}

export async function loadPlantList(): Promise<LibraryPlant[]> {
  const dir = join(process.cwd(), "data/plants");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(files.map(async (f) => {
    const p = JSON.parse(await readFile(join(dir, f), "utf8"));
    return { id: p.id, commonName: p.commonName, category: p.category };
  }));
}
