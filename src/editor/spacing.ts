import { plantsById } from "../model/library";
import type { Property } from "../model/property";

type Single = Extract<Property["plantings"][number], { type: "single" }>;

// Width a single plant reaches when full grown, after any resize.
export const matureRadius = (s: Single) => ((plantsById.get(s.plantId)?.size.spreadFt ?? 2) / 2) * (s.scale ?? 1);

// Other single plants whose full-grown canopy will run into this one's.
// A little touching is normal in a planted bed; flag it once they overlap by a quarter of the smaller plant.
export function crowding(p: Property, id: string) {
  const me = p.plantings.find((x): x is Single => x.id === id && x.type === "single");
  if (!me) return [];
  const r1 = matureRadius(me);
  return p.plantings
    .filter((x): x is Single => x.type === "single" && x.id !== id)
    .map((o) => {
      const r2 = matureRadius(o);
      const overlap = r1 + r2 - Math.hypot(o.at[0] - me.at[0], o.at[1] - me.at[1]);
      return { id: o.id, at: o.at, r: r2, overlapFt: Math.round(overlap * 10) / 10, name: plantsById.get(o.plantId)?.commonName ?? o.plantId, min: Math.min(r1, r2) };
    })
    .filter((o) => o.overlapFt > o.min * 0.5)
    .sort((a, b) => b.overlapFt - a.overlapFt);
}
