/**
 * Microsoft Graph Calendar Client
 * Retrieves and normalizes events from Microsoft Outlook/Exchange via Graph API.
 */

import { CalendarEvent } from "./calendar-schema.js";

export interface MicrosoftGraphEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay: boolean;
  location?: {
    displayName: string;
  };
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: "accepted" | "declined" | "tentativelyAccepted" | "notResponded";
    };
  }>;
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
      daysOfWeek?: string[];
      dayOfMonth?: number;
      month?: number;
    };
  };
  categories?: string[];
  showAs: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
}

export class MicrosoftGraphCalendarClient {
  private token: string;
  private calendarId: string = "calendar"; // Default calendar

  constructor(token: string) {
    this.token = token;
  }

  async listEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&$top=500`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Microsoft Graph API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = (await response.json()) as { value?: MicrosoftGraphEvent[] };
    const events = data.value || [];

    return events.map((event) => this.normalizeEvent(event));
  }

  private normalizeEvent(event: MicrosoftGraphEvent): CalendarEvent {
    return {
      id: event.id,
      providerId: "microsoft",
      title: event.subject,
      description: event.bodyPreview,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      isAllDay: event.isAllDay,
      location: event.location?.displayName,
      organizer: event.organizer
        ? {
            name: event.organizer.emailAddress.name,
            email: event.organizer.emailAddress.address
          }
        : undefined,
      attendees: event.attendees?.map((att) => ({
        name: att.emailAddress.name,
        email: att.emailAddress.address,
        status:
          att.status.response === "tentativelyAccepted"
            ? "tentative"
            : att.status.response === "notResponded"
              ? "needs-action"
              : (att.status.response as "accepted" | "declined" | "tentative" | "needs-action")
      })),
      isRecurring: !!event.recurrence,
      recurrenceRule: this.buildRRule(event.recurrence),
      categories: event.categories,
      isBusy: event.showAs === "busy" || event.showAs === "oof",
      raw: event
    };
  }

  private buildRRule(recurrence?: MicrosoftGraphEvent["recurrence"]): string | undefined {
    if (!recurrence?.pattern) {
      return undefined;
    }

    const pattern = recurrence.pattern;
    const parts = [`FREQ=${pattern.type?.toUpperCase() || "DAILY"}`];

    if (pattern.interval > 1) {
      parts.push(`INTERVAL=${pattern.interval}`);
    }

    if (pattern.daysOfWeek?.length) {
      parts.push(`BYDAY=${pattern.daysOfWeek.map((d) => d.substring(0, 2).toUpperCase()).join(",")}`);
    }

    return `RRULE:${parts.join(";")}`;
  }
}
