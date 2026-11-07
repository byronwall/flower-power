---
title: "AWS-backed runtime configuration"
slug: "aws-runtime-config"
phase: intent
status: current
last_updated: "2026-08-11"
---

# AWS-backed runtime configuration

## My read

The application is moving from Railway to AWS and needs a durable replacement for its current configuration workflow. Today it can start from TOML or environment variables, accept configuration changes while running, and write those changes back to Railway so a restart does not restore stale values. The new system must preserve that behavior while using AWS-managed storage—most likely Systems Manager Parameter Store for ordinary settings and Secrets Manager for credentials or other sensitive values.

The important outcome is not simply “call two AWS SDKs.” The application needs one coherent configuration lifecycle: load a valid snapshot at startup, distinguish secret from non-secret values, apply an authorized runtime update, persist it, survive restart, and fail in an understandable way. Developers also need to reproduce success and failure locally. A deployment-only feedback loop would make the integration slow to debug and would make permission, timeout, missing-key, and partial-write behavior difficult to exercise deliberately.

The first release should prove one representative read/write path and the restart behavior. It should not become a general configuration platform, a multi-provider abstraction, or a complete secrets-rotation system.

## What matters most

- Runtime changes persist and are present after restart.
- Secret and non-secret values use appropriate storage without creating two unrelated application workflows.
- The application can be developed and failure-tested locally.
- AWS credentials, permissions, and deployment wiring are introduced after core behavior is already proven.
- Existing TOML and environment-variable behavior remains available long enough for a safe transition.

## The behavior you appear to want

```text
application starts
  → loads and validates one configuration snapshot
  → serves using that snapshot
  → authorized update arrives
  → validates the proposed change
  → persists the correct fields
  → activates the new snapshot
  → restart loads the same values
```

A failed read or write should produce a clear diagnostic and a defined fallback. A partial write must not silently create a configuration the application never intended.

## Boundaries

### Must be true

- Sensitive values are never logged or stored in the non-secret path.
- The application owns validation and configuration semantics; AWS is a storage adapter.
- Tests can intentionally produce missing values, denied access, timeout, malformed data, and partial failure.
- The first integration can be disabled or bypassed without losing the existing startup path.

### Must be avoided

- Requiring an AWS deployment for routine development or failure testing.
- Mirroring the full SSM and Secrets Manager SDKs in application code.
- Adding rotation, multi-region replication, or a general configuration UI before one path works.
- Making the new source authoritative before its reads, writes, restart behavior, and diagnostics are observable.

## What seems settled

- AWS is the target platform.
- Parameter Store and Secrets Manager are the expected managed primitives.
- The application must support startup reads and runtime persistence.
- The existing configuration validation and mutation behavior should be reused rather than reimplemented inside AWS adapters.

## Possibilities, not decisions

- One combined `ConfigStore` may be appropriate, or secret and parameter ports may remain separate behind one coordinator.
- LocalStack is a promising provider-level local test target, but a smaller deterministic fake should still drive most application tests.
- Runtime updates may use a version or compare-and-set rule if concurrent writers are possible.

## Current reality that matters

- Configuration already enters through TOML and environment variables.
- The current Railway persistence hook is platform-specific and should become one adapter rather than define the new domain model.
- The highest-risk unknowns are AWS semantics, permissions, and transition behavior—not parsing configuration from scratch.

## What still needs your input

- Is preserving the old Railway/TOML path during rollout a requirement, or may the first AWS deployment cut over completely?
- Can more than one actor update configuration concurrently, or is there one authoritative writer?

## Next step after confirmation

Shape a narrow configuration boundary, a local proof ladder, and one representative end-to-end update before producing the implementation plan.
