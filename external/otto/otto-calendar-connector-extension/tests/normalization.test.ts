import test from "node:test";
import assert from "node:assert/strict";
import {
  MicrosoftGraphCalendarClient,
  type MicrosoftGraphEvent
} from "../src/providers/microsoft-graph-client.js";

test("Microsoft Graph client normalizes event correctly", () => {
  const client = new MicrosoftGraphCalendarClient("fake-token");

  const mockEvent: MicrosoftGraphEvent = {
    id: "event-123",
    subject: "Team Standup",
    bodyPreview: "Daily sync",
    start: {
      dateTime: "2026-09-01T09:00:00",
      timeZone: "America/New_York"
    },
    end: {
      dateTime: "2026-09-01T09:30:00",
      timeZone: "America/New_York"
    },
    isAllDay: false,
    organizer: {
      emailAddress: {
        name: "Alice",
        address: "alice@example.com"
      }
    },
    showAs: "busy",
    attendees: [
      {
        emailAddress: {
          name: "Bob",
          address: "bob@example.com"
        },
        status: {
          response: "accepted"
        }
      }
    ]
  };

  // Access private method via any for testing
  const result = (client as any).normalizeEvent(mockEvent);

  assert.equal(result.id, "event-123");
  assert.equal(result.providerId, "microsoft");
  assert.equal(result.title, "Team Standup");
  assert.equal(result.isAllDay, false);
  assert.equal(result.isBusy, true);
  assert.ok(result.organizer);
  assert.equal(result.organizer.email, "alice@example.com");
  assert.ok(Array.isArray(result.attendees));
  assert.equal(result.attendees?.[0]?.status, "accepted");
});

test("Google Calendar client normalizes event correctly", async () => {
  const { GoogleCalendarClient, type GoogleCalendarEvent } = await import(
    "../src/providers/google-calendar-client.js"
  );

  const client = new GoogleCalendarClient("fake-token");

  const mockEvent = {
    id: "google-event-456",
    summary: "Project Review",
    description: "Q3 review",
    start: {
      dateTime: "2026-09-02T14:00:00",
      timeZone: "UTC"
    },
    end: {
      dateTime: "2026-09-02T15:00:00",
      timeZone: "UTC"
    },
    organizer: {
      displayName: "Carol",
      email: "carol@example.com"
    },
    transparency: "opaque"
  };

  // Access private method via any for testing
  const result = (client as any).normalizeEvent(mockEvent);

  assert.equal(result.id, "google-event-456");
  assert.equal(result.providerId, "google");
  assert.equal(result.title, "Project Review");
  assert.equal(result.isBusy, true);
});
