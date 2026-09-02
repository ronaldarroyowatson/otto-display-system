# Otto Calendar Connector Extension Instructions

## Architectural Principles
- Extensions MUST NOT define API or CLI commands directly.
- All commands MUST be routed through the Otto Command Service Layer.
- Token retrieval MUST delegate to `auth.get.token` command; never store credentials.
- Provider clients MUST be stateless and only access auth/cache through command-service.

## Forbidden Actions
- Do not implement HTTP routes, REST handlers, GraphQL handlers, or server entrypoints.
- Do not add CLI parsers, shell command surfaces, or direct process argument parsing.
- Do not store OAuth tokens, refresh tokens, or any credentials in-memory or on disk.
- Do not invoke provider APIs directly; always use clients that bridge through token commands.
- Do not hard-code provider configuration; load from MemPalace or command payload.

## Command Generation Rules
- Calendar workflows are internal; route all queries through command-service.
- Keep calendar event payloads deterministic and schema-compliant.
- Normalize provider-specific event formats immediately upon retrieval.
- Fail with clear error messages when tokens are missing or expired.

## Extension Development Rules
- Keep code scoped to providers, normalization services, and internal commands.
- Persist sync metadata and provider state to MemPalace rooms.
- Delegate all auth operations to `auth.get.token` and `auth.get.user` commands.
- Expect callers to use `executeRoutedCommand('calendar.list.events', payload)` only.

## Testing Strategy
- Mock provider API responses in provider client tests.
- Test normalization with realistic provider event payloads.
- Verify command contracts match command-service schema definitions.
- Test error cases: missing token, API unavailable, malformed event.

## Dependency Rules
- Depends on: `otto.auth.extension` (for token retrieval).
- Does NOT depend on: display-specific modules or runtime.
- Other modules depend on this through command-service only.
