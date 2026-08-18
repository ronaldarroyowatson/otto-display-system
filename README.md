# otto-display-system

Standalone vertical display application built on Otto kernel, command service, update engine, API/CLI/auth extensions, and design system.

## Workspace Layout

- external/otto: cloned Otto foundation repositories
- modules: display-system feature modules
- apps: local runtime helpers (CLI wrapper and display runtime server)
- tools: update and install scripts
- schemas: shared JSON schemas for display data
- install/otto-display-system: deployment-safe install assets and rollback scripts
- docs: deployment runbooks and checklists

## Copilot and MemPalace Provenance

- Copilot instructions source: curated Ronald Otto standards authored for this repository and consolidated into copilot-instructions.md.
- MemPalace source: curated Ronald Otto architecture and deployment memory for this repository and consolidated into mem-palace.md.
- Creation timestamp: 2026-08-18T00:00:00Z.
- Purpose:
  - copilot-instructions.md defines mandatory engineering and deployment behavior for agents and contributors.
  - mem-palace.md records long-term architecture, deployment constraints, and migration goals.

## Agent Loading Rules

- Agents must read copilot-instructions.md and mem-palace.md before major changes.
- Agents must update both files when architecture or deployment policy changes.

## Quick Start

1. Install dependencies: pnpm install
2. Build all modules: pnpm -r build
3. Validate CLI runtime:

   - otto --help
   - otto modules list --config module-loader.config.json
4. Start local display runtime server:

   - node apps/display-runtime/src/server.mjs
5. Build update package:

   - powershell -ExecutionPolicy Bypass -File tools/build-update-package.ps1 -Version 0.1.0

## Installer Workflow

- One-line installer script: install-display-system.sh
- Uninstall script: uninstall-display-system.sh
- Rollback script: install/otto-display-system/scripts/rollback-display-system.sh

### Installation Paths

- Otto Display root: /opt/otto-display-system
- Active payload: /opt/otto-display-system/current
- Backups: /opt/otto-display-system/backups
- Frontend publish path: /var/www/otto-display

### Safety Guarantees

- PiSignage binaries and installation directory are not modified.
- PiSignage configuration is preserved during install and uninstall.
- Rollback affects only /opt/otto-display-system/current.
- PiSignage directories explicitly untouched:
   - /home/pi/pisignage
   - /var/lib/pisignage
   - /etc/pisignage

## Raspberry Pi Validation Docs

- Test plan: docs/raspberry-pi-test-plan.md
- PiSignage-safe checklist: docs/pisignage-safe-checklist.md
- Installer smoke test: docs/installer-smoke-test.md
- Live Pi validation: docs/raspberry-pi-live-test.md
- Deployment checklist: docs/raspberry-pi-deployment-checklist.md
- Dev Pi access details: docs/dev-pi-access.md
- Workspace handoff: docs/workspace-handoff.md
