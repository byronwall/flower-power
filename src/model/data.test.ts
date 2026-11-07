import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditPlant, plantSchema } from "./plant";
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

describe("plant audit", () => {
  // A plant file without the plant object fields, whatever the real file has filled in.
  const { lifespanYears, pollination, emerges, planting, images, ...plant } = plantFiles[0].json;
  const complete = {
    ...plant,
    lifespanYears: [3, 5],
    pollination: { needsPartner: false },
    emerges: 4,
    planting: { method: "container" },
    images: {
      photos: [
        {
          url: "https://upload.wikimedia.org/example.jpg",
          author: "Example",
          license: "CC BY-SA 4.0",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
        },
      ],
    },
  };

  it("lets an unverified plant leave the plant object fields empty", () => {
    expect(plantSchema.safeParse({ ...plant, verified: false }).success).toBe(true);
  });

  it("names each missing field on a verified plant", () => {
    const paths = plantSchema.safeParse({ ...plant, verified: true }).error?.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(["lifespanYears", "pollination", "emerges", "planting", "images.photos"]);
  });

  it("accepts a verified plant with every field", () => {
    expect(plantSchema.safeParse({ ...complete, verified: true }).error?.issues ?? []).toEqual([]);
    expect(auditPlant(complete)).toEqual([]);
  });

  it("rejects a lifespan whose shortest is more than its longest", () => {
    expect(plantSchema.safeParse({ ...complete, lifespanYears: [9, 2] }).success).toBe(false);
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
