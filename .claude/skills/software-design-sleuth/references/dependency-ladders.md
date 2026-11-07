# Dependency ladders

Use this file when a plan touches cloud services, databases, queues, identity providers, payment systems, email, object storage, LLMs, third-party APIs, or a difficult legacy subsystem.

## First identify the semantic contract

Before choosing a test double or emulator, record what the application actually relies on:

- operations used;
- input and output shape;
- consistency and ordering assumptions;
- identity and idempotency keys;
- expected errors;
- retry and timeout behavior;
- permission model;
- latency sensitivity;
- state that must survive restart;
- behavior during partial outage.

Design the narrow application-facing port around this contract, not around every method in the provider SDK.

## Decide the dependency's role in the first proof

For every material dependency, record one of:

- **absent** — the first proof does not need the dependency;
- **local-substitute** — the first proof uses a fake, emulator, container, or fixture;
- **real** — the dependency itself is inseparable from the outcome being tested.

When `real` is selected, record why a lower-cost proof cannot answer the question. Treat "that is how production works" as insufficient justification by itself.

Verify current provider and emulator capabilities from primary documentation before selecting a rung. Record limitations in the initiative map; do not assume a local substitute reproduces identity, permissions, consistency, quotas, or operational behavior.

## Proof rungs

### 1. Deterministic fake

Best for:

- application behavior;
- state transitions;
- validation;
- retries and backoff decisions;
- injected failures;
- fast local tests.

A fake should be small, intentional, and able to simulate named failure modes. It does not prove provider compatibility.

### 2. Stub or mock

Best for:

- verifying a specific request or interaction;
- rare branches that are awkward to reproduce;
- focused unit tests.

Avoid mirroring a large provider SDK with dozens of brittle expectations.

### 3. Emulator or real container

Best for:

- protocol and serialization fidelity;
- database, queue, and cloud API behavior;
- local integration tests;
- reproducible developer environments.

Examples include Testcontainers, LocalStack, provider emulators, or a real database container.

### 4. Contract test

Best for:

- running one shared behavioral suite against multiple adapters;
- documenting the subset of provider behavior the application depends on;
- preventing drift between fake, emulator, and production adapter.

A contract test should assert application-relevant semantics, not provider implementation details.

### 5. Live sandbox smoke

Best for:

- authentication and IAM;
- real endpoint configuration;
- service-specific quirks;
- network and account policy;
- deployment wiring.

Keep it small, isolated, cleanup-safe, and intentionally slower.

### 6. Deployed operational proof

Best for:

- runtime identity;
- production-like network boundaries;
- observability;
- rollback;
- throttling or outage behavior that cannot be reproduced faithfully elsewhere.

This should confirm an already-proven path, not be the first time it works.

## Selection rules

- Use a fake when speed and failure control matter.
- Use a real container or emulator when protocol fidelity matters.
- Use a sandbox when provider identity, permissions, or account behavior matters.
- Use production-like proof for operational properties only.
- Do not use a higher rung merely because it feels more realistic.
- Do not trust a lower rung for properties it cannot represent.

## AWS SSM and Secrets Manager example

A strong sequence is usually:

1. define an application-facing `ConfigStore` or separate parameter/secret ports;
2. implement an in-memory fake with missing-key, stale-value, permission, timeout, and write-conflict modes;
3. prove startup and runtime update behavior against the fake;
4. run adapter contract tests against LocalStack or another supported emulator for SSM and Secrets Manager;
5. run a small sandbox test against real AWS for IAM, KMS, endpoint, and account behavior;
6. deploy behind explicit configuration or a feature flag;
7. verify logs, metrics, restart persistence, and rollback.

Do not force SSM and Secrets Manager into one abstraction when their application semantics differ. Do not split them merely because AWS exposes two products if the application truly sees one coherent configuration capability.
