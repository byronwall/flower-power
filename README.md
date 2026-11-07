# Flower Power

Flower Power is a garden planner for Indiana homeowners. You give it your address and a few photos. It paints your whole property as a watercolor plan and suggests gardens that fit your sun and shade. You can see a garden in 2D and 3D through the seasons and 5 years out. You also get a step-by-step plan for planting and care.

The first part in progress is the 2D plan renderer. See the [plan views shape brief](docs/intent/plan-views/shape-brief.md).

## Run it

The app uses SolidStart, TypeScript, and pnpm, on Node 20 to 22.

```bash
pnpm install
pnpm dev
```

`pnpm test` checks every plant and property file. `pnpm typecheck` checks the TypeScript.

## Data

- `data/plants/`: one JSON file for each plant. See [data/plants/README.md](data/plants/README.md) to add a plant.
- `data/properties/`: one JSON file for each property. The schema is in `src/model/property.ts`.

## Overview

The [Flower Power plan overview](https://claude.ai/artifact/LLiJW3prBD1RbqrwGhM5cB) is a one-page summary. It shows the first product, the key decisions, the first proof, and the 17 spikes in groups. The page source is [overview.html](docs/intent/garden-design-app/overview.html).

## Planning documents

The [intent index](docs/intent/README.md) lists the seven parts of the product, such as property capture, the plant library, and plan views. Each part has its own intent brief and open question.

The product documents are in [docs/intent/garden-design-app/](docs/intent/garden-design-app/):

- [intent-brief.md](docs/intent/garden-design-app/intent-brief.md): what the app is for and who it is for.
- [shape-brief.md](docs/intent/garden-design-app/shape-brief.md): what the first product includes, the key decisions, and the first proof.
- [spikes.md](docs/intent/garden-design-app/spikes.md): the spikes and research to do before and during the build.
- [initiative-map.json](docs/intent/garden-design-app/initiative-map.json): the record of each question round, claim, and decision.
- [mockups/](docs/intent/garden-design-app/mockups/): early concept mockups from the first voice memo.

## Next step

Run spikes S1, S5, S15, and S2, then run the first proof. The first proof takes one real Indiana yard to a watercolor plan with 10 plants and a working time slider.
