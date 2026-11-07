import { describe, expect, it } from "vitest";
import { plantsById } from "../model/library";
import { propertySchema } from "../model/property";
import { makeCommunity, makeGarden } from "./community";
import { layoutPodium, layoutWall, spanForRank, TOP_N } from "./layout";
import { bestGardens, rankGardens, score } from "./rank";

describe("made-up community", () => {
  const community = makeCommunity(200);

  it("is the same every run", () => {
    expect(makeGarden(42)).toEqual(makeGarden(42));
  });

  it("makes valid gardens that use known plants", () => {
    for (const g of community) {
      expect(propertySchema.safeParse(g.property).error?.issues ?? [], g.id).toEqual([]);
      expect(g.property.plantings.filter((p) => !plantsById.has(p.plantId)), g.id).toEqual([]);
    }
  });

  it("keeps every planting inside the lot", () => {
    for (const g of community) {
      const [, , [W, H]] = g.property.lot.outline;
      for (const p of g.property.plantings) {
        const pts = p.type === "single" ? [p.at] : p.type === "row" ? p.path : p.outline;
        for (const [x, y] of pts) {
          expect(x, g.id).toBeGreaterThanOrEqual(-1);
          expect(x, g.id).toBeLessThanOrEqual(W + 1);
          expect(y, g.id).toBeGreaterThanOrEqual(-1);
          expect(y, g.id).toBeLessThanOrEqual(H + 1);
        }
      }
    }
  });

  it("has a mix of new and established gardens", () => {
    expect(community.filter((g) => g.stars.count < 5).length).toBeGreaterThan(10);
    expect(community.filter((g) => g.stars.count >= 50).length).toBeGreaterThan(10);
  });
});

describe("ranking", () => {
  it("prefers many saves and high stars over one perfect rating", () => {
    const loved = { stars: { sum: 86, count: 10 }, saves: 40 };
    const lucky = { stars: { sum: 10, count: 1 }, saves: 2 };
    expect(score(loved, 7)).toBeGreaterThan(score(lucky, 7));
  });

  it("shows only the top 10 rankable gardens on Best", () => {
    const best = bestGardens(makeCommunity(300));
    expect(best).toHaveLength(TOP_N);
    expect(best.every((g) => g.stars.count >= 5)).toBe(true);
  });

  it("puts gardens with too few ratings after ones that can rank", () => {
    const ranked = rankGardens([
      { id: "new", stars: { sum: 30, count: 3 }, saves: 50 },
      { id: "ok", stars: { sum: 35, count: 5 }, saves: 0 },
    ]);
    expect(ranked.map((g) => g.id)).toEqual(["ok", "new"]);
  });
});

describe("wall layout", () => {
  const tiles = layoutWall(Array.from({ length: 500 }, (_, i) => i));

  it("never overlaps tiles", () => {
    const seen = new Set<string>();
    for (const t of tiles)
      for (let dy = 0; dy < t.span; dy++)
        for (let dx = 0; dx < t.span; dx++) {
          const k = `${t.x + dx},${t.y + dy}`;
          expect(seen.has(k), k).toBe(false);
          seen.add(k);
        }
  });

  it("gives the top 10 bigger tiles than everyone else", () => {
    expect(tiles.slice(0, TOP_N).every((t) => t.span >= 3)).toBe(true);
    expect(tiles.slice(TOP_N).every((t) => t.span < 3)).toBe(true);
  });

  it("gives the best garden the biggest tile at the center", () => {
    expect(tiles[0].span).toBe(spanForRank(0));
    const c = tiles[0].x + tiles[0].span / 2;
    expect(Math.abs(c)).toBeLessThanOrEqual(2);
  });
});

describe("top 10 podium", () => {
  const tiles = layoutPodium(Array.from({ length: TOP_N }, (_, i) => i));

  it("places all ten without overlap on a seven-column grid", () => {
    expect(tiles).toHaveLength(TOP_N);
    const seen = new Set<string>();
    for (const t of tiles)
      for (let dy = 0; dy < t.span; dy++)
        for (let dx = 0; dx < t.span; dx++) {
          const k = `${t.x + dx},${t.y + dy}`;
          expect(seen.has(k), k).toBe(false);
          expect(t.x + dx).toBeLessThan(7);
          seen.add(k);
        }
  });

  it("makes number 1 the biggest, in the middle", () => {
    expect(tiles[0].span).toBeGreaterThan(Math.max(...tiles.slice(1).map((t) => t.span)));
    expect(tiles[0].x + tiles[0].span / 2).toBe(3.5);
  });

  it("handles fewer than ten gardens", () => {
    expect(layoutWall([1, 2, 3])).toHaveLength(3);
  });
});
