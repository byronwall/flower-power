---
title: "Public garden gallery — shape brief"
slug: "public-gallery"
phase: shape
status: current
last_updated: "2026-11-07"
---

# Public garden gallery — what we are adding

**Outcome:** While you design, you can flip to a gallery of the community's best gardens, rate new ones, and save any garden as your own copy to edit.

**Primary flow:** Designing → flip the toggle to Gallery → pan and zoom the wall → open a garden view only → rate it and save it → open your copy from your personal gallery → edit → flip back to your design.

## Feature scope

```text
Gallery
├── PLANNED ADDITIONS
│   ├── Design / Gallery toggle in the app bar
│   │   └── One full-screen view at a time; your unsaved design waits untouched
│   ├── Gallery tabs: Best · New · Mine
│   ├── Best: the top 10 only
│   │   ├── A podium of watercolor tiles: #1 big in the middle, #2 and #3 beside it, #4 to #10 below
│   │   ├── Rank badges, names, stars, and saves on every tile; pan and zoom still work
│   │   └── Closest zoom opens the garden
│   ├── New: rate recent gardens
│   │   ├── A few recent public gardens at a time, one after another
│   │   └── For each: stars 1 to 10, and a Save yes/no toggle
│   ├── Garden view (from Best or New)
│   │   ├── The full plan as the designer draws it, with the month and year slider
│   │   ├── Plant list; tap a plant for its facts
│   │   ├── View only: no edit tools
│   │   └── Its stars, save count, and your own rating and Save toggle
│   ├── Mine: personal gallery
│   │   ├── Your own gardens, each with a Public on/off switch
│   │   └── Gardens you saved, kept as your own editable copies
│   └── Ranking
│       └── One score from stars and saves; a garden needs a few ratings before it can rank
└── LATER POSSIBILITIES
    ├── Search and filters on the wall (style, plants, sun)
    ├── Comments, follows, or owner profiles
    └── Landscape architect portfolios and community projects
```

## Behavior

| Situation | Expected result |
| --- | --- |
| You flip to Gallery with unsaved design changes | Your design stays as it was, unsaved changes included. Flipping back returns to it. |
| You rate a garden again | Your new rating replaces the old one. One rating per person per garden. |
| You open your own public garden in the gallery | You can view it, but you can't rate or save it. |
| You save a garden | A copy of it, as it is now, goes into Mine. Later changes by its owner don't touch your copy. |
| You edit a saved copy | Only your copy changes. The original never changes. |
| An owner turns Public off | The garden leaves Best and New right away. Copies people already saved stay in their Mine. |
| A garden has only one or two ratings | It shows in New but can't make the top 10 yet. |
| A garden ranks 11th or lower | It isn't on Best. People reach it through New while it's new, or from Mine once saved. |
| You make an edited saved copy public | It joins New as its own garden, with a "Based on" credit that links to the original. |
| Any public view | No address, no aerial photo, no owner contact details. |

## Example

Proposed score: average stars, pulled toward the overall average until about 5 ratings, plus a small bonus for saves. 40 saves at 8.6 stars beats 2 saves at 10 stars.

## Decisions and boundaries

**Appetite:** One gallery inside the existing app: three tabs, one wall, one view-only garden view, and saved copies. No new editor. The garden view reuses the existing plan painter without the edit layer.

**Key decision:** Build and prove the gallery against a local, made-up community before accounts exist. Accounts and a server database are a separate initiative and aren't built yet. Placing the gallery behind one "gallery store" seam means the wall, rating, saving, and garden view can be judged now with a few hundred generated gardens. Real accounts then plug into the same seam. This keeps the hardest UX risk, the wall, apart from login and hosting risks.

**Key decision:** A public garden is a cleaned copy made when the owner turns Public on, with the address, the aerial photo, and personal details removed. The gallery never reads the owner's private project directly, so a new private field can't leak by accident.

**Boundary:** The wall shows public gardens only. Every garden has a single owner. Moderation and reporting are out of the first version. Turning the gallery off hides the toggle, and the designer works as before.

**First proof:** **Try:** Spike S16 with about 500 generated gardens based on the sample lot. Build the wall with real thumbnails from the plan painter, sized by a made-up score, and open a garden view only at the closest zoom. **Observe:** Does panning and zooming stay smooth on a normal laptop? Do you want to explore it, and do the best gardens stand out? **Decide:** If it is smooth and inviting, keep the wall and build New and Mine on the local store. If it stutters or feels confusing, switch Best to a scrolling grid sorted by score, and keep everything else.

See the [intent brief](intent-brief.md).
