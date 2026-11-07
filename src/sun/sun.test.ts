import { describe, expect, it } from "vitest";
import type { Point, Property } from "../model/property";
import { hoursAt, sunClassAt, sunHours } from "./sun";

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function lot(house: Point[], headingDeg = 0, heightFt = 30): Property {
  return {
    id: "test",
    name: "Test",
    units: "ft",
    headingDeg,
    lot: { outline: rect(0, 0, 100, 200) },
    house: { outline: house, heightFt },
    fences: [],
    surfaces: [],
    structures: [],
    edges: [],
    features: [],
    plantings: [],
  };
}

describe("sun model", () => {
  it("puts the north side of a tall house in shade and the south side in full sun", () => {
    // The strip along the north wall. A few feet out, high summer sun reaches past the roof.
    const p = lot(rect(20, 80, 80, 120));
    expect(sunClassAt(p, [51, 79])).toBe("shade");
    expect(sunClassAt(p, [51, 79], { season: "equinox" })).toBe("shade");
    expect(sunClassAt(p, [51, 123])).toBe("full");
  });

  it("mirrors the result when the plan turns 180 degrees", () => {
    // Points sit at cell centers. A centered house, so a half turn maps each point to the opposite corner of the lot.
    const a = sunHours(lot(rect(30, 70, 70, 130), 0));
    const b = sunHours(lot(rect(30, 70, 70, 130), 180));
    for (const at of [[51, 61], [51, 139], [21, 101], [85, 41], [11, 175]] as Point[]) {
      const flip: Point = [100 - at[0], 200 - at[1]];
      expect(hoursAt(b, flip)).toBeCloseTo(hoursAt(a, at), 0);
    }
  });

  it("gives an open lot full sun everywhere", () => {
    // A tiny, low house in a corner barely shades anything.
    const g = sunHours(lot(rect(0, 0, 1, 1), 0, 1));
    const lit = [...g.hours].filter((h) => !Number.isNaN(h));
    expect(Math.min(...lit)).toBeGreaterThan(6);
  });
});
