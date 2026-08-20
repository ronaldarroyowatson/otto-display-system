# EDS Dependencies

## Purpose

EDS now reads the generated dependency index from `external/otto/otto-extension-index/dependencies.json`.
That lets runtime discovery validate the same dependency graph that the meta repo publishes.

## What EDS Validates

- required extensions are installed in the current workspace
- version constraints match the resolved workspace versions
- dependency cycles are not introduced by the local graph
- dependency metadata is attached to `eds.get.registry` and `eds.get.extension`

## Runtime Behavior

- `eds.get.registry` returns the local registry plus dependency validation state.
- `eds.get.extension.<name>` returns the extension record with dependency metadata.
- `/eds/registry` and `/eds/extension/<name>` expose the same routed data through the display runtime.

## Display-System Integration

The display runtime now derives required supporting extensions from EDS instead of a hardcoded config list.
