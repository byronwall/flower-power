import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Node loader hooks that expand Vite's eager JSON `import.meta.glob("dir/*.json", ...)` for scripts run with tsx.
// src/model/library.ts uses it, and the sun model imports the library.

export async function load(url, context, next) {
  const res = await next(url, context);
  if (!url.startsWith("file:") || !/\.tsx?$/.test(url)) return res;
  const src = String(res.source);
  if (!src.includes("import.meta.glob")) return res;
  const dir = dirname(fileURLToPath(url));
  const source = src.replace(/import\.meta\.glob(?:<[^>]*>)?\(\s*["']([^"']+)\/\*\.json["'][^)]*\)/g, (_, rel) => {
    const abs = join(dir, rel);
    const files = readdirSync(abs).filter((f) => f.endsWith(".json"));
    return JSON.stringify(Object.fromEntries(files.map((f) => [`${rel}/${f}`, JSON.parse(readFileSync(join(abs, f), "utf8"))])));
  });
  return { ...res, source };
}
