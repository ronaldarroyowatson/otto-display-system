export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  source: "google" | "outlook";
}

export class CalendarAggregator {
  async refresh(): Promise<CalendarEvent[]> {
    return [];
  }
}
