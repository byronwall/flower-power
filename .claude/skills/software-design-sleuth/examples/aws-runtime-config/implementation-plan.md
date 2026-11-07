---
title: "AWS-backed runtime configuration — implementation plan"
slug: "aws-runtime-config"
phase: plan
status: current
last_updated: "2026-08-11"
---

# AWS-backed runtime configuration — implementation plan

## Plan at a glance

Do not start by granting the application AWS write credentials and discovering the lifecycle through deployments. First extract the smallest application-owned configuration boundary and prove one complete update/restart path against deterministic local stores. That gives the team a seconds-long loop for validation, partial writes, timeouts, denied access, missing values, stale revisions, and rollback.

Add real dependencies one at a time. Parameter Store is the first provider contract because it proves names, serialization, versions, and endpoint behavior without also introducing secret handling. Secrets Manager follows through the same coordinator, with a deliberate commit rule that prevents a partially persisted revision from becoming active. LocalStack or another supported local AWS emulator confirms the SDK/API path; a very small sandbox suite confirms IAM, KMS, and account-specific behavior. The deployed application adopts the AWS source only after those proofs pass, behind a source selector that preserves the current startup path.

This sequence leaves a useful system after every milestone: first a provider-independent runtime configuration lifecycle, then a locally integrated AWS adapter, then coherent secret/non-secret persistence, then a real-account proof, and finally a reversible production path.

## Implementation strategy

- **First proof:** Use the existing runtime update path to change one ordinary value and one secret value, recreate the configuration manager, and recover the same validated snapshot from deterministic local stores.
- **Primary seam:** `ConfigurationCoordinator` depends on narrow `ParameterStorePort` and `SecretStorePort` contracts. Consumers continue to depend on the existing typed configuration model.
- **Fast local loop:** `./scripts/test-runtime-config-local.sh` starts any required local dependencies and runs the focused contract and lifecycle tests. The first milestone runs with no network or containers.
- **Local dependencies:** In-memory fakes for application behavior and failure injection; LocalStack for SSM and Secrets Manager API fidelity.
- **Provider/live confirmation:** A tagged sandbox suite creates isolated paths/secrets, verifies read/write/version/permission behavior, and cleans them up.
- **Rollout and rollback:** Select the source with configuration. Preserve TOML/environment or the current provider until AWS read/write/restart and diagnostics are proven. Keep the prior committed revision readable.

### Material dependency proof strategy

```text
configuration lifecycle + deterministic fakes
    → shared adapter contract against LocalStack
    → small AWS sandbox smoke for IAM/KMS/account behavior
    → deployed read-only comparison
    → AWS source becomes authoritative behind a reversible switch
```

The fake proves application semantics. LocalStack proves the application is speaking the expected AWS APIs. The sandbox proves what local substitutes cannot: runtime identity, real permissions, KMS policy, endpoint configuration, and account behavior. None of these should substitute for the others.

## Milestone 1: Prove durable runtime configuration without AWS

This milestone isolates the product behavior from every cloud concern. It deliberately supports one representative ordinary setting and one secret setting rather than generalizing across the entire configuration schema.

- **Change — Define the application-facing persistence boundary**
  - Introduce small parameter and secret contracts with typed results for found, missing, denied, unavailable, malformed, and revision-conflict outcomes.
  - Keep AWS names, ARNs, clients, and exceptions outside the contracts.
  - Add a coordinator that maps the selected typed fields to the correct store and returns one validated snapshot.
- **Change — Reuse the existing configuration lifecycle**
  - Route startup loading, runtime validation, activation, and persistence through the coordinator without changing configuration consumers.
  - Preserve TOML/environment loading as an explicit alternate source rather than an implicit fallback.
- **Change — Add deterministic local implementations**
  - Build in-memory stores that preserve state across manager recreation inside the test harness.
  - Support named failure modes: missing key, malformed value, denied write, timeout, stale revision, and failure after the first store succeeds.
- **Change — Prove restart and partial-write behavior**
  - Exercise the existing update entry point or a thin operator harness.
  - Assert that a failed revision is never activated and that recreation loads the last committed revision.
  - Document one focused local command that runs in seconds without network or shared infrastructure.

### Desired end state

- One real application update path persists and reloads a secret and non-secret setting locally.
- All application-relevant failure states can be selected deterministically.
- Configuration consumers contain no AWS-specific code.
- The original startup source remains usable.
- The focused lifecycle suite passes with one local command and no deployment.

## Milestone 2: Prove the Parameter Store adapter locally

This milestone introduces one AWS service and only the provider semantics needed by the application. The system still defaults to the local source outside the focused integration test.

- **Change — Implement `AwsParameterStore` behind the parameter port**
  - Translate typed names, serialization, version information, and provider errors at the adapter boundary.
  - Apply explicit timeouts and preserve provider diagnostics without exposing values.
- **Change — Create one shared parameter-store contract suite**
  - Run the same application-relevant cases against the in-memory parameter store and the LocalStack adapter.
  - Cover create/read/update, missing value, malformed payload, stale expected revision when supported by the selected commit rule, timeout mapping, and denied-access mapping where the emulator permits it.
- **Change — Make the local integration reproducible**
  - Add the minimal LocalStack service configuration and seed/cleanup commands.
  - Extend `test-runtime-config-local.sh` so a developer does not need to create resources manually.
  - Keep the container and test data isolated from unrelated local AWS usage.
- **Change — Use the adapter in one end-to-end local path**
  - Persist the representative ordinary setting through LocalStack while the secret remains on the deterministic local store.
  - Recreate the manager and prove the combined snapshot is valid.

### Desired end state

- The application contract has passed against both the fake and the local SSM implementation.
- The ordinary setting survives a local integration restart.
- Provider exceptions are translated into stable application failures.
- One command starts, seeds, tests, and cleans up the local dependency.
- Secrets Manager, IAM, deployment wiring, and production authority remain excluded.

## Milestone 3: Add Secrets Manager and coherent revision commits

This milestone adds the second AWS service only after the lifecycle and first provider adapter are stable. Its main purpose is not merely SDK coverage; it is proving that a secret and ordinary value form one recoverable configuration revision.

- **Spike — Choose the smallest coherent commit rule**
  - **Decision required:** How does the reader know that all values for a revision are durable before activating it?
  - **Evidence to gather:** Existing writer concurrency, update frequency, provider version semantics, cleanup needs, and whether one JSON secret or per-field secrets are required.
  - **Preferred direction:** Write revisioned values first, then update one current-revision manifest or pointer last. Readers use only a committed revision.
  - **Fallback:** If the application has one writer and one secret bundle, use an explicit serialized write coordinator with a durable last-good snapshot, then revisit compare-and-set before multiple writers.
- **Change — Implement `AwsSecretStore` behind the secret port**
  - Translate value/version/error semantics and never include secret material in exceptions, traces, or fixtures.
  - Keep secret field routing in the coordinator rather than in consumers.
- **Change — Run the shared secret-store contract suite**
  - Execute the same secret semantics against the deterministic fake and LocalStack.
  - Cover missing secret, denied access, malformed secret payload, timeout, version mismatch where applicable, and interrupted persistence.
- **Change — Prove a coherent mixed revision**
  - Write one ordinary value and one secret value under the selected revision protocol.
  - Inject failure before commit, between provider writes, and after commit.
  - Assert that startup sees either the previous complete revision or the new complete revision—never a mixed snapshot.

### Desired end state

- One locally integrated update persists both AWS-backed value classes and survives restart.
- Partial failures cannot make a mixed revision authoritative.
- Fake and LocalStack adapters pass the same application semantics.
- Secret values are absent from logs, snapshots, test output, and error messages.
- The source can still be switched back to the previous configuration path.

## Milestone 4: Confirm real AWS identity, permissions, and service behavior

This is a small live confirmation, not the normal development suite. It should be runnable on demand and in a protected CI job against isolated sandbox resources.

- **Change — Define least-privilege sandbox resources and identity**
  - Create isolated parameter paths, secret names, tags, and KMS policy as needed.
  - Grant only the read/write operations required by the adapter and explicit cleanup permissions.
  - Keep sandbox and production resource identifiers separate.
- **Change — Add a tagged live smoke suite**
  - Create or seed one test revision, read it, update it, read it after manager recreation, and remove test resources.
  - Include one deliberate denied operation using a restricted identity or resource path when practical.
  - Assert logs include source, operation, revision, duration, and typed error while excluding values.
- **Change — Compare emulator and real-service observations**
  - Record any AWS behavior not represented locally, such as KMS policy, eventual visibility, endpoint, version, or permission details.
  - Amend the contract tests only for application-relevant differences.

### Desired end state

- Real AWS accepts the adapter's requests under the intended runtime identity.
- IAM and KMS behavior are proven independently from application logic.
- The smoke suite is isolated, cleanup-safe, and intentionally small.
- Any meaningful LocalStack/AWS difference is documented and covered at the correct proof rung.
- No deployment is required to run the sandbox test.

## Milestone 5: Introduce AWS as a reversible runtime source

This milestone wires the already-proven adapters into the deployed application without immediately removing the existing source.

- **Change — Add explicit source selection and startup diagnostics**
  - Select the configuration source through deployment configuration rather than environment-specific branching scattered through the code.
  - Emit the selected source, committed revision, load duration, and fallback/abort decision without values.
- **Change — Add read-only comparison when practical**
  - In a non-authoritative mode, load the AWS snapshot and compare its normalized shape with the current authoritative configuration.
  - Report mismatches without activating AWS values.
  - Skip this mode if reading secrets twice or the current lifecycle makes comparison unsafe; use a staged sandbox deployment instead.
- **Change — Enable one controlled runtime update path**
  - Turn on AWS persistence for the representative settings in a non-production or limited environment first.
  - Recreate or restart the process and confirm the persisted revision is loaded.
  - Keep the old source available through the rollback setting.
- **Change — Exercise rollback**
  - Disable AWS authority, restart on the prior source, and verify that configuration consumers continue to operate.
  - Preserve the AWS revision for diagnosis rather than deleting it during rollback.

### Desired end state

- A deployed environment can read and persist one coherent AWS-backed revision.
- Restart recovery has been observed through normal deployment/runtime identity.
- Operators can tell which source and revision are active without seeing values.
- The old source can be restored with a documented configuration change.
- The change remains limited to the representative settings and environment.

## Milestone 6: Expand safely and make the integration operationally complete

Only after the representative path is stable should the application broaden field coverage and harden the provider path.

- **Change — Migrate remaining fields by category**
  - Move ordinary and secret settings in small groups using the established routing and contract tests.
  - Add schema/version migration only when a real field requires it.
  - Keep each group independently diagnosable.
- **Change — Add operational limits and recovery**
  - Define startup behavior for unavailable AWS, stale last-good data, malformed revision, and throttling.
  - Add bounded retries, timeout metrics, update success/failure counts, and revision-age diagnostics.
  - Test fallback or fail-closed behavior explicitly; do not infer it from code review.
- **Change — Remove temporary compatibility only after evidence**
  - Confirm all intended environments use the AWS source and no runtime path still writes through Railway.
  - Remove the old adapter in a separate cleanup change after rollback appetite expires.
  - Preserve import/export or recovery tooling if it remains operationally valuable.

### Desired end state

- All in-scope configuration fields use the selected AWS-backed lifecycle.
- Routine development and failure testing remain local and deterministic.
- A small live suite protects provider and permission fidelity.
- Operators can diagnose load, update, retry, fallback, revision, and rollback behavior.
- Temporary compatibility code is removed only after the new path has operated successfully.

## Cross-cutting verification

- Run the same application-semantic contract against each applicable fake, emulator, and AWS adapter.
- Verify no secret values appear in logs, traces, snapshots, exceptions, test reports, or fixture diffs.
- Test startup and runtime update separately; one can succeed while the other fails.
- Exercise process restart after every persistence boundary.
- Keep local tests hermetic: isolated names, deterministic time where needed, explicit cleanup, and no ambient developer AWS credentials.
- Make the sandbox suite opt-in or separately tagged so the fast suite never waits on the network.

## Open decisions and spikes

- **Writer authority:** Decide whether the running application may write secrets or only request an operator-mediated change. Evidence: security model and operational workflow. Fallback: make Secrets Manager read-only and keep secret writes in deployment automation.
- **Concurrency:** Confirm whether multiple writers exist. Evidence: current update callers and future administration flow. Fallback: support one writer explicitly and reject stale revision tokens.
- **Outage policy:** Decide whether startup may use a last-known-good local snapshot when AWS is unavailable. Evidence: availability and security requirements. Fallback: fail startup with a clear diagnostic and preserve the old source during initial rollout.

## Below the cut line

- General multi-provider configuration framework.
- Automated secret rotation and rotation-aware consumers.
- Multi-region replication or cross-account distribution.
- Arbitrary user-defined schemas and configuration UI.
- Event-driven cache invalidation or push updates.
- Full audit/history service beyond provider versions and application diagnostics.
- Removal of the old source before the rollback window closes.
