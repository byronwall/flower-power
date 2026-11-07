import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { propertySchema } from "../../../model/property";

// Reads every property file fresh, so saved edits show on the next load.
export async function GET() {
  const dir = join(process.cwd(), "data/properties");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const list = await Promise.all(files.map(async (f) => propertySchema.parse(JSON.parse(await readFile(join(dir, f), "utf8")))));
  return Response.json(list);
}
