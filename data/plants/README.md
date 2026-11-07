# Plant files

Each plant is one JSON file in this folder. The file name must be the plant's `id` plus `.json`, for example `purple-coneflower.json`.

## Add a plant

1. Copy a plant file that is like the new plant, for example another perennial.
2. Change the `id` and the file name to match. Use lowercase words and dashes.
3. Change every fact. The schema in `src/model/plant.ts` describes each field.
4. Put the sources you used in `sources`. Set `verified` to `true` only after you check each fact against them.
5. Run `pnpm test`. The check names the file and the field when something is wrong.

## Fields that drive the drawing

- `size`: mature height and spread, the spread when planted, the years to reach mature size, and the spacing in a region.
- `foliage`: the leaf color in each season. Use `null` when nothing shows, for example a perennial in winter.
- `bloom` and `fruit`: the months and colors.
- `render.form`: the shape from above: `canopy`, `columnar`, `mound`, `upright`, `grass`, `rosette`, or `mat`.
- `placement`: `single` for plants that people place one at a time, such as a tree or a rose bush. `region` for plants that fill an area. `either` lets the person choose.

## Indiana plants

Most files came from `indiana_plants.json` at the repository root. To bring in new rows from it, run `node scripts/import-indiana.mjs`. The script adds a file for each new plant. For a plant that already has a file, it adds only the Indiana fields and leaves the rest alone.

That list has no soil, care, or planting dates, so the script works them out from moisture, habit, and size. Each new file has `verified: false` until a person checks it.

- `indianaStatus`: `native`, `introduced`, `invasive_banned` (on Indiana's Terrestrial Plant Rule, 312 IAC 18-3-25), or `invasive_listed` (on the Indiana Invasive Species Council list). The app shows invasive plants only under the Invasive filter, as plants to remove, and never lets them be placed.
- `alternatives`: for an invasive plant, the ids of native plants to grow instead. The test checks that each one exists.
- `moisture`, `tags`, `edible`: feed the plant list filters.
