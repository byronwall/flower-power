---
title: "AI assist — implementation plan"
slug: "ai-assist"
phase: plan
status: draft
last_updated: "2026-11-07"
---

# AI assist — implementation plan

## Plan at a glance

Prove import first, from a script, on your own machine. Zero-click import is the riskiest promise, and it is the one the other two jobs need, because a design is only as good as the yard under it. A script run on 3 to 5 real listings answers the main question for about a dollar, before any upload UI exists.

Each later milestone adds one new risk:

1. **Script import.** The model call and the photo underlay.
2. **Import in the app.** Upload and the scale fix.
3. **Hosting.** The cost controls and the storage volume.
4. **Designs.** Edit ops and parallel calls.
5. **Transition plan.** Phasing.

Every milestone leaves the editor working, and manual drawing stays available.

One implementation choice carries the design and plan work: **a single diff function**. It compares two property states by item id and returns keep, remove, replace, move and add ops. Saving an edited design uses it to store ops. The transition plan uses it to make tasks. You write it once in M4 and reuse it in M5.

## Implementation strategy

- **First proof:** `scripts/import.ts` turns an aerial screenshot plus listing photos into `data/properties/import-<name>.json`. The editor opens it over the photo.
- **Primary seam:** `src/ai/` holds `client.ts` (one `run(feature, request)` that calls Claude, saves the run, and returns the parsed output) and the per-feature prompts and schemas. Routes and scripts call this module only.
- **Fast local loop:** `pnpm tsx scripts/import.ts tmp/listings/<name>` for prompt work. `pnpm test` covers geometry, diff and validation. With `AI_FAKE=1`, routes return the latest saved run, so UI work makes no calls.
- **Local dependencies:** real listing images under `tmp/listings/` (gitignored), and saved runs under `data/ai-runs/` (gitignored).
- **Provider confirmation:** the M1 script is the live check. Live calls stay manual and few. Tests do not call the API.
- **Rollout and rollback:** if `ANTHROPIC_API_KEY` is missing, or the cap is reached, the AI buttons are turned off and manual editing still works. Each feature ships behind its own button. To remove a feature, remove its route.

### Material dependency proof strategy

Claude is the only new external dependency. No emulator exists, and a fake cannot tell you whether the polygons are good. So the ladder is short:

```text
pure geometry, diff, and validation under vitest (no network)
    → live script runs on real listings, saved as runs (M1, M4, M5)
    → AI_FAKE replay of saved runs for all UI work
    → one hosted smoke run per feature after deploy (M3+)
```

## Milestone 1: A listing becomes a plan you can fix over the photo

This answers the first proof with no upload UI. It leaves out scale confirmation in the UI, cost controls, and hosting.

- **Change — AI client and saved runs**
  - Add `@anthropic-ai/sdk` and `tsx` with pnpm.
  - `src/ai/client.ts` calls `messages.parse` with `zodOutputFormat`. It uses `claude-opus-5-5` at effort `high`, checks `stop_reason` for a refusal, and makes one repair retry with the zod issues.
  - It writes `data/ai-runs/<time>-<feature>/` with the input, images, response, usage and result.
  - Add `data/ai-runs/` to `.gitignore`.
- **Change — shared plant loader**
  - Move plant parsing into a function that works with both `import.meta.glob` and `fs`. Scripts and routes need the library outside Vite.
- **Change — import schema and conversion**
  - `src/ai/import.ts` holds a small schema: pixel `{x, y}` points, kinds from the existing enums, plant ids as a fixed list with a `guess` flag, a scale estimate in feet per pixel, and the size it bases the scale on (for example "house width").
  - Code converts pixels to feet, sets the lot origin, clips to the lot, drops shapes with fewer than 3 points, simplifies, snaps to 0.1 ft, gives fresh ids, and checks the result with `propertySchema`.
  - Verify with a vitest test on a hand-made model output.
- **Change — photo underlay**
  - Add an optional `underlay: { file, ftPerPx, origin }` to `propertySchema`.
  - `PlanView` draws it under the painting at the right scale, with an opacity toggle.
  - A new `GET /api/images/[file]` route serves images from `data/images/`.
- **Spike — zero-click scale**
  - Decision required: keep the AI scale guess, or require one typed size before import.
  - Evidence to gather: scale error against a known size (the lot width from the listing) on each test lot.
  - Fallback: the person types one size before import. M2's size fix becomes a required step.

### Desired end state

- 3 to 5 real listings are imported, and each opens in the editor over its photo.
- For each lot, the fix time and the scale error are written in the map.
- The decision rule is applied: under 5 minutes keeps zero-click import. Over 5 minutes adds click-the-corners before the AI pass.

## Milestone 2: Import from the app, with a one-size fix

- **Change — import route and drop zone**
  - `POST /api/ai/import` takes multipart images, saves them to `data/images/`, calls `src/ai/import.ts`, and writes the new property.
  - A "New from photos" drop zone sits next to the property picker and shows a spinner while the call runs. One aerial image is required, and photos are optional.
- **Change — scale confirm**
  - After import, a banner shows the size the AI used, for example "House ≈ 42 ft wide".
  - Editing that number rescales every point and the underlay in one undo step.
- **Change — guessed plants**
  - Plantings marked as guesses get a dashed outline and a "Confirm or change" control in the Inspector.

### Desired end state

- You drop a listing into the running app and get an editable plan with no clicks before the result.
- A wrong scale takes one number to fix.
- `AI_FAKE=1` gives the same flow from a saved run.

## Milestone 3: Hosted on Coolify with cost controls

- **Change — data directory**
  - Read `DATA_DIR` (default `./data`) in every route that touches properties, images or runs.
  - Mount a persistent Coolify volume at that path.
- **Change — usage controls**
  - Add an `AI_PASSCODE` env value. The AI routes require it in a header, and the browser keeps it after you type it once.
  - A daily ledger in `data/ai-usage.json` adds each run's cost from `usage`. Calls stop at `AI_DAILY_USD`, and a per-call size limit applies to uploads.
  - The UI shows "AI limit reached for today". Manual editing still works.
- **Change — deploy**
  - Set `ANTHROPIC_API_KEY`, `AI_PASSCODE` and `AI_DAILY_USD` as runtime env values in Coolify.
  - Check that the proxy timeout allows calls of about 90 s.

### Desired end state

- The deployed app imports a listing after the passcode is entered.
- A redeploy keeps the properties, images and runs.
- With a cap set below one call's cost, the next call is refused.

## Milestone 4: 3 to 5 designs, kept on the property

- **Change — design model and diff**
  - `propertySchema` gains `designs: [{ id, name, stance, dial, goals, ops }]` and `activeDesignId`.
  - `src/model/design.ts` holds `diff(current, edited)` (matched by item id) and `applyOps(current, ops)`. A vitest test checks that `applyOps(a, diff(a, b))` equals `b`.
- **Change — design generation**
  - `src/ai/design.ts` makes one call per stance, run in parallel: 3 to 5 calls, with Opus or Sonnet chosen by cost.
  - The input is a compact JSON summary of the plan, the library table, the goals, the dial and a rendered plan image.
  - Code drops ops with unknown plant ids. It also clips added areas, fills regions with `droppedPlanting`, and blocks removals that the dial does not allow.
- **Change — design UI**
  - A goals box and the light / refresh / redo dial sit next to a "Make designs" button.
  - Design cards show thumbnails. Picking one sets it active. A ghost overlay in `PlanView`'s `overlay` slot shows removals in red, additions in green and replacements in amber.
  - Editing while a design is active changes the shown state. Save stores `diff(current, shown)` as that design's ops.
  - Sun is labeled "unchecked".

### Desired end state

- One click makes 3 to 5 clearly different designs on the sample lot and on an imported lot.
- You switch between designs, edit one, save, reload, and all designs are still there.
- No design removes an existing tree on "light touch" or "refresh".

## Milestone 5: A printable, phased transition plan

- **Change — task list from code**
  - `src/plan/tasks.ts` makes tasks from `diff(current, active design)`: remove, prep (lawn area to bed in sq ft), buy, plant, lift and care. Each task has a count from `expand()` and allowed months from `plantingMonths`.
  - Verify with a vitest test on a fixture pair, including a dahlia lift task.
- **Change — AI phasing**
  - `src/ai/phase.ts` uses Sonnet. It may only order task ids into phases by season and year, pick months within the allowed months, and write a short "why" for each.
  - Code checks that each id appears once, that each month is allowed, and that removal comes before planting in the same area. If a check fails, the call retries once.
- **Change — plan page**
  - `/plan/[id]` shows the phases, the tasks and a shopping list, laid out for print.
  - Unverified plant facts show a small "unverified" mark.

### Desired end state

- The active design on the sample lot gives a 2- to 3-year phased plan that prints cleanly.
- Every month in the plan comes from the plant data.

## Open decisions and spikes

- **Daily spend cap.** Decision: the value of `AI_DAILY_USD`. Needed by M3. Evidence: real per-call costs from the M1 runs. Fallback: $5 per day.
- **Passcode vs. accounts.** Decision: whether a shared passcode is enough until the accounts work lands. Fallback: keep the passcode, and leave the AI routes out of the public gallery.
- **Sun in designs.** Designs ship with sun marked "unchecked" until sun-and-shade gives each area a sun class. Then `src/ai/design.ts` adds the sun check.

## Below the cut line

- Address lookup for the aerial image (spike S1). This is next after M2.
- Click-the-corners import, unless M1 fails its decision rule.
- Photos that place themselves on the plan.
- Streaming progress, and chat-style refinement of a design.
- Tasks ticked off over months, reminders, step-through on the time slider, and costs and budget.
- Per-user quotas and accounts.
