import type { Plant, Season } from "../model/plant";
import type { Planting, Point } from "../model/property";
import { along, hashString, scatter } from "./geometry";

export type ViewTime = { month: number; year: number };

export const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function seasonOf(month: number): Season {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

export type Look = {
  spreadFt: number;
  heightFt: number;
  foliage: string | null;
  bloom: string[] | null;
  fruit: string | null;
};

// How a plant looks in a given month and year after planting.
export function lookOf(plant: Plant, time: ViewTime, existing = false): Look | null {
  const season = seasonOf(time.month);
  const foliage = plant.foliage[season];
  const bloom = plant.bloom?.months.includes(time.month) ? plant.bloom.colors : null;
  const fruit = plant.fruit?.months.includes(time.month) ? plant.fruit.color : null;
  const seasonal = plant.lifecycle === "annual" || plant.lifecycle === "tender-perennial";
  if (seasonal && !foliage && !bloom) return null;

  const { plantedSpreadFt, spreadFt, heightFt, yearsToMature } = plant.size;
  const t = existing || seasonal ? 1 : Math.min(1, time.year / yearsToMature);
  const grow = 1 - Math.pow(1 - t, 1.6);
  return {
    spreadFt: plantedSpreadFt + (spreadFt - plantedSpreadFt) * grow,
    heightFt: heightFt * Math.max(0.15, grow),
    foliage,
    bloom,
    fruit,
  };
}

export type Instance = { key: string; plantingId: string; plantId: string; at: Point; seed: number; existing: boolean };

// Turns each planting into the plants it holds. Regions and rows place plants from spacing and seed.
export function expand(planting: Planting, plant: Plant): Instance[] {
  const existing = planting.existing ?? false;
  const spacing = (planting.type !== "single" && planting.spacingFt) || plant.size.spacingFt;
  const pts =
    planting.type === "single" ? [planting.at]
    : planting.type === "row" ? along(planting.path, spacing)
    : scatter(planting.outline, spacing, planting.seed);
  const base = planting.type === "region" ? planting.seed : hashString(planting.id);
  return pts.map((at, i) => ({
    key: `${planting.id}:${i}`,
    plantingId: planting.id,
    plantId: plant.id,
    at,
    seed: base * 31 + i * 7919,
    existing,
  }));
}
