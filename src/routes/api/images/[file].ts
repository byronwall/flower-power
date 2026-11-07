import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { unauthorized, userDir } from "../../../server/auth";

// Serves an aerial or photo saved by the import, from the logged-in user's images folder.
export async function GET({ params, request }: APIEvent) {
  const user = userDir(request);
  if (!user) return unauthorized();
  if (!/^[\w.-]+$/.test(params.file)) return new Response("Bad name", { status: 400 });
  try {
    const data = await readFile(join(user, "images", params.file));
    return new Response(data, { headers: { "content-type": params.file.endsWith(".png") ? "image/png" : "image/jpeg" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
