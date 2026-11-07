# Brainstorming mode

Use this file only when the user asks for breadth, alternatives, contrasting options, or a brainstorming pass.

## Goal

Create a compact field of genuinely different possibilities that makes hidden assumptions visible. Do not turn brainstorming into a research report or a seven-column evaluation framework.

## Generation procedure

1. Anchor every option to the current intent brief.
2. Identify 3–6 internal design dimensions, but do not show the matrix unless requested.
3. Generate options independently before ranking them.
4. Force differences in governing premise, user model, ownership, boundary, workflow, or proof path.
5. Remove cosmetic or technology-only variants.
6. Include a minimal/null option and an inversion when they are credible.
7. Keep options coherent rather than combining every attractive idea.

Useful prompts:

- What if we solve only the underlying outcome and omit the requested subsystem?
- What if we reuse the existing path instead of introducing a new model?
- What if ownership moves to the opposite side of the boundary?
- What if the workflow is pull instead of push, synchronous instead of asynchronous, or explicit instead of automatic?
- What if the external dependency is absent from the first release?
- What would the ideal greenfield design look like?
- What hybrid inherits the best mechanism without inheriting all of the cost?

## Output format

Default to seven options. For each:

```markdown
### [Option name]

**Core move:** ...

- **Makes easier:** ...
- **Main catch:** ...
- **Best fit:** ...
```

Aim for 70–140 words per option. Do not add evidence IDs, source notes, detailed architecture, or implementation tasks.

Finish with:

```markdown
## Strongest contrasts

- ...
- ...
- ...

## My current lean

[Optional. Two to five sentences. Omit when the user asked only for divergence.]
```

## Independence check

Before returning, verify that no two options differ only by:

- framework;
- vendor;
- visual style;
- naming;
- one optional feature;
- degree of polish.

At least four options should represent different governing assumptions.

## Why this mode exists

Normal shaping should converge. Brainstorming deliberately delays convergence. Keep the artifact broad enough to reveal possibility, but short enough that the user can compare all options in one sitting.
