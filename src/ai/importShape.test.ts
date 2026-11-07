import { expect, test } from "vitest";
import { toProperty, type ImportRaw } from "./importShape";

const g = (x: number, y: number) => ({ x, y });
const box = (x0: number, y0: number, x1: number, y1: number) => [g(x0, y0), g(x1, y0), g(x1, y1), g(x0, y1)];

// A 1000 px aerial that is 300 ft wide, so one grid unit is 0.3 ft. The lot starts at grid (200, 100).
const raw: ImportRaw = {
  imageWidthFt: 300,
  scaleBasis: "cars",
  lot: box(200, 100, 600, 700),
  house: { outline: box(300, 300, 500, 450), heightFt: 22 },
  surfaces: [{ kind: "driveway", outline: box(150, 300, 260, 700) }],
  structures: [],
  fences: [],
  plants: [
    { plantId: "red-maple", at: g(400, 600), note: "" },
    { plantId: "red-maple", at: g(800, 600), note: "next door" },
  ],
  beds: [],
  notes: "",
};

test("grid points become feet from the lot's top-left, clamped to the lot", () => {
  const p = toProperty(raw, { id: "t", name: "T", aerial: { name: "a.jpg", width: 1000, height: 1000 } });
  expect(p.lot.outline).toEqual([[0, 0], [120, 0], [120, 180], [0, 180]]);
  expect(p.house.outline[0]).toEqual([30, 60]);
  // The driveway pokes out of the lot on the left, so it is cut at x = 0.
  expect(p.surfaces[0].outline[0]).toEqual([0, 60]);
  // The tree outside the lot is dropped, and the one inside is marked as an existing guess.
  expect(p.plantings).toEqual([{ id: "red-maple-1", type: "single", plantId: "red-maple", at: [60, 150], existing: true, guess: true }]);
  expect(p.underlay).toEqual({ file: "a.jpg", sizePx: [1000, 1000], ftPerPx: 0.3, originFt: [-60, -30] });
});
