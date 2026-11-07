// Rough sun positions for central Indiana. Close enough to plan a garden with:
// no equation of time, no refraction, and times are local solar time.
export const LAT = 39.8;

const rad = Math.PI / 180;

// altDeg is above the horizon. azDeg is the compass direction, clockwise from north.
export type SunPos = { altDeg: number; azDeg: number; hours: number; month: number };

export function declination(dayOfYear: number) {
  return 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
}

// Sun positions across one day, at the midpoints of even steps from sunrise to sunset.
// Each position carries the hours it stands for.
export function dayPath(dayOfYear: number, month: number, stepHours = 0.5, lat = LAT): SunPos[] {
  const phi = lat * rad;
  const dec = declination(dayOfYear) * rad;
  const half = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec)))) / rad / 15;
  const n = Math.max(1, Math.round((half * 2) / stepHours));
  const dt = (half * 2) / n;
  const out: SunPos[] = [];
  for (let i = 0; i < n; i++) {
    const h = (-half + dt * (i + 0.5)) * 15 * rad;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
    const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / rad + 180;
    out.push({ altDeg: alt / rad, azDeg: az, hours: dt, month });
  }
  return out;
}

export const seasons = ["growing", "june", "equinox"] as const;
export type SunSeason = (typeof seasons)[number];

export const seasonLabels: Record<SunSeason, string> = {
  growing: "Growing season (Apr–Sep average)",
  june: "June 21 (longest day)",
  equinox: "March 20 (equinox, trees bare)",
};

// [day of year, month] for each representative day.
const days: Record<SunSeason, [number, number][]> = {
  growing: [[105, 4], [135, 5], [166, 6], [196, 7], [227, 8], [258, 9]],
  june: [[172, 6]],
  equinox: [[79, 3]],
};

// The day count lets a caller average the hours per day.
export function seasonPath(season: SunSeason) {
  const list = days[season];
  return { days: list.length, path: list.flatMap(([d, m]) => dayPath(d, m)) };
}
