import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { plantSchema } from "../model/plant";
import { propertySchema } from "../model/property";
import { checkOps, type Ask, type RawOp } from "./designShape";

const lot = propertySchema.parse(JSON.parse(readFileSync("data/properties/sample-lot.json", "utf8")));
const plants = new Map(
  readdirSync("data/plants")
    .filter((f) => f.endsWith(".json"))
    .map((f) => plantSchema.parse(JSON.parse(readFileSync(`data/plants/${f}`, "utf8"))))
    .map((p) => [p.id, p]),
);
const goals = { text: "", chips: [], favorites: [], hardscape: false };
const op = (o: Partial<RawOp>): RawOp => ({ op: "add", id: null, plantId: null, kind: null, at: null, outline: null, path: null, reason: "", ...o });
const run = (ops: RawOp[], ask: Partial<Ask> = {}) => checkOps(lot, plants, ops, { goals, dial: "redo", style: "cottage", ...ask }, "t");

test("each bad op is dropped with a note, and good ops stay", () => {
  const { ops, dropped } = run([
    op({ plantId: "no-such-plant", at: { x: 40, y: 120 } }),
    op({ plantId: "purple-coneflower", at: { x: 200, y: 20 } }),
    op({ plantId: "purple-coneflower", at: { x: 40, y: 80 } }),
    op({ plantId: "purple-coneflower", at: { x: 58, y: 110 } }),
    op({ op: "addFeature", kind: "patio", outline: [{ x: 2, y: 34 }, { x: 10, y: 34 }, { x: 10, y: 39 }] }),
    op({ op: "remove", id: "nothing-here" }),
    op({ plantId: "red-maple", at: { x: 14, y: 20 } }),
    op({ plantId: "purple-coneflower", outline: [{ x: 22, y: 5 }, { x: 34, y: 5 }, { x: 34, y: 11 }, { x: 22, y: 11 }] }),
    op({ plantId: "purple-coneflower", outline: [{ x: 70, y: 110 }, { x: 78, y: 110 }, { x: 78, y: 118 }, { x: 70, y: 118 }] }),
  ]);
  expect(dropped.map((d) => d.split(": ")[1])).toEqual([
    'unknown plant "no-such-plant"',
    "outside the lot",
    "on the house",
    "on the driveway",
    "patio is hardscape the person did not ask for",
    'there is no item "nothing-here"',
    "too close to maple (4 ft apart, needs 25)",
    "overlaps the bed coneflowers",
  ]);
  expect(ops).toHaveLength(1);
});

test("the dial and the scope limit removals", () => {
  const ops = [op({ op: "remove", id: "maple" }), op({ op: "remove", id: "rose" }), op({ op: "replace", id: "daylilies", plantId: "catmint" })];
  expect(run(ops, { dial: "light" }).ops).toHaveLength(0);
  expect(run(ops, { dial: "refresh" }).ops.map((o) => o.op)).toEqual(["remove", "replace"]);
  expect(run(ops, { dial: "redo" }).ops).toHaveLength(3);
  const scope: [number, number][] = [[0, 20], [80, 20], [80, 45], [0, 45]];
  expect(run(ops, { scope }).ops.map((o) => ("id" in o ? o.id : ""))).toEqual(["rose"]);
});
