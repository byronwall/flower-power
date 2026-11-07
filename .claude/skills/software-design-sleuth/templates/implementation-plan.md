---
title: "[Initiative title] — implementation plan"
slug: "[initiative-slug]"
phase: plan
status: draft
last_updated: "YYYY-MM-DD"
---

# [Initiative title] — implementation plan

## Plan at a glance

[In 150–300 words, explain the proof order and the material implementation pushback. State how the sequence shortens feedback, isolates dependencies, and leaves valid intermediate systems.]

## Implementation strategy

- **First proof:** [Smallest user-visible or operator-visible behavior]
- **Primary seam:** [Application-facing boundary around the difficult dependency]
- **Fast local loop:** `[focused command or workflow]`
- **Local dependencies:** [Fake, emulator, containers, fixtures]
- **Provider/live confirmation:** [Small sandbox or deployed proof]
- **Rollout and rollback:** [Flag, adapter selection, fallback, migration, or bypass]

### Material dependency proof strategy

[Omit when no material external dependency exists. Explain which rungs are needed and why.]

```text
application core + deterministic fake
    → emulator/container or contract tests
    → live sandbox smoke
    → deployed operational proof
```

## Milestone 1: [Observable thin-slice outcome]

[Why this is the fastest meaningful proof and what it deliberately excludes.]

- **Change — [Concrete subsystem change]**
  - [Implementation or configuration detail]
  - [Focused verification]
- **Change — [Concrete change]**
  - [Detail]
  - [Verification]

- **Spike — [Only when a genuine unknown blocks implementation]**
  - Decision required:
  - Evidence to gather:
  - Fallback:

### Desired end state

- [Visible or operator-visible result]
- [Relevant system behavior]
- [Proof that the milestone is complete]

## Milestone 2: [Next isolated proof]

[Repeat the milestone structure. Introduce one major dependency or risk at a time where practical.]

### Desired end state

- ...

<!-- Add only the milestones required to reach the shaped outcome. Typical later outcomes: provider contract, live sandbox, rollout/persistence, operational safety, hardening. -->

## Cross-cutting verification

[Only include checks that cannot sensibly live inside one milestone. Avoid creating a separate generic testing phase.]

## Open decisions and spikes

[At most three. Each must include the decision output, evidence needed, and fallback. Omit when none.]

## Below the cut line

- [Deferred generalization]
- [Deferred polish]
- [Speculative infrastructure]
