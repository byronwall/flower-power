import type { Plant } from "./plant";

type Unit = "days" | "weeks" | "months" | "years";

// "3–5 days", "75–90 days", "10–12 months", "1 year". Long spans in days read better as months.
export function span([lo, hi]: [number, number], unit: Unit): string {
  if (unit === "days" && hi >= 180) return span([Math.round(lo / 30.4), Math.round(hi / 30.4)], "months");
  if (unit === "months" && lo % 12 === 0 && hi % 12 === 0) return span([lo / 12, hi / 12], "years");
  const n = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `${n} ${hi === 1 ? unit.slice(0, -1) : unit}`;
}

export const sproutsIn = (p: Plant) => (p.germination ? span(p.germination.days, "days") : undefined);

export const bloomsIn = (p: Plant) => (p.firstBloom ? `${span(p.firstBloom.after, p.firstBloom.unit)} from ${p.firstBloom.from}` : undefined);
