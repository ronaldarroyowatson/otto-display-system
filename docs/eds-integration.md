# EDS Integration

EDS is the local runtime source of truth for extension discovery and dependency validation.

## Dependency model

EDS reads the generated dependency catalog from `external/otto/otto-extension-index/dependencies.json` and cross-checks it against the local workspace registry.

## Validation responsibilities

EDS validates:

- required extensions
- optional extensions
- contract dependencies
- API dependencies
- tool dependencies
- version constraints
- compatibility constraints
- dependency cycles

## Display runtime behavior

The display runtime should not maintain a static extension list. Instead, it consumes EDS output through the routed command layer and uses the EDS dependency graph to decide which required and optional extensions are present and healthy.

## Command surface

The relevant EDS contract surface is:

- `eds.scan`
- `eds.get.registry`
- `eds.get.extension`
- `eds.get.extension.<name>`

This keeps the runtime aligned with the command-service contract model and the generated meta repo catalog.
