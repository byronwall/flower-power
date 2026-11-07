---
title: "Garden design app — shape brief"
slug: "garden-design-app"
phase: shape
status: draft
last_updated: "2026-11-07"
---

# Garden design app — the first product

**Outcome:** An Indiana homeowner sees their own property as a beautiful watercolor plan, gets garden designs that fit its sun and shade, sees them in 2D and 3D through the seasons and over 5 years, and leaves with a plan to follow.

**Primary flow:** Sign in → address and photos → your property appears → fix it and set the sun → say what you want → pick a design → edit in 2D beside a live 3D view → move through time → get the plan → share it.

## Feature scope

```text
Garden design app (desktop web, Indiana)
├── PLANNED ADDITIONS
│   ├── Accounts: email and password only; projects saved to your account
│   ├── Your property appears
│   │   ├── Address → aerial view at a known scale
│   │   ├── AI marks house, driveway, fences, beds, trees, lawn
│   │   ├── Drag-in photos show how each area looks and what grows there now
│   │   └── Correct: redraw outlines, type a size, draw fence and property lines
│   ├── Sun and shade
│   │   ├── Set which way the front door faces
│   │   ├── Morning and afternoon shadows; rotate until they look right
│   │   └── Each area gets full sun, part sun, or shade
│   ├── Say what you want
│   │   ├── Feeling, color theme, wildlife, safety (kids, pets)
│   │   ├── Favorite plants to design around
│   │   ├── Reference photo: "use the style of this garden" (labeled as borrowed)
│   │   └── Review of the yard now: what works, what does not, empty spots
│   ├── Designs: 3 to 5 options on your real plan; pick, give feedback, rework an area
│   ├── 2D plan editor
│   │   ├── Drag a plant out and paint an area; the app fills it at the right spacing
│   │   ├── Plants overlap at real size, not in grid cells
│   │   ├── Move, remove, or replace any plant or area
│   │   └── Plant gallery: about 100 Indiana plants; filter by color, bloom, sun, effort
│   ├── Views
│   │   ├── Watercolor plan: each plant painted with some randomness, so it looks organic
│   │   └── Two panes: 2D plan on the left, 3D view on the right that you can rotate
│   │       └── An edit in 2D shows in 3D at once
│   ├── Time slider: winter to fall, then years 1 to 5; both panes change at once
│   ├── Your plan: shopping list, planting and care calendar, soil, sun, time to grow
│   ├── Share a project with another account, view only
│   └── Public gallery
│       ├── Mark a project public to include it
│       └── Zoomed-out wall of garden thumbnails; zoom in to open one
├── EVALUATE BEFORE COMMITTING
│   ├── Front view painted onto your own house photo
│   ├── Tree and house heights from public elevation data for real shadows
│   └── Property lines from county parcel maps
└── LATER POSSIBILITIES
    ├── Growth simulation: seed to flower, plants fill in and crowd out others
    ├── Budget and costs; paths, stone, and fence materials
    └── Other regions; weather simulations; city use; garden explainer; portfolio
```

## Behavior

| Situation | Expected result |
| --- | --- |
| AI misses or misplaces a feature | The person redraws it. The design uses the corrected map. |
| No usable aerial view | The person draws the outline on a plain grid with one known size. |
| A plant goes where the sun is wrong | The plant shows a warning. "Replace" offers plants that fit. |
| The person locks a plant they love | New designs and reworks keep it. |
| The same plant is placed twice | The two areas look similar but not the same. |
| The person drags the time slider | The 2D and 3D panes both update with no wait. |
| Plants grow into each other by year 5 | The plan shows the overlap and suggests spacing. |
| A reference photo has non-Indiana plants | The app uses Indiana plants with a similar look and says so. |
| A shared person opens a project | They see every view and the slider, but they cannot edit. |
| A project is public | The gallery shows the garden but not the address or the aerial photo (proposed). |

## Decisions and boundaries

**Appetite:** One property type (a house on a suburban Indiana lot), one region, about 100 plants. Big enough to show Anne her whole yard. Not a platform.

**Key decision: aerial view first, photos second.** The plan comes from the address and an aerial image. The photos show the look of each area and the existing plants. A 3D model made from photos (for example, Gaussian splats) is a research project and would hold the whole app on its hardest problem. The person still drags in photos and sees their property appear.

**Key decision: watercolor plants with variation.** Plain plant photos look repetitive. Each plant has watercolor art with randomness, so areas look organic. The 3D pane uses the same art and the same data as the 2D plan, so the two views always agree.

**Key decision: AI chooses, code places.** The AI picks plants, areas, and reasons. Normal code does the spacing, sun checks, and plant facts. Designs stay repeatable, fast to edit, and free from made-up plant facts.

**Boundary:** Accounts use email and password only, with the simplest possible database. No magic links, private links, or payments. No integration with listing sites: people drag in listing photos they saved. The map only needs to be close enough to plan with.

**First proof:** **Try:** For one real Indiana property, go from the address to a watercolor plan with AI-marked features. Paint areas of 10 Indiana plants and move the slider through 4 seasons and 5 years. **Observe:** Do you and Anne recognize the yard after less than 5 minutes of fixes? Would you show the plan to a friend? **Decide:** If yes, add the live 3D pane, then designs and the plan output. If the map fails, switch to guided drawing. If the art fails, finish the plant-art spike before more features.

Research and spikes: [spikes.md](spikes.md) · Intent: [intent-brief.md](intent-brief.md) · Early mockups: [mockups/](mockups/)
