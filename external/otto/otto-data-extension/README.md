# Otto Data Extension

This repository provides the Otto Data extension for blob transfer, ZIP packaging, compression, extraction, and metadata-aware payload handling.

## Purpose

- Provide reusable data transfer helpers for Otto workflows
- Package and extract archives deterministically
- Persist metadata to MemPalace for data flow inspection
- Register command-service-driven flows so API and CLI surfaces are generated automatically

## Required extension identity

- Extension ID: `otto.data.extension`
- Repository: `otto-extensions/otto-data-extension`

## Folder structure

```text
otto-data-extension/
├── README.md
├── package.json
├── tsconfig.json
├── copilot-instructions.md
├── agents/
│   └── OttoDataExtensionAgent.md
├── manifests/
│   └── extension.json
├── contracts/
│   ├── api.json
│   ├── commands.json
│   └── schemas/
├── src/
│   ├── index.ts
│   ├── data-rescan.ts
│   ├── data-core.ts
│   └── data-config.ts
├── tests/
│   └── data-rescan.test.ts
├── mempalace/
│   ├── rooms.json
│   ├── data-blob-index.json
│   ├── data-generation-history.json
│   └── data-rescan-events.json
├── registry/
│   └── extension-registry.json
├── scripts/
│   └── gitops-sync.mjs
└── docs/
    └── data-extension-overview.md
```

## Notes

- Command definitions live in the command service layer.
- API and CLI surfaces are generated from those definitions rather than hand-written.
- MemPalace writes are used for auditability and traceability across data generation and rescan events.
