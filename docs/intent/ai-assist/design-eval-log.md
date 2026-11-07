# Design engine eval log

The design engine makes a short review of the yard, then one design per style, as edit ops on the property. Code checks every op. `scripts/eval-design.ts` runs eight fixture cases and scores them. `/dev/designs` draws the newest run.

## How to run

```sh
pnpm tsx scripts/eval-design.ts                # all cases, about 34 model calls
pnpm tsx scripts/eval-design.ts sample-safe-redo
pnpm tsx scripts/eval-design.ts --rescore      # check the saved answers again, with no calls
```

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
