import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { applyOps, designSchema, diff } from "./design";
import { propertySchema, type Property } from "./property";

const a: Property = propertySchema.parse(JSON.parse(readFileSync("data/properties/sample-lot.json", "utf8")));

test("applyOps(a, diff(a, b)) gives b", () => {
  const b = structuredClone(a);
  b.plantings.splice(1, 1);
  const s = b.plantings.findLast((p) => p.type === "single")!;
  if (s.type === "single") s.at = [s.at[0] + 3, s.at[1] - 2];
  const r = b.plantings.find((p) => p.type === "region")!;
  if (r.type === "region") r.outline = r.outline.map(([x, y]) => [x + 1, y]);
  b.plantings[0] = { ...b.plantings[0], plantId: "eastern-redbud" };
  b.plantings.push({ id: "new-bed", type: "region", plantId: "purple-coneflower", outline: [[5, 60], [15, 60], [15, 70]], seed: 7 });
  b.features.pop();
  b.features.push({ id: "bath", kind: "birdbath", at: [40, 40] });
  b.edges[0].path = [[1, 1], [2, 2]];
  b.surfaces[0] = { ...b.surfaces[0], kind: "gravel" };

  const ops = diff(a, b);
  expect(applyOps(a, ops)).toEqual(b);
  expect(ops.map((o) => o.op).sort()).toEqual(["add", "addFeature", "move", "remove", "remove", "replace", "replace", "reshape", "reshape"]);
  expect(diff(a, a)).toEqual([]);
});

test("a property with designs still parses", () => {
  const ops = diff(a, { ...a, plantings: a.plantings.slice(1) });
  const design = designSchema.parse({ id: "d1", name: "Calm", style: "cottage", dial: "refresh", goals: { text: "calm", chips: [] }, ops });
  expect(propertySchema.parse({ ...a, designs: [design], activeDesignId: "d1" }).designs?.[0].ops).toEqual(ops);
});
