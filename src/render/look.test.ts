import { describe, expect, it } from "vitest";
import { hasGroundSnow } from "./look";

describe("hasGroundSnow", () => {
  it("covers the ground only in December and January", () => {
    const snowy = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(hasGroundSnow);
    expect(snowy).toEqual([1, 12]);
  });
});
