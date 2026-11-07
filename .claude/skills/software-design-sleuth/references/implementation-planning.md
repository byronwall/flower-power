# Proof-first implementation planning

Use this file for `plan`, `full`, or a shape-to-plan continuation.

## Planning objective

Create an execution-ready sequence that proves value and risk as early as possible while preserving a fast development loop.

The plan must describe a route through valid intermediate systems, not a taxonomy of components.

## Repository investigation

Inspect only enough to make the plan concrete:

- relevant user or operator entry points;
- current lifecycle and state ownership;
- transport, persistence, and sync paths;
- configuration and deployment;
- tests and test helpers;
- observability and diagnostics;
- recent history and in-flight work when relevant.

Use real subsystem names. Avoid speculative exact file lists unless the repository evidence is strong.

## Milestone construction

Start by identifying:

1. the first user-visible or operator-visible proof;
2. the riskiest external or architectural assumption;
3. the local substitute or seam that separates them;
4. the smallest real integration proof;
5. the transition from provisional to authoritative behavior;
6. hardening and operational proof;
7. everything below the cut line.

A common sequence is:

1. **Proofable core slice** — real behavior against a deterministic local boundary;
2. **Dependency contract** — adapter plus emulator/container or contract suite;
3. **Live integration slice** — sandbox credentials, permissions, and provider smoke;
4. **Product completion** — persistence, UI/operator feedback, background behavior;
5. **Operational safety** — observability, rollback, throttling, recovery;
6. **Hardening** — broader cases, polish, and cleanup.

Adapt this sequence. Do not force an external-dependency milestone when none exists.

## Milestone format

```markdown
## Milestone X: [Observable outcome]

[Why this is the next useful proof and what it deliberately excludes.]

- **Change — [Concrete subsystem change]**
  - [Implementation detail]
  - [Verification detail]
- **Change — ...**

- **Spike — [Only when an unknown blocks implementation]**
  - Decision required:
  - Evidence to gather:
  - Fallback:

### Desired end state

- [Visible or operator-visible result]
- [Relevant system behavior]
- [How completion is proven]
```

Do not create a separate “testing milestone” when tests belong with the behavior.

## Fast-loop contract

The implementation strategy should state:

- the focused command or workflow used during development;
- which dependencies it starts;
- whether it requires network or shared infrastructure;
- how failures are selected or injected;
- the slower proof that confirms provider or deployment fidelity.

Prefer one documented command that reproduces the first slice locally.

## Plan quality checks

- The first milestone proves a real behavior, not just scaffolding.
- Each new external dependency has a named seam.
- Provider access is not introduced before application behavior is testable.
- One milestone does not introduce several independent unknowns.
- Every milestone has verification and leaves a valid system.
- The old path remains available when migration risk is material.
- The live environment confirms rather than substitutes for local testing.
- Security, permissions, and operational visibility are not forgotten.
- Generalization follows a representative implementation.
- Unknowns have decision outputs and fallback rules.

## Milestone record

Each entry in `initiative-map.json` `implementation.milestones` matches a milestone heading in `implementation-plan.md`, in the same order. A milestone's `status` is `planned`, `active`, `completed`, or `cancelled`; `not-started` belongs only to `shape.status` and `implementation.status`.

```json
{
  "id": "m1",
  "title": "Treemap renders one level from a saved view",
  "outcome": "A user can add a treemap of revenue by category and see it restore after reload.",
  "dependencies_introduced": [],
  "proof": "Vitest for the layout plan; browser screenshot at 1280, 783, and 390 px.",
  "valid_intermediate_state": "The chart type is registered but hidden from the picker until m2.",
  "rollback": "Remove the registry entry; saved views without the type are unaffected.",
  "status": "planned",
  "evidence": []
}
```

Add `evidence` entries (test names, screenshots, PR links) before setting `status` to `completed`.
