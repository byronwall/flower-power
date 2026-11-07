# Plant files

Each plant is one JSON file in this folder. The file name must be the plant's `id` plus `.json`, for example `purple-coneflower.json`.

## Add a plant

1. Copy a plant file that is like the new plant, for example another perennial.
2. Change the `id` and the file name to match. Use lowercase words and dashes.
3. Change every fact. The schema in `src/model/plant.ts` describes each field.
4. Put the sources you used in `sources`. Set `verified` to `true` only after you check each fact against them.
5. Run `pnpm test`. The check names the file and the field when something is wrong.

## Fields needed before a plant is verified

These fields are optional while a plant is a draft. The check fails if `verified` is `true` and any of them is missing. The plan is in [the plant data plan](../../docs/intent/plant-library/data-plan.md).

- `lifespanYears`: how long one plant lives, as `[shortest, longest]`.
- `pollination`: `needsPartner` is `true` when it needs a second plant to fruit, such as a male winterberry. Name the partner in `partner`.
- `emerges`: the month it comes up or leafs out. Use `null` for evergreens.
- `planting`: `method` is `seed`, `bulb`, `plug`, `container`, `bare-root`, or `division`. Add `depthIn` when depth matters, for example for bulbs.
- `images.photos`: at least one real photo with `url`, `author`, `license`, and `sourceUrl`. Use only openly licensed photos, for example from Wikimedia Commons.

## Fields that drive the drawing

- `size`: mature height and spread, the spread when planted, the years to reach mature size, and the spacing in a region.
- `foliage`: the leaf color in each season. Use `null` when nothing shows, for example a perennial in winter.
- `bloom` and `fruit`: the months and colors.
- `render.form`: the shape from above: `canopy`, `columnar`, `mound`, `upright`, `grass`, `rosette`, or `mat`.
- `placement`: `single` for plants that people place one at a time, such as a tree or a rose bush. `region` for plants that fill an area. `either` lets the person choose.
