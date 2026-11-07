# Regression: compact shaping must retain decisions

## Prompt: grouped scientific charts

> Shape scatter improvements for linear, polynomial, and LOESS regression. Fit each color group within each facet. Own brushing preserves fits; external filters recompute them. Shared parameters apply across one definition's facets. Show equations and R² where meaningful. Detailed results need compact inspection. Summaries and hex counts are committed additions. KDE and mean regions need evaluation. Bands are later possibilities.

## Prompt: dashboard authoring

> Shape a compact dashboard DSL for agents. Complete documents replace configuration with app defaults. Names are optional. Filters are chart-local. Render independent usable charts when one declaration fails, with actionable warnings. Export after UI edits on demand. No authored JSON. Paste entry is tentative. Global filters are a later possibility. Show likely examples without claiming final grammar.

## Acceptance

- One canonical shape-brief.md; no second detailed-shaping document.
- Outcome and primary flow appear before the scope tree.
- User-visible capabilities form a readable nested tree.
- Committed, evaluated, and later scope remain distinct.
- Shared parameters, optional choices, and defaults retain their qualifiers.
- Behavior rules do not become implementation tasks or repeated prose.
- DSL examples label unsettled syntax; no JSON escape blocks.
- A compact closing section exposes appetite, consequential boundaries, and material pushback.
- First proof names a slice, observable evidence, and a decision rule.
- Map retains 3–6 concrete success moves and question/artifact/decision_rule.
- Default budget is 400–800 words including examples; small work can use less.

## Rejection cases

- A beautiful tree without a human-visible first proof.
- Invented commitment to an evaluation candidate or tentative interface.
- Mandatory empty sections or a second prose description of every leaf.
- Generic "test it" proof without an observation or next-action decision.
- Loss of the regression brush rule or silent dropping of a broken DSL filter.
- Implementation-success reasoning removed because the human document is shorter.

## Structural checks

Run `node scripts/test-shape-validation.mjs` from this skill folder. These checks exercise accepted and rejected artifact contracts. They do not establish semantic fidelity; assess the generated documents against the prompts above.
