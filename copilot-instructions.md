# Copilot Instructions

Purpose: Define the mandatory engineering, architecture, deployment, and collaboration rules for Otto Display System work.

## Ronald Standard Instructions

- Apply Pragmatic Programmer principles on every change.
- Keep all code DRY and remove copy-paste logic early.
- Use contract-driven architecture for API, command, and schema surfaces.
- Preserve clear module boundaries and separation of concerns.
- Favor declarative configuration over hard-coded values.
- Keep commands deterministic and idempotent when feasible.

## Development Workflow Rules

- Use a tracer-bullet workflow: scaffold, wire contracts, validate quickly, then deepen behavior.
- Run install, build, and test before finalizing any change.
- Keep commits small, meaningful, and reversible.
- Never ship undocumented behavior changes.
- Record deployment-impacting changes in repository docs.

## Otto Module Development Rules

- Each feature lives in a dedicated module under modules.
- Module exports must remain focused and minimal.
- Each module defines explicit command and API contracts.
- Cross-module communication must happen through contracts or service gateways.
- Shared schemas live in schemas or module-local schemas when tightly scoped.

## VS Code Agent Interaction Rules

- Agent must gather context before edits and avoid blind rewrites.
- Agent must prefer smallest safe patch that solves the request.
- Agent must validate runtime behavior, not only static structure.
- Agent must report blockers with reproducible evidence.
- Agent must keep README and operational docs aligned with code.

## MemPalace Usage Rules

- Read mem-palace.md before major design changes.
- Update mem-palace.md when stable architectural decisions are made.
- Separate short-term notes from long-term rules.
- Keep memory entries factual, concise, and actionable.

## Display System Architecture Rules

- display-orchestrator is the single role-aware payload authority.
- display-calendar owns normalized calendar aggregation output.
- display-assignments owns assignment ingestion and normalization output.
- display-schedule owns period lookup and phase helpers.
- display-api-interface owns external API adapters and gateway orchestration.
- display-frontend only renders from backend payloads and does not duplicate business logic.

## PiSignage Orchestration Rules

- Do not modify PiSignage binaries or internal service files.
- Keep Otto Display System installs isolated under /opt/otto-display-system.
- Frontend URL updates for PiSignage must be explicit and reversible.
- Uninstall must preserve PiSignage installation and configuration.

## Otto Update Packaging Rules

- Every release package must include modules, configs, schedules, and schemas.
- Update manifests must be versioned and timestamped.
- Auto-update scripts must be idempotent and safe on repeated runs.
- Keep rollback artifacts for at least one prior known-good version.

## Raspberry Pi Deployment Rules

- Validate on one non-production Pi before wider rollout.
- Require health checks for API endpoints and frontend polling.
- Ensure kiosk mode loads role-specific display layouts.
- Validate update, rollback, and uninstall procedures on-device.
- Preserve PiSignage safety guarantees through install lifecycle.

## Validation Rules

- Required pre-merge checks:
  - pnpm install
  - pnpm -r --if-present build
  - pnpm -r --if-present test
  - otto --help
  - otto modules list --config module-loader.config.json

## Operational Source of Truth

- Architecture and lifecycle decisions are documented in README.md and mem-palace.md.
- Live Pi access and connection workflow are documented in docs/dev-pi-access.md.
- Workspace takeover and phase completion state are documented in docs/workspace-handoff.md.
- If documentation conflicts with code, update documentation in the same change.

## Extension Discovery Rules (Option C)

- Global extension awareness must come from `otto-extension-index`.
- Local runtime truth must come from Otto Kernel EDS.
- Runtime, CLI, and display-system workflows must prefer EDS over hardcoded extension references.
- EDS commands and endpoints must always be routed through the Otto Command Service Layer.
