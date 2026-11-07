import { createSignal } from "solid-js";
import type { Property } from "../model/property";
import type { GalleryGarden } from "./community";
import { toPublic } from "./publish";

// A garden you saved: a copy as it was when you saved it, so it stays even if the owner
// changes or unpublishes the original.
export type SavedCopy = { id: string; from: { id: string; title: string; owner: string }; property: Property; savedAt: number };

// Everything the gallery needs from "the community". The local store below keeps your own
// ratings, saves, and published gardens in this browser; a server store can replace it once
// accounts exist.
export interface GalleryStore {
  gardens(): GalleryGarden[];
  myRating(id: string): number | null;
  rate(id: string, stars: number): void;
  isSaved(id: string): boolean;
  setSaved(id: string, saved: boolean): void;
  saved(): SavedCopy[];
  // Your own designs.
  isMine(gardenId: string): boolean;
  publicIdOf(propertyId: string): string;
  isPublic(propertyId: string): boolean;
  publish(property: Property): void;
  unpublish(propertyId: string): void;
  // Remembers that a design started as a saved copy, so publishing it credits the original.
  noteCopy(propertyId: string, from: { id: string; title: string }): void;
  copiedFrom(propertyId: string): { id: string; title: string } | null;
}

type Boost = { sum: number; count: number; saves: number };
type Mine = {
  ratings: Record<string, number>;
  // Demo only: ratings and saves from simulated neighbors, added on top of the community's.
  boosts?: Record<string, Boost>;
  saved: SavedCopy[];
  published: GalleryGarden[];
  copies: Record<string, { id: string; title: string }>;
};
export type Storage = { load(): Partial<Mine> | null; save(m: Mine): void };

// Browser storage can be missing or blocked; the gallery still works, it just forgets on reload.
// Each account in this browser keeps its own ratings, saves, and published gardens.
export const browserStorage = (account: string): Storage => {
  const key = `flower-power.gallery.v1:${account}`;
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Partial<Mine>) : null;
      } catch {
        return null;
      }
    },
    save(m) {
      try {
        localStorage.setItem(key, JSON.stringify(m));
      } catch {
        /* not saved; fine for a local preview */
      }
    },
  };
};

export const memoryStorage = (): Storage => {
  let m: Mine | null = null;
  return { load: () => m, save: (x) => void (m = structuredClone(x)) };
};

export const OWNER = "You";

// The local store can also simulate other people, for demos. A server store would not have this.
export type LocalStore = GalleryStore & {
  simulate(id: string, add: Boost): void;
  resetDemo(id: string): void;
};

export function createLocalStore(community: GalleryGarden[], storage: Storage): LocalStore {
  const loaded = storage.load() ?? {};
  const [mine, setMine] = createSignal<Mine>({ ratings: {}, saved: [], published: [], copies: {}, ...loaded });
  const update = (f: (m: Mine) => Mine) => {
    const next = f(mine());
    setMine(next);
    storage.save(next);
  };
  const all = () => [...mine().published, ...community];
  const find = (id: string) => all().find((g) => g.id === id);
  const isMine = (id: string) => find(id)?.owner === OWNER;
  const publicIdOf = (propertyId: string) => `mine-${propertyId}`;

  return {
    // Community numbers with your own rating and save folded in. Your published gardens come first.
    gardens() {
      const m = mine();
      return all().map((g) => {
        const r = m.ratings[g.id];
        const s = m.saved.some((c) => c.from.id === g.id);
        const b = m.boosts?.[g.id];
        if (r == null && !s && !b) return g;
        return {
          ...g,
          stars: { sum: g.stars.sum + (r ?? 0) + (b?.sum ?? 0), count: g.stars.count + (r == null ? 0 : 1) + (b?.count ?? 0) },
          saves: g.saves + (s ? 1 : 0) + (b?.saves ?? 0),
        };
      });
    },
    myRating: (id) => mine().ratings[id] ?? null,
    rate(id, stars) {
      if (!find(id) || isMine(id)) return;
      const n = Math.min(10, Math.max(1, Math.round(stars)));
      update((m) => ({ ...m, ratings: { ...m.ratings, [id]: n } }));
    },
    isSaved: (id) => mine().saved.some((c) => c.from.id === id),
    setSaved(id, saved) {
      const g = find(id);
      if (!g || isMine(id)) return;
      update((m) => {
        const rest = m.saved.filter((c) => c.from.id !== id);
        if (!saved) return { ...m, saved: rest };
        const copy: SavedCopy = { id: `saved-${id}`, from: { id, title: g.title, owner: g.owner }, property: structuredClone(g.property), savedAt: Date.now() };
        return { ...m, saved: [copy, ...rest] };
      });
    },
    saved: () => mine().saved,

    isMine,
    publicIdOf,
    isPublic: (propertyId) => mine().published.some((g) => g.id === publicIdOf(propertyId)),
    // Publishing again replaces the public copy with the latest version, keeping its ratings.
    publish(property) {
      const id = publicIdOf(property.id);
      update((m) => {
        const old = m.published.find((g) => g.id === id);
        const based = m.copies[property.id];
        const garden: GalleryGarden = {
          id,
          title: property.name,
          owner: OWNER,
          ageDays: old?.ageDays ?? 0,
          stars: old?.stars ?? { sum: 0, count: 0 },
          saves: old?.saves ?? 0,
          property: { ...toPublic(property), id },
          ...(based ? { basedOn: based } : {}),
        };
        return { ...m, published: [garden, ...m.published.filter((g) => g.id !== id)] };
      });
    },
    unpublish(propertyId) {
      const id = publicIdOf(propertyId);
      update((m) => ({ ...m, published: m.published.filter((g) => g.id !== id) }));
    },
    noteCopy(propertyId, from) {
      update((m) => ({ ...m, copies: { ...m.copies, [propertyId]: from } }));
    },
    copiedFrom: (propertyId) => mine().copies[propertyId] ?? null,

    simulate(id, add) {
      update((m) => {
        const old = m.boosts?.[id] ?? { sum: 0, count: 0, saves: 0 };
        return { ...m, boosts: { ...m.boosts, [id]: { sum: old.sum + add.sum, count: old.count + add.count, saves: old.saves + add.saves } } };
      });
    },
    // Puts one garden back as it started: no simulated neighbors, and no rating or save from you.
    resetDemo(id) {
      update((m) => {
        const { [id]: _b, ...boosts } = m.boosts ?? {};
        const { [id]: _r, ...ratings } = m.ratings;
        return { ...m, boosts, ratings, saved: m.saved.filter((c) => c.from.id !== id) };
      });
    },
  };
}
