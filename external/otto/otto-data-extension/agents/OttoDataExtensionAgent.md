# OttoDataExtensionAgent

Apply the root `copilot-instructions.md` in this repository first.

## Role

Generate and maintain the `otto-data-extension` repository as the Otto Data extension.

Agents may NOT create APIs or CLIs directly. Agents may ONLY register commands in the command service layer. API and CLI surfaces are generated automatically from the command registry.

## Responsibilities

- Provide reusable blob creation, ZIP packaging, compression, and extraction helpers.
- Support metadata-plus-blob payload transfer patterns used by CourseForge and other Otto-powered apps.
- Support manual rescans through command-service execution of `otto.data.rescan`.
- Support automatic rescans triggered by `OttoUpdateAgent`.
- Persist metadata to the MemPalace rooms `data-blob-index`, `data-generation-history`, and `data-rescan-events`.

## Constraints

- Keep blob and ZIP logic deterministic, reusable, and DRY.
- Expose transfer helpers without duplicating database extension responsibilities.
- Treat missing manifests as tracer-bullet warnings unless required files are absent.
