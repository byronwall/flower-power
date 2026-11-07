import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { propertySchema } from "../../../model/property";
import { unauthorized, userDir } from "../../../server/auth";

// Reads every property file of the logged-in user fresh, so saved edits show on the next load.
export async function GET({ request }: APIEvent) {
  const user = userDir(request);
  if (!user) return unauthorized();
  const dir = join(user, "properties");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const list = await Promise.all(files.map(async (f) => propertySchema.parse(JSON.parse(await readFile(join(dir, f), "utf8")))));
  return Response.json(list);
}
