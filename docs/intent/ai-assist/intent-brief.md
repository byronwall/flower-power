---
title: "AI assist: import, recommend, and plan"
slug: "ai-assist"
phase: intent
status: draft
last_updated: "2026-11-07"
---

# AI assist: import, recommend, and plan

Part of the [garden design app](../garden-design-app/intent-brief.md). This part owns the three AI jobs that connect the parts: a picture becomes a plan, the plan becomes a better plan, and the difference becomes steps. It builds on [property capture](../property-capture/intent-brief.md), the [design assistant](../design-assistant/intent-brief.md), and the [garden plan](../garden-plan/intent-brief.md). See the [intent index](../README.md).

## My read

The editor and the watercolor plan now work. You can draw a yard by hand, but drawing by hand is the blank-canvas work the product must avoid. AI must take three steps off the person:

1. **Import.** An image of the yard becomes a property file that the editor opens, close enough to fix in a few minutes.
2. **Recommend.** From the yard as it is and what the person wants, the AI proposes what to keep, remove, replace, and add, with a reason for each.
3. **Plan.** From the yard now and the chosen goal, the app makes steps: remove, prepare, buy, plant, and care, on an Indiana calendar.

These three jobs share one idea. The yard has a *current* state and a *goal* state. Import makes the current state. Recommend proposes the goal. Plan explains how to get from one to the other.

## What matters most

- **Output lands in the editor.** Every AI result is something the person can see on their plan and change, not a chat answer.
- **AI judges, code checks.** The AI picks shapes, plants, reasons, and order. Code checks scale, lot bounds, plant ids, spacing, and planting months.
- **No invented plant facts.** Months, sizes, and care come from the plant library.
- **Fixes are cheap.** A wrong result costs a few clicks, not a redraw.

## The experience you appear to want

You drop in an overhead screenshot of your lot and a few listing or phone photos. With no clicks, the plan appears with the house, driveway, beds, and trees outlined over the photo, and existing plants named as guesses. The plan labels one size, such as "house ~42 ft". You correct it if it is wrong, and you drag wrong corners into place.

You say what you want, such as "a quiet place to sit, and songbirds", and set how much may change: light touch, refresh, or redo. The app shows 3 to 5 different designs on your yard. Each shows what to remove, add, and replace, with a short reason. You pick one and edit it. The other designs stay saved.

You open the plan. It lists what to do this fall, next spring, and next year, with a shopping list. You print it and take it with you.

## Boundaries

### Must be true

- An imported plan has a known scale and passes the property checks.
- Every proposed plant is in the library.
- Accepting a proposal is one undo step.
- The transition plan uses only planting months and care from the plant data.

### Must be avoided

- A chat window as the main AI surface.
- Plants proposed where they cannot grow. Until the sun model exists, sun is marked as unchecked.
- An AI step that blocks the flow. A manual path always remains.

## What seems settled

- These jobs use Claude through the hosted server with one API key. Basic usage controls stop excess cost.
- Import takes an overhead screenshot plus listing or phone photos, with zero clicks. Listings from Zillow are the demo case.
- Address lookup comes right after screenshot import, not in the first step.
- Designs come as 3 to 5 options first. A dial sets how much may change. All designs are kept.
- The transition plan is taken once, and it is phased by season and year.
- Most of the transition plan is code: a diff of current and goal, counts, and allowed months. AI adds phasing, prep advice, and the "why".

## Possibilities, not decisions

- Designs stored as lists of edit ops on the property, so one file holds the yard and all designs. *My proposal, to meet both "one file" and "keep all designs".*
- Photos that place themselves on the plan.
- Tasks ticked off over months, and costs and budget phasing.

## Current reality that matters

- `Property` has an `existing` flag on plantings, but no way to mark a removal or hold a goal.
- No sun class per area exists yet. Recommendations depend on the sun-and-shade work.
- Plant files already hold `plantingMonths`, `care`, `effort`, and `liftAndStore`, all unverified.
- No AI dependency, image underlay, or saved-run folder exists yet.
- Hosted use needs a persistent volume. Today `data/` is lost on each redeploy.

## Next step after confirmation

Answer the question round, then confirm the [shape](shape-brief.md) and write the implementation plan.
