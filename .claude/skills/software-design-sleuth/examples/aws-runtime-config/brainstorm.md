---
title: "AWS-backed runtime configuration — contrasting approaches"
slug: "aws-runtime-config"
phase: brainstorm
status: current
last_updated: "2026-08-11"
---

# AWS-backed runtime configuration — contrasting approaches

Every option preserves the same intent: the application must load validated configuration, persist authorized runtime changes, and recover the same state after restart. They differ in where authority lives and how much AWS complexity enters the application.

## Option 1 — Deployment-time materialization

**Core move:** Keep the application environment/TOML model. A deployment job reads SSM and Secrets Manager and materializes the values before the process starts. Runtime changes create a new deployment rather than writing directly from the app.

- **Makes easier:** Application simplicity, local development, and rollback to a known deployment.
- **Main catch:** Runtime updates are slower and remain coupled to the deployment system.
- **Best fit:** Configuration changes are rare and a restart or redeploy is acceptable.

## Option 2 — Narrow in-process adapters

**Core move:** Put a small application-owned configuration port around the existing validation lifecycle. Use an in-memory implementation locally, AWS adapters in production, and a coordinator that routes secret and non-secret fields.

- **Makes easier:** Fast tests, controlled failures, gradual migration, and reuse of current behavior.
- **Main catch:** The application owns persistence coordination and must handle partial writes carefully.
- **Best fit:** Runtime updates are a real product requirement and the application is the authoritative writer.

## Option 3 — Local mirror with asynchronous AWS sync

**Core move:** Keep a local durable snapshot as the immediate source of truth. Changes commit locally first and synchronize to AWS in the background. Startup can use the last known snapshot when AWS is unavailable.

- **Makes easier:** Availability, fast updates, and resilience to transient provider outages.
- **Main catch:** Reconciliation, stale state, and multiple-authority problems become central.
- **Best fit:** The process must continue operating through AWS outages and eventual consistency is acceptable.

## Option 4 — Configuration sidecar

**Core move:** A companion process owns AWS credentials, reads and writes both services, and exposes a small local API or mounted snapshot to the application.

- **Makes easier:** Credential isolation, language-independent integration, and centralized provider behavior.
- **Main catch:** Adds another deployable, another failure boundary, and local orchestration.
- **Best fit:** Several applications need the same capability or security policy forbids direct provider access.

## Option 5 — Dedicated configuration service

**Core move:** Build a small internal service that owns schemas, versions, audit history, SSM, and Secrets Manager. Applications read a coherent configuration revision through one API.

- **Makes easier:** Multi-application governance, auditability, and coordinated updates.
- **Main catch:** It is a platform project and is much larger than the current need.
- **Best fit:** Many services, teams, or concurrent writers need shared configuration policy.

## Option 6 — Read from AWS, write through operations

**Core move:** Applications load directly from AWS but never mutate it. Runtime update requests create an operator action, pull request, or approved automation that writes the new values.

- **Makes easier:** Security review, change history, and separation of application and administrative authority.
- **Main catch:** Removes immediate self-service persistence from the running application.
- **Best fit:** Configuration changes require approval or the application should not have write credentials.

## Option 7 — Representative slice, then hybridize

**Core move:** Start with the narrow in-process adapter for one non-secret and one secret value. Keep the existing source as fallback. After observing real update frequency and outage needs, decide whether deployment materialization, a sidecar, or a local mirror is justified.

- **Makes easier:** Early proof without locking in a platform-sized solution.
- **Main catch:** Some architecture remains deliberately provisional during the first slice.
- **Best fit:** The required behavior is clear but the long-term operational model is not.

## Strongest contrasts

- Direct runtime authority versus operator- or deployment-mediated writes.
- AWS as source of truth versus a local snapshot with asynchronous replication.
- An application-local boundary versus a shared sidecar or platform service.

## My current lean

Use Option 7, implemented initially with Option 2's narrow adapter. It proves the required runtime behavior quickly while preserving a credible path toward stricter operational ownership if real usage shows that it is needed.
