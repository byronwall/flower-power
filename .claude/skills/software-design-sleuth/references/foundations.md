# Methodological foundations

This file is for skill maintainers and agents that need the reasoning behind the procedure. Do not reproduce this source list in normal user artifacts.

## Intent and shaping

- Basecamp, *Shape Up*: problem, appetite, solution, rabbit holes, and no-gos; breadboards keep design at the level of elements and connections rather than premature detail.
  - https://basecamp.com/shapeup/1.3-chapter-04
  - https://basecamp.com/shapeup/1.4-chapter-05
  - https://basecamp.com/shapeup/1.5-chapter-06

## Creativity and alternatives

- Marian Petre and Mary Shaw, “Contrasting to Spark Creativity in Software Development,” 2025. Contrasts and creativity moves observed in high-performing software teams.
  - https://arxiv.org/abs/2503.06407
- Mary Shaw and Marian Petre, “Design Spaces and How Software Designers Use Them,” 2024.
  - https://arxiv.org/abs/2407.18502
- Steven Dow et al., “Parallel Prototyping Leads to Better Design Results, More Divergence, and Increased Self-Efficacy,” 2010.
  - https://aaalab.stanford.edu/assets/papers/2010/Parallel_Prototyping_leads_to_better_design_results.pdf

## Delivery and architecture risk

- Google Cloud / DORA: small batches create shorter lead times and faster feedback; loose coupling allows teams and services to test, deploy, fail, and recover independently.
  - https://docs.cloud.google.com/architecture/devops
  - https://cloud.google.com/resources/state-of-devops
- Carnegie Mellon Software Engineering Institute, Architecture Tradeoff Analysis Method: evaluate architecture against quality goals and expose tradeoffs and risks.
  - https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/
- Basecamp, *Shape Up*: unresolved technical unknowns and interdependencies create long-tail schedule risk.
  - https://basecamp.com/shapeup/1.4-chapter-05

## Dependency isolation and testing

- Alistair Cockburn, Hexagonal Architecture: application ports support multiple adapters and separate the application from external technology.
  - https://alistair.cockburn.us/hexagonal-architecture
- AWS Prescriptive Guidance, hexagonal architecture best practices: test the application core with mocks or fixtures before implementing real adapters.
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/best-practices.html
- Testcontainers: local and CI tests with throwaway real dependencies in containers.
  - https://testcontainers.com/getting-started/
- LocalStack: local AWS APIs, including Systems Manager and Secrets Manager.
  - https://docs.localstack.cloud/aws/services/ssm/
  - https://docs.localstack.cloud/aws/services/secretsmanager/
- Pact: consumer-driven contracts test the subset of provider behavior actually used by consumers.
  - https://docs.pact.io/
- AWS serverless testing guidance: mocks are useful for unit tests, while end-to-end tests should exercise real system behavior rather than rely on mocks.
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-application-testing/best-practices.html
- Bazel test guidance: hermetic tests declare dependencies and avoid uncontrolled external resources to remain reproducible.
  - https://bazel.build/reference/test-encyclopedia

## Skill construction

- Claude Code skills support a concise `SKILL.md` plus progressively loaded reference files, templates, examples, and scripts. Keep the main file under 500 lines.
  - https://code.claude.com/docs/en/skills
