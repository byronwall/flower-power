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
- A run passes when the scale error is 25% or less, the house box IoU is 0.5 or more, the house is in the lot, the lot area error is 35% or less, and the expected features are there.
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
