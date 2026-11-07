---
title: "Sun and shade"
slug: "sun-and-shade"
phase: intent
status: draft
last_updated: "2026-11-07"
---

# Sun and shade

Part of the [garden design app](../garden-design-app/intent-brief.md). This document owns how the app knows which areas get sun and which get shade. See the [intent index](../README.md) for the other parts.

## My read

Sun and shade decide what grows, so they drive the whole design. The app does not ask a homeowner to know their sun hours. Instead, it shows them their own yard with shadows at familiar times of day and asks, "Does this look right?" The person already knows their yard. They know the back bed is shady in the afternoon. The app uses that knowledge.

After this step, each area of the plan has a sun class: full sun, part sun, or shade. Plant warnings, plant suggestions, and designs all use that class.

## What matters most

- **The person checks it by eye.** They confirm shadows, not numbers.
- **Every area gets a sun class.** Designs and warnings depend on it.
- **It is simple.** One direction, one check, and a rotate if the shadows look wrong.

## The experience you appear to want

The address gives the location. You say which way your front door faces: north, south, east, or west. The app shows the morning and afternoon shadows of your house and trees on the plan. If the shadows look wrong, you rotate the plan until they match what you see in your yard. The plan then shows sun and shade areas, and you can paint over any area that is wrong.

When you place a plant where the sun is wrong for it, the plant shows a warning. "Replace" then offers plants that fit.

## Boundaries

### Must be true

- The sun class for each area comes from the location, the house direction, and the shadows the person confirms.
- The person can paint full sun, part sun, or shade over any area.
- The shade area under a tree matches the shaded area in the [plan views](../plan-views/intent-brief.md) layer slicer.
- Location is limited to Indiana.

### Must be avoided

- Asking the person for sun hours or other numbers they do not know.
- A sun model so detailed that it slows the plan or confuses the person.

## What seems settled

- Front-door direction plus a shadow check is the main setup.
- Heights are estimates: the house from its number of floors, and trees by type.

## Possibilities, not decisions

- Real house and tree heights from Indiana's public lidar data (spike S9).
- A time-of-day shadow animation on the plan.

## What still needs your input

1. Should shade change by season in the first version? Trees without leaves in early spring let sun through, which matters for spring bulbs and ephemerals.

## Spikes

S8 (sun and shadows) and S9 (real heights from elevation data). See the [spike list](../garden-design-app/spikes.md).
