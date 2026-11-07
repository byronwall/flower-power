---
title: "Plant data plan"
slug: "plant-library-data-plan"
phase: planning
status: draft
last_updated: "2026-11-07"
---

# Plant data plan

Part of the [plant library](intent-brief.md). This plan moves the Indiana working list into the app's own plant format. It is a one-time move. After it, `data/plants/*.json` and `src/model/plant.ts` are the only source of truth, and new facts go straight into that format.

## Where the data is today

| Source | What it holds | Size |
| --- | --- | --- |
| NRCS Indiana checklist (`Indiana_NRCS_csv.txt`, not in the repo) | Names only: symbol, synonym symbol, scientific name, common name, family | 12,686 rows; 4,508 accepted taxa; about 2,670 at species level |
| `indiana_plants.json` (the working list) | A short record per plant in an older format, with metric sizes, one flower color, one foliage color, bloom months, status, sun, moisture, tags, sources, edible, recommended and invasive alternatives | 105 plants |
| `data/plants/*.json` (the app) | Full records that pass `plantSchema` and drive the renderer, gallery and editor | 25 plants |

The NRCS file adds no growing facts. It is useful only for checking names, getting a stable ID (the NRCS symbol), the family and synonyms.

## How the lists line up

- **16 plants are in both** the working list and the app, for example red maple, purple coneflower and little bluestem. The app records are richer, so they win. From the working list we keep only the tags, sources and invasive alternatives.
- **89 working-list plants are new** to the app. They need converting and most fields researched.
- **9 app plants are not in the working list**: dahlia, zinnia, Knock Out rose, black-eyed Susan, Green Giant arborvitae, creeping phlox, coral bells, daylily and catmint. They stay.
- The result is **114 plants**.

### Name problems to fix during the move

- `Andropogon gerardi` is spelled `gerardii` in NRCS.
- `Sambucus canadensis` and `Viburnum trilobum` are synonyms in NRCS. The accepted names are *Sambucus nigra* ssp. *canadensis* and *Viburnum opulus* var. *americanum*. Keep the familiar common names and store the accepted names.
- `Hosta`, `Buxus` and `Tulipa` are genus-only entries. Each needs a real species or cultivar. The app already has Hosta 'Francee' and Buxus 'Green Velvet'.
- Garden and crop plants are not on the Indiana checklist, which is expected: peony, bigleaf hydrangea, tomato, pepper, basil and squash.
- App cultivars such as `Rosa 'Radrazz'` put the cultivar inside `botanicalName`. Split them into species and cultivar so they can be matched to NRCS.

## The plant object (audit checklist)

Every plant must answer these 10 questions. The one-time transfer fills them, and later audits check every plant against them. A plant can be `verified: true` only when all 10 are filled and each has a source.

| # | Attribute | App field | In the schema today? | Notes |
| --- | --- | --- | --- | --- |
| 1 | Lifespan | `lifespanYears: [min, max]` | No, new | How long one plant lives, for example 2 to 4 years for coneflower or 100+ for white oak |
| 2 | Space requirements | `size.heightFt`, `size.spreadFt`, `size.plantedSpreadFt`, `size.spacingFt`, `size.yearsToMature` | Yes | Already drives the renderer and the plan editor |
| 3 | Needs a mate to pair | `pollination: { needsPartner, partner, note }` | No, new | For example, winterberry needs a male plant to make berries, and pawpaw needs a second unrelated tree. Today the winterberry file can only say this in a care task |
| 4 | Color | `bloom.colors`, `fruit.color`, `foliage.spring` / `summer` / `fall` / `winter` | Yes | Flower, fruit and leaf color by season |
| 5 | Season and lifecycle (perennial or annual) | `lifecycle`, plus new `emerges` (the month it comes up) | Partly | `lifecycle` already has annual, perennial, tender-perennial and woody. Add `biennial`. `emerges` answers "when does it sprout" |
| 6 | How it needs to be planted | `planting: { method, depthIn, note }` | No, new | `method`: `seed`, `bulb`, `plug`, `container`, `bare-root` or `division`. For example, tulip bulbs go 6 to 8 in deep in fall |
| 7 | Sunlight | `sun` | Yes | `full`, `part`, `shade`; matches the sun class of each area |
| 8 | Water | `water` | Yes | `low`, `medium`, `high` |
| 9 | When to plant | `plantingMonths` | Yes | Months; the garden plan calendar uses them |
| 10 | Real-life image | `images.photos: [{ url, author, license, sourceUrl }]`, at least 1 | No, new | A real photo, openly licensed, with credit. The watercolor thumbnail is separate and generated |

### Where the facts come from

The CSV gives only the names, the NRCS symbol and the family. The 10 attributes come from these sources:

- **USDA PLANTS** (keyed by the same NRCS symbol). Its characteristics data covers duration (annual or perennial), lifespan, flower color, shade tolerance, moisture use, propagation method and bloom period, but only for part of the species. Check each value; it is written for conservation planting, not home gardens.
- **Missouri Botanical Garden Plant Finder, Purdue Extension and Lady Bird Johnson Wildflower Center** for size, spacing, planting depth, planting months, the need for a mate, and anything USDA does not cover.
- **Wikimedia Commons and CC-licensed iNaturalist observations** for photos, saving the license and author.

An AI can gather these facts only with a cited source. A person approves each plant.

## Gaps in the app schema

`plantSchema` is the ground truth, but it cannot yet hold everything the briefs ask for. Below are the gaps, with the brief that needs each one.

| Gap | Needed by | Proposal |
| --- | --- | --- |
| No pictures | Plant gallery, design assistant (style from a reference photo) | `images.thumbnail`, rendered from our own watercolor renderer, plus `images.photos[]` with `url`, `author`, `license` and `sourceUrl` for real photos |
| Native, introduced or invasive is a yes/no `nativeToIndiana` | Design assistant (review the yard now), "Replace" | `status`: `native`, `introduced`, `invasive_listed` or `invasive_banned`. Add `plantable` (false for invasives) and `alternatives` (plant ids) |
| No lifespan | Plant library ("lifespan" is a must-have) | `lifespanYears` |
| Toxicity covers pets only | Plant library, design assistant ("kids and pets") | `toxicity: { pets, people }` and `skinIrritant` |
| No artificial plants | Plant library (must-have) | Add `artificial` to `category` |
| Categories miss vines, ferns and bulbs | 9 vines, 3 ferns and tulip in the working list | Add `vine`, `fern` and `bulb` to `category`, and `biennial` to `lifecycle` |
| Wildlife misses host plants | Working-list tags: host plant, monarch host, keystone | Add `caterpillar-host` and `keystone` to `wildlife` |
| Edible plants not marked | 9 edible plants in the working list | `edible` |
| No free tags | Gallery filters such as rain garden, groundcover and fall color | `tags: string[]` |
| No NRCS link, family or synonyms | Name checks, later data pulls by symbol | `nrcsSymbol`, `family`, `synonyms` |
| Sources are listed per plant, not per fact | Plant library ("each fact has a source") | Keep the `sources` list, and add `factSources` mapping each field to source indexes |
| No order for beginners | Plant library ("popular, easy, local plants first") | `popularity` (1 to 5) or keep `recommended` |
| Render data is only `form` | Plan views (3D pane, watercolor variety) | Start with `render.texture` (fine, medium or coarse) and `render.bloomStyle` (spike, daisy, cluster or none). Add more when the 3D pane needs them |

## Converting the working list

| Working-list field | App field | Notes |
| --- | --- | --- |
| `id`, `common`, `sci` | `id`, `commonName`, `botanicalName` | Fix names first (see above). Ids become common-name slugs, matching the app files |
| `status` | `status`, `nativeToIndiana` | Lossless with the new `status` field |
| `habit` | `category`, `lifecycle`, `evergreen`, `render.form`, `placement` | Only a first guess: `forb` can be a perennial, an annual or a groundcover, so check each |
| `height_m`, `spread_m` | `size.heightFt`, `size.spreadFt` | Multiply by 3.28 and round |
| `bloom` + `flower` | `bloom.months`, `bloom.colors` | 7 plants have no bloom months; use `bloom: null` |
| `foliage` (one color) | `foliage.summer` | Spring, fall and winter colors need research |
| `sun` | `sun` | Same values |
| `moisture` | `water`, `soil` | dry → low, medium → medium, wet → high. Soil needs research |
| `sources` (keys) | `sources` (label and URL) | Map each key to its label and URL from `_meta.source_keys` |
| `tags`, `edible`, `recommended`, `alternatives` | New fields above | Lost without the schema changes |

**Fields with no data at all in the working list**, to research for all 89 new plants: `plantedSpreadFt`, `yearsToMature`, `spacingFt`, `zones`, `care`, `plantingMonths`, `liftAndStore`, `thorns`, `toxicity`, `wildlife` (partly in tags), `effort`, `fruit`, seasonal foliage, `soil`, `lifespanYears` and images. That is most of the record, so the research pass is the main work, not the conversion.

## Images

There are no plant pictures anywhere yet. Two layers:

1. **Watercolor thumbnails (do first).** Render each plant with `src/render` at peak bloom, in summer and in winter, and save them as small images. This costs nothing, matches the app's look, and works the moment a record is complete.
2. **Real photos (second).** Get them from openly licensed sources, such as Wikimedia Commons or CC-licensed iNaturalist observations, and store the author, license and source with each one. These help people recognize plants, and they feed "review the yard now" and the reference-photo match.

## Steps

1. **Decide the open questions** below.
2. **Widen the schema** in `src/model/plant.ts` with the 10 plant-object attributes first (`lifespanYears`, `pollination`, `emerges`, `planting`, `images`), then the other fields above. Add a test that a `verified` plant has all 10 filled with a source each; that test is the audit. Fill the 25 existing files for the new fields. Keep `pnpm test` green.
3. **Allow draft records.** Add `verified: false` drafts that may leave research fields empty, using a looser draft schema. The gallery shows only complete records, and the test still checks drafts for shape.
4. **Write a one-time import script** (`scripts/import-working-list.ts`). It reads `indiana_plants.json` and the NRCS file, fixes names, converts units and fields, merges into the 16 existing files without overwriting their facts, and writes 89 draft files. Run it once, commit the output, then delete `indiana_plants.json` and the script so the old format can't drift back.
5. **Research pass.** Fill each draft from real sources, such as Missouri Botanical Garden, Purdue Extension, Lady Bird Johnson Wildflower Center, USDA PLANTS (by NRCS symbol) and Indiana DNR for invasives. An AI may gather facts only with a cited source, and a person sets `verified: true`. Start with the plants beginners see first: recommended natives and popular garden plants.
6. **Generate watercolor thumbnails** for every complete record, then add photos.
7. **Use the new fields in the app**: gallery filters (status, edible, tags, kid and pet safe), "Replace" using `alternatives`, and warnings for invasives.

## Open questions

1. **Invasive plants (15).** Keep them as records the app can identify and offer replacements for, but never place? Or leave them out for now? This plan assumes keep, with `plantable: false`.
2. **Crops (tomato, pepper, basil, squash, sunflower).** Are vegetables in scope for the first version? The schema has no vegetable care model, such as yearly replanting or harvest.
3. **Natives first?** The plant library brief already asks whether native plants should rank above popular non-natives such as hosta.
4. **Genus-only entries.** Which tulip should we use, and should the Hosta and Buxus entries merge into the existing cultivars?
5. **The NRCS file.** Should a copy go in the repo for the import, or stay outside, since the move is one-time?
