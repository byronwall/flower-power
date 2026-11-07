# Demo

A demo account and real photos for a live demo.

## Log in

Open https://flowerpower.today/login and log in:

- Email: `demo@flower.test`
- Password: `flowerdemo`

Each login as the demo account starts clean. The server makes the account if it is missing. It deletes the demo projects and photos, and puts back the sample lot. Do not keep work in the demo account.

The password is public on purpose. Anyone can use it, but they only get the sample lot. They can do nothing that a new account cannot do.

## Photos to upload

The photos stay on your computer, not in git, because they are real listings and the repository is public. Run this once to copy them into `demo/files/`:

```bash
pnpm demo:setup
```

- `demo/files/delmar/`: 3605 Delmar Rd. One aerial and 8 listing photos. Use this one. The import finds about 12 plantings in about 35 s.
- `demo/files/broadway/`: 5560 Broadway St. One aerial and 7 listing photos. Use it as a second yard.

The command copies from `tmp/listings/`. On another computer, copy that folder first, or give its path: `pnpm demo:setup <folder>`.

## Run it on your computer

To demo with no internet, or to test before the live demo:

```bash
pnpm demo
```

Open http://localhost:3300/login and log in with the same demo account. Local demo data goes in `demo/data/`, apart from your own accounts in `data/`.

`pnpm demo:offline` does the same, but replays saved AI answers with no API call. The import then takes about 3 s. It works only for the Delmar and Broadway photos.

## Script (about 5 minutes)

### 1. The problem (30 s)

Start on the projects page.

> Most people in Indiana want a better yard, but they don't know what grows where, or what it looks like in 5 years. Flower Power starts from photos you already have.

### 2. Import a real yard (1 min)

1. Click **New from photos**.
2. Select every file in `demo/files/delmar/`: the aerial and all 8 photos.
3. While it runs (about 35 s), say:

   > The aerial gives the shape of the lot and the house. The listing photos tell it which plants are already there.

4. When it ends, show the **scale banner**. Say:

   > It guessed the size from the house. If it is wrong, you change one number and the whole plan rescales.

5. Click **Save**.

### 3. See it grow (1 min)

1. Click **Year 1**, then **Year 5**. The plants fill in.
2. Click **Spring**, **Summer**, **Fall**, **Winter**. Bloom color and leaves change.
3. Click **3D View**. Drag to orbit. Click **Side by side** to show 2D and 3D together.

> This is the part people can't picture in their head: what the yard looks like in 5 years, and in January.

### 4. Add plants (1 min)

1. In the plant list, click **Native**.
2. Drag a plant, for example **Purple coneflower**, onto the plan.
3. Click **Fill area** on a plant and outline a bed on the plan.
4. Click **Invasive** to show plants to remove, and what to grow instead.

> Every plant is from a list of 138 plants for Indiana. Invasive plants are hidden unless you ask for them.

### 5. Design ideas from AI (1 min)

1. Click the sparkle button at the top right of the plan. Its tooltip is "Goals, a review of your yard, and design ideas".
2. Type a goal, for example "Color all summer and food for pollinators".
3. Select a style. Click **Make designs**.
4. Open a design. Show the ghost changes on the plan. Click **Accept all**.

> It makes suggestions. You accept or reject each change.

### 6. Share it (30 s)

1. Go back to **My projects**.
2. Click **Share** on the Delmar project. Open the link in a private window.

> The link works without an account, so you can send it to a spouse or a landscaper.

## If something goes wrong

- **The import fails or hangs.** Open **Sample Indiana lot** instead. It has 26 plantings and shows all the same features. If you have a laptop with the repository, run `pnpm demo:offline` and use http://localhost:3300.
- **The demo is messy from a test run.** Log out and log in again. The account starts clean.
