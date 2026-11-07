# Feedback and downstream invalidation

Use this file whenever the user provides dictation, comments, corrections, or new repository evidence after artifacts exist.

## Parse feedback semantically

Preserve qualifiers such as:

- definitely;
- for now;
- eventually;
- I am leaning toward;
- maybe;
- that was only an example;
- I do not care how;
- not that;
- use your recommendation;
- keep researching.

Update the underlying claim strength and time horizon rather than copying the sentence into a notes section.

## Invalidation rules

### Intent change

Examples:

- target user changes;
- required outcome changes;
- a mechanism becomes mandatory or is rejected;
- first-release horizon changes;
- a policy decision reverses.

Action:

- update intent brief and JSON;
- mark brainstorm, shape, and plan stale when affected;
- regenerate only the affected artifacts permitted by the current mode.

### Shape change

Examples:

- source of truth changes;
- selected concept changes;
- external dependency is added or removed;
- appetite changes materially;
- first proof changes.

Action:

- preserve intent;
- update shape brief;
- mark implementation plan stale;
- re-run implementation-success and dependency analysis.

### Repository discovery

Examples:

- an existing reusable adapter is found;
- the assumed test harness does not exist;
- deployment restrictions invalidate the proposed seam;
- another worktree already contains part of the change.

Action:

- update current reality and plan strategy;
- change the intent only when the user explicitly treats repository constraints as product requirements.

## User-facing delta

After feedback, respond with a short summary:

```markdown
## Updated
- Promoted ... from possibility to first-release requirement.
- Replaced ... with ... in the shape.
- Marked the implementation plan stale because ...

## Next
- Regenerate the plan with the new dependency boundary.
```

Do not repost the complete brief in chat.

## Lifecycle and closure

Artifact invalidation changes freshness, not initiative lifecycle. Keep status separate from planning phases.
Do not reopen completed or cancelled work without explicit user direction.
For lifecycle updates or retirement, load `lifecycle-and-retirement.md`.
Retirement reconciles stale plans against code; it does not require regenerating obsolete plans.
