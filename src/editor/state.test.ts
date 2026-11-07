import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { propertySchema } from "../model/property";
import { createEditor, scaleProperty } from "./state";

const sample = propertySchema.parse(JSON.parse(readFileSync(join(import.meta.dirname, "../../data/properties/sample-lot.json"), "utf8")));
const lot = { ...sample, underlay: { file: "a.jpg", sizePx: [1000, 800] as [number, number], ftPerPx: 0.3, originFt: [-40, -20] as [number, number] } };

describe("scale fix", () => {
  it("rescales the plan and the underlay together, and one undo restores it", () => {
    const ed = createEditor(lot);
    ed.update((p) => scaleProperty(p, 1.5));
    const p = ed.property();
    expect(p.house.outline[0]).toEqual([lot.house.outline[0][0] * 1.5, lot.house.outline[0][1] * 1.5].map((n) => Math.round(n * 10) / 10));
    expect(p.house.heightFt).toBe(lot.house.heightFt);
    // A plan point keeps the same aerial pixel under it.
    const pixel = (q: typeof p, [x, y]: number[]) => [(x - q.underlay!.originFt[0]) / q.underlay!.ftPerPx, (y - q.underlay!.originFt[1]) / q.underlay!.ftPerPx];
    expect(pixel(p, [30, 60])[0]).toBeCloseTo(pixel(lot, [20, 40])[0]);
    expect(pixel(p, [30, 60])[1]).toBeCloseTo(pixel(lot, [20, 40])[1]);
    ed.undo();
    expect(ed.property()).toEqual(lot);
  });
});
