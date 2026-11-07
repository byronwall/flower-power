import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";

// Serves an aerial or photo saved by the import, from data/images.
export async function GET({ params }: APIEvent) {
  if (!/^[\w.-]+$/.test(params.file)) return new Response("Bad name", { status: 400 });
  try {
    const data = await readFile(join(process.cwd(), "data/images", params.file));
    return new Response(data, { headers: { "content-type": params.file.endsWith(".png") ? "image/png" : "image/jpeg" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
