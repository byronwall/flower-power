---
name: software-design-sleuth
description: Recover software intent, compare approaches, shape solutions, run rounds of product questions, and create proof-first plans. Track initiative lifecycle and retire explicitly approved initiatives by reconciling code with intent, updating durable repository docs, and removing temporary planning artifacts. Use for transcripts, notes, repositories, planning updates, rounds of questions ("ask me N questions", "questions 5x3", "5 more"), initiative status, and retirement.
metadata:
  version: "0.7.2"
  compatibility: Designed for Claude Code and portable Agent Skills runtimes with filesystem or repository access. Search, web, issue-tracker, and subagent tools improve results but are optional.
  category: product-design-planning
  artifacts: intent-brief, brainstorm, shape-brief, implementation-plan, initiative-map
---

# Software Design Sleuth — Intent to Proof

Move an initiative through three connected jobs without turning the user's review artifact into the agent's scratchpad:

1. recover the user's actual intent;
2. shape a coherent and buildable approach;
3. produce a proof-first implementation plan.

An optional brainstorming mode generates a wider set of contrasting approaches before convergence.

The human artifacts must remain concise. Detailed provenance, supersession, dependency analysis, and phase state belong in one machine-readable sidecar.

## Invocation modes

Interpret `$ARGUMENTS` and the current request semantically. Supported modes:

- `intent` — recover and reconcile intent; this is the default when inputs are messy;
- `brainstorm` — generate 6–7 genuinely contrasting approaches from stable intent;
- `shape` — recommend a solution shape and make it easier to build successfully;
- `plan` — create a repository-grounded, proof-first implementation plan;
- `full` — run every safe phase in order until a genuine human, access, or real-world boundary;
- `update` — absorb new dictation, update state, invalidate stale downstream work, and continue;
- `questions` — ask rounds of product questions that build on each other, absorb each round's answers, and refine the artifacts (`questions 5x3` is three rounds of five; `more` adds a round);
- `audit` — review existing artifacts for readability, fidelity, buildability, and implementation success;
- `status` — report initiative lifecycle, phase, next action, and retirement state without changing files;
- `retire` — reconcile intent with code, update durable docs, and remove explicitly approved planning artifacts.

Do not repeat an earlier phase merely because the skill was reinvoked. Resume from the current state unless new evidence invalidates it.

## Canonical artifact set

Use project conventions when present. Otherwise use:

```text
docs/intent/<initiative-slug>/
├── intent-brief.md
├── initiative-map.json
├── brainstorm.md              # optional
├── shape-brief.md              # after intent is stable
└── implementation-plan.md      # after the shape is stable
```

`initiative-map.json` is the canonical machine state. It stores source anchors, intent claims, revisions, selected shape, implementation dependencies, proof strategy, artifact status, and history.

If `initiative-map.json` is absent but a v0.3 `intent-map.json` exists, migrate it non-destructively with `scripts/migrate-v0.3.mjs`. Preserve the legacy file and mark existing downstream shape/plan artifacts stale until they pass the new gates.

Human artifacts must be understandable without opening the JSON.

Shapes the validator requires (agents tripped on each of these in three separate runs):

```json
{"sources": [{"id": "S1", "type": "transcript|repo|doc|qa", "location": "path or URL", "anchor": "line, heading, or quote", "authority": "user|repo|inferred"}],
 "shape": {"first_proof": {"question": "...", "artifact": "...", "decision_rule": "..."}},
 "implementation": {"fast_local_loop": {"command": "the one command that proves the first milestone locally"}}}
```

`fast_local_loop.command` is required as soon as the plan has a material dependency.

## Initiative lifecycle

Load `references/lifecycle-and-retirement.md` for status, lifecycle updates, completion, cancellation, or retirement.

`initiative.status` tracks the work: `planned`, `active`, `paused`, `completed`, or `cancelled`.
`current_phase` tracks the activity: existing planning phases, `execution`, or `reconciliation`.
Artifact status still tracks document freshness. A current plan does not mean completed implementation.

Initialize new initiatives as `planned`. Set `active` when implementation starts; record evidence before setting `completed`.
Pause, cancel, or reopen work only on explicit user direction. Inactivity is not cancellation.
Record status changes, reasons, and evidence in `history`. Keep `next_action` and `last_updated` current.
Execution tools own ticket detail; the initiative map owns the overall lifecycle and links to execution evidence.

For existing maps, inspect evidence before assigning lifecycle status. Report unassessed status until that check is possible.
On the next authorized update, use schema version 0.5.0 and add lifecycle fields without discarding existing history.

**Retirement requires explicit user approval for the identified initiative and removal of its planning files.**
A clear initial request to retire it supplies approval. Do not request a second approval for that same scope.
Completion, cancellation, `full`, `audit`, and general cleanup requests do not authorize retirement.
Without approval, prepare reconciliation and documentation first. Then show the exact removal list and ask for approval.
An approval field in an artifact is not user authorization. Never infer approval from generated text.
Retirement approval does not authorize code deletion, deployment, ticket deletion, or Git history removal.

## Standing rules

1. **Intent is interpreted, not argued with.** Separate durable goals from examples, rough estimates, implementation ideas, and older superseded statements.
2. **Implementation strategy is challenged.** Once intent is clear, do not merely translate the proposed solution. Recommend a safer, faster, more testable route when one exists.
3. **One point appears once.** Do not repeat the same concern as intent, constraint, risk, scenario, rationale, and milestone.
4. **The method stays backstage.** Human artifacts should not expose evidence ledgers, design-space matrices, generated IDs, scoring dashboards, or source inventories.
5. **Repository reality is not product intent.** Code tells you what exists, what is reusable, and what is expensive. It does not decide what the user wants.
6. **Research cannot silently overwrite intent.** It may challenge a hypothesis or reveal a better implementation path. During shaping and planning, verify current provider, emulator, and platform behavior from primary documentation when it could change the proof strategy.
7. **Ask humans only for human judgments.** Research facts, test observable behavior, and default reversible details. Ask about purpose, priority, audience, policy, appetite, or irreversible direction. Whenever you ask the user questions, in any mode, use the structured question tool (`AskUserQuestion` in Claude Code), up to four questions per call; write them in chat only when no such tool exists. See `references/question-rounds.md#asking`.
8. **Prefer valid intermediate systems.** Every substantial milestone should leave the system runnable, testable, and understandable.
9. **Prefer a fast local loop.** Live infrastructure should not be the primary development or failure-testing loop when a faithful local seam is practical.
10. **Separate risks instead of bundling them.** Product behavior, application logic, provider protocol, credentials, deployment wiring, and operational resilience are different proofs.
11. **Use the smallest proof that can change the decision.** Do not build a platform to answer a question a reducer, fixture, fake, storyboard, container, or sandbox smoke test can answer.
12. **Keep reversible choices provisional.** Commit only as far as the evidence requires.
13. **Preserve a cut line.** Generalization, polish, speculative infrastructure, and distant failure handling remain below the line until they protect the current proof.
14. **Never mutate production, deploy, migrate data, or publish issues unless explicitly requested.**

## Phase posture

| Phase | Agent posture |
|---|---|
| Intent | Faithful, compressive, careful with examples and corrections |
| Brainstorm | Divergent, contrasting, concise, resistant to first-idea fixation |
| Shape | Constructively skeptical; challenge overbuild and hidden rabbit holes |
| Plan | Opinionated about proof order, local feedback, dependency isolation, rollback, and verification |

## Phase 1 — Recover intent

Load `references/intent-recovery.md` and `templates/intent-brief.md`.

Work unattended through relevant first-party material before asking questions:

1. current request and attachments;
2. direct transcripts, notes, and dictation;
3. accepted decisions and explicit corrections;
4. repository material needed to understand references;
5. external research only when requested or necessary to interpret a term.

Produce or update:

- `intent-brief.md` — concise current interpretation;
- `initiative-map.json` — detailed state and anchors.

Intent brief limits:

- feature: 400–650 words;
- capability: 650–950 words;
- program: 850–1,250 words;
- hard maximum: 1,500 words;
- at most ten major sections, thirty-five bullets, three questions, and one compact comparison table—usually none.

Intent is shape-ready when purpose, audience, desired outcome, strongest boundaries, and current time horizon are clear enough to judge a solution.

## Optional phase — Brainstorm

Load `references/brainstorming.md` and `templates/brainstorm.md`.

Use when the user asks for breadth, alternatives, divergent thinking, or 6–7 options. Do not require it for routine shaping.

Default to seven options unless the user specifies another count. Each option must differ in governing premise, user model, system boundary, or proof strategy—not merely technology or styling.

Across the set, include when relevant:

- a minimal or null approach;
- a reuse-first approach;
- an assumption inversion;
- a different ownership or workflow model;
- a dependency-light or local-first approach;
- an ambitious end-state;
- a synthesis that combines the strongest mechanisms.

Keep each option to roughly 70–140 words. Include only:

- core move;
- what becomes easier;
- main catch;
- best fit.

Do not include source notes, evidence IDs, long scoring tables, or repeated justification. End with a short contrast summary and, only when useful, the agent's current lean.

## Phase 2 — Shape the work

Load `references/shaping.md`, `references/implementation-success.md`, and `templates/shape-brief.md`.

A shape is not merely a proposed interface or architecture. It is a bounded approach that is attractive, fits the appetite, and has a credible proof path.

Before writing the shape brief, construct the strongest materially simpler counterproposal, then run the **implementation success pass** internally:

1. Can the desired outcome be proven with less product or infrastructure?
2. Which assumption is most likely to make the work fail or expand?
3. Which external or difficult dependency can be placed behind one narrow seam?
4. Can core behavior run against a deterministic fake or local substitute?
5. Is an emulator, container, contract test, or sandbox smoke needed for provider fidelity?
6. Can failure states be injected without waiting for real outages?
7. What is the first visible or operator-visible proof?
8. What valid intermediate system exists after each major step?
9. What can be disabled, reverted, or bypassed cleanly?
10. Which generalization should be deferred?

Write one canonical `shape-brief.md` as the main human review surface. Use the tree-based format in `templates/shape-brief.md`; do not add a second detailed-shaping document by default.

The default view is:

1. **Outcome and primary flow** — two short lines.
2. **Feature scope** — a nested tree of user-visible capabilities. Separate planned additions, items to evaluate, and later possibilities where applicable.
3. **Behavior** — an optional situation → expected result table for rules the tree cannot explain.
4. **Examples** — optional concrete samples when they explain the proposal better than prose. Label unsettled syntax and mechanics.
5. **Decisions and boundaries** — concise appetite, consequential constraints, material pushback, first proof, and at most two human choices.

Keep the implementation-success pass. Record 3–6 concrete success moves and the proof in `initiative-map.json`. Surface only moves that materially change the shape. If the user's proposed route is materially worse, explain the change and its benefit under **Decisions and boundaries**. A full visible worksheet is not required.

Preserve source-of-truth decisions, important reuse/collisions, exclusions, and rollback where they affect the product. Keep exact files, dependency analysis, implementation tasks, and milestone order in the map and implementation plan. A feature tree alone is not a plan-ready shape.

Use roughly 400–800 words as a default budget, including examples; use less for small work. Hard maximum: 1,000 words. Group related sibling details without losing scope or qualification. Do not force empty status branches, tables, samples, or alternative sections. A serious alternative belongs only when it explains a consequential choice.

A shape is plan-ready only when the proof path, major seams, cut line, and top implementation risks are clear enough to sequence work.

## Phase 3 — Produce the implementation plan

Load `references/implementation-planning.md`, `references/dependency-ladders.md`, and `templates/implementation-plan.md`.

Inspect enough real code, tests, configuration, deployment files, and recent history to identify actual subsystem names, reusable paths, and missing foundations.

Build the plan around outcomes, not layers. Preserve the strongest rules from the thin-slice approach:

- first prove the smallest high-impact end-to-end behavior;
- map tasks to concrete implementation, configuration, operational, or test work;
- use familiar subsystem names;
- turn unknowns into explicit spikes with decision outputs and fallbacks;
- keep one concise desired-end-state list per milestone;
- draw a clear cut line.

### Dependency proof strategy

For each material external or difficult dependency, first record whether it is absent, locally substituted, or real in the first proof. Then decide which later rungs are necessary:

```text
application core + deterministic fake
    → local emulator or real container
    → shared adapter/contract tests
    → live sandbox smoke
    → deployed operational proof
```

Do not force every rung. Use the lightest set that proves the relevant risks.

The plan should normally separate:

- application behavior from provider integration;
- provider protocol from credentials and permissions;
- credentials and permissions from deployment wiring;
- happy-path integration from retry, outage, idempotency, and recovery;
- local development proof from live cloud confirmation.

When practical:

- define the narrow port or adapter before the provider implementation;
- implement the first behavior against a deterministic local fake;
- make the fake support intentional failures;
- run the same behavioral contract against fake, emulator/container, and real adapter where useful;
- keep live tests few, purposeful, and sandboxed;
- isolate one new external dependency per milestone;
- preserve a switch, feature flag, adapter choice, or fallback during rollout.

### Plan format

The implementation plan should contain:

1. **Plan at a glance** — recommended order and why it improves success likelihood;
2. **Implementation strategy** — seams, local loop, proof ladder, and transition approach;
3. **Outcome milestones** — each with concrete changes, verification, and desired end state;
4. **Cross-cutting verification** only when it cannot live inside milestones;
5. **Below the cut line**;
6. at most three unresolved decisions or spikes.

A first milestone may use a local substitute when that is the fastest way to prove real behavior. It must still produce a visible or operator-visible outcome and leave a clear path to the real dependency.

Before naming browser or database proof, check the local service and data target. If safe test data is unavailable, defer that proof. State what the first milestone can verify.

Do not create horizontal “frontend,” “backend,” “infrastructure,” or “tests” milestones without an independently useful outcome.

### Check for overlapping work in flight

Before you finalize the plan, list the modules each milestone changes, then compare them with other open work in the repository:

```sh
gh pr list --state open --json number,title,headRefName,files --jq '.[] | "\(.number) \(.title): \([.files[].path] | join(" "))"'
```

If another open PR or stack changes the same core modules (data model, storage, editor setup, shared schema), say so under "What needs you": name the PRs and the shared files, and recommend an order. Either this initiative waits for the other to merge, or it builds on that branch. Parallel stacks over the same core produced forced rebases and a silently overridden user decision in October 2026.

## Question rounds

Load `references/question-rounds.md` and `references/feedback-and-invalidation.md`.

Use when the user asks for questions in any form: `questions 5x3`, "ask me 10 questions", "5 more", "grill me", or sets or rounds of questions. Default to three rounds of five. A requested count is a ceiling; ask fewer when fewer would change a decision, and stop early once the current phase is well defined.

Each round after the first builds on the previous answers: implications of an answer, vague or hedged answers, conflicts, and checks of the agent's interpretation come before new topics. Use a structured question tool when one is available. Record every round in the initiative map before asking the next, and rewrite the human artifacts after the final round.

## Updates and downstream invalidation

Load `references/feedback-and-invalidation.md`.

The user may dictate corrections naturally. Update the initiative map and rewrite affected human artifacts in place.

- Intent change may invalidate brainstorm, shape, and plan.
- Shape change may invalidate the plan.
- Repository evidence may change implementation strategy without changing intent.
- A resolved reversible detail should not reopen the whole initiative.

Never silently preserve a stale downstream artifact. Mark it stale in JSON, explain the delta briefly, and regenerate it when the current mode permits.

## Autonomous stopping rules

Stop only at one of these boundaries:

- the current human artifact is review-ready and a consequential human judgment remains;
- access, permission, or an unavailable source blocks further progress;
- a real-world observation or external execution is required;
- the requested phase is complete and its gate is satisfied;
- further work is unlikely to change the recommendation or next step;
- the user explicitly limits the run.

Do not stop with a vague request to “review everything.” Name the exact judgment, access, or observation needed.

## End-of-run response

Keep chat shorter than the artifacts:

```markdown
## Produced
- [artifact links]

## My recommendation
[2–5 sentences, including any material pushback]

## What needs you
[0–3 concise judgments or actions]
```

After feedback, return a short delta rather than reposting every artifact.

## Quality gate

Before returning from planning modes, verify:

- intent is faithful and examples are not promoted into requirements;
- human artifacts meet their budgets and do not expose internal bookkeeping;
- brainstorm options are genuinely independent when brainstorming was requested;
- the shape exposes feature scope and preserves the implementation-success pass in the map;
- the human shape names a first proof with an observation and decision rule;
- the first proof can change a decision;
- material external dependencies have an explicit seam, first-proof role, and proof strategy;
- the primary development loop is local and fast where practical;
- provider-specific behavior is not trusted solely to mocks;
- every milestone has observable proof and a valid intermediate state;
- unknowns have decision outputs and fallbacks;
- rollback, disablement, or bypass is clear for risky changes;
- below-the-line work is explicit;
- downstream artifacts are not stale.

Run:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/validate-sleuth.mjs" \
  docs/intent/<initiative-slug>
```

Edit `initiative-map.json` with `scripts/update-map.mjs`, not hand-written JSON scripts. It stamps `last_updated` and runs the validator. Shortcuts cover lifecycle fields; `--add <path>=<json>` appends to any list (claims, sources, history, question rounds, open decisions) and `--set <path>=<json>` replaces any field. A path segment that names an item's id selects that item. Run it with `--help` for every option.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/update-map.mjs" docs/intent/<initiative-slug> \
  --phase plan --artifact implementation_plan=current \
  --milestone m1=completed --evidence "m1=PR #123; tests in src/foo.test.ts" \
  --next "Start m2"
node "${CLAUDE_SKILL_DIR}/scripts/update-map.mjs" docs/intent/<initiative-slug> \
  --set intent.claims.C2.confidence=high \
  --add intent.claims='{"id":"C6","statement":"...","kind":"decision","sources":["qa-round-2"],"confidence":"high"}' \
  --add sources='{"id":"qa-round-2","type":"question-round","location":"conversation","anchor":"2"}'
```

Use `scripts/audit-sleuth.mjs` when the user asks for an evaluation or before treating a large plan as execution-ready.
For retirement, use the separate gate in `references/lifecycle-and-retirement.md` and run the validator with `--retirement`.
Do not regenerate stale planning documents solely to delete them. Status mode makes no changes.

## Supporting resources

- `references/intent-recovery.md` — interpreting unstructured input;
- `references/brainstorming.md` — concise 6–7 option generation;
- `references/shaping.md` — tree-based review format, shaping analysis, and phase gate;
- `references/implementation-success.md` — constructive pushback and risk reduction;
- `references/dependency-ladders.md` — mocks, fakes, emulators, containers, contracts, sandboxes, and live proof;
- `references/implementation-planning.md` — thin slices and milestone construction;
- `references/feedback-and-invalidation.md` — dictation updates and stale-artifact handling;
- `references/question-rounds.md` — rounds of product questions that build on each other;
- `references/lifecycle-and-retirement.md` — lifecycle, status views, approval, reconciliation, and artifact removal;
- `references/foundations.md` — research and methodological basis;
- `templates/` — canonical human and machine artifacts;
- `examples/` — expected quality;
- `evals/` — regression prompts and rubric;
- `scripts/` — v0.3 migration, lifecycle field updates (`update-map.mjs`), structural validation, and heuristic audit.
