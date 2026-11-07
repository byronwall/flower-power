# Evaluation rubric

Score each dimension from 0 to 10. Use the attached inputs and repository as ground truth. A polished document should not score highly when it misreads intent or creates an implementation-hostile plan.

| Dimension | 10/10 behavior | Common failure |
|---|---|---|
| Intent fidelity | Durable goals, audience, boundaries, corrections, and horizons are recovered accurately; examples remain examples | Promotes vivid mechanics or repository structure into requirements |
| Human readability | Briefs are concise, plain-language, non-repetitive, and easy to correct | Exposes source ledgers, IDs, matrices, or methodology jargon |
| State continuity | JSON preserves exact anchors, claim strength, revisions, artifact status, and history | Downstream artifacts remain silently stale |
| Brainstorm diversity | 6–7 coherent options differ in premise, ownership, workflow, boundary, or proof strategy | Cosmetic, framework-only, or minor feature variants |
| Shape quality | Exposes additions in a concise scope tree, keeps commitments distinct, and preserves appetite, first proof, boundaries, and material pushback | Restates the user's implementation idea without improving it |
| Implementation-success challenge | Finds a cheaper proof, faster loop, narrower seam, and lower-risk sequence | Accepts deployment-first or infrastructure-first work |
| Repository grounding | Uses real subsystem names, stable paths, tests, configuration, and deployment constraints | Generic plan or speculative exact file list |
| Dependency isolation | Material dependencies have narrow seams and are introduced separately where practical | Several providers, migrations, and domain changes arrive in one slice |
| Local feedback loop | One reproducible fast command exercises core behavior and deliberate failures | Routine development requires deployment or shared infrastructure |
| Fidelity ladder | Fakes, containers/emulators, contracts, sandboxes, and deployed tests prove only the properties they can represent | Mocks are treated as provider proof, or live tests replace all local tests |
| Vertical slicing | First milestone proves real value; every milestone leaves a valid runnable system | Frontend/backend/infrastructure/testing phases |
| Verification | Proof is observable, specific, and colocated with each milestone | “Add tests” or vague acceptance criteria |
| Reversibility | Flags, adapter selection, fallback, prior revisions, or safe migration preserve rollback | New path becomes authoritative before observation |
| Scope discipline | Generalization, polish, and speculative infrastructure remain below the cut line | Builds a platform before one representative path works |
| Human frontier | Only purpose, priority, appetite, policy, or irreversible choices reach the user | Asks the user to decide facts or behavior a probe can answer |

## Critical failures

Treat any of these as a major regression even when the prose is strong:

- intent brief exceeds the hard limit or exposes an evidence ledger;
- brainstorm options share one governing premise;
- shape is only a feature inventory, with no visible observation and decision rule for its first proof;
- a proposed example silently becomes a committed feature;
- implementation-success analysis disappears from the map when the human shape becomes shorter;
- a material dependency has no local proof strategy;
- the first implementation milestone is scaffolding only;
- the plan makes live cloud or deployment the normal failure-testing loop without justification;
- implementation plan is current while its shape is stale;
- user feedback changes intent but downstream artifacts are silently preserved.

## Suggested acceptance bar

- No critical failures.
- At least 8/10 on intent fidelity, readability, shape quality, dependency isolation, local feedback, vertical slicing, and reversibility.
- Overall average at least 8.5/10.
- The user can explain the recommendation and first proof after reading only the human artifacts.
