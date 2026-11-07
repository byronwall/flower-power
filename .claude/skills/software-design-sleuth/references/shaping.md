# Shaping after intent

Use this file for `shape`, `full`, or `update` when intent is stable enough to judge a solution.

## Shape objective

A shape answers:

- What problem are we solving now?
- How much work is it worth?
- What is the recommended product and system shape?
- Where does it fit in the current system?
- What is most likely to make it fail or expand?
- What is the cheapest meaningful proof?
- What is deliberately out of scope?

It is not a detailed design document or implementation backlog.

## Shape sequence

1. Restate the problem without embedding the implementation.
2. Set an appetite or at least a relative size boundary.
3. Inspect the current system only enough to identify reusable paths and collisions.
4. Sketch the essential places, actions, data movement, and boundaries.
5. Construct and test the strongest dependency-light or smaller counterproposal.
6. Run the implementation-success challenge.
7. Amend the shape to remove or isolate rabbit holes.
8. Choose the first proof.
9. Write the concise shape brief.

## Analysis and presentation

Keep the source-of-truth decision, seam to current behavior, valid intermediate state, rollback path, and first proof in the shaping analysis. Record 3–6 implementation-success moves in the initiative map. These gates remain active even when the human document is short.

The main human surface is one `shape-brief.md`, not a prose brief plus a second feature document. Follow the template:

- Outcome and primary flow: two short lines.
- Feature scope: nested user-visible capabilities.
- Behavior: optional table of situations and expected results.
- Examples: optional concrete samples, with unconfirmed choices labeled.
- Decisions and boundaries: appetite, consequential constraints, material pushback, first proof, and at most two open human choices.

Use roughly 400–800 words, including samples, with a 1,000-word hard maximum. Do not pad a small feature to reach the target. The tree should be easy to scan without requiring a second prose description of each branch.

## Tree rules

Group scope by planned additions, evaluation candidates, and later possibilities when those distinctions exist. Omit empty groups. Do not imply that proposed features already exist or that a candidate is a commitment.

Use two to four useful levels of nesting. Group sibling details on one line when they share meaning. Keep qualifiers such as optional, off by default, and shared across facets beside the relevant feature. Identify existing features only when they clarify the change.

Put settings, outputs, and user actions in the tree. Put interaction and failure rules in the behavior table. Put implementation files, tasks, provider proof ladders, and milestone order in the map or plan. A service initiative may use operator capabilities rather than screen features.

## Preserve the decisions

Keep the implementation-success challenge internal and retain its evidence in the map. Surface only recommendations that change the selected shape, with their concrete benefit. Do not require three repeated recommendations in the human artifact.

The closing section must expose a first proof: **Try → Observe → Decide**. It must name a small meaningful slice, observable evidence, and a decision rule. A feature inventory with no proof is not a completed shape.

Keep appetite and exclusions concise. Include ownership, reuse collisions, and rollback when they materially affect what the user gets. Include a serious alternative only when it explains a consequential tradeoff. Unknown product choices stay explicit; examples cannot settle them silently.

## Rabbit-hole categories

Look specifically for:

- uncertain third-party behavior;
- missing local development path;
- unclear state ownership;
- migration or compatibility;
- permissions and security;
- retries, idempotency, and partial failure;
- slow feedback caused by deployment-only testing;
- broad generalization before one representative path works;
- several new dependencies introduced together;
- UX that depends on an unproven backend model.

## Shape gate

Do not proceed to a detailed plan when:

- the intended outcome is still contested;
- the recommended shape has no credible first proof;
- a provider or migration risk has no isolation seam;
- the first usable intermediate state is unknown;
- the shape exceeds the appetite with no meaningful cut;
- a human policy or product decision materially changes the architecture.

Create a focused spike or ask one high-leverage question instead.
