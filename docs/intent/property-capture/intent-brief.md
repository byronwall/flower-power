---
title: "Property capture"
slug: "property-capture"
phase: intent
status: draft
last_updated: "2026-11-07"
---

# Property capture

Part of the [garden design app](../garden-design-app/intent-brief.md). This document owns how a real property becomes a plan. See the [intent index](../README.md) for the other parts.

## My read

This is the magic moment of the product. A homeowner enters an address and drags in a few photos. The app shows their whole property from above, at a known scale, with the house, driveway, fences, beds, trees, and lawn marked. They recognize it as their own yard. Then they fix what is wrong in a few minutes, not an hour.

The plan only needs to be close enough to plan a garden with. It is not a survey and it is not for a contractor. Every design, sun check, and plant count in the product depends on this plan, so the person must be able to correct it easily.

## What matters most

- **It is your property.** You see your own house and yard, not a template.
- **Fast corrections.** Most people finish their fixes in less than 5 minutes.
- **No step blocks the flow.** If an automatic step fails, a manual step takes its place.

## The experience you appear to want

You type your address. An aerial view of your lot appears, with a scale. The app outlines the house, the driveway, the fences, the beds, and the trees. You drag in photos from your photo library, or listing photos you saved, or a picture you took on your phone in the yard. The photos show what each area looks like and what grows there now.

You drag a wrong outline into place. You type "this bed is 12 feet long." You draw the fence line and the lot line. The plan updates, and you move on to set the sun.

## Boundaries

### Must be true

- The whole property around the house is in scope. A small area alone also works.
- The plan has a known scale, from the aerial view or from one size the person types.
- The person can redraw any outline, type a size, and draw fence and lot lines.
- Photos come from files the person drags in. A phone only sends photos.

### Must be avoided

- A 3D model built from photos in the first version.
- Any integration that pulls photos from listing sites. The person brings their own files.
- A flow that stops when the AI cannot find a feature.

## What seems settled

- The aerial view gives the outline and the scale. Photos give the look of each area.
- Accuracy is "close enough to plan with."
- When no aerial view is usable, the person draws the outline on a plain grid with one known size.

## Possibilities, not decisions

- Lot lines from county parcel maps (spike S3).
- Photos placed on the plan by the AI (spike S4).
- Photos across seasons to show how the yard changes.

## What still needs your input

1. Must the first version name the existing plants in your photos, or is outlining the beds and trees enough?

## Spikes

S1 (aerial base map), S2 (AI marks features), S3 (lot lines), and S4 (what photos add). See the [spike list](../garden-design-app/spikes.md).
