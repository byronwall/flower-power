import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { baseName, parseChecklist } from "./nrcs";

const taxa = parseChecklist(readFileSync(join(import.meta.dirname, "../../data/nrcs/indiana-checklist.csv"), "utf8"));

describe("NRCS checklist", () => {
  it("reads every accepted name and groups the synonyms under it", () => {
    expect(taxa.length).toBe(4508);
    expect(taxa.reduce((n, t) => n + t.synonyms.length, 0)).toBe(8178);
    // 2,668 species plus 107 named hybrids such as Aesculus ×marylandica.
    expect(taxa.filter((t) => t.rank === "species").length).toBe(2775);
  });

  it("keeps the fields of a row", () => {
    const yarrow = taxa.find((t) => t.symbol === "ACMIO")!;
    expect(yarrow).toMatchObject({ common: "western yarrow", family: "Asteraceae", rank: "variety", base: "achillea millefolium" });
    expect(yarrow.synonyms).toContain("Achillea lanulosa Nutt.");
  });

  it("matches app names to checklist names", () => {
    expect(baseName("Hydrangea arborescens 'Annabelle'")).toBe("hydrangea arborescens");
    expect(baseName("Buxus 'Green Velvet'")).toBe("buxus");
    expect(baseName("Acer rubrum L.")).toBe("acer rubrum");
  });
});
