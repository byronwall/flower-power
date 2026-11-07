# Examples

## `aws-runtime-config/`

A complete `intent → brainstorm → shape → plan` example for a Python application's move from Railway-managed environment variables to AWS Systems Manager Parameter Store and Secrets Manager.

It demonstrates the behavior this release is intended to add:

- recover the durable configuration lifecycle rather than treating “use AWS” as the intent;
- compare several authority and deployment models;
- challenge a deployment-first implementation;
- prove behavior first with deterministic local stores;
- add Parameter Store and Secrets Manager separately;
- use a local AWS emulator for provider API semantics;
- reserve a real sandbox for IAM, KMS, endpoint, and account behavior;
- preserve a reversible source path;
- leave a valid system after each milestone.

Repository paths and commands are illustrative placeholders. A real run must inspect and use the target repository's actual names and tooling.

## `brainstorm-collaboration-surface.md`

A concise seven-option brainstorming example for a large collaboration addition to an existing modeling tool. It shows how options can vary by authority, workflow, state model, and proof path without becoming seven mini-design documents.
