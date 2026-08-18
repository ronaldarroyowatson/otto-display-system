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
  - Exposes /display/<role>/current contract.
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

- Install root must remain /install/otto-display-system.
- Web frontend publish path remains separate from PiSignage internals.
- Auto-update must support cron-driven unattended refreshes.
- Rollback must restore prior package from local backup archives.
- Uninstall must remove only Otto Display System assets.

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
