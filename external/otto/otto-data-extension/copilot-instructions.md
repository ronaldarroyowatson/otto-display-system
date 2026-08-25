# Otto Data Extension Instructions

Apply the root repository copilot instructions before making changes.

## Role
Generate and maintain the `otto-data-extension` repository as the Otto Data extension.

## Responsibilities
- Provide reusable blob creation, ZIP packaging, compression, and extraction helpers.
- Support metadata-plus-blob payload transfer patterns used by Otto-powered apps.
- Support manual rescans through command-service execution of `otto.data.rescan`.
- Support automatic rescans triggered by `OttoUpdateAgent`.
- Persist metadata to MemPalace rooms `data-blob-index`, `data-generation-history`, and `data-rescan-events`.

## Constraints
- Keep blob and ZIP logic deterministic, reusable, and DRY.
- Expose transfer helpers without duplicating database extension responsibilities.
- Treat missing manifests as tracer-bullet warnings unless required files are absent.
- Prefer command-service-driven registration over direct custom command wiring.
