# Agent Usage Guide

## Global + Local Discovery Model

Use both layers together:

1. Global understanding
   - Read `otto-extension-index` for cross-org extension landscape and compatibility metadata.

2. Local workspace truth
   - Call EDS (`eds.get.registry`, `eds.get.extension`) for what exists in the current checkout.

## Rules

- Agents must not treat global index data as local install truth.
- Runtime, CLI, and display-system behavior should use EDS for local execution decisions.
- All command and API interactions remain routed through the command service layer.

## Recommended Workflow

1. Read global context from `otto-extension-index`.
2. Execute `eds.scan` when local workspace has changed.
3. Query `eds.get.registry` for inventory and dependencies.
4. Query `eds.get.extension` per required component.
