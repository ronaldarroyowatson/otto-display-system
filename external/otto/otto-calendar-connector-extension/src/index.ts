/**
 * Otto Calendar Connector Extension Exports
 */

export { CalendarConnectorCore, type TokenProvider } from "./calendar-core.js";
export {
  type CalendarEvent,
  type CalendarEventListRequest,
  type CalendarEventListResponse,
  type CalendarProviderConfig,
  type CalendarSyncRequest,
  type CalendarSyncResponse
} from "./calendar-schema.js";
export { registerCalendarCommands, type CommandServiceContext } from "./calendar-commands.js";
export { MicrosoftGraphCalendarClient, type MicrosoftGraphEvent } from "./providers/microsoft-graph-client.js";
export { GoogleCalendarClient, type GoogleCalendarEvent } from "./providers/google-calendar-client.js";
