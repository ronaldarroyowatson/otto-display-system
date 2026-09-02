/**
 * Google Calendar Client
 * Retrieves and normalizes events from Google Calendar via Calendar API.
 */

import { CalendarEvent } from "../calendar-schema.js";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  organizer?: {
    displayName: string;
    email: string;
  };
  attendees?: Array<{
    displayName: string;
    email: string;
    responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
  }>;
  recurringEventId?: string;
  recurrence?: string[]; // Array of RRULE strings
  categories?: string[];
  transparency: "opaque" | "transparent"; // opaque = busy
}

export class GoogleCalendarClient {
  private token: string;
  private calendarId: string = "primary";

  constructor(token: string) {
    this.token = token;
  }

  async listEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?` +
      `timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&maxResults=2500&singleEvents=true`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Google Calendar API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
    const events = data.items || [];

    return events.map((event) => this.normalizeEvent(event));
  }

  private normalizeEvent(event: GoogleCalendarEvent): CalendarEvent {
    const startTime = event.start.dateTime || `${event.start.date}T00:00:00Z`;
    const endTime = event.end.dateTime || `${event.end.date}T23:59:59Z`;
    const isAllDay = !event.start.dateTime;

    return {
      id: event.id,
      providerId: "google",
      title: event.summary,
      description: event.description,
      startTime,
      endTime,
      isAllDay,
      location: event.location,
      organizer: event.organizer
        ? {
            name: event.organizer.displayName || event.organizer.email,
            email: event.organizer.email
          }
        : undefined,
      attendees: event.attendees?.map((att) => ({
        name: att.displayName || att.email,
        email: att.email,
        status: att.responseStatus as "accepted" | "declined" | "tentative" | "needs-action"
      })),
      isRecurring: !!event.recurringEventId,
      recurrenceRule: event.recurrence?.join("\n"),
      categories: event.categories,
      isBusy: event.transparency === "opaque",
      raw: event
    };
  }
}
