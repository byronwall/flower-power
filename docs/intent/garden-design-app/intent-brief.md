---
title: "Garden design app"
slug: "garden-design-app"
phase: intent
status: current
last_updated: "2026-11-07"
---

# Garden design app

## My read

You want a website where a homeowner sees their own house and yard, then plans a better garden on top of it. The person opens a link at home on a desktop computer. They drag in photos of the property, give the address, and the app shows the whole property as a plan they recognize. From there, the app helps them decide what to plant, where, and when, and it shows how the result looks across the seasons and over several years.

The first user is a homeowner with a place for a garden. Think of older people, retired people, and family people, not Gen Z. Anne is the likely first real user. Some users know almost nothing about gardening. Others have a garden and strong opinions. The app must serve both.

The value is a beautiful, believable picture of *your* yard, and a plan you can act on. A person often starts from a feeling, such as "a peaceful, private place to sit after work," and the app turns that feeling into plants and a layout.

## What matters most

- **It is your property.** The design always sits on the real house and yard. Reference ideas come from elsewhere, and the app makes that clear.
- **It looks beautiful.** Visual quality is a core requirement, not polish.
- **Sun and shade drive the design.** Where the sun falls decides what grows.
- **Time is visible.** You see the seasons in one year, and the size of plants and trees after about 5 years.
- **It ends in a plan you can follow.** What to plant, when, and how to care for it.

## The experience you appear to want

You enter your address and drag in photos of your yard. The app shows the whole property from above, at a known scale, with the house, driveway, fences, beds, and trees marked. You correct what is wrong, add a size or two, and say which way your front door faces. The app shows morning and afternoon shadows, and you rotate the plan until they look right.

Then you say what you want. This can be a feeling, a color theme, wildlife to attract (songbirds, hummingbirds, butterflies), safety needs (no thorns or toxic plants near kids and pets), or a photo of a garden you like. The app can also review the yard as it is now: what works, what does not, and which spots are empty.

A beginner gets 3 to 5 different designs, picks one, and gives feedback. An experienced gardener names the plants they love, and the app designs around them. On the plan, you can move, remove, or replace any plant, or ask the app to rework one area. A visual plant gallery lets you add plants yourself and filter by color and bloom time.

You drag a time slider through winter, spring, summer, and fall, and out to 5 years. You see the top-down plan, and a front view or 3D view when possible. You leave with a step-by-step plan.

## Boundaries

### Must be true

- The whole property around the house is in scope. A small area alone also works.
- The 2D top-down plan is where you edit. Other views are for seeing.
- Plants overlap and have real sizes, so the plan is not a square grid of cells.
- Each plant's data includes mature size, growth time, sun, soil, bloom time and color, annual or perennial, lifespan, and yearly care, such as lifting dahlias in fall.
- The map only needs to be close enough to plan with.
- It runs in a desktop web browser. A phone only sends photos.

### Must be avoided

- A blank-canvas drawing tool that makes the user do the design work.
- Ugly or generic visuals.
- Controls that assume skill with 3D or design software.

## What seems settled

- First version is for homeowners who open a URL, not only for Anne's yard.
- The most important moment is seeing your own property appear.
- Climate, region, and plants are limited to Indiana. Start from about the top 100 Indiana plants.
- Sun and shade come from the address, the house direction, and the person's check of the shadows.
- The step-by-step plan covers when to plant, care through the year, time to grow, sun, soil, and replanting work.
- Plant choices can include low-effort options, including artificial plants that never die.
- The main look is a detailed watercolor illustration, not photos. Each plant is painted with some randomness, so it looks organic and not repeated.
- Dragging a plant out paints an area of that plant.
- A 3D view sits beside the 2D plan and updates at once with each edit and slider move. This is the goal, if it can be made fast enough.
- Accounts use email and password only, with the simplest database. People must not lose their work, and sharing a project is important. A shared project is view only.
- A public gallery shows projects that their owners mark public: a zoomed-out wall of garden thumbnails, where you zoom in to see one garden. The public view hides the address and the aerial photo.

## Possibilities, not decisions

- Growth simulation later: seed to flower, and plants that fill in or crowd out others.
- Photos from a listing site such as Zillow, provided by the user.
- Budget and how much change the person accepts, from the first memo.
- Paths, stonework, and fence materials beyond what exists now.
- Gaussian splats, many weather-year simulations, and other render styles.

## Later, not in the first version

- Community use, such as a city like Fishers planning a quiet public space.
- The garden explainer (for example, Versailles over time) and the architect portfolio. These can be views on the same engine later.
- Regions outside Indiana. A professional tier.

## Current reality that matters

- An empty repository exists at `byronwall/flower-power`. There is no code yet.
- Ten early mockups in [mockups/](mockups/) show the main views. They come from the first memo, so some show features that are now later work.

## Parts with their own intent

This brief is the umbrella for the product. Each part has its own intent document with more detail: [property capture](../property-capture/intent-brief.md), [sun and shade](../sun-and-shade/intent-brief.md), [plant library](../plant-library/intent-brief.md), [design assistant](../design-assistant/intent-brief.md), [plan views](../plan-views/intent-brief.md), [garden plan](../garden-plan/intent-brief.md), and [accounts and gallery](../accounts-and-gallery/intent-brief.md). The [intent index](../README.md) lists each part's spikes and open question.

## Next step after confirmation

Shape the first product and run the spikes that decide how capture, sun, plant visuals, and design proposals work. See [shape-brief.md](shape-brief.md) and [spikes.md](spikes.md).
