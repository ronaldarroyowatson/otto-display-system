export interface MicrosoftGraphCalendarClient {
  getEvents(userId: string): Promise<Record<string, unknown>[]>;
}

export class MicrosoftGraphCalendarClientPlaceholder implements MicrosoftGraphCalendarClient {
  async getEvents(): Promise<Record<string, unknown>[]> {
    return [];
  }
}
