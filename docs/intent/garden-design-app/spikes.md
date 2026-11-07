---
title: "Garden design app — spikes and research"
slug: "garden-design-app"
phase: shape
status: draft
last_updated: "2026-11-07"
---

# Spikes and research

Each item answers one question that changes the build. A **spike** is a small throwaway prototype. **Research** is reading and checking sources. Items marked **first proof** must finish before the first proof can run.

Do them in three groups:
- **First proof:** S1, S5, S15, and S2 decide whether the first proof is possible.
- **Next:** S7, S8, S10, and S12 unlock the live 3D pane, sun and shade, the plant data, and the designs.
- **Later:** the rest decide how later features work.

## Property capture

**S1. Aerial base map for an Indiana address** · research + spike · first proof
- **Question:** Which aerial image source gives a clear, current, top-down view of a suburban lot at a known scale, with terms that let us trace on it and show it?
- **Check:** IndianaMap statewide orthoimagery, Esri World Imagery, Mapbox Satellite, and Google Map Tiles. For each, record the resolution, the date, the cost, and whether the terms allow tracing.
- **Decide:** One source, plus the way to get meters per pixel.
- **Fallback:** The person uploads a screenshot and sets the scale with one known size, for example the garage width.

**S2. AI marks features on the aerial view** · spike · first proof
- **Question:** Can a vision model outline the house, driveway, fences, beds, trees, and lawn well enough that a person fixes it in less than 5 minutes?
- **Try:** Five real Indiana lots. Compare a vision model alone with public building footprints (for example Microsoft or OpenStreetMap) plus a vision model for the rest.
- **Decide:** Automatic marking with corrections, or guided drawing with snapping.
- **Fallback:** Guided drawing: the person clicks the corners of the house, and the app suggests the rest.

**S3. Property lines** · research
- **Question:** Can we get lot lines from county parcel maps (for example Hamilton County GIS) by address, and can we show them?
- **Decide:** Automatic lot lines, or the person draws them.
- **Fallback:** The person draws the lot and fence lines.

**S4. What photos add** · spike
- **Question:** From drag-in photos, can the AI name the existing plants and say which area of the plan each photo shows?
- **Decide:** Automatic photo placement, or the person drops each photo on the plan.
- **Fallback:** The person places photos and names the main plants. The gallery helps them pick.

## Visuals

**S5. Watercolor plant art with variation** · spike · first proof · the biggest product risk
- **Question:** Can we paint detailed watercolor plants that change with the season, bloom, and age, look a little different each time, and overlap well when they fill an area?
- **Try:** Ten Indiana plants (one tree, two shrubs, five perennials, two annuals) in 4 seasons and 3 ages. Compare three methods:
  - a set of generated watercolor images for each plant, with random rotation, scale, and tint when placed;
  - a code watercolor painter (brush strokes and paper texture from a random seed), driven by the plant's shape and colors;
  - a mix of the two: a generated texture for each plant and code for the shape and variation.
- **Observe:** Does a painted area look organic and not repeated? Does the whole plan look like a professional watercolor plan? How fast does it draw, and what does each new plant cost to add?
- **Decide:** The art method, the style guide, and the cost to add all 100 plants.
- **Fallback:** Soft colored shapes with paper texture and bloom color. They are clear but less beautiful.

**S6. Front view of the house** · spike
- **Question:** Can an image model paint the planned plants into the person's own front photo so that the result matches the plan?
- **Decide:** Whether the front view is a generated image, a drawn scene, or later work.
- **Fallback:** No front view in the first version.

**S7. Live 3D pane beside the plan** · spike · needed right after the first proof
- **Question:** Can a browser 3D scene show the whole yard from the same plan data, with the same watercolor look, and update at once when the person edits the plan or drags the time slider?
- **Try:** A house shape raised from its footprint, a ground texture from the plan, and plants as painted images that face the camera, or as simple painted shapes. Test a full yard with several hundred plants. Check edits and slider moves for delay.
- **Observe:** Does the 3D view look like it belongs with the watercolor plan? Does it update with no wait you can see? Can you rotate it smoothly?
- **Decide:** The 3D method and the plant limit before it slows down.
- **Fallback:** A "Render 3D" button that makes a still image after the plan is done.

## Sun and shade

**S8. Sun and shadows** · spike
- **Question:** From the latitude, the date, the house footprint, and estimated heights, can we draw believable morning and afternoon shadows and give each area a sun class?
- **Try:** A sun position library, a house height from the number of floors, and tree heights by type. Check the result against a real yard at two times of day.
- **Decide:** Whether simple heights are enough.
- **Fallback:** The person paints full-sun, part-sun, and shade areas.

**S9. Real heights from elevation data** · research
- **Question:** Does Indiana's public lidar data give house and tree heights at a useful level of detail, and is it practical to use in a browser app?
- **Decide:** Use lidar heights, or estimates.

## Plant knowledge

**S10. Indiana plant data set** · research
- **Question:** Which sources give trusted data for about 100 popular Indiana plants, and under what terms? Check Purdue Extension, the Indiana Native Plant Society, the Missouri Botanical Garden Plant Finder, and USDA PLANTS.
- **Fields:** Size and spread at maturity, years to reach it, sun, soil, water, bloom months and colors, leaf color by season, annual or perennial, lifespan, hardiness zone, care tasks by month, planting window, lift and store, thorns, toxicity to kids and pets, wildlife value, and effort.
- **Decide:** The data model and the first 100 plants, with a source for each fact.
- **Fallback:** An AI drafts the data, and a person checks each plant against one trusted source.

**S11. Growth over time** · research
- **Question:** Is a simple curve from planted size to mature size, plus a seasonal look (bare, leafing, bloom, fall color, dormant), enough to look right at 1, 3, and 5 years?
- **Decide:** The growth model fields in the data set.

## Design intelligence

**S12. Design generation** · spike
- **Question:** Can the AI choose plants and zones for 3 to 5 different designs that fit the sun, the theme, the safety needs, and the locked plants, while code does the spacing?
- **Try:** One real plan with three themes: "peaceful place to sit," "songbirds," and "low effort and safe for kids."
- **Observe:** Are the designs different from each other? Do they respect sun and spacing? Would a gardener accept them?
- **Decide:** How the work is split between the AI and the code, and the prompt and output format.
- **Fallback:** Hand-made design templates per theme, filled with plants that fit the sun.

**S13. Review the yard now** · spike
- **Question:** From the plan and the photos, can the AI give a useful, honest review: what works, what does not, and which spots are empty?
- **Decide:** Ship the review, or start from themes only.

**S14. Style from a reference photo** · spike
- **Question:** From a photo of another garden, can the AI pull out the colors, plant forms, and structure, and map them to Indiana plants that fit?
- **Decide:** Ship it, or keep themes only.

## Product

**S15. Painting an area of one plant** · spike · first proof
- **Question:** When a person drags a plant out and paints an area, how does the app fill it? It must use the right spacing, a natural pattern (not rows), and an edge that looks good next to other areas.
- **Decide:** The fill rule and how a person changes the count or the edge.
- **Fallback:** The person places single plants, and "repeat" copies one at the right spacing.

**S16. Public gallery wall** · spike
- **Question:** Can the app show hundreds of garden thumbnails on one zoomed-out wall, and zoom smoothly into one garden?
- **Try:** 500 saved thumbnails on a canvas that you can pan and zoom. Load a sharper image as you zoom in, and open the full project at the closest zoom.
- **Decide:** How thumbnails are made and stored, and the zoom method.
- **Fallback:** A normal grid of cards that you scroll, with a link to each garden.

## Decided, not spikes

- **Accounts:** email and password only, with the simplest database. No magic links and no private links.
- **Sharing:** share a project with another account. The other person can view it but cannot edit it.
- **Public gallery:** a project is private until its owner marks it public. The public view hides the address and the aerial photo.

## Later research

- **Growth simulation:** seed to plant to flower, and plants that fill in or crowd out others over the years.
