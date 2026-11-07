# Question rounds

Use this file for `questions` mode: rounds of product questions that put the user's knowledge into the initiative and check the agent's understanding. Each round builds on the answers to the last one.

## Invocation

Read the arguments semantically. All of these mean `questions`:

- `questions`, `questions 5`, `questions 5x3`, `questions 3 rounds of 6`;
- `ask me 10 questions`, `ask me 5 more`, `grill me`, `interview me`;
- any request for "lots of", "sets of", or "rounds of" questions about the initiative.

| Setting | Default | Notes |
|---|---|---|
| Questions per round | 5 | A requested count is a ceiling, not a quota. See "Fewer is allowed". |
| Rounds | 3 | `5x3` means three rounds of five. `ask me 10 questions` with no round count means one round of ten. |
| Focus | weakest part of the current artifacts | Any remaining words, such as `questions 5 cardinality and provenance`. |

`more` or `N more` continues the current run with one more round, using the previous count unless a new one is given. Steering in the request, such as "less indexed on the retire-at-50 comment" or "1–3 questions per category", applies to every remaining round.

Questions mode can follow another mode in the same request: "update the shape, then `questions 5x2`" runs the update first and asks about the result.

## Before the first round

1. Find the most advanced current artifact: the shape if it exists, otherwise the intent brief, or the plan when the user is questioning the plan. Read it and the initiative map.
2. If the artifacts are missing or stale, run the phase work needed to have something worth questioning. Do not ask questions to make up for unread sources.
3. List the open decisions: places where an answer would change scope, behavior, proof, order, or the cut line. Leave out anything already answered in the artifacts, the map, or earlier rounds.
4. Plan the rounds as a rough progression. Adjust it after every round:
   - **Round 1, goals and stakes:** the job, the main journey, what matters most, what is out.
   - **Round 2, behavior and limits:** edge cases, scale, persistence, failure, conflicts between goals.
   - **Round 3, boundaries and confirmation:** the cut line, the first proof, and statements of the agent's understanding for the user to confirm or correct.

## Writing a round

Apply the product-question discipline from `review-plan-with-product-questions` when that skill is available. Its core rules are repeated here so this mode works without it:

- Ask about users, jobs, decisions, priorities, frequency, scale, persistence, compatibility, failure recovery, and acceptable tradeoffs. Do not ask architecture questions in softer words.
- Every question must have an answer that changes an implementation choice. Say briefly what it decides when that is not obvious.
- Prefer forced choices among concrete options over open prompts such as "What matters most?"
- Make the questions non-overlapping and order them by decision value.
- Use concrete examples the user can react to. When choices are visual, such as syntax, layout, or labels, show a small sample of each option.
- Label your own proposals as proposals, so the user does not mistake them for something they already said.
- Ask humans only for human judgments (standing rule 7). Research facts yourself, and default reversible details.

Rounds 2 and later must build on what came before. Pick questions in this order:

1. **Implications.** An answer often implies a capability the artifacts exclude or never considered. Ask whether it is in. Example: "just works" region detection implies assigning coordinates to regions, which the plan excluded.
2. **Vague or hedged answers.** "idk", "maybe", or several options listed together. Offer two or three concrete readings to choose from.
3. **Conflicts.** An answer that contradicts the artifacts, an earlier answer, or the repository.
4. **Understanding checks.** "I'm reading X as Y, which means Z is out. Right?" Use these for answers the agent had to interpret heavily. Include at least one in each round after the first.
5. **The next most valuable open decision** from the plan made before round 1.

### Fewer is allowed

Ask fewer than the requested count when fewer questions would change a decision, and say why in one line. Stop the run early when the initiative is well defined for its current phase, as defined by the gates in SKILL.md. Never pad a round to reach the count.

## Asking

Present the whole round at once and wait for the answers.

**When a structured question tool is available**, such as `AskUserQuestion` in Claude Code, use it:

- Give each question 2–4 distinct options. Put a recommended option first and add "(Recommended)" only when you actually have a recommendation.
- Rely on the tool's free-text "Other" answer. Do not add an "Other" option yourself.
- Use multi-select only when the choices are not exclusive, such as what must survive export.
- The tool takes up to four questions per call. Split a larger round into consecutive calls without commentary between them.
- Open-ended questions that cannot be fairly reduced to options go in chat after the tool calls.

**Without such a tool**, write a numbered list in chat. Number questions continuously across rounds (round 2 starts at 6 after a round of 5), so the user can answer "7: b" without ambiguity. Put options on lettered sub-lines when they help. Accept any answer format: numbered replies, inline annotations on the questions, or free dictation.

Title each round with one short line, such as **Round 2 of 3: behavior and limits**.

## After each round

1. **Read the answers carefully.** An answer may redirect the work, reject the premise of the question, or ask for something else entirely: a comparison, a sample, research, or a different approach. Do that first. When an answer asks for a decision between approaches, compare them with `consider-contrast` when it is available.
2. **Record the round in the initiative map.** Add one source for the round (`type: "question-round"`, the location as the conversation, and the anchor as the round number) and an entry in `question_rounds`. Update intent claims with their strength and time horizon, as described in `feedback-and-invalidation.md`. Make these edits with `scripts/update-map.mjs --add` and `--set` (see SKILL.md), not a hand-written JSON script. An answer of "use your recommendation" or "idk" becomes a provisional default, not a confirmed requirement.
3. **Write a short delta in chat:** what the answers changed, and how you read any answer you had to interpret. This is the understanding check the user relies on. Keep it to a few bullets.
4. **Continue or finish.** Ask the next round right away when rounds remain and the work is not yet well defined.

Record the answers after every round, so an interrupted run loses nothing. Rewrite the affected human artifacts once, after the final round, unless an answer invalidates the current direction badly enough that the next round's questions would rest on the wrong premise. Follow `feedback-and-invalidation.md` for downstream staleness.

## Finishing

After the last round:

- rewrite the affected artifacts and run the validator;
- move any decision still unresolved into `intent.human_questions` or `shape.open_decisions`, staying within their limits;
- report with the normal end-of-run format, plus one line on what the rounds settled and the most valuable question still open.

The user can always run `more` for another round.

## Map record

Use the optional top-level `question_rounds` object. Keep the full questions and answers here, not in the human artifacts:

```json
"question_rounds": {
  "focus": "scatter regressions",
  "per_round": 5,
  "planned_rounds": 3,
  "status": "in-progress",
  "rounds": [
    {
      "round": 1,
      "theme": "goals and stakes",
      "source": "qa-round-1",
      "questions": [
        {
          "n": 1,
          "question": "Which job should lead the first example?",
          "answer": "Running many queries, some with joins.",
          "effect": "Promoted join-aware charts to the first slice."
        }
      ]
    }
  ]
}
```

`status` is `in-progress`, `complete`, or `stopped-early`. A later `questions` run on the same initiative appends rounds and continues the question numbering.
