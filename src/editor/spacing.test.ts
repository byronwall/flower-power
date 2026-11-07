import { describe, expect, it } from "vitest";
import { propertySchema, type Property } from "../model/property";
import { crowding, matureRadius } from "./spacing";

const base = (plantings: Property["plantings"]): Property => ({
  id: "t",
  name: "Test",
  units: "ft",
  headingDeg: 0,
  lot: { outline: [[0, 0], [100, 0], [100, 100], [0, 100]] },
  house: { outline: [[40, 40], [60, 40], [60, 60], [40, 60]], heightFt: 20 },
  fences: [],
  surfaces: [],
  structures: [],
  edges: [],
  features: [],
  plantings,
});

describe("spacing", () => {
  it("uses the resized width when grown", () => {
    // Red maple is 35 ft wide when grown; half size is 17.5 ft wide.
    expect(matureRadius({ id: "a", type: "single", plantId: "red-maple", at: [0, 0], scale: 0.5 })).toBe(8.75);
  });

  it("flags trees that will run into each other, not ones with room", () => {
    const p = base([
      { id: "a", type: "single", plantId: "red-maple", at: [20, 20] },
      { id: "b", type: "single", plantId: "red-maple", at: [30, 20] },
      { id: "c", type: "single", plantId: "red-maple", at: [90, 90] },
    ]);
    expect(crowding(p, "a").map((c) => c.id)).toEqual(["b"]);
    expect(crowding(p, "c")).toEqual([]);
  });

  it("accepts a resize in saved plans, within limits", () => {
    const ok = base([{ id: "a", type: "single", plantId: "red-maple", at: [1, 1], scale: 1.5 }]);
    expect(propertySchema.safeParse(ok).success).toBe(true);
    const tooBig = base([{ id: "a", type: "single", plantId: "red-maple", at: [1, 1], scale: 9 }]);
    expect(propertySchema.safeParse(tooBig).success).toBe(false);
  });
});
