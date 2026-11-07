# Changelog

## 0.7.2 — Required map shapes and overlap check

- SKILL.md lists the source, `first_proof`, and `fast_local_loop` shapes the validator requires, after three runs failed on them.
- Phase 3 compares the plan's modules with open PRs and asks the user to order initiatives that share core files.

## 0.7.1 — Map edits without scripts

- `update-map.mjs` gains `--add <path>=<json>` (append to any list, merging an item whose id exists) and `--set <path>=<json>` (replace any field), with id-based path segments, `--no-validate`, and a `--help` that no longer crashes.
- Standing rule 7 now says to use the structured question tool whenever the skill asks the user questions, not only in `questions` mode.

## 0.7.0 — Question rounds

- Add `questions` mode: rounds of product questions that build on each other (`questions 5x3`, "ask me 10 questions", `more`).
- Later rounds ask first about implications, hedged answers, conflicts, and the agent's own interpretations before new topics.
- Use a structured question tool when available, in batches of four; otherwise number questions continuously across rounds.
- Record each round in an optional `question_rounds` map object and as a source; rewrite human artifacts after the final round.
- Add `references/question-rounds.md`, a schema entry, a validator check, and an eval prompt.

## 0.6.1 — Faster map updates and clearer validation

- Add `scripts/update-map.mjs` for phase, status, next action, artifact status, and milestone status and evidence; it stamps `last_updated` and runs the validator.
- Validator errors name the allowed milestone statuses, every missing milestone field, the `first_proof` shape, and the template to copy missing sections from.
- A missing shape section no longer also reports each check inside it.
- Document the milestone record in `references/implementation-planning.md`.

## 0.6.0 — Tree-based shaping

- Replace the prose shape layout with a scope tree and compact behavior/decision view.
- Keep optional samples within a 400–800 word default budget; cap shapes at 1,000 words.
- Preserve the internal success pass and visible Try/Observe/Decide first proof.
- Update the template, checks, audit, AWS example, and regression guidance.
- Keep initiative-map schema 0.5.0 and its existing proof fields.

## 0.5.0 — Lifecycle and retirement

- Added initiative lifecycle and read-only `status` mode.
- Added explicit-approval `retire` mode, intent-to-code reconciliation, durable documentation, and compact closure history.
- A clear initial retirement request supplies approval; completion and cancellation do not.
- Added structural closure checks and retirement regression coverage.
- Kept existing initiative lifecycle unassessed until repository evidence is inspected.

## 0.4.0 — Intent to Proof

### Added

- Integrated `intent`, optional `brainstorm`, `shape`, `plan`, `full`, `update`, and `audit` modes.
- One canonical `initiative-map.json` spanning all phases.
- Concise seven-option brainstorming format.
- Mandatory **How to make this go better** section for material work.
- Implementation-success challenge focused on smaller proof, fast local loops, narrow seams, failure injection, valid intermediate systems, and rollback.
- Dependency proof ladder covering deterministic fakes, mocks, emulators/containers, contract tests, live sandboxes, and deployed proof.
- Proof-first implementation plan format derived from thin vertical-slice principles.
- Automatic downstream invalidation after intent, shape, or repository changes.
- Non-destructive v0.3 `intent-map.json` migration.
- Structural validator and heuristic 0–10 audit.
- Full AWS SSM/Secrets Manager example and regression test.
- Concise seven-option product brainstorming example.

### Changed

- The skill now becomes more opinionated as it moves from intent interpretation to implementation strategy.
- `shape-brief.md` is a first-class canonical artifact rather than an informal continuation.
- The implementation plan owns planning quality directly; a separate task-list skill is no longer required to get proof-first milestones.
- Repository facts and external research stay in the JSON sidecar unless they materially change the human recommendation.

### Preserved from 0.3

- Concise intent brief.
- Detailed machine-readable intent map.
- Source authority and supersession discipline.
- Plain-language human frontier.
- Strong readability limits and no evidence-ledger output.

### Intentionally not integrated

- Personal daily-file locations.
- Worktree naming conventions.
- Automatic Linear publication and comment synchronization.

Those remain appropriate for a personal execution/publication skill after the portable implementation plan is approved.
