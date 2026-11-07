# Evaluation prompts

Run these against a disposable repository or fixture. Inspect both the concise human artifacts and `initiative-map.json`.

## 1. Messy intent recovery

> I have three transcripts, two old plans, and a repository. Some of the older material says this should be a dashboard, but the latest transcript says the real goal is to help operators notice and resolve inconsistent records. Run the skill in intent mode. Do not design the product yet.

Expected behavior:

- reads first-party sources unattended;
- distinguishes the durable outcome from dashboard examples;
- reconciles recency and explicit corrections in JSON;
- produces a brief under the intent limits;
- asks no technical implementation questions.

## 2. AWS runtime configuration — full pipeline

> The application currently loads TOML and environment variables and writes runtime changes back to Railway. We are moving to AWS and expect to use SSM Parameter Store and Secrets Manager. Run the full workflow through implementation planning. The result must be practical to develop and test locally.

Expected behavior:

- preserves runtime persistence and restart recovery as the intent;
- challenges a live-AWS-only implementation path;
- defines a narrow application seam;
- recommends deterministic failure-capable fakes;
- uses an emulator/container or LocalStack for provider semantics;
- reserves real AWS for IAM/KMS/account smoke tests;
- introduces provider risks in isolated milestones;
- keeps a reversible old path or explains why it cannot.

## 3. Large addition to an existing tool

> Add a collaboration surface to this existing modeling application. I am leaning toward real-time multiplayer. Inspect the repository, shape the work, and produce a plan.

Expected behavior:

- treats real-time multiplayer as a hypothesis, not intent;
- identifies reuse and collision with current state ownership;
- offers a lower-risk proof such as annotations, proposals, or session handoff when appropriate;
- avoids splitting the plan into frontend/backend/infrastructure phases;
- leaves each milestone as a usable system.

## 4. Deliberate brainstorming

> The intent brief is stable. Give me seven genuinely contrasting ways to solve it before we shape anything. I want breadth, not detailed justification.

Expected behavior:

- produces about seven concise options;
- includes a minimal/null option and a premise inversion when credible;
- varies governing premise, authority, workflow, boundary, or proof strategy;
- avoids sources, IDs, matrices, and repetitive explanation;
- does not silently select an option unless a short lean is useful.

## 5. Small feature with no material dependency

> Add bulk editing to this table. Users need to apply one operation to 10–100 selected rows. Shape and plan it.

Expected behavior:

- stays at feature scale;
- does not invent containers, ports, or a dependency ladder without a real dependency;
- considers selection, partial failure, undo, and navigation;
- produces a compact plan with a real thin slice.

## 6. New dictation invalidates the plan

> Update the initiative: the running service is no longer allowed to write secrets. All secret changes must go through an operator-approved deployment workflow. Ordinary parameters may still be changed at runtime. Continue from the existing artifacts.

Expected behavior:

- updates intent and records the authority decision;
- marks the affected shape and plan stale;
- rewrites only the affected downstream strategy;
- removes runtime secret-write milestones;
- returns a short delta instead of reposting everything in chat.

## 7. Reuse-first repository discovery

> Plan a new import pipeline. The repository may already contain CSV parsing, validation, and job progress infrastructure. Do not assume it does or does not.

Expected behavior:

- inspects actual paths, tests, and current lifecycle;
- distinguishes reuse from accidental constraints;
- does not invent exact files without evidence;
- creates the first slice through stable existing paths where practical.

## 8. Premature backlog pressure

> Turn this idea into implementation tickets now. The target audience, source of truth, and migration policy are not decided.

Expected behavior:

- refuses false precision without becoming obstructive;
- produces or updates the intent brief;
- asks at most a few consequential human questions;
- turns discoverable facts into research and technical unknowns into focused spikes;
- does not hide product decisions inside tasks.

## 9. Provider mocks are insufficient

> Integrate with a payment provider. Unit tests already mock every SDK call. We need confidence in webhook signatures, retries, idempotency, and sandbox credentials.

Expected behavior:

- preserves unit mocks only for focused application behavior;
- adds a provider contract or sandbox proof for signature and API fidelity;
- separates webhook application semantics from provider credentials and network setup;
- makes duplicate and out-of-order delivery reproducible locally;
- does not make end-to-end sandbox tests the routine development loop.

## 10. Full program with several coordinating pieces

> Nothing exists yet. We want a product that turns transcripts, documents, and agent notes into an evidence-backed planning system. Run full mode, but stop before implementation planning if the shape is not coherent enough.

Expected behavior:

- recovers program intent without exposing a full evidence ledger;
- shapes the whole-system model before decomposing capabilities;
- challenges premature platform pieces;
- identifies one smallest end-to-end proof;
- proceeds to planning only if the source of truth, major seams, and first proof are coherent.

## 11. Question rounds that build on each other

> A shape brief exists for a map feature. Run `questions 5x3`.

Expected behavior:

- reads the shape and map before asking, and skips anything they already answer;
- asks at most five product questions per round, each with an answer that would change a choice;
- uses a structured question tool when one exists, in batches of four or fewer;
- records each round in `question_rounds` and as a source before asking the next;
- opens rounds 2 and 3 with implications, hedged answers, conflicts, and at least one "I'm reading X as Y" check;
- stops early, with a one-line reason, when the shape is well defined;
- rewrites the affected artifacts once at the end, runs the validator, and reports a short delta;
- treats `5 more` as one more round on the same run.
