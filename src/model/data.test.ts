import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plantSchema } from "./plant";
import { propertySchema } from "./property";

// Plant and property files are added by hand, so check every one of them.
const root = join(import.meta.dirname, "../../data");
const read = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: `${dir}/${f}`, json: JSON.parse(readFileSync(join(root, dir, f), "utf8")) }));

const plantFiles = read("plants");
const plantIds = new Set(plantFiles.map((p) => p.json.id));

describe("plant files", () => {
  it.each(plantFiles)("$file is valid", ({ file, json }) => {
    const result = plantSchema.safeParse(json);
    expect(result.error?.issues ?? [], file).toEqual([]);
    expect(`plants/${json.id}.json`).toBe(file);
  });
});

describe("Indiana details", () => {
  // An invasive plant always offers something to grow instead, and those suggestions are real plants.
  it.each(plantFiles.filter((p) => p.json.indianaStatus?.startsWith("invasive")))("$file suggests natives to plant instead", ({ json }) => {
    expect(json.alternatives?.length ?? 0).toBeGreaterThan(0);
    const unknown = json.alternatives.filter((id: string) => !plantIds.has(id));
    expect(unknown).toEqual([]);
  });
});

describe("property files", () => {
  it.each(read("properties"))("$file is valid and uses known plants", ({ file, json }) => {
    const result = propertySchema.safeParse(json);
    expect(result.error?.issues ?? [], file).toEqual([]);
    const unknown = json.plantings.map((p: { plantId: string }) => p.plantId).filter((id: string) => !plantIds.has(id));
    expect(unknown, file).toEqual([]);
  });
});
