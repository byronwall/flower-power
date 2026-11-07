import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { propertySchema } from "../../../model/property";

// Saves a property back to its file in data/properties. Local development only.
export async function POST({ params, request }: APIEvent) {
  const result = propertySchema.safeParse(await request.json());
  if (!result.success) return Response.json({ error: result.error.issues }, { status: 400 });
  if (result.data.id !== params.id) return Response.json({ error: "The id in the file does not match the URL." }, { status: 400 });
  const file = join(process.cwd(), "data/properties", `${params.id}.json`);
  // Keep each [x, y] point on one line so the file stays readable by hand.
  const text = JSON.stringify(result.data, null, 2).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, "[$1, $2]");
  await writeFile(file, text + "\n");
  return Response.json({ saved: file });
}
