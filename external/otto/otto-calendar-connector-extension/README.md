# Otto Calendar Connector Extension

This repository provides the Otto calendar connector extension for ingesting and normalizing calendar events from Microsoft Exchange/Outlook and Google Calendar.

All command behavior is internal and routed through the Otto Command Service Layer. Token retrieval is delegated to the otto-auth-extension.

## Responsibilities

- Register internal calendar commands through the command-service layer.
- Bridge to Microsoft Graph API and Google Calendar API via auth-provided tokens.
- Normalize heterogeneous event formats into a common calendar event schema.
- Persist sync metadata and provider configuration in MemPalace.
- Fail gracefully when providers are unavailable or unconfigured.

## Command Contracts

- `calendar.list.events` – Retrieve normalized events for a date range.
- `calendar.sync` – Trigger provider sync and refresh event cache.
- `calendar.get.provider.config` – Get configured provider and its status.

## Supported Providers

- **Microsoft Exchange/Outlook** – via Microsoft Graph API (oauth provider: `microsoft`)
- **Google Calendar** – via Google Calendar API (oauth provider: `google`)

## Repository Layout

- `src/calendar-core.ts` – TypeScript domain logic for calendar operations and normalization.
- `src/calendar-commands.ts` – Internal in-process command registration.
- `src/calendar-runtime.mjs` – Runtime-safe bridge used by command-service handlers.
- `src/providers/microsoft-graph-client.ts` – Microsoft Graph API client.
- `src/providers/google-calendar-client.ts` – Google Calendar API client.
- `src/calendar-schema.ts` – Normalized calendar event types.
- `manifests/extension.json` – Extension metadata consumed by Otto extension registry.
- `tests/*.test.ts` – Node test coverage for normalization and provider logic.
- `mempalace/` – MemPalace rooms for sync metadata and provider state.

## How It Wires Into Otto

1. Register command schemas in `otto-command-service/src/schemas`.
2. Register command handlers in `otto-command-service/src/handlers`.
3. Point handlers to `src/calendar-runtime.mjs` in this repo.
4. Handlers call `auth.get.token` to retrieve provider tokens.
5. Display runtime and orchestrator consume calendar commands via `executeRoutedCommand()`.

## Integration Points

- Display runtime calls `calendar.list.events` during tier trigger-window evaluation.
- Orchestrator evaluates tier activation/expiry based on calendar event windows.
- Dev UI displays current event context for debugging.

## Local Development

1. Install dependencies: `pnpm --filter otto-calendar-connector-extension install`
2. Run tests: `pnpm --filter otto-calendar-connector-extension test`
3. Run typecheck: `pnpm --filter otto-calendar-connector-extension typecheck`

## Design Constraints

- Never expose API routes or CLI surfaces in this repo.
- Always retrieve tokens via `auth.get.token` command; never store credentials.
- Normalize events to common schema immediately upon retrieval.
- Fail gracefully when provider APIs are unavailable.
- Persist sync state and metadata in MemPalace, not in-memory.

## Validation

- `npm run typecheck`

## Testing

- Event normalization tests verify consistent schema across providers.
- Provider client tests mock API responses and verify field extraction.
- Command contract tests verify schema compliance with command-service.

## Future Enhancements

- Apple Calendar support (when provider is available).
- Calendar event cache with TTL-based refresh.
- Multi-calendar aggregation (e.g., both work and personal calendars).
- Recurrence rule expansion for recurring events.
