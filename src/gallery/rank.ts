import type { GalleryGarden } from "./community";
import { TOP_N } from "./layout";

// Until a garden has about this many ratings, its stars are pulled toward the community average.
export const RATINGS_TO_RANK = 5;

export function averageStars(g: Pick<GalleryGarden, "stars">) {
  return g.stars.count ? g.stars.sum / g.stars.count : 0;
}

export function communityAverage(gardens: Pick<GalleryGarden, "stars">[]) {
  let sum = 0, count = 0;
  for (const g of gardens) {
    sum += g.stars.sum;
    count += g.stars.count;
  }
  return count ? sum / count : 7;
}

// One rough score from stars and saves. Stars matter most; saves add a small bonus that grows slowly.
export function score(g: Pick<GalleryGarden, "stars" | "saves">, mean: number) {
  const stars = (RATINGS_TO_RANK * mean + g.stars.sum) / (RATINGS_TO_RANK + g.stars.count);
  return stars + 0.35 * Math.log10(1 + g.saves);
}

// Best first. Gardens with too few ratings go after every garden that can rank.
export function rankGardens<T extends Pick<GalleryGarden, "stars" | "saves">>(gardens: T[]): T[] {
  const mean = communityAverage(gardens);
  const ranked = gardens.map((g) => ({ g, s: score(g, mean), ok: g.stars.count >= RATINGS_TO_RANK }));
  ranked.sort((a, b) => Number(b.ok) - Number(a.ok) || b.s - a.s);
  return ranked.map((x) => x.g);
}

// The Best tab: only the top 10 gardens that have enough ratings to rank.
export function bestGardens<T extends Pick<GalleryGarden, "stars" | "saves">>(gardens: T[]): T[] {
  return rankGardens(gardens.filter((g) => g.stars.count >= RATINGS_TO_RANK)).slice(0, TOP_N);
}
