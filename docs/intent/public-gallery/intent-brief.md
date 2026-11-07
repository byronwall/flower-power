---
title: "Public garden gallery"
slug: "public-gallery"
phase: intent
status: current
last_updated: "2026-11-07"
---

# Public garden gallery

Part of [accounts and gallery](../accounts-and-gallery/intent-brief.md). This document owns the public gallery, the New gardens tab, and the personal gallery. Accounts and sharing stay in the parent.

## My read

The public gallery shows the community's best gardens. People rate gardens from 1 to 10 stars and save the ones they like. A rough mix of stars and saves decides which gardens are best, and the wall highlights them.

New gardens get their chance in a separate New gardens tab. There you go through a few new public gardens, give each one stars, and choose yes or no to save it. That rating is what lets a new garden rise to the top.

Your own gardens, and the gardens you save, live in your personal gallery. Nothing there is public unless you mark your own garden public.

All of this sits beside the designer. A toggle switches between your current design and the gallery, so you see one at a time.

## What matters most

- **The best gardens first.** One rough ranking from stars and saves.
- **Every new garden gets a chance.** The New gardens tab is where they collect their first ratings.
- **Look, don't touch.** Other people's gardens are view only. To change one, you save it and edit your own copy from your personal gallery. The original never changes.
- **No location.** No public view shows the address or the aerial photo.

## The experience you appear to want

You are designing your garden. You flip the toggle to the gallery and see a zoomed-out wall of gardens, with the best ones highlighted. You pan and zoom toward one. At the closest zoom it opens, and you see its full plan: the plant layout, the plants, how they are arranged, and the whole landscape, just like the designer, but view only.

In the New gardens tab, you go through a few recent gardens. For each one, you pick 1 to 10 stars and flip save to yes or no.

To edit a garden you like, you save it, open it from your personal gallery, and edit it there. Then you flip back to your own design.

## Boundaries

### Must be true

- Private by default. Each owner chooses public or not for each garden.
- Saving puts a garden in your personal gallery, never in the public one.
- Gardens in the public gallery and the New gardens tab are view only.
- Address and aerial photo are hidden in every public view.

### Must be avoided

- Any public view that shows where someone lives.
- Editing someone else's original garden.

## What seems settled

- One rough combined ranking from 1–10 stars and total saves.
- Three places: the public gallery (best gardens), New gardens (rate and save), and your personal gallery (your own and saved gardens).
- A toggle between your current design and the gallery, viewed separately.

## Possibilities, not decisions

- Spike S16: a pan-and-zoom wall of 500 thumbnails that get sharper as you zoom. Fallback: a scrolling grid of cards.
- The exact ranking formula, and a minimum number of ratings before a garden can rank.
- Later: landscape architect portfolios and community projects, such as Fishers.

## Current reality that matters

- No accounts, server database, or public pages exist yet. Projects are local JSON files.
- The watercolor renderer and designer exist, and could give the view-only garden view and the thumbnails.

## Next step after confirmation

See the [shape brief](shape-brief.md).
