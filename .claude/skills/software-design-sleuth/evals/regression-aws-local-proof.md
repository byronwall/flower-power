# Regression: external dependency must trigger constructive pushback

## Prompt

> We are moving a Python service from Railway to AWS. It currently reads TOML or environment variables and can persist runtime changes back to Railway. Implement SSM Parameter Store and Secrets Manager so startup and runtime writes survive restart. Produce a shape brief and implementation plan.

## Must appear in the shape

- The durable intent is configuration lifecycle and restart persistence, not merely SDK integration.
- A capability tree and concise operator behavior rules.
- Material pushback and a visible Try/Observe/Decide proof under **Decisions and boundaries**.
- 3–6 concrete implementation-success moves retained in the initiative map.
- A narrow application-facing seam around provider access.
- A provider-free first proof or a specific explanation why it is impossible.
- A deterministic local fake capable of named failures.
- A provider-fidelity rung such as LocalStack or another supported local emulator.
- A small real AWS sandbox proof for IAM/KMS/account behavior.
- A reversible source-selection or fallback path.

## Must appear in the plan

- First milestone proves update → persist → recreate/restart without live AWS.
- Parameter Store and Secrets Manager are not introduced as one undifferentiated task.
- Provider protocol, permissions, deployment wiring, and operational recovery are separated.
- At least missing, denied, timeout, malformed, partial-write, and stale/conflict behavior are assigned to a proof rung.
- One documented fast local command or workflow.
- Each milestone records a valid intermediate system and rollback/bypass.
- Live AWS confirms rather than replaces local testing.

## Must not appear

- “Set up AWS resources” as the first milestone.
- A broad `AWSService` abstraction mirroring both SDKs.
- Routine failure testing that requires deployment.
- Rotation, multi-region, generic configuration platform, or full administration UI above the cut line.
- Claims that LocalStack proves IAM or KMS policy completely.
