---
name: consider-contrast
description: Compare multiple viable approaches before an agent makes a meaningful decision. Score the options from 0 to 10 only on dimensions that are specific and relevant to the task domain, then select the best option or design a stronger hybrid. Use when the user invokes `$consider-contrast`, asks to consider and contrast alternatives, wants to avoid tunnel vision, or wants a decision checkpoint inside a larger investigation, plan, design, or implementation task. Keep this as a proportional inline step unless the user asks for a full decision report.
---

# Consider and Contrast

Use a short decision checkpoint inside the current task. Do not turn it into the full deliverable unless requested.

## Hard Rule for Dimensions

Use only dimensions grounded in the user's request or established domain success criteria. Do not infer generic process goals. When relevance is uncertain, omit the dimension. A short domain-specific comparison is better than a complete-looking scorecard.

Before output, remove any generic scoring column such as cost, speed, time, complexity, ease, risk, flexibility, reversibility, maintenance, or interpretability. Keep one only when the user or source context makes that concern decision-critical. Rename it to its concrete domain effect or measurement.

Examples:

- For overlapping tree-crown segmentation, use touching-crown merge rate, single-crown split rate, boundary F1, and occlusion robustness. Do not add cost or time-to-result without an explicit constraint.
- For a database migration, use lock duration, recovery-point exposure, replication lag, and rollback fidelity when those factors control the decision.

## Compare

1. State the decision in one sentence.
2. Identify two to four genuinely different approaches. Include the status quo or a minimal option when it is viable.
3. Derive dimensions only from the task's desired outcomes, hard constraints, domain failure modes, evidence, and operating context. Use no target count. Never add a dimension to make the comparison look complete.
4. Apply this gate to every proposed dimension. Reject the dimension if any answer is no:
   - **Relevant:** Can you identify the task fact, requirement, constraint, or domain failure mode that makes it matter?
   - **Specific:** Does its label name an observable domain outcome, measurement, resource unit, burden, or failure mode?
   - **Discriminating:** Can the approaches differ enough on it to affect the choice?
   - **Distinct:** Does it add information that another dimension does not already cover?
5. If a label could move unchanged into an unrelated decision, rename it to the specific domain effect or remove it.
6. Treat general agent preferences as irrelevant unless the user or source context states them. Do not infer that faster, cheaper, simpler, safer, more reversible, or easier to explain is decision-critical.
7. Score each option from 0 to 10 on each dimension. State what 0 and 10 mean when the scale is not clear.
8. Add one short reason for each score. Mark assumptions and evidence gaps.
9. Weight dimensions only when some are materially more important. Do not use false precision.
10. Choose the best option or build a specific hybrid from the strongest parts. Explain the decisive tradeoff.
11. Continue the parent task with that choice. Do not stop after the comparison unless the choice requires user input.

Use a compact table by default:

| Approach | Domain outcome | Domain failure mode | Domain constraint | Main tradeoff |
| --- | ---: | ---: | ---: | --- |
| A | 0–10 | 0–10 | 0–10 | Short reason |

After the table, give a short decision:

- **Choice:** State the option or hybrid.
- **Why:** Name the dimensions that decide it.
- **Watch:** Name the largest risk or assumption.
- **Next:** State the immediate action in the parent task.

## Keep It Proportional

- For a local, reversible choice, use two or three options and a small table.
- For a costly or hard-to-reverse choice, add evidence, weights, sensitivity checks, or a small experiment.
- Do not invent alternatives only to reach a fixed count.
- Do not create a balanced scorecard from stock dimensions. Omit cost, speed, risk, complexity, ease, flexibility, interpretability, and similar concerns unless the task makes them decision-critical.
- When the request lacks business or workflow constraints, score only domain outcomes and domain failure modes. List missing constraints as evidence gaps, not invented dimensions.
- Do not use a generic label for a relevant concern. Replace `speed` with the operation or latency that matters. Replace `risk` with the concrete failure mode. Replace `complexity` with the actual integration, calibration, or operating burden. Replace `interpretability` with the exact decision or failure that must be explained.
- Name dimensions in domain terms.
- Do not average scores when a hard constraint disqualifies an option.
- Do not let a hybrid become an unbounded list of every desirable feature.
- Do not score before confirming the options address the same decision.

## Inline Invocation Examples

- `Use $consider-contrast for the storage choice, then continue the implementation.`
- `Before you pick an architecture, use $consider-contrast inline.`
- `Apply $consider-contrast to the risky decision in this plan.`
