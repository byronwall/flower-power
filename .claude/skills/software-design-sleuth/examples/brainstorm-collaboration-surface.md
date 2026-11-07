---
title: "Collaboration for an existing modeling tool — contrasting approaches"
slug: "modeling-collaboration"
phase: brainstorm
status: example
last_updated: "2026-08-11"
---

# Collaboration for an existing modeling tool — contrasting approaches

Every option lets several people contribute to the same modeling work without losing authorship, rationale, or recoverability. The options deliberately vary the unit of collaboration rather than merely changing UI treatment.

## Option 1 — Review-only annotations

**Core move:** Leave the underlying model single-writer. Other people attach comments, suggestions, and approval states to stable model locations. The owner applies accepted changes through the existing edit path.

- **Makes easier:** Fast delivery, compatibility, and clear authority.
- **Main catch:** Collaboration remains indirect and can create an application bottleneck.
- **Best fit:** The immediate need is review and sign-off rather than simultaneous construction.

## Option 2 — Proposed changes as first-class objects

**Core move:** Collaborators create structured change proposals against a known model revision. The system previews impact and applies accepted proposals through one merge path.

- **Makes easier:** Auditability, asynchronous work, rollback, and agent participation.
- **Main catch:** Conflict detection and proposal rebasing become real product concepts.
- **Best fit:** Changes are consequential and should be reviewed before becoming authoritative.

## Option 3 — Shared live editing

**Core move:** Several users edit the same model directly with presence, selections, and near-real-time synchronization. Conflicts are resolved continuously rather than through explicit proposals.

- **Makes easier:** Fast co-creation and pair-modeling sessions.
- **Main catch:** Highest implementation and operational complexity; domain edits may not merge cleanly like text.
- **Best fit:** Teams frequently work together at the same time and immediate collaboration is central to the product.

## Option 4 — Session ownership with handoff

**Core move:** One person owns the editable session at a time. Others can observe, queue requests, or take ownership through an explicit handoff. The session records decisions and checkpoints.

- **Makes easier:** Reuse of the current editing architecture and avoidance of merge semantics.
- **Main catch:** Less fluid than true collaboration and can feel procedural.
- **Best fit:** Synchronous workshops matter, but unrestricted concurrent mutation does not.

## Option 5 — Branch-and-merge workspaces

**Core move:** Each collaborator or workstream edits an isolated branch of the model. The product provides comparison, selective merge, and a named integration branch.

- **Makes easier:** Independent exploration, experiments, and long-running alternatives.
- **Main catch:** Users must understand branches and resolve semantic conflicts.
- **Best fit:** Work naturally divides into larger independent changes and alternatives are valuable.

## Option 6 — Agent-mediated collaboration

**Core move:** People continue contributing through notes, comments, transcripts, and existing edits. An agent turns those inputs into proposed model deltas, highlights conflicts, and asks for focused decisions.

- **Makes easier:** Asynchronous participation and integration of unstructured feedback.
- **Main catch:** Trust and review quality become the central interaction; it is not direct human co-editing.
- **Best fit:** Contributors provide rich context but do not all need to manipulate the model directly.

## Option 7 — Progressive collaboration ladder

**Core move:** Start with annotations and structured proposals. Add session handoff next. Introduce branch or live-edit behavior only where usage proves that review-oriented collaboration is insufficient.

- **Makes easier:** Early value, measurable demand, and preservation of the existing editor.
- **Main catch:** The first release intentionally leaves some high-energy collaboration scenarios unsolved.
- **Best fit:** The desired collaboration outcome is clear, but the dominant collaboration pattern is not yet proven.

## Strongest contrasts

- Suggestions versus direct authority over the shared model.
- Explicit merge points versus continuous synchronization.
- Human-authored edits versus agent-produced deltas from unstructured input.

## My current lean

Begin with Option 7, using Option 2 as the durable core. Structured proposals create a useful collaboration object that can later be produced by comments, branches, live sessions, or agents without forcing the first release to solve every synchronization problem.
