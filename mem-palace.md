# Otto Display MemPalace

Created: 2026-08-18
Purpose: Persistent project memory for Otto Display System architecture, workflows, and deployment safety.

## Ronald Long-Term Preferences

- Prefer DRY code with explicit boundaries over implicit magic.
- Prefer contract-first design for commands, APIs, and data schemas.
- Prefer deterministic automation with clear rollback paths.
- Keep deployment scripts operationally safe and reversible.
- Preserve existing production systems while introducing Otto overlays.

## Otto Development Patterns

- Command surfaces are declarative and derived from contracts.
- API and CLI generators scan command service definitions, then enrich with built-in display contracts.
- Module responsibilities are explicit and composable.
- Update package generation is repeatable and version-addressable.

## Display System Architecture

- display-orchestrator:
  - Computes current event/phase per role.
  - Exposes /display/{role}/current contract.
- display-api-interface:
  - Wraps PiSignage, FACTS ingestion, Google Calendar, and Microsoft Graph.
- display-calendar:
  - Aggregates/normalizes calendar streams.
  - Exposes /content/calendar.json.
- display-assignments:
  - Ingests FACTS CSV and normalizes assignments.
  - Exposes /content/assignments.json.
- display-schedule:
  - Owns period lookup and phase math helpers.
- display-frontend:
  - Polls role-aware orchestrator endpoint.
  - Renders countdowns, announcements, homework, calendar, and weather zones.

## PiSignage Integration Notes

- Treat PiSignage as orchestrated player infrastructure, not a code dependency.
- Never mutate PiSignage installation files from Otto scripts.
- Frontend URL assignment must be an explicit deploy-time operation.
- Keep PiSignage configs exportable before migration changes.

## Raspberry Pi Deployment Notes

- Install root must remain /opt/otto-display-system.
- Web frontend publish path remains separate from PiSignage internals.
- Auto-update must support cron-driven unattended refreshes.
- Rollback must restore prior package from local backup archives.
- Uninstall must remove only Otto Display System assets.

## Live Validation State (2026-08-18)

- Hosted install path validated against `http://192.168.2.23:8090`.
- Live Pi target validated: `pi@192.168.2.179`.
- Backend polling validated from Pi to `http://192.168.2.23:4180` endpoints.
- Hosted uninstall validated with `/opt/otto-display-system` removal.
- Hosted rollback validated with restore of `/opt/otto-display-system/current`.
- PiSignage safety policy remains in force: no writes to PiSignage paths.

## Schedule Logic

- Current period logic: now in [startsAt, endsAt).
- Next period logic: first period with startsAt > now.
- Orchestrator phase output includes current phase, next phase, and countdown seconds.
- Role payload includes zone configuration used by frontend renderer.

## Classroom Workflow Logic

- Hallway role emphasizes announcements and countdown.
- Sidewall role emphasizes assignment reminders and upcoming events.
- Backwall role emphasizes active phase support and weather/calendar context.
- Refresh loops should tolerate temporary backend failures with graceful fallback UI.

## Future Goals

- Replace PiSignage content orchestration with full Otto-native orchestration.
- Expand auth providers for district SSO standards.
- Add richer schedule-aware content slots and role-based policy engine.
- Promote single-Pi test workflow to fleet rollout playbook with canary update channels.

## Option C Architecture (2026-08-19)

- Global extension truth is maintained in `otto-extension-index` (cross-org index repo).
- Global dependency truth is maintained in `external/otto/otto-extension-index/dependencies.json`.
- Local workspace truth is maintained by Otto Kernel EDS and written to `runtime/extension-registry.json`.
- Runtime, CLI, and display-system extension lookups should use EDS, not hardcoded extension wiring or static dependency lists.
- Command/API access for EDS is routed through command-service contracts (`eds.*`).

## Display Control System Authority (2026-09-01)

- `external/otto/otto-display-control-system` is now the reusable appearance authority repository.
- Appearance source-of-truth (themes, colors, typography, motion defaults) belongs in DCS contracts.
- Runtime and Dev UI consumers should read DCS contract data and avoid duplicating style authority in behavior modules.
- Behavior ownership remains in orchestrator and command-service layers.

## GitHub Sync Notes (2026-09-01)

- New reusable repo pushed: https://github.com/ronaldarroyowatson/otto-display-control-system
- Root monorepo now tracks `external/otto/otto-display-control-system` as a gitlink pointer commit.
- After Pi deploys that include runtime route additions, restart `otto-display-system.service` to ensure new routes are active.
