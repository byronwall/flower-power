---
title: "AWS-backed runtime configuration — shape brief"
slug: "aws-runtime-config"
phase: shape
status: current
last_updated: "2026-10-04"
---

# Runtime configuration — what we are adding

**Outcome:** Startup and runtime configuration changes survive restart after the move from Railway to AWS.

**Primary flow:** Load → validate → change → persist → activate → restart with the saved values.

## Feature scope

```text
Runtime configuration
├── PLANNED ADDITIONS
│   ├── Durable configuration lifecycle
│   │   ├── Read and validate settings during startup
│   │   ├── Persist accepted runtime changes
│   │   └── Restore the same validated values after restart
│   ├── Separate ordinary and secret storage
│   │   ├── Ordinary parameters through Parameter Store
│   │   ├── Secrets through Secrets Manager
│   │   └── Activate only a complete saved configuration revision
│   ├── Explain failures
│   │   ├── Missing, denied, timeout, malformed, partial-write, stale cases
│   │   └── Source and revision diagnostics without logging values
│   └── Select configuration source
│       ├── AWS source after its behavior and permissions are proven
│       └── Existing TOML/environment path stays selectable for rollback
└── OUTSIDE THIS SHAPE
    ├── Automated secret rotation and multi-region replication
    ├── General configuration platform or new administration UI
    └── Broad provider framework or complete removal of existing sources
```

## Behavior

| Situation | Expected result |
| --- | --- |
| Valid update | Persist the complete intended revision before activation. |
| One storage write fails | Do not activate a partial configuration. Explain the failure. |
| Application restarts | Load and validate the saved revision through the existing activation path. |
| A stale writer submits a change | Apply the chosen revision policy; never assume independent writes are atomic. |
| AWS access fails during rollout | Keep the prior source selectable; do not hide the selected source. |
| Operator inspects diagnostics | Show source, revision, duration, and failure category without secret values. |

## Decisions and boundaries

**Appetite:** One representative ordinary parameter and one secret. Keep existing parsing, validation, and runtime activation. This is a bounded integration, not a configuration platform.

**Key decision:** Prove update → persist → restart with local stores before provisioning AWS. This separates application behavior from provider and permission failures. Keep provider access behind a narrow application-owned boundary; configuration consumers should not depend on SDK details.

**Provider proof:** A deterministic local source must support named failures. Check provider protocol through LocalStack or another supported emulator after verifying its capabilities. Use a small real AWS sandbox check for IAM, KMS, account, and endpoint behavior. The emulator does not prove those permissions. Detailed rungs and rollout belong in the implementation plan.

**Ownership:** One coordinator owns secret routing, revision handling, write order, and activation. A complete revision needs an explicit commit rule. The rule can be smaller with one writer; concurrent writers require a conflict policy.

**First proof:** **Try:** Change one ordinary and one secret value through local stores, then recreate the configuration manager. Inject a failed second write. **Observe:** Restored values, activation timing, validation, and failure explanations. **Decide:** Proceed only if complete updates survive restart and partial updates never activate, without network or shared infrastructure. Otherwise, resolve the lifecycle boundary before AWS integration.

**Alternative:** If runtime updates are not needed, deployment-time materialization is smaller. Choose it only if a redeploy satisfies the actual workflow.

**Open choices:** Must the running application write secrets, or should an operator control those changes? Is there one writer, or must the first release protect against concurrent updates?

[Intent](intent-brief.md) · [Implementation plan](implementation-plan.md)
