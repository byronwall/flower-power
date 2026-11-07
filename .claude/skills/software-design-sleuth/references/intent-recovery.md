# Intent recovery

Load this file for `intent`, `full`, or `update` when the meaning of the source material is not already stable.

## Interpretation hierarchy

Treat sources in this order unless the user explicitly says otherwise:

1. current explicit instruction;
2. recent direct correction or dictation;
3. repeated direct intent across first-party sources;
4. earlier direct intent;
5. user-approved decisions;
6. repository facts about current reality;
7. agent-authored analysis;
8. external research and comparable products.

Lower-ranked material can reveal risk or contradiction. It does not silently become the user's intent.

## Atomic signal types

Record claims in `initiative-map.json` as one of:

- outcome;
- problem;
- audience;
- desired experience;
- required behavior;
- constraint;
- anti-goal;
- decision;
- preference;
- sequence;
- example;
- rough estimate;
- implementation hypothesis;
- future possibility;
- open question;
- current repository reality;
- derived implication.

For each claim preserve:

- normalized statement;
- commitment: explicit, repeated, tentative, illustrative, derived;
- importance: core, supporting, peripheral;
- status: active, rejected, superseded, resolved;
- time horizon: proof, first release, later, eventual;
- exact source anchors;
- conflicts and supersession;
- confidence and notes.

## Recover meaning from mechanics

For each concrete idea, ask:

> If this exact mechanism disappeared, what outcome or experience would still matter?

Keep both levels in JSON.

Example:

```text
Source:
“Maybe the app stores config in Secrets Manager and writes changes back.”

Durable intent:
“Runtime configuration must survive restarts and remain centrally manageable.”

Implementation hypotheses:
Secrets Manager, SSM Parameter Store, environment variables, config service.
```

Do not discard a mechanism when the user clearly selected it or when a platform constraint makes it mandatory.

## Reconciliation procedure

Before surfacing a conflict:

1. check whether statements apply to different users, releases, or horizons;
2. look for a later correction;
3. separate outcome from implementation;
4. distinguish requirement from example or estimate;
5. merge synonyms;
6. preserve the tension only if it materially changes the product or build path.

Do not narrate the full chronology in the human brief.

## Intent brief quality

The first 150–250 words should explain the initiative without requiring the rest of the document.

Prefer these sections, using fewer when possible:

- My read
- What matters most
- The experience or behavior you appear to want
- Boundaries
- What seems settled
- Possibilities, not decisions
- Current reality that matters
- What still needs your input
- Next step after confirmation

Questions belong only when they change purpose, audience, policy, appetite, priority, or irreversible direction.

## Common mistakes

- Promoting a vivid brainstorm into a requirement.
- Treating a repo's current architecture as the intended product architecture.
- Treating an agent-authored recommendation as direct user intent.
- Averaging contradictory statements into vague prose.
- Repeating the same intent in several sections.
- Asking the user to decide something a repository search or cheap probe can answer.
