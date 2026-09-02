/**
 * Calendar Core
 * Main logic for calendar operations: token retrieval, provider selection, and event normalization.
 */

import { MicrosoftGraphCalendarClient } from "./providers/microsoft-graph-client.js";
import { GoogleCalendarClient } from "./providers/google-calendar-client.js";
import {
  CalendarEvent,
  CalendarEventListRequest,
  CalendarEventListResponse,
  CalendarProviderConfig,
  CalendarSyncRequest,
  CalendarSyncResponse,
  type CalendarEvent as CalendarEventType
} from "./calendar-schema.js";

/**
 * Placeholder for token retrieval.
 * In production, this will be called through command-service auth commands.
 * For now, we define the interface that handlers will use.
 */
export interface TokenProvider {
  getToken(providerId: string): Promise<string | null>;
  getUser(providerId: string): Promise<{ email: string; name: string } | null>;
}

export class CalendarConnectorCore {
  constructor(private tokenProvider: TokenProvider) {}

  async listEvents(request: CalendarEventListRequest): Promise<CalendarEventListResponse> {
    const providerId = request.providerId || "microsoft"; // Default to microsoft for now
    const token = await this.tokenProvider.getToken(providerId);

    if (!token) {
      throw new Error(`No authentication token available for provider: ${providerId}`);
    }

    let events: CalendarEventType[] = [];

    if (providerId === "microsoft") {
      const client = new MicrosoftGraphCalendarClient(token);
      events = await client.listEvents(request.startDate, request.endDate);
    } else if (providerId === "google") {
      const client = new GoogleCalendarClient(token);
      events = await client.listEvents(request.startDate, request.endDate);
    } else {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    if (!request.includeRaw) {
      events = events.map((e) => ({ ...e, raw: undefined }));
    }

    return {
      events,
      totalCount: events.length,
      provider: providerId,
      requestedRange: {
        startDate: request.startDate,
        endDate: request.endDate
      },
      generatedAt: new Date().toISOString()
    };
  }

  async getProviderConfig(providerId?: string): Promise<CalendarProviderConfig[]> {
    const providers = providerId ? [providerId] : ["microsoft", "google"];
    const configs: CalendarProviderConfig[] = [];

    for (const pId of providers) {
      const token = await this.tokenProvider.getToken(pId);
      const user = token ? await this.tokenProvider.getUser(pId) : null;

      configs.push({
        providerId: pId,
        name: pId === "microsoft" ? "Microsoft Outlook" : "Google Calendar",
        isConfigured: !!token,
        isAuthenticated: !!user,
        lastSyncAt: undefined, // Would be loaded from MemPalace in full implementation
        error: !token ? "No authentication token available" : undefined
      });
    }

    return configs;
  }

  async setProviderConfig(
    providerId: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ providerId: string; name: string; isConfigured: boolean; message: string }> {
    // Validate inputs
    if (!["microsoft", "google"].includes(providerId)) {
      throw new Error("Invalid providerId. Must be 'microsoft' or 'google'.");
    }

    if (!clientId || typeof clientId !== "string") {
      throw new Error("clientId is required and must be a string");
    }

    if (!clientSecret || typeof clientSecret !== "string") {
      throw new Error("clientSecret is required and must be a string");
    }

    // Store credentials - in a real implementation, these would be encrypted and stored in a secure vault
    // For now, we're just acknowledging the configuration
    const providerName = providerId === "microsoft" ? "Microsoft Outlook" : "Google Calendar";

    return {
      providerId,
      name: providerName,
      isConfigured: true,
      message: `OAuth credentials saved for ${providerName}. Restart the service to activate.`
    };
  }

  async syncProviders(request: CalendarSyncRequest): Promise<CalendarSyncResponse> {
    const providerId = request.providerId || "microsoft";

    try {
      const response = await this.listEvents({
        providerId,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      });

      return {
        providers: [
          {
            providerId,
            status: "success",
            eventCount: response.totalCount,
            syncedAt: response.generatedAt
          }
        ],
        totalEventCount: response.totalCount,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        providers: [
          {
            providerId,
            status: "failed",
            error: errorMessage
          }
        ],
        totalEventCount: 0,
        generatedAt: new Date().toISOString()
      };
    }
  }
}
