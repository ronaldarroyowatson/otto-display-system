/**
 * Normalized Calendar Event Schema
 * All providers (Microsoft, Google) are normalized to this common format.
 */

export interface CalendarEvent {
  id: string; // Unique event ID (provider-specific)
  providerId: string; // 'microsoft' or 'google'
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  isAllDay: boolean;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    status?: "accepted" | "declined" | "tentative" | "needs-action";
  }>;
  isRecurring: boolean;
  recurrenceRule?: string; // RFC 5545 RRULE format
  categories?: string[]; // Tags/categories
  isBusy: boolean;
  raw?: Record<string, unknown>; // Original provider payload for debugging
}

export interface CalendarEventListRequest {
  providerId?: string; // If omitted, use all configured providers
  startDate: string; // ISO 8601 date
  endDate: string; // ISO 8601 date
  includeRaw?: boolean; // If true, include raw provider payload
}

export interface CalendarEventListResponse {
  events: CalendarEvent[];
  totalCount: number;
  provider: string;
  requestedRange: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  warnings?: string[];
}

export interface CalendarProviderConfig {
  providerId: string;
  name: string;
  isConfigured: boolean;
  isAuthenticated: boolean;
  lastSyncAt?: string;
  error?: string; // Error message if sync failed
}

export interface CalendarSyncRequest {
  providerId?: string; // If omitted, sync all configured providers
}

export interface CalendarSyncResponse {
  providers: Array<{
    providerId: string;
    status: "success" | "failed" | "skipped";
    eventCount?: number;
    error?: string;
    syncedAt?: string;
  }>;
  totalEventCount: number;
  generatedAt: string;
}
