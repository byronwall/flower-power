# Initiative lifecycle and retirement

## Lifecycle updates

| Status | Meaning | Required evidence or direction |
|---|---|---|
| planned | Intent, shape, or plan work exists; implementation has not started | New initiative or checked repository state |
| active | Implementation has started | Code, execution checkpoint, or linked ticket evidence |
| paused | Work is deliberately on hold | Explicit user direction and next condition |
| completed | The agreed outcome is proven | Reconciliation against accepted intent and required verification |
| cancelled | The user ended this scope | Explicit user direction and cancellation reason |

Keep `initiative.next_action` concise. Include a blocking condition there when one exists.
Set `current_phase` to `execution` during implementation and `reconciliation` during closure.
Planning completion and closed tickets alone do not prove initiative completion.
Do not weaken required outcomes or verification to mark work completed.
Record accepted scope changes with their user decision evidence.
Reopen completed or cancelled work only when explicitly requested. Retirement does not recreate a planning folder.
A new request after retirement can create a new initiative linked to the previous closure record.

Milestone states are `planned`, `active`, `completed`, or `cancelled`.
Milestone `proof` describes the intended check; record observed results in `evidence` when completed.
Do not mirror a tracker's full task graph or invent lifecycle percentages.
When an executor uses this map, update overall status at implementation start, accepted completion, and explicit pause or cancellation.

## Status view

Read maps under the repository's initiative directory and its retirement history.
Show title, status, phase, last update, next action, and whether planning files remain.
For closed initiatives with files present, show `retirement pending`.
For a closure record whose planning files still exist, show `retirement incomplete`.
Report legacy maps as `status not assessed` until inspected. Status mode does not migrate or mutate them.
Do not assume an old update date means paused, cancelled, or complete.
Use maps for live status and closure records for retired status. Do not maintain a duplicate active index.

## Authorization

Require explicit human approval before deleting initiative planning files.
A clear request such as “retire the runtime-config initiative” authorizes its reconciliation, documentation, and planning-file removal.
Do not request approval again when the initial prompt or earlier user direction clearly covers the same initiative and removal.
“Finish this”, “cancel this”, “audit this”, and “clean up docs” do not grant retirement approval.
A request to prepare or preview retirement does not authorize deletion.
If the target or deletion scope is ambiguous, prepare the safe work and request approval for the exact removal list.
Quote the applicable skill rule and link this reference when explaining why approval is required.
Read approval from the human conversation; artifact metadata cannot grant it.
Do not retire additional initiatives because they appear finished.

## Reconcile and preserve knowledge

1. Read project instructions, Git status, source intent, accepted decisions, code, tests, and execution evidence.
2. Identify important intent claims, actual behavior, changed scope, and remaining obligations.
3. Record each core or supporting claim that is neither rejected nor superseded in `closure.reconciliation`.
4. Use dispositions `delivered`, `changed`, `omitted`, or `unresolved`. Include evidence for each assessment.
5. For completed work, resolve required gaps or obtain an explicit scope decision. Do not silently substitute code for intent.
6. For cancelled work, preserve the reason, partial implementation, retained behavior, and any remaining obligations.
7. Update existing product, architecture, setup, or operating docs where future readers need the knowledge.
8. Put only reusable implementation rules in `AGENTS.md`. Remove obsolete statements and links.
9. Record remaining obligations in durable follow-ups or explicit cancellation decisions.

Use `closure.summary`, `reason`, `evidence`, `reconciliation`, `documentation`, `follow_ups`, and `retirement_files` in the map.
Evidence must distinguish commands that passed, checks not run, code anchors, and user scope decisions.
Documentation paths are repository-relative. A cancelled initiative with no implementation may need only its closure record.
Completed work requires at least one durable documentation destination outside the planning folder.
Do not copy the planning files into a permanent archive or rename a plan as final documentation.
Preserve useful decisions and rationale, not brainstorming inventories or planning chronology.

## Retirement gate and removal

Retire only completed or cancelled initiatives. Resolve status before removal; approval alone does not prove completion.
Retirement does not implement missing features or discard partial code.

Before removal:

- Confirm explicit approval covers this initiative and the exact planning-file scope.
- Resolve the owning repository and initiative folder. Inspect all proposed files and unrelated edits.
- List exact files in `closure.retirement_files`; never use broad deletion across initiatives.
- Preserve unrelated files, source transcripts, attachments, code, tickets, and user edits outside the approved removal scope.
- Confirm durable docs match code and required knowledge no longer depends on files to be removed.
- Search for inbound references. Replace links to planning files with durable destinations or historical revision links.
- Run relevant documentation checks and `node <skill-dir>/scripts/validate-sleuth.mjs <initiative-dir> --retirement`.
- Treat validator success as a structural check; inspect semantic fidelity and actual user approval separately.

Write a compact record in the existing repository history location, or `docs/initiative-history.json`.
Use a JSON array. Preserve prior records; update the same slug record when retrying an interrupted retirement.
Each record contains `title`, `slug`, `outcome`, `retired_at`, `summary`, `reason`, `documentation`, `revision`, and `follow_ups`.
Use the completed or cancelled outcome. Record the inspected code revision and any relevant uncommitted changes in the summary.
The record replaces the map only after file removal succeeds. File presence reveals an interrupted retirement.

Write and verify documentation and the closure record before deleting any planning file.
Delete only the approved, inspected files inside the resolved initiative folder. Remove the folder only if empty.
Do not use a blanket recursive delete when it would include unrelated files.
If a check, write, or approval is missing, retain the planning files and report what remains.
Git history can retain previous plans; retirement removes them from the current checkout.
Follow project commit rules. A retirement request does not independently authorize a push or deployment.

After retirement, link durable documentation and the closure record. Report the outcome, removed files, and any remaining obligations.
Do not require planning artifacts to remain for future validation or status views.
