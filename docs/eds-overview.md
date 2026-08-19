# EDS Overview

## Purpose
The Extension Discovery Service (EDS) is the local-truth discovery subsystem in Otto Kernel.

EDS scans local workspace roots only:
- `external/otto/`
- `modules/`
- `extensions/`

It reads:
- `module.json`
- `manifests/*.json`
- `contracts/*.json`
- `commands/*.json`
- `package.json`

## Output
EDS writes a unified runtime registry to:
- `runtime/extension-registry.json`

Registry entries include:
- extension name
- extension path
- command contracts
- API contracts
- tools provided
- metadata
- version
- dependencies
- install footprint (when available)

## Command Contracts
EDS is exposed through command-service-routed internal commands:
- `eds.scan`
- `eds.get.registry`
- `eds.get.extension`
- `eds.get.extension.<name>` (template alias contract)

## API Endpoints Through Command Service Layer
- `GET /eds/registry`
- `GET /eds/extension/:name`
