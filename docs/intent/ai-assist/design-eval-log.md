# Design engine eval log

The design engine makes a short review of the yard, then one design per style, as edit ops on the property. Code checks every op. `scripts/eval-design.ts` runs eight fixture cases and scores them. `/dev/designs` draws the newest run.

## How to run

```sh
pnpm tsx --import ./scripts/glob.mjs scripts/eval-design.ts                # all cases, about 34 model calls
pnpm tsx --import ./scripts/glob.mjs scripts/eval-design.ts sample-safe-redo
pnpm tsx --import ./scripts/glob.mjs scripts/eval-design.ts --rescore      # check the saved answers again, with no calls
```

`scripts/glob.mjs` lets tsx load `src/model/library.ts`, which the sun model imports. It expands Vite's `import.meta.glob` for JSON files.

## Cases

| Case | Lot | Goals | Dial | Styles |
| --- | --- | --- | --- | --- |
| sample-peaceful-refresh | sample | peaceful place to sit | refresh | 4 |
| sample-wildlife-light | sample | songbirds and butterflies | light | 4 |
| sample-safe-redo | sample | low effort, safe for kids and dogs | redo | 4 |
| lot-a-wildlife-refresh | imported A | songbirds and butterflies | refresh | 4 |
| lot-b-peaceful-light | imported B | peaceful place to sit | light | 4 |
| lot-b-safe-redo | imported B | low effort, safe for kids and dogs | redo | 4 |
| lot-a-patio-refresh | imported A | grill and eat outside, hardscape opted in | refresh | 3 |
| sample-area-wildlife | sample, back strip only | songbirds and butterflies | refresh | 3 |

Imported lots are rebuilt from the newest saved import of each aerial in `data/ai-runs/`, renamed, with the photo removed. They are never committed.

## Scores

- **survival**: share of the model's ops that pass the checks. Pass at 0.75 or more.
- **overlap**: Jaccard overlap of the new-plant sets between each pair of designs. Pass at a mean of 0.3 or less and a max of 0.5 or less.
- **fit**: share of new plants that match the goal tags (wildlife, safety and effort, soft colors). Pass at 0.6 or more.
- **rules**: dial, hardscape, scope, and kid-and-pet safety breaks, counted again on the result apart from the checks. Must be 0.
- **thin**: each design has at least 6 changes (3 for area rework).

## Iterations

### 1. Baseline, 25 plants

`gpt-6.1-terra`, medium effort. Style prompts name each style's plant palette and say that other styles are being made for the same yard.

- 4 of 8 cases pass. 37 calls, 216k tokens (125k in, 91k out).
- Survival 0.94 to 1.0. No dial, hardscape, scope, or safety breaks. The only drops were a second op on one item, a plant on the path, and a moved tree.
- Every fail is overlap: mean 0.33 to 0.41 on four cases. With 25 plants, every wildlife design reaches for coneflower, black-eyed Susan, and bergamot.
- The hardscape opt-in works: all three patio-case designs add a patio. No other case adds one.
- A unit test proves the checks drop bad ops (unknown plant, outside the lot, on the house or driveway, hardscape, tree spacing, bed overlap, dial, scope), since the model rarely sends them.

### 2. 95 plants, same prompts

The library grew from 25 to 95 plants (`1e1de98`).

- 8 of 8 cases pass. 37 calls, 316k tokens (225k in, 91k out). The longer plant table adds about 100k input tokens per run.
- Overlap fell from 0.33-0.41 to 0.03-0.25 mean. Survival 0.94 to 1.0. No rule breaks.
- On the page the designs read as timid. Even "redo" leaves most of the lawn alone, and formal designs swap beds for short hedges.
- New score, **area**: square feet of planting each design adds, replaces, or reshapes, counting rows by length times spread and single plants by crown. Pass at 80 (light), 250 (refresh), 500 (redo), 60 (area rework), for the smallest design in the case. Net bed area did not work: formal and low-effort designs rightly trade beds for hedges or lawn.
- Rescored with the area check: 5 of 8 pass. Formal designs are the smallest in every case.

### 3. Area targets per dial

The prompt now states the open lawn and mulch area and asks for new, replaced, and reshaped planting of 5-10% (light), 15-25% (refresh), or 30-45% (redo) of it. It also gives bed depths: 4 to 8 ft along the house, 5 to 10 ft along fences.

- 7 of 8 pass. 37 calls, 337k tokens (228k in, 108k out).
- Touched area rose 2 to 6 times: the smallest redo design on the sample lot went from 160 to 1,897 sq ft. Formal designs now plant at the same scale as the others.
- Area rework fails on overlap (mean 0.31): three designs in a 1,500 sq ft strip share plants.

### Sun model wired in

The sun session's `sunClassAt(p, at)` (`8100775`, `513ad87`) is now the default `sun` for the engine and the checks. Rescoring iteration 3 with real sun drops about 10% more ops, mostly part-shade plants (woodland phlox, wild geranium, impatiens) placed in full sun. The model did not see sun in that run.

A replace and a reshape of the same bed are now merged into one replace op, instead of dropping the second. That was the most common drop (16).

### 4. Sun map in the prompt

The model now sees full, part, and shade ground in the text map. The checks judge a bed or row by the sun class that covers most of it, not by its center.

- 8 of 8 pass. 37 calls, 335k tokens (230k in, 105k out).
- Survival 0.89 to 1.0. Mean overlap 0.04 to 0.24; max 0.5. Goal fit 0.95 to 1.0. No dial, hardscape, scope, or safety breaks.
- Touched area: light 250 to 430 sq ft, refresh 840 to 2,330, redo 810 to 1,930, area rework 270 to 300.
- 25 ops dropped in 31 designs, almost all sun: part-shade groundcovers (woodland phlox, wild geranium, sedge) put in sun the model judged shaded by a tree. The checks catch these, so the designs stay valid.
- Area rework now passes overlap (0.24 mean).

## Editor (Phase 2)

The editor's **Design ideas** panel calls `/api/ai/design`, which requires login. Designs save on the user's own property through `/api/properties/<id>`. The property file keeps the yard as it is, plus `designs` and `activeDesignId`. Each design keeps accepted `ops` and proposed `pending` ops. Edits made while a design is active save into it as `diff(base, shown)`.

Browser proof with a test user, in `tmp/proof-designs/1x-*.jpg`:
- Sample lot, live model: a review with numbered empty spots, then 4 designs.
- Sample lot, `AI_FAKE` replay: accept, reject, and accept all; switch the active design; save and reload; rework a dragged area on top of the active design.
- Imported lot A (import replayed into the user's folder), live model: a review, 4 designs, accept all, save.

The rebased branch rescores 8 of 8 with no calls.

### 5. Rebased on main with 153 plants

The coworker's plant list import grew the library to 153 plants. The design prompt grew from about 19k to 27k characters.

- 8 of 8 pass. 37 calls, 431k tokens (323k in, 108k out). Input tokens rose about 40% (from 230k); output stayed the same.
- Survival 0.84 to 1.0. Mean overlap 0.03 to 0.18; max 0.38. Goal fit 0.95 to 1.0. No dial, hardscape, scope, or safety breaks.
- Touched area: light 210 to 420 sq ft, refresh 580 to 1,890, redo 920 to 1,740, area rework 190 to 260.


209 model calls in all: 5 smoke, 5 eval runs of 37, and 14 in the editor proof (two reviews and three sets of 4 designs, one set lost to a hot reload before it was saved). About 1.75M tokens.
