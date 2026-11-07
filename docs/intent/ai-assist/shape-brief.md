---
title: "AI assist — shape brief"
slug: "ai-assist"
phase: shape
status: draft
last_updated: "2026-11-07"
---

# AI assist — what we are adding

**Outcome:** A person goes from pictures of their yard to several proposed gardens and a phased list of steps, and edits each result in the plan editor.

**Primary flow:** Drop an overhead screenshot and listing or phone photos → confirm one size → fix outlines over the photo → set goals and a change dial → compare 3 to 5 designs → pick one and edit it → print the phased plan.

## Feature scope

```text
AI assist
├── PLANNED ADDITIONS
│   ├── Shared AI layer (hosted on Coolify with the server key)
│   │   ├── Server API routes for each job
│   │   ├── Usage controls: access passcode, daily call and spend cap
│   │   ├── Small AI-only schemas (plant ids as a fixed list, points as {x, y})
│   │   ├── Validate, then one repair retry, then show the error
│   │   └── Saved runs on a persistent volume, replayable as a fake
│   ├── Image import (zero clicks)
│   │   ├── One overhead screenshot plus any listing or phone photos, in one call
│   │   ├── AI outlines lot, house, driveway, surfaces, beds, and trees
│   │   ├── AI estimates the scale; the person confirms one size and all rescales
│   │   ├── Existing plants get the best library match, marked as a guess
│   │   └── Photo underlay in the plan view for fixing outlines
│   ├── Designs
│   │   ├── Goals as free text, plus a dial: light touch, refresh, redo
│   │   ├── 3 to 5 designs in parallel, one stance each
│   │   ├── Each design is a list of edit ops (keep, remove, replace, add) with reasons
│   │   ├── Code fills added areas and checks ids, bounds, spacing, protected items
│   │   └── All designs saved on the property; one is active and editable
│   └── Transition plan (take it once)
│       ├── Code diff of current and active design: tasks, counts, allowed months
│       ├── AI phases tasks by season and year and writes the why
│       └── Printable phase list and shopping list
├── NEXT AFTER V1
│   └── Address lookup for the aerial image (spike S1)
└── LATER POSSIBILITIES
    ├── Tick-off tasks saved over months, and reminders
    ├── Step-through of phases on the time slider
    └── Budget and costs
```

## Behavior

| Situation | Expected result |
| --- | --- |
| The AI's scale guess is wrong | The person edits one labeled size, such as "house ~42 ft". The plan rescales. |
| The AI returns a plant id not in the library | Code drops that op and notes it. |
| An added area crosses the house or a patio | Code clips it. If nothing is left, code drops the op. |
| Dial is "light touch" or "refresh" | Existing trees and shrubs are never removed. |
| The person switches the active design | The plan view and the transition plan follow it. Other designs stay saved. |
| The AI picks a month outside a plant's planting months | Code rejects the plan and retries once. |
| The daily cap is reached | AI buttons explain the limit. Manual editing still works. |
| `AI_FAKE=1` | Routes return the last saved run, so UI work needs no calls. |

## Decisions and boundaries

**Appetite:** Three jobs on one shared layer. Each is useful alone. No streaming, no chat, and no accounts beyond a passcode.

**Key decision:** Designs are *lists of edit ops stored on the property*, not separate property files. The current yard stays the single source. Every design points at its ids, so nothing drifts, and you keep all designs as you asked. Ops map to the editor's existing `add`, `remove`, and `updateItem`, and they make the plan diff simple.

**Boundary:** Sun is shown as "unchecked" in designs until the sun-and-shade work lands. Photos show a real home, so they stay on the server volume and are never in the public gallery. Address lookup waits for the screenshot path to work.

**First proof:** **Try:** a script that imports 3 to 5 real listings (aerial screenshot plus photos) into property files that the editor opens. **Observe:** the scale error and the time to fix each plan over the photo. **Decide:** under 5 minutes keeps zero-click import. Over 5 minutes adds click-the-corners before the AI pass.

**Open choices:** the daily spend cap, and whether the passcode is enough before accounts exist.
