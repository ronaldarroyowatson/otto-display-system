/**
 * Calendar Commands
 * Internal command registration for calendar operations via command-service.
 */

import { CalendarConnectorCore, type TokenProvider } from "./calendar-core.js";
import {
  type CalendarEventListRequest,
  type CalendarEventListResponse,
  type CalendarSyncRequest,
  type CalendarSyncResponse
} from "./calendar-schema.js";

export interface CommandServiceContext {
  executeCommand(commandName: string, payload: unknown): Promise<unknown>;
}

/**
 * Create a token provider that bridges to auth commands via command-service.
 */
function createTokenProvider(context: CommandServiceContext): TokenProvider {
  return {
    async getToken(providerId: string) {
      try {
        const result = (await context.executeCommand("auth.get.token", {
          providerId
        })) as { value: string } | null;
        return result?.value || null;
      } catch {
        return null;
      }
    },

    async getUser(providerId: string) {
      try {
        const result = (await context.executeCommand("auth.get.user", {
          providerId
        })) as { email: string; name: string } | null;
        return result;
      } catch {
        return null;
      }
    }
  };
}

export function registerCalendarCommands(context: CommandServiceContext) {
  const tokenProvider = createTokenProvider(context);
  const core = new CalendarConnectorCore(tokenProvider);

  return {
    async listEvents(request: CalendarEventListRequest): Promise<CalendarEventListResponse> {
      return core.listEvents(request);
    },

    async syncProviders(request: CalendarSyncRequest): Promise<CalendarSyncResponse> {
      return core.syncProviders(request);
    },

    async getProviderConfig(providerId?: string) {
      return core.getProviderConfig(providerId);
    },

    async setProviderConfig(providerId: string, clientId: string, clientSecret: string) {
      return core.setProviderConfig(providerId, clientId, clientSecret);
    }
  };
}
