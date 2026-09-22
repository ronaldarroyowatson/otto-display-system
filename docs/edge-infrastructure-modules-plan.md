# Edge Infrastructure Module Plan

## Goal

Make HTTP/HTTPS, hostname, and TLS behavior reusable across Otto deployments with permanent modules instead of one-off script edits.

## Design Principles

- Pragmatic Programmer workflow: tracer bullets first, then harden.
- Contract-first command surfaces through command-service only.
- Feature-based folders in each repo to keep responsibilities explicit.
- Idempotent automation with safe defaults and clear overrides.

## New Repositories

## 1) otto-edge-profile-extension

Purpose:

- Resolve canonical hostnames and endpoint URLs.
- Compute stable display URL and OAuth redirect URI.
- Detect risky host/protocol combinations and emit warnings.

Core command:

- edge.profile.resolve

## 2) otto-tls-automation-extension

Purpose:

- Generate SAN-safe OpenSSL config text.
- Produce deterministic TLS provisioning plans for install scripts.
- Standardize cert/key/CA path conventions.

Core command:

- edge.tls.plan

## 3) otto-edge-service-extension

Purpose:

- Generate consistent systemd HTTPS environment blocks.
- Generate optional reverse proxy config (Caddy) for simple 80/443 UX.
- Keep service wiring reusable across display apps.

Core command:

- edge.service.plan

## Wire-In Targets

- command-service schemas and handlers for the 3 commands above
- display runtime startup diagnostics (logs resolved edge profile)
- installer scripts consume generated plans in a follow-up phase
- update package includes all new extension repos

## Validation Gate

- repo tests for each extension
- command-service typecheck and tests
- display runtime health checks
- Pi smoke test for profile/tls/service command outputs

## Adoption Phases

1. Phase A (this change): create repos, contracts, commands, runtime wiring.
2. Phase B: switch installers to consume edge.tls.plan and edge.service.plan outputs directly.
3. Phase C: optional Caddy integration for auto 80->443 and standard browser trust UX.
4. Phase D: enterprise onboarding path (GPO/Intune trust or public TLS).
