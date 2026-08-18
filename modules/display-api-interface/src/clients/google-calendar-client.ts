export interface GoogleCalendarClient {
  getEvents(calendarId: string): Promise<Record<string, unknown>[]>;
}

export class GoogleCalendarClientPlaceholder implements GoogleCalendarClient {
  async getEvents(): Promise<Record<string, unknown>[]> {
    return [];
  }
}
