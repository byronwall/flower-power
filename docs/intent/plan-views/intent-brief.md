---
title: "Plan views: 2D plan, 3D pane, and height layers"
slug: "plan-views"
phase: intent
status: draft
last_updated: "2026-11-07"
---

# Plan views: 2D plan, 3D pane, and height layers

Part of the [garden design app](../garden-design-app/intent-brief.md). This document owns how the garden is drawn and edited. Other parts, such as capture and plant data, have their own documents. See the [intent index](../README.md).

## My read

The person edits a garden on a 2D watercolor plan, with a 3D view beside it. A garden has height: a tree is above a fern, and a shrub is above a ground cover. The 2D plan must stay easy to edit when plants sit under other plants. It must also hint at height, and the 3D pane must show the true height.

You do not want people to look through foliage to find what is under it. When a design has layers, the person can slice the plan at a height. Above the slice, a tree becomes a trunk with a shaded area around it. Below the slice, the plants under the tree are clear and easy to edit. When a design has no layers, such as a flat formal garden, the slicer is not shown.

## What matters most

- **Easy to edit at every height.** The person can always reach and change a plant, even under a tree.
- **The 2D plan hints at height, and the 3D pane shows it.** The two views agree.
- **Show the layer control only when it helps.** A flat design shows no layer control.

## The experience you appear to want

The 2D plan is on the left and the 3D pane is on the right. In 2D, taller plants have a soft painted shadow and a little artificial depth. This lets you sense which plants are tall. The 3D pane shows the same plants at their real heights, along with any steps or levels in the ground.

You plant a shade garden under a big maple. A layer control appears, because now plants overlap in height. You slice below the canopy. The maple becomes a trunk circle inside a shaded wash that marks its shade area. The hostas and ferns under it are now clear. You move, add, or replace them as on open ground. You slice back up, and the canopy covers them again, as in the 3D pane.

## Boundaries

### Must be true

- Plants that do not overlap look correct from the top in every case.
- The layer control appears only when plants overlap at different heights.
- Below the canopy, a tree is shown as its trunk footprint and a shaded area, not as foliage.
- An edit in 2D shows in the 3D pane at once, at the correct height.

### Must be avoided

- Editing through or around foliage to reach plants underneath.
- A layer control that every user must learn, even for a flat design.
- Height hints that make the watercolor plan look busy or technical.

## What seems settled

- 2D and 3D sit side by side and stay in sync.
- The 2D plan uses some artificial depth (shadows and shading) to hint at height.
- Overlapping heights use a layer slicer on the 2D plan.

## Possibilities, not decisions

- The layer control could be a few fixed layers (canopy, shrubs, ground) or a free height slider.
- Steps, terraces, and other ground-level changes could show in the 3D pane and as contour-style marks in 2D.
- The slice could also apply to the 3D pane, which would cut away the canopy there too.

## What still needs your input

1. Fixed layers (canopy, shrubs, ground) or a free height slider?
2. Are ground-level changes, such as steps and terraces, part of the first version?

## Next step after confirmation

Add the layer cases to spike S17, which tests height hints, the canopy cutaway, and the shaded area against the 3D pane.
