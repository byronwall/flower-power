---
title: "Photo measurement assumptions"
slug: "photo-measurement-assumptions"
phase: research
status: draft
last_updated: "2026-11-08"
origin: repo-reading-brief
source_edition: "2026-11-08"
source_date: "2026-11-08"
source_edition_url: "https://chatgpt.com/space/page_2fd090f1c09c819196185a4f6e955db2"
topic_id: "flower-power.photo-measurement-plane.v1"
reviewed_commit: "7dbd3e15bc43a12719787ab78fd1055e4212e936"
---

# Photo measurement assumptions

**Recommendation:** Keep the estimated import and its one-step scale correction. Before treating a corrected plan as measured, specify exactly which image segment the person measured, which surface it belongs to, and which image geometry allows that scale to apply elsewhere.

This research note supports [AI assist](intent-brief.md). It proposes a small measurement contract for review, without changing application code, the existing import evaluation, or the product's zero-click default. Origin: repo-reading-brief. Source: [November 8, 2026 edition](https://chatgpt.com/space/page_2fd090f1c09c819196185a4f6e955db2). Stable topic ID: `flower-power.photo-measurement-plane.v1`.

## What the current source already does

Reviewed on `main` at `7dbd3e15bc43a12719787ab78fd1055e4212e936`:

- [The import prompt and conversion](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/src/ai/importShape.ts) assume a straight-down, north-up aerial, estimate image width from typical object sizes, and request the main **roof outline**. The conversion applies one feet-per-pixel value to both axes and sets north up.
- [ScaleBanner](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/src/editor/ImportFlow.tsx) calls the outline's bounding-box width “House width.” [bounds](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/src/render/geometry.ts) computes maximum x minus minimum x. This is a horizontal extent, which can differ from a wall or roof-edge length on a rotated house.
- [scaleProperty](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/src/editor/state.ts) scales plan points and the image underlay together, preserving their alignment. It leaves heights and plant spacing unchanged. [PR #10](https://github.com/byronwall/flower-power/pull/10) already delivered and tested that correction.
- [The property model](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/src/model/property.ts) assumes flat ground. The import's `scaleBasis` is explanatory text; the schema has no measurement endpoints, plane identity, or uncertainty record.

These facts expose a semantic gap even when the scalar arithmetic is correct: a homeowner may enter a wall length while the control rescales a roof's horizontal extent.

## What the reading supports

Criminisi, Reid and Zisserman's *Single View Metrology* (IJCV 40(2), 2000, pp. 123–148) derives measurements from explicit scene geometry. Its reference-plane vanishing line and an off-plane vanishing direction support affine reconstruction. A known reference length sets the remaining scale for the relevant construction; it does not alone calibrate an arbitrary photograph.

Section 2.2 permits ratios of parallel lengths and areas on a plane. Comparing different parallel planes requires their geometric relationship. Arbitrary Euclidean lengths within a plane require additional metric information. Section 4 propagates uncertainty from image points and calibration, and warns that first-order approximations fail for sufficiently large uncertainty.

Read the [Oxford publication record](https://www.robots.ox.ac.uk/~lav/Papers/criminisi_etal_ijcv2000/) and [paper, especially sections 2.1, 2.2 and 4](https://courses.grainger.illinois.edu/cs543/sp2011/sources/criminisi00.pdf). Flower Power currently implements none of that perspective reconstruction. The practical application here is to bound its scalar model's claims.

## Proposed measurement contract

These are recommendations for a later design decision, not implemented behavior.

1. **Name the quantity.** Record two identifiable endpoints, their image coordinates, the measured length and units, and how it was obtained. Distinguish a wall face, a roof edge, a horizontal plan extent, and a ground segment. Keep typical car or sidewalk dimensions explicitly estimated.
2. **Name the surface.** Prefer a visible ground segment for ground-plan scaling. A roof overhang is physically different from the wall below. A sloped roof edge can also differ from its horizontal projection. Do not silently equate any of these.
3. **Record the image basis.** Preserve source dimensions, crop/resize history and available map scale metadata. Track north separately: a correct distance does not establish orientation. A crop changes the full image's coverage; resizing changes feet per pixel.
4. **Limit the claim.** A trusted length checks scale only under the selected geometry assumptions. Keep shape placement, roof-to-ground correspondence, boundary inference and scale as separate review questions. The “Looks right” action is not evidence that all four have been measured.

The roof distinction also matters for map imagery. Esri explains that traditional orthomosaics may place ground features correctly while elevated buildings lean or shift horizontally; true orthos use a detailed surface model to address that displacement. This does not identify the processing or accuracy of every World Imagery tile. See [Esri's comparison](https://www.esri.com/arcgis-blog/products/arcgisrealitystudio/imagery/the-different-types-of-ortho-images-created-in-arcgis).

## Which inputs support the claim

| Input | Proposed treatment |
| --- | --- |
| Orthorectified map image with preserved scale metadata | Use the metadata as the scale basis and check independent ground features. Do not promise exact roof or boundary geometry. |
| Apparently overhead drone image or map screenshot without metadata | Keep the editable estimate. A measured, visible ground segment may support approximate scaling, with its assumptions recorded. Looking overhead alone does not prove uniform scale. |
| Oblique drone or street image | Keep the current overhead-input boundary. Do not imply that entering one length removes perspective. Perspective rectification would be a separate proposal requiring its own evidence. |
| Image with unclear endpoints, sloped ground, heavy occlusion or a roof-only anchor for a ground claim | Ask for a better source or retain approximate/manual planning. Do not manufacture a precise error range. |

[USGS distinguishes uniform-scale orthoimagery from ordinary aerial photography](https://www.usgs.gov/faqs/what-a-digital-orthophoto-quadrangle-doq-or-orthoimage). The existing [aerial-fetch script](https://github.com/byronwall/flower-power/blob/7dbd3e15bc43a12719787ab78fd1055e4212e936/scripts/fetch-aerial.ts) computes a requested map export scale. That removes one source of guessing; it does not validate the image's feature locations, the traced outlines, or parcel boundaries. “Known export scale” is a more defensible description than “exact measurements.”

## Uncertainty and a bounded next check

A future record should separate uncertainty in the real length, endpoint placement, and the assumed image-to-ground mapping. Repeated model agreement cannot expose a shared wrong anchor. An interval is meaningful only after defining its inputs and checking coverage against independent measurements; no numeric confidence level is established here.

A synthetic example makes the current naming risk testable without an API call. A 40 by 20 ft rectangle rotated 45 degrees has a horizontal extent of about 42.4 ft. Entering “40” into the current bounding-width control scales everything by about 0.943, even though its 40 ft edge was already correct. This is geometry, not a measured Flower Power failure rate.

For later validation, extend the existing evidence rather than start a new benchmark:

- Use a few synthetic examples to check rotated width versus edge length, roof overhang versus wall footprint, perspective, and non-uniform resizing.
- On eligible existing cases with lawful access to the original images, annotate one independently measured ground segment and a second held-out segment. Record whether each is actually visible and comparable.
- Compare the existing estimate with the supplied-anchor interpretation at the same cases. Report held-out length error and time to correct the plan, including cases where the anchor is unusable. Keep the product's existing pass criteria unchanged.
- Keep private addresses, listing photos and aerials out of this public repository, following the existing evaluation practice.

[PR #14](https://github.com/byronwall/flower-power/pull/14) and the [import evaluation log](import-eval-log.md) already cover 22 cases with three runs each, image-count variants, zoom/crop cases and a drone check. The kept round passed 53/66 at the revised 50% lot-area limit, with 5.9% median and 34% worst scale error. The scale-reference experiment was reverted because model-selected object marks did not improve the result. This note does not reverse that result or claim that a supplied anchor will improve it.

**Decision to make after that check:** Is an explicitly identified ground segment worth offering as an optional correction? Preserve the current path unless it reduces useful correction work. Perspective reconstruction, new accuracy promises and mandatory calibration are outside this note.

## Verification limits

This is source and literature review only. No application changes, live model calls, new benchmark results or measurement-accuracy claims accompany it. The proposed checks have not been run.
