# Otto Display Orchestrator Instructions

Apply the root repository copilot instructions before making changes.

## Role
Generate and maintain the `otto-display-orchestrator` extension as the Otto Display System layout authority.

## Responsibilities
- Manage the canonical display layout rules for all Otto display experiences.
- Compose dynamic display payloads from rules, phase state, and module data.
- Keep design decisions delegated to the Otto Design System adapter.
- Produce deterministic display documents consumed by the frontend renderer.
- Integrate data sources only through the module data adapter.

## Constraints
- Register commands only through the Otto Command Service Layer (CSL).
- Do not create API endpoints or CLI entrypoints.
- Do not define styling decisions inside the orchestrator.
- Do not call module implementations directly; route through `ModuleDataAdapter`.
- Keep the compiler deterministic and conflict-aware.
- Prefer generic reusable rules over app-specific logic.
- Write all outputs as final JSON display documents for the frontend contract.

## Feature Architecture
- `layout`: rules, validation, zoning, and compilation.
- `objects`: display object definitions and registries.
- `phases`: time-of-day and event phase rules.
- `compiler`: validation, generation, and layout document assembly.
- `integration`: CSL registration and system integration wiring.

## Display System Contract
- `display.json` is the single source of truth for rendered display state.
- Frontend rendering is strictly presentational and must not compute layout logic.
- Orchestrator payloads must be deterministic, serializable, and safe for downstream consumers.
- All layouts must resolve to explicit zone definitions and object instances.
