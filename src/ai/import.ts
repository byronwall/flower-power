import { respond, type Part } from "./openai";
import { instructions, schema, slug, toProperty, type Image, type ImportRaw, type LibraryPlant } from "./importShape";

// Turns an aerial image of a lot, plus optional ground photos, into a Property. Server and scripts only.

export async function importLayout(opts: { name: string; aerial: Image; photos: Image[]; plants: LibraryPlant[] }) {
  const url = (i: Image) => `data:${i.mime};base64,${i.data.toString("base64")}`;
  const parts: Part[] = [
    { type: "input_text", text: `Aerial of the lot, ${opts.aerial.width} by ${opts.aerial.height} pixels.` },
    { type: "input_image", image_url: url(opts.aerial), detail: "high" },
  ];
  if (opts.photos.length) parts.push({ type: "input_text", text: `${opts.photos.length} listing photos of the same property:` });
  for (const p of opts.photos) parts.push({ type: "input_image", image_url: url(p), detail: "auto" });
  const files = Object.fromEntries([opts.aerial, ...opts.photos].map((i) => [i.name, i.data]));
  const run = await respond<ImportRaw>({ feature: "import", instructions: instructions(opts.plants), parts, schema: schema(opts.plants.map((p) => p.id)), files });
  // The model leaves the lot empty when the first image is not an overhead view, such as a street photo.
  if (run.data.lot.length < 3 || run.data.imageWidthFt <= 0) throw new Error(`The first image does not look like an overhead aerial of the lot. ${run.data.notes}`);
  const property = toProperty(run.data, { id: slug(opts.name), name: opts.name, aerial: opts.aerial });
  return { ...run, raw: run.data, property };
}
