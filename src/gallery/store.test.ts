import { describe, expect, it } from "vitest";
import { propertySchema, type Property } from "../model/property";
import { DEMO_ID, makeCommunity, makeDemoGarden } from "./community";
import { bestGardens, RATINGS_TO_RANK } from "./rank";
import { PRIVATE_FIELDS, PUBLIC_FIELDS, toPublic } from "./publish";
import { createLocalStore, memoryStorage } from "./store";

const community = makeCommunity(20);
const design = (id = "my-yard"): Property => ({ ...structuredClone(community[0].property), id, name: "My yard" });

describe("local gallery store", () => {
  it("keeps one rating per garden, replacing the old one", () => {
    const s = createLocalStore(community, memoryStorage());
    const g = community[3];
    s.rate(g.id, 4);
    s.rate(g.id, 9);
    expect(s.myRating(g.id)).toBe(9);
    const shown = s.gardens().find((x) => x.id === g.id)!;
    expect(shown.stars).toEqual({ sum: g.stars.sum + 9, count: g.stars.count + 1 });
  });

  it("clamps stars to 1 through 10", () => {
    const s = createLocalStore(community, memoryStorage());
    s.rate(community[1].id, 14);
    expect(s.myRating(community[1].id)).toBe(10);
  });

  it("saves a snapshot copy once, and unsaving removes it", () => {
    const s = createLocalStore(community, memoryStorage());
    const g = community[5];
    s.setSaved(g.id, true);
    s.setSaved(g.id, true);
    expect(s.saved()).toHaveLength(1);
    expect(s.saved()[0].property).toEqual(g.property);
    expect(s.saved()[0].property).not.toBe(g.property);
    s.setSaved(g.id, false);
    expect(s.saved()).toHaveLength(0);
  });

  it("remembers ratings and saves across a reload", () => {
    const storage = memoryStorage();
    const a = createLocalStore(community, storage);
    a.rate(community[2].id, 7);
    a.setSaved(community[2].id, true);
    const b = createLocalStore(community, storage);
    expect(b.myRating(community[2].id)).toBe(7);
    expect(b.isSaved(community[2].id)).toBe(true);
  });

  it("publishes your design as a new garden you can't rate or save", () => {
    const s = createLocalStore(community, memoryStorage());
    s.publish(design());
    const id = s.publicIdOf("my-yard");
    const g = s.gardens().find((x) => x.id === id)!;
    expect(g.owner).toBe("You");
    expect(g.stars.count).toBe(0);
    s.rate(id, 10);
    s.setSaved(id, true);
    expect(s.myRating(id)).toBeNull();
    expect(s.isSaved(id)).toBe(false);
  });

  it("unpublishing removes the garden but leaves other people's saved copies alone", () => {
    const s = createLocalStore(community, memoryStorage());
    s.setSaved(community[4].id, true);
    s.publish(design());
    s.unpublish("my-yard");
    expect(s.isPublic("my-yard")).toBe(false);
    expect(s.gardens().some((g) => g.id === s.publicIdOf("my-yard"))).toBe(false);
    expect(s.saved()).toHaveLength(1);
  });

  it("credits the original when you publish an edited copy", () => {
    const s = createLocalStore(community, memoryStorage());
    s.noteCopy("copy-g1", { id: community[0].id, title: community[0].title });
    s.publish(design("copy-g1"));
    expect(s.gardens().find((g) => g.id === s.publicIdOf("copy-g1"))!.basedOn).toEqual({ id: community[0].id, title: community[0].title });
  });
});

describe("public copy", () => {
  it("drops anything that is not on the public list", () => {
    const withSecrets = { ...design(), address: "123 Main St", aerialPhoto: "aerial.jpg" } as Property;
    const out = toPublic(withSecrets) as Record<string, unknown>;
    expect(out.address).toBeUndefined();
    expect(out.aerialPhoto).toBeUndefined();
    expect(propertySchema.safeParse(out).success).toBe(true);
  });

  it("publishes the plan the active design shows, not the bare yard or its ideas", () => {
    const yard = design();
    const gone = yard.plantings[0].id;
    const withDesign = { ...yard, designs: [{ id: "d1", name: "Idea", ops: [{ op: "remove", id: gone, reason: "" }] }], activeDesignId: "d1" } as Property;
    const out = toPublic(withDesign);
    expect(out.plantings.some((x) => x.id === gone)).toBe(false);
    expect(out.designs).toBeUndefined();
  });

  it("has a decision for every property field", () => {
    const decided = new Set<string>([...PUBLIC_FIELDS, ...PRIVATE_FIELDS]);
    expect(Object.keys(propertySchema.shape).filter((k) => !decided.has(k))).toEqual([]);
  });
});

describe("mock run: a garden you rate goes from New into Best", () => {
  const place = (s: ReturnType<typeof createLocalStore>) => bestGardens(s.gardens()).findIndex((g) => g.id === DEMO_ID);

  it("needs your rating to rank, and the community to reach the top 10", () => {
    const s = createLocalStore([makeDemoGarden(), ...makeCommunity(500)], memoryStorage());
    const demo = () => s.gardens().find((g) => g.id === DEMO_ID)!;

    // Start: a new garden with 4 strong ratings. It's in New, not on Best.
    expect(demo().stars.count).toBe(RATINGS_TO_RANK - 1);
    expect(place(s)).toBe(-1);

    // You give it 10 stars and save it. Now it can rank, but one rating can't carry it to the top 10.
    s.rate(DEMO_ID, 10);
    s.setSaved(DEMO_ID, true);
    expect(demo().stars.count).toBe(RATINGS_TO_RANK);
    expect(place(s)).toBe(-1);

    // 30 neighbors agree. It joins Best near the top.
    s.simulate(DEMO_ID, { sum: 294, count: 30, saves: 140 });
    expect(place(s)).toBeGreaterThanOrEqual(0);
    expect(place(s)).toBeLessThan(3);

    // Reset puts everything back.
    s.resetDemo(DEMO_ID);
    expect(demo().stars.count).toBe(RATINGS_TO_RANK - 1);
    expect(s.isSaved(DEMO_ID)).toBe(false);
  });
});
