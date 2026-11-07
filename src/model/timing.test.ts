import { describe, expect, it } from "vitest";
import { span } from "./timing";

describe("span", () => {
  it("writes short spans in days", () => {
    expect(span([3, 5], "days")).toBe("3–5 days");
    expect(span([75, 90], "days")).toBe("75–90 days");
  });

  it("writes long spans in days as months", () => {
    expect(span([300, 365], "days")).toBe("10–12 months");
    expect(span([365, 365], "days")).toBe("1 year");
  });

  it("uses the singular for one", () => {
    expect(span([1, 1], "years")).toBe("1 year");
    expect(span([2, 3], "years")).toBe("2–3 years");
  });
});
