import { readdir, readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import type { APIEvent } from "@solidjs/start/server";

// Dev only: serves the import eval's gitignored files from tmp/listings and tmp/import-eval.
// A folder returns its entry names as JSON.
const roots = ["listings", "import-eval"];
const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", json: "application/json" };

export async function GET({ params }: APIEvent) {
  const rel = normalize(params.path);
  if (rel.startsWith("..") || !roots.includes(rel.split("/")[0])) return new Response("Not allowed", { status: 403 });
  const path = join(process.cwd(), "tmp", rel);
  try {
    if ((await stat(path)).isDirectory()) return Response.json((await readdir(path)).sort());
    return new Response(await readFile(path), { headers: { "content-type": types[rel.split(".").pop()!] ?? "application/octet-stream" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
