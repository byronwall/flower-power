import type { Property } from "../model/property";

// The only property fields that may appear in a public garden. Anything else, such as a future
// address or aerial photo, is left out. A test fails when the property gains a field that is in
// neither list, so each new field gets an explicit decision.
export const PUBLIC_FIELDS = ["id", "name", "units", "headingDeg", "lot", "house", "fences", "surfaces", "structures", "edges", "features", "plantings"] as const;
export const PRIVATE_FIELDS = ["underlay"] as const;

export function toPublic(property: Property): Property {
  const out: Record<string, unknown> = {};
  for (const f of PUBLIC_FIELDS) out[f] = structuredClone(property[f]);
  return out as Property;
}
