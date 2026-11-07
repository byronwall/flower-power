---
title: "Public garden gallery — implementation plan"
slug: "public-gallery"
phase: plan
status: draft
last_updated: "2026-11-07"
---

# Public garden gallery — implementation plan

## Plan at a glance

Prove the wall first, because it is the riskiest and most visible part. Milestone 1 puts a Design / Gallery toggle in the app bar and a Best wall of about 500 generated gardens, each painted by the existing plan painter. Clicking a garden opens it view only. There are no accounts, no server, and no ratings yet. The made-up community is generated in the browser from a fixed seed, so every run looks the same and the loop is just `pnpm dev`.

Milestone 2 adds the community actions behind one `GalleryStore` seam: stars from 1 to 10, Save yes/no, the New tab, and Mine with saved copies. The first store keeps your ratings and saves in this browser. Milestone 3 publishes your own gardens: a Public switch that makes a cleaned copy, editing a saved copy in the designer, and the "Based on" credit.

Real accounts and a server database are a separate initiative. When they land, they become a second `GalleryStore` behind the same seam. Nothing in the gallery UI changes.

This order keeps each step runnable. After milestone 1 you can judge the wall. After milestone 2 you can rate and save. After milestone 3 the whole loop works on one machine.

## Implementation strategy

- **First proof:** the Best wall of about 500 painted gardens, panned and zoomed, opening one view only.
- **Primary seam:** `GalleryStore` in `src/gallery/store.ts`. Its methods list gardens, rate, save, and publish. Milestones 1–3 use a local store; accounts add a server store later.
- **Fast local loop:** `pnpm dev`, then open the app and flip to Gallery. Run `pnpm test` for the generator, ranking, privacy, and store logic.
- **Local dependencies:** a seeded garden generator, and browser storage for your own ratings and saves.
- **Provider/live confirmation:** none until the accounts initiative.
- **Rollout and rollback:** the gallery sits behind the toggle. Removing the toggle leaves the designer exactly as before.

## Milestone 1: Flip to a wall of the best gardens and open one

This answers spike S16. It leaves out ratings, saving, and publishing.

- **Change — Generated community** (`src/gallery/community.ts`)
  - Seeded lots of different sizes, each with a house, driveway, patio or path, beds, rows, and single plants from the plant library. Each garden gets a made-up owner name, title, stars, and save count.
  - Vitest: the same seed gives the same gardens, and every garden passes `propertySchema` and uses known plants.
- **Change — Ranking** (`src/gallery/rank.ts`)
  - Average stars pulled toward the overall mean until about 5 ratings, plus a small bonus that grows with saves.
  - Vitest: 40 saves and 8.6 stars beats 2 saves and 10 stars.
- **Change — Design / Gallery toggle** (`src/routes/plan.tsx`)
  - The designer stays mounted while the gallery shows, so unsaved changes survive. The view and the open garden are kept in the URL.
- **Change — Best wall** (`src/gallery/Wall.tsx`)
  - One canvas. Best gardens get the largest tiles, at the center. Drag to pan; the wheel zooms around the cursor. Thumbnails are painted once, cached, and repainted sharper when tiles get large.
- **Change — Garden view** (`src/gallery/GardenView.tsx`)
  - `PlanView` without the edit layer, the month and year slider, the plant list, and the garden's stars and saves. Back returns to the wall where you left it.

### Desired end state

- Flipping to Gallery shows hundreds of watercolor gardens. The best ones are big and central.
- Panning and zooming stay smooth on a laptop. Opening a garden shows its full plan, with no edit tools.
- Flipping back to Design finds your design unchanged.

## Milestone 2: Rate, save, and find new gardens

- **Change — `GalleryStore` seam and local store**
  - Ratings (one per person per garden; a new rating replaces the old one) and saves, kept in browser storage. Scores update from your ratings.
  - Vitest against the store contract: re-rating, saving twice, and not rating your own garden.
- **Change — New tab**
  - Recent gardens with few ratings, one at a time, with stars 1 to 10 and a Save yes/no toggle.
- **Change — Mine tab**
  - Saved gardens are snapshot copies, so they stay when the owner turns Public off.

### Desired end state

- You can rate and save from the garden view and the New tab. Saved gardens show in Mine after a reload.

## Milestone 3: Publish your own gardens and edit saved copies

- **Change — Cleaned public copy** (`toPublic` in `src/gallery/publish.ts`)
  - Copies only fields on an allow list, so a future address or aerial photo field can never be published.
  - Vitest: an extra private field on the property is not in the public copy.
- **Change — Public switch and editing a copy**
  - Your designs show in Mine with a Public switch. A saved copy opens in the designer as your own new property. Publishing an edited copy adds a "Based on" credit that links to the original.

### Desired end state

- Turning Public on puts your garden in New. Turning it off removes it from Best and New, and saved copies stay. An edited copy can go public with credit.

## Open decisions and spikes

- **Spike S16 (decided):** the wall is smooth and inviting, so it stays. The scrolling grid fallback is not needed.

## Below the cut line

- Real accounts, a server database, and hosting (the accounts initiative).
- Moderation, reporting, comments, and profiles.
- Search and filters on the wall.
- Tuning the ranking formula with real ratings.
