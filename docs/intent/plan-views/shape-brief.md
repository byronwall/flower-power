---
title: "Plan views — 2D renderer shape brief"
slug: "plan-views"
phase: shape
status: current
last_updated: "2026-11-07"
---

# 2D renderer — the first part we build

**Outcome:** A property file draws as a semi-realistic watercolor plan, like a hand-drawn landscape architecture plan. You can edit it, add plants from a gallery, and move through the seasons and years 1 to 5.

**Primary flow:** Open a property → see the watercolor plan → pick a season and year → select, move, add, or delete objects → drag plants from the gallery as single plants or regions → save.

## Feature scope

```text
2D renderer
├── PLANNED ADDITIONS
│   ├── Property file (typed JSON, one file per property)
│   │   ├── Lot outline, size in feet, and compass heading
│   │   ├── House outline
│   │   ├── Fences: solid privacy, semi-open, open (each with a height and shade amount)
│   │   ├── Ground surfaces: patio, path, stepping stones, gravel, mulch, lawn, driveway
│   │   ├── Structures: deck, pergola, shed, raised bed
│   │   ├── Edges and low walls: bed edging, border, seat wall
│   │   ├── Garden features: bird bath, feeder, bench, fire pit, water feature
│   │   └── Plantings: single plant at a point, region of one plant, or row (hedge)
│   ├── Plant library (one JSON file per plant, 25 to start)
│   │   ├── Facts: size, growth time, sun, soil, bloom, lifecycle, care, safety, wildlife
│   │   ├── Look: plant form, colors by season, bloom colors
│   │   └── Default placement: single, region, or either
│   ├── Watercolor renderer
│   │   ├── Paper texture, soft washes, hand-drawn ink outlines
│   │   ├── Seeded variation, so the same plant never looks copied
│   │   └── Season and year 1 to 5 change color, bloom, and size
│   ├── Editor
│   │   ├── Select, move, delete; draw region and row outlines
│   │   └── Save back to the property file
│   └── Plant gallery
│       ├── Filter by category, sun, bloom color, bloom month
│       └── Drag out as a single plant or paint a region
└── OUTSIDE THIS SHAPE
    ├── Slope, terraces, and height layers (a later spike)
    ├── Aerial capture, sun model, AI designs, and the 3D pane
    └── Accounts and saving to a server database
```

## Behavior

| Situation | Expected result |
| --- | --- |
| A region of one plant | The renderer places plants at that plant's spacing, in a natural pattern from the region's seed. |
| The same plant in two regions | They look alike but not the same. |
| Year 1, then year 5 | Plants grow from planted size toward mature size. |
| Winter | Deciduous plants show bare or dormant. Evergreens stay green. Annuals are gone. |
| A fence is solid, semi-open, or open | It draws in a different style, and it stores its shade amount for the sun model. |
| A plant file has a missing or wrong field | A check fails and names the file and the field. |

## Example

A property file, shortened. Points are in feet from the lot's top-left corner. `headingDeg` is the compass direction of the top of the plan.

```json
{
  "id": "sample-lot",
  "name": "Sample Indiana lot",
  "units": "ft",
  "headingDeg": 0,
  "lot": { "outline": [[0,0],[80,0],[80,130],[0,130]] },
  "house": { "outline": [[18,60],[62,60],[62,100],[18,100]] },
  "fences": [{ "id": "f1", "kind": "solid", "heightFt": 6, "path": [[0,0],[80,0]] }],
  "surfaces": [{ "id": "s1", "kind": "patio", "material": "flagstone", "outline": [[30,40],[50,40],[50,60],[30,60]] }],
  "structures": [],
  "edges": [],
  "features": [{ "id": "b1", "kind": "birdbath", "at": [65, 30] }],
  "plantings": [
    { "id": "p1", "type": "single", "plantId": "eastern-redbud", "at": [15, 20], "plantedYear": 0 },
    { "id": "p2", "type": "region", "plantId": "purple-coneflower", "outline": [[40,10],[60,10],[60,25],[40,25]], "seed": 7 },
    { "id": "p3", "type": "row", "plantId": "green-giant-arborvitae", "path": [[78,5],[78,55]] }
  ]
}
```

## Decisions and boundaries

**Appetite:** One renderer, one editor, one gallery, 25 plants, two property files: Byron's yard and a made-up typical lot.

**Key decision:** Paint on a canvas and edit on an SVG layer above it. The canvas gives the watercolor look. The SVG layer gives selection, handles, and hit testing without custom code.

**Key decision:** The renderer works out where each plant in a region goes, from the plant's spacing and the region's seed. The file stores the region, not every plant. Single plants and rows store their own positions.

**Boundary:** The ground is always flat. Heights are only values on objects, for shade and for the 3D pane later. Plant facts are drafts until someone checks each one against a trusted source.

**First proof:** **Try:** Open the sample lot. Paint a coneflower region, place a redbud, and move through winter, summer, and year 5. **Observe:** Does it look like a hand-drawn landscape plan? Is a region easy to make and edit? **Decide:** If yes, trace Byron's yard into a property file and add the remaining plants. If the look fails, run the art spike (S5) before more editor work.
