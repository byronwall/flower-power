# Software Design Sleuth — Intent to Proof

Version 0.7.0

A scale-aware Agent Skill that turns messy transcripts, notes, repositories, and iterative dictation into a connected planning system:

```text
unstructured evidence
        ↓
concise intent brief + detailed initiative map
        ↓
optional 6–7 option brainstorm
        ↓
bounded shape with constructive implementation pushback
        ↓
proof-first implementation plan
```

The skill is deliberately gentle while recovering intent and increasingly opinionated as work approaches implementation.

## What changed from the intent-first release

The v0.3 intent brief and JSON sidecar remain the foundation. Version 0.4 adds:

- one integrated `intent → shape → plan` workflow;
- optional concise brainstorming with 6–7 genuinely contrasting options;
- tree-based shaping with an internal implementation-success pass and a visible first proof;
- explicit pressure toward smaller proofs, faster local feedback, isolated dependencies, and reversible rollout;
- a dependency proof ladder that distinguishes fakes, mocks, emulators/containers, contract tests, live sandboxes, and deployed proof;
- implementation milestones compatible with the strongest thin-slice principles from `byronize-task-list`;
- downstream invalidation when new dictation changes intent or shape;
- structural validation and a heuristic 0–10 audit.

## Installation

Install for all projects:

```bash
mkdir -p ~/.claude/skills
rm -rf ~/.claude/skills/software-design-sleuth
cp -R software-design-sleuth ~/.claude/skills/software-design-sleuth
```

Install only in one repository:

```bash
mkdir -p .claude/skills
rm -rf .claude/skills/software-design-sleuth
cp -R software-design-sleuth .claude/skills/software-design-sleuth
```


## Migrating an existing v0.3 initiative

Version 0.3 used `intent-map.json`. The current release uses the broader `initiative-map.json`. Migrate without deleting the old file:

```bash
node ~/.claude/skills/software-design-sleuth/scripts/migrate-v0.3.mjs \
  docs/intent/<initiative-slug>
```

The script preserves `intent-map.json`, writes schema version 0.5.0 with unassessed lifecycle status, and carries forward sources, claims, themes, questions, and history, and marks any existing brainstorm, shape, or implementation plan stale. Re-run the relevant phase so the new implementation-success and dependency-proof gates are applied.

## Modes

| Mode | Use it when | Main output |
|---|---|---|
| `intent` | Inputs are messy or contradictory | `intent-brief.md`, `initiative-map.json` |
| `brainstorm` | You want 6–7 different directions before convergence | `brainstorm.md` |
| `shape` | Intent is stable and the work needs a bounded solution | `shape-brief.md` |
| `plan` | Shape is stable and repository-grounded execution planning is appropriate | `implementation-plan.md` |
| `full` | You want the skill to advance unattended through every safe phase | All applicable artifacts |
| `update` | You are dictating corrections or supplying new evidence | Updated artifacts plus a short delta |
| `audit` | You want a quality review of existing artifacts | Scores and high-leverage improvements |
| `status` | You want to see where initiatives stand | Read-only lifecycle and retirement view |
| `retire` | You explicitly approve retirement of an initiative | Durable docs, closure record, removed planning files |

The skill resumes from `initiative-map.json`. It does not restart intent recovery every time.

## Canonical project artifacts

```text
docs/intent/<initiative-slug>/
├── intent-brief.md
├── initiative-map.json
├── brainstorm.md              # optional
├── shape-brief.md
└── implementation-plan.md
```

The Markdown files are for humans. Detailed sources, claim strength, revisions, dependency proofs, artifact status, and history live in `initiative-map.json`.

## Recommended usage

### 1. Recover intent

```text
/software-design-sleuth intent

Read the supplied transcripts, notes, and repository. Determine what I am
actually trying to accomplish. Produce a concise intent brief and detailed
initiative map. Do not shape or plan yet.
```

### 2. Explore broadly when useful

```text
/software-design-sleuth brainstorm

The intent is approved. Give me seven genuinely contrasting approaches.
Keep each compact. I want variety, not a research report or scoring matrix.
```

### 3. Shape with constructive pushback

```text
/software-design-sleuth shape

Shape the approved intent. Inspect the repository and tell me how to make this
go better: smaller proof, faster local loop, narrower seams, safer rollout,
and anything else that materially improves implementation success.
```

### 4. Produce the implementation plan

```text
/software-design-sleuth plan

Create a proof-first implementation plan from the current shape. Use real
subsystem names, outcome milestones, valid intermediate systems, explicit
verification, and a clear cut line. Isolate difficult dependencies and make
routine development local where practical.
```

### Run the full process unattended

```text
/software-design-sleuth full

Recover intent, then shape and plan as far as the evidence allows. Use
brainstorming only if it would expose a consequential choice. Work unattended
through repository research and safe artifact creation. Stop only at a genuine
human, access, real-world observation, or phase boundary.
```

### Force a brainstorming pass inside full mode

```text
/software-design-sleuth full

Recover intent, generate seven concise contrasting options, recommend a shape,
and produce the proof-first implementation plan. Keep provenance in JSON and
keep the human artifacts readable.
```

### Continue from dictation

```text
/software-design-sleuth update

The running application must not write secrets. Secret changes require an
operator-approved deployment workflow. Ordinary parameters may still change at
runtime. Update the artifacts, invalidate stale downstream work, and continue.
```

## The implementation-success behavior

The default `shape-brief.md` uses an outcome, primary flow, scope tree, optional behavior table and samples, and compact decisions with a first proof. Keep one human shaping surface. Use roughly 400–800 words; the hard maximum is 1,000.

Keep 3–6 implementation-success moves in the initiative map. Surface material pushback under **Decisions and boundaries**; a separate worksheet is not required.

The skill actively asks:

- Can the outcome be proven with less product or infrastructure?
- Can the core behavior run locally without deployment?
- Can a narrow port isolate the external or unstable dependency?
- Can important failures be selected intentionally?
- Which properties require a fake, emulator/container, contract test, sandbox, or deployed proof?
- Are several independent risks bundled into one milestone?
- What useful system exists after every major step?
- How can the new path be disabled, bypassed, or rolled back?

It should push back on plans such as:

```text
provision cloud resources
  → wire credentials
  → deploy the whole application
  → discover application behavior and failure states there
```

and prefer a sequence such as:

```text
application behavior + deterministic fake
  → provider adapter contract locally
  → small real-provider sandbox smoke
  → reversible deployed slice
  → operational hardening
```

The exact ladder depends on the dependency. The skill must not add containers or abstractions when a small feature does not need them.

## Relationship to `byronize-task-list`

The implementation planner incorporates the reusable planning principles that matter across projects:

- get the smallest high-impact end-to-end behavior working first;
- group milestones by delivered outcome rather than engineering layer;
- ground work in real subsystem names;
- turn unknowns into spikes with decision outputs and fallbacks;
- give every milestone one concise desired end state;
- draw a clear cut line.

The workspace-specific behavior from the original skill—daily-file paths, worktree conventions, and Linear publication—is intentionally not baked into this portable skill. An existing `byronize-task-list` installation can still consume `implementation-plan.md` afterward when issue publication or the personal daily-planning workflow is wanted.

## External-dependency example

The complete example in `examples/aws-runtime-config/` shows the intended progression:

- recover the real intent behind “integrate SSM and Secrets Manager”;
- brainstorm seven operational models;
- recommend an application-owned seam and three-level proof path;
- prove update/restart locally before IAM and deployment;
- introduce Parameter Store and Secrets Manager separately;
- use LocalStack for AWS API behavior and a sandbox for real IAM/KMS behavior;
- preserve a reversible source-selection path.

The example is illustrative. A real run must replace placeholder repository anchors and commands with discovered paths and conventions.

## Validation

Validate one initiative folder:

```bash
node ~/.claude/skills/software-design-sleuth/scripts/validate-sleuth.mjs \
  docs/intent/<initiative-slug>
```

The validator checks:

- human readability budgets;
- forbidden process-heavy sections in the intent brief;
- brainstorm count and compact option structure;
- mandatory shape pushback and first proof;
- dependency seams, first-proof roles, failure modes, local/live proof, and rollout;
- milestone outcomes, verification, valid intermediate states, and rollback;
- current/stale artifact consistency.

Run the heuristic audit:

```bash
node ~/.claude/skills/software-design-sleuth/scripts/audit-sleuth.mjs \
  docs/intent/<initiative-slug>
```

Or get machine-readable scores:

```bash
node ~/.claude/skills/software-design-sleuth/scripts/audit-sleuth.mjs \
  docs/intent/<initiative-slug> --json
```

The audit scores:

- intent readability and fidelity;
- brainstorm diversity;
- shape challenge;
- dependency isolation;
- fast local feedback;
- vertical slicing;
- verification ladder;
- reversibility;
- state continuity.

These scores are heuristics. Use the evaluation rubric for a human or model review before treating a large plan as execution-ready.

## Package structure

```text
software-design-sleuth/
├── SKILL.md
├── README.md
├── CHANGELOG.md
├── references/
│   ├── intent-recovery.md
│   ├── brainstorming.md
│   ├── shaping.md
│   ├── implementation-success.md
│   ├── dependency-ladders.md
│   ├── implementation-planning.md
│   ├── feedback-and-invalidation.md
│   └── foundations.md
├── templates/
│   ├── intent-brief.md
│   ├── initiative-map.json
│   ├── initiative-map.schema.json
│   ├── brainstorm.md
│   ├── shape-brief.md
│   └── implementation-plan.md
├── examples/
│   ├── aws-runtime-config/
│   └── brainstorm-collaboration-surface.md
├── evals/
│   ├── test-prompts.md
│   ├── evaluation-rubric.md
│   ├── regression-aws-local-proof.md
│   └── regression-brainstorm-readability.md
└── scripts/
    ├── migrate-v0.3.mjs
    ├── validate-sleuth.mjs
    └── audit-sleuth.mjs
```

## Design constraints

- Do not expose the agent's complete source ledger in the human brief.
- Do not make brainstorming mandatory.
- Do not let research silently redefine the user's intent.
- Do not let the user's initial implementation idea silently dictate the shape.
- Do not create detailed tasks while product or architecture decisions remain hidden.
- Do not make deployment the primary development loop without a specific justification.
- Do not claim a fake or emulator proves provider identity, permissions, or production operations.
- Do not keep a downstream plan current after its intent or shape changes.

## Lifecycle and retirement

Initiative status is separate from phase and artifact freshness.
Use `planned`, `active`, `paused`, `completed`, or `cancelled`. Completion requires intent and implementation evidence.

Retirement requires explicit user approval before file deletion. A clear initial retirement request counts; do not ask twice.
Completion, cancellation, or a full planning run does not authorize retirement.
Reconcile intent with code, update durable docs, and write a compact closure record before removing approved planning files.
See [lifecycle and retirement](references/lifecycle-and-retirement.md) for the gate and status view.

Existing lifecycle remains unassessed until inspected. The v0.3 migrator writes a 0.5 map with null status for assessment.
Run retirement validation with `node scripts/validate-sleuth.mjs <initiative-dir> --retirement`.
The validator checks structure; it cannot establish human approval or semantic correctness.
