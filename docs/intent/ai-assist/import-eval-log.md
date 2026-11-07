# Image import eval log

This log records each change to the image import, with the eval result before and after.
Run the eval with `pnpm tsx scripts/eval-import.ts --iter <name> --runs 3`. See each run at `/dev/eval?iter=<name>`.

## Eval set

- 12 listings in 46220 from Zillow (sold, single family). They cover a landscaped corner lot, two barren lots, two wooded lots, a long driveway, a corner lot on a curved street with a fence, two dense lots with alleys and fences, a cul-de-sac lot on a pond, a patio home, and a lot with a detached garage.
- Each listing has an Esri World Imagery aerial, 100 m square at 1024 px (0.3204 ft/px), centered on Zillow's point, and up to 7 exterior photos. Two listings have one photo only.
- Truth is hand labeled from the aerial: the house box, plus the lot size from Zillow, a rough tree count range, and the presence of a driveway, fence, beds, or detached structure.
- 10 robustness cases come from `scripts/make-variants.ts`, with truth moved by geometry:
  - off center: the aerial center is 8 m to 13 m away from the house (ralston, cherbourg);
  - zoom: 60 m (kessler, steinmeier) and 160 m (circle, wexford) across;
  - no photos (circle, newjersey);
  - screenshot crop: a non-square PNG, 1280×800 at 125 m and 1180×720 at 90 m (e71st, indianola).
- A run passes when the scale error is 25% or less, the house box IoU is 0.5 or more, the house is in the lot, the lot area error is 50% or less, and the expected features are there.
- The lot limit was 35% until iteration 3. Byron then said lots only need to be close, because the person corrects the lot lines. All iterations are rescored at 50% (`--rescore`, no API calls).
- `scripts/fetch-parcels.ts` adds the county parcel and building footprint from Indianapolis MapIndy. The eval reports parcel IoU but does not pass or fail on it. Zillow lot sizes match the parcels within 2% for 11 of 12 lots (kessler: 11%).
- Listing photos, aerials, and results stay in gitignored `tmp/`.

## Iterations

### 0-base: the M1 prompt

- 42 of 66 runs pass (64%).
- Scale error: median 5.5%, worst 29.5% (wexford at 160 m).
- House IoU: median 0.96, worst 0.65.
- Lot area error: median 24%, worst 107%.
- Most failures are lot size (18 of 24). The model traces lots too large: it runs the front line to the curb and takes in part of the neighbor yards.
- No-photo runs miss beds and fences (circle, newjersey).
- Cost: 66 calls, 591k input and 171k output tokens.

### 1-lot-lines: say where lot lines run (kept)

- Change: the prompt says the front line is 10 to 15 ft behind the curb, side lines are midway to the neighbors, and the lot leaves out streets, sidewalks, alleys, and neighbor yards.
- 45 of 66 pass (was 42).
- Lot area error: median 22% (was 24%), worst 78% (was 107%).
- Scale error: median 5.9%, worst 34% (was 29.5%). Run-to-run noise is about this size.
- Cost: 66 calls, 598k in, 161k out.
- Kept, because the lot error fell and the pass count rose.

### 2-scale-refs: mark known objects, take the median in code (reverted)

- Change: the model marks both ends of each parked car, garage door, and street width. Code converts each mark to a scale and takes the median of the cars.
- 41 of 66 pass (was 45).
- Scale error: median 7.0% (was 5.9%), worst 28% (was 34%).
- Lot area error: median 18%, worst 73%.
- The marks gave almost the same scale as the model's own guess. Where the guess was wrong, the marks were wrong too. The errors come from where the model puts points, not from its arithmetic.
- Cost: 66 calls, 605k in, 183k out.
- Reverted, because the pass count fell.

### 3-grid: draw the 0-1000 grid on the aerial (reverted)

- Change: `sharp` draws a white line every 100 grid units, labeled on the edges, and the prompt says to read positions off it.
- 44 of 66 pass at the old lot limit (was 45).
- Scale error: median 6.7%, worst 37% (was 5.9%, 34%).
- Lot area error: median 25%, worst 225%.
- The grid did not make the points more accurate, and the lines may hide thin fences.
- Cost: 66 calls, 601k in, 158k out.
- Reverted.

### Rescore with the 50% lot limit and parcel truth (no API calls)

| Iteration | Pass | Scale err median / worst | House IoU median / worst | Lot err median / worst | Parcel IoU median / worst |
| --- | --- | --- | --- | --- | --- |
| 0-base | 46/66 (70%) | 5.5% / 30% | 0.96 / 0.65 | 24% / 107% | 0.73 / 0.44 |
| 1-lot-lines (kept) | 53/66 (80%) | 5.9% / 34% | 0.96 / 0.69 | 22% / 78% | 0.76 / 0.49 |
| 2-scale-refs | 47/66 (71%) | 7.0% / 28% | 0.97 / 0.80 | 18% / 73% | 0.78 / 0.50 |
| 3-grid | 51/66 (77%) | 6.7% / 37% | 0.94 / 0.79 | 25% / 225% | 0.80 / 0.46 |

- At the true scale, the traced lot is still 10% to 45% too large in 18 of 22 cases. The model draws its lines a few feet outside the parcel on each side. The person corrects this in the editor.
- In 1-lot-lines, 6 of the 13 failures are the no-photo cases. They miss beds (circle) or beds and fences (newjersey).

### 4-no-photo-cues: tell the model how beds and fences look from above (reverted)

- Change: the prompt says how a foundation bed, a mulch edge, and a fence line look in an aerial when there are no photos.
- 51 of 66 pass (was 53).
- Fence misses fell from 3 to 1. Bed misses stayed at 6: in leaf-off spring aerials, beds look like bare soil.
- Scale error: median 5.5%, worst 31%. Lot area error: median 26%, worst 105%.
- Cost: 66 calls, 606k in, 171k out.
- Reverted. This is the third change in a row that did not beat 1-lot-lines, so the prompt loop stops here.

### Guard: a first image that is not an aerial (kept, no API calls)

- When the first image is a street photo, the model says so and returns an empty lot. `toProperty` then threw a raw schema error.
- `importLayout` now throws a plain error: "The first image does not look like an overhead aerial of the lot", plus the model's note.

## Image count study

Byron asked for the minimum number of images. Six listings (kessler, circle, newjersey, ralston, cherbourg, steinmeier) ran with the 1-lot-lines pipeline at four image counts. The full set comes from the 1-lot-lines runs.

| Images | Runs | Pass | Scale err median / worst | House IoU median / worst | Trees median (in range) | Beds median | Runs with a fence | Plant species median | Tokens per run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aerial only | 18 | 4 (22%) | 4.6% / 34% | 0.93 / 0.68 | 2 (10 of 18) | 0 | 6 | 1 | 5k |
| Aerial + front photo | 18 | 14 (78%) | 5.4% / 42% | 0.96 / 0.81 | 3.5 (15 of 18) | 1 | 9 | 3 | 7k |
| Aerial + 3 photos | 12 | 11 (92%) | 6.1% / 37% | 0.96 / 0.87 | 4 (9 of 12) | 2 | 8 | 4 | 9k |
| Aerial + all (6 or 7) | 18 | 16 (89%) | 4.4% / 22% | 0.94 / 0.78 | 4 (11 of 18) | 3 | 12 | 4 | 14k |

- Scale, house, and lot come from the aerial alone. They do not get better with photos. The worst scale error is 22% to 42% at every image count, so it is run-to-run noise.
- Beds, plant names, trees, and fences come from the photos. With the aerial alone, 14 of 18 runs find no bed, and most runs name one species.
- The front photo gives most of the gain: from 4 to 14 passes. Two or three back yard photos add the back beds and fences.

Images that are not a map aerial:

- A top-down drone photo from the listing (cherbourg, rotated about 90°, no north): 2 of 2 runs trace the house (IoU 0.98) and get the scale within 5% of a hand estimate. One run missed the beds. The plan comes out rotated, because the import assumes north is up.
- A street photo as the only image: the model refuses, and the import now says the image is not an aerial.

## Recommendation

Require two images: an overhead aerial and one photo of the front of the house. Ask for up to three back yard photos as an option.

- One aerial gives the layout: scale within 5% median, house box IoU 0.93 median. But it gives almost no planting: no beds in 14 of 18 runs, one plant species, and a pass rate of 22%.
- Adding the front photo lifts the pass rate to 78%, finds beds, and names 3 species. Three photos reach 92%.
- Suggested upload steps:
  1. "Top view of your lot." Accept a map screenshot or a top-down drone photo. If the image is not a top view, show the import's error and ask again.
  2. "Front of the house, from the street." Required.
  3. "Back yard (optional, up to 3)." Say that it finds beds and fences.
- Keep the one-size scale fix after import. The worst scale error stays near 35% at every image count. The app can also fetch the Esri aerial itself from the address, at an exact scale. Then the person uploads only photos, and the scale is exact.
- Ask the person to confirm north on a drone photo, or to rotate it.

## Final state

- Kept changes: 1-lot-lines (prompt) and the not-an-aerial guard.
- Main set (22 cases × 3 runs, 50% lot limit): 53 of 66 pass (80%). Scale error median 5.9%, worst 34%. House IoU median 0.96, worst 0.69. Lot area error median 22%, worst 78%.
- The target (90% pass, worst scale under 25%) is not met. The loop stopped after three changes in a row that did not improve it, and near the budget.
- 6 of the 13 failures are the no-photo cases, which the two-image rule removes. The rest are lot size on zoomed or wooded lots, and two scale misses.
- Total spend: 379 API calls, 3.21M input and 0.96M output tokens.

### 6-rebase-check: after rebasing onto main (f6bcd9e)

- Main now has the 95-plant library, so the prompt is longer: about 11.7k input tokens per run, up from about 9k.
- 1 run per base listing: 11 of 12 pass. Scale error median 9.1%, worst 24%. House IoU median 0.97. Lot area error median 21%, worst 47%.
- The same 12 listings passed 32 of 36 runs (89%) in 1-lot-lines, so the rebase did not regress the import.
- Cost: 12 calls, 141k in, 31k out. Total spend is now 391 calls, 3.35M in, 0.99M out.
