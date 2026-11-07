// Lays out ranked gardens on the wall: the best get the biggest tiles at the center,
// and the rest spiral outward in rank order. Positions are in grid cells.
export type Tile<T> = { item: T; x: number; y: number; span: number };

// The top 10 get the big tiles in the middle of the wall and a rank badge.
export const TOP_N = 10;

export function spanForRank(rank: number) {
  if (rank === 0) return 4;
  if (rank < TOP_N) return 3;
  if (rank < 33) return 2;
  return 1;
}

// The top 10 as a podium on a 7-column grid: #1 big in the middle, #2 and #3 beside it,
// and #4 to #10 in a row underneath, left to right.
const PODIUM = [
  { x: 2, y: 0, span: 3 },
  { x: 0, y: 1, span: 2 },
  { x: 5, y: 1, span: 2 },
  ...Array.from({ length: 7 }, (_, i) => ({ x: i, y: 3, span: 1 })),
];

export function layoutPodium<T>(ranked: T[]): Tile<T>[] {
  return ranked.slice(0, PODIUM.length).map((item, i) => ({ item, ...PODIUM[i] }));
}

// xWeight below 1 makes the wall wider than tall, measured in cells.
export function layoutWall<T>(ranked: T[], xWeight = 0.8): Tile<T>[] {
  if (ranked.length <= TOP_N) return layoutPodium(ranked);
  const area = ranked.reduce((a, _, i) => a + spanForRank(i) ** 2, 0);
  const R = Math.ceil(Math.sqrt(area / xWeight)) + 4;
  // Cells nearest the center first, slightly wider than tall to suit a screen.
  const cells: [number, number][] = [];
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) cells.push([x, y]);
  const dist = ([x, y]: [number, number]) => Math.hypot(x * xWeight, y) + Math.atan2(y, x) * 0.01;
  cells.sort((a, b) => dist(a) - dist(b));

  const taken = new Set<string>();
  const free = (x: number, y: number, s: number) => {
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (taken.has(`${x + dx},${y + dy}`)) return false;
    return true;
  };
  let start = 0;
  return ranked.map((item, rank) => {
    const s = spanForRank(rank);
    // Every cell before `start` is taken, so later searches can skip them.
    while (start < cells.length && taken.has(`${cells[start][0]},${cells[start][1]}`)) start++;
    for (let i = start; i < cells.length; i++) {
      const x = cells[i][0] - Math.floor(s / 2);
      const y = cells[i][1] - Math.floor(s / 2);
      if (!free(x, y, s)) continue;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) taken.add(`${x + dx},${y + dy}`);
      return { item, x, y, span: s };
    }
    throw new Error("The wall ran out of room.");
  });
}
