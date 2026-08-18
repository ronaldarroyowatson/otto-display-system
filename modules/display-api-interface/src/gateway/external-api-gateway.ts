import { FactsClientPlaceholder, type FactsClient } from "../clients/facts-client.js";
import { GoogleCalendarClientPlaceholder, type GoogleCalendarClient } from "../clients/google-calendar-client.js";
import { MicrosoftGraphCalendarClientPlaceholder, type MicrosoftGraphCalendarClient } from "../clients/microsoft-graph-calendar-client.js";
import { PiSignageClientPlaceholder, type PiSignageClient } from "../clients/pisignage-client.js";

export class ExternalApiGateway {
  constructor(
    private readonly pisignageClient: PiSignageClient = new PiSignageClientPlaceholder(),
    private readonly factsClient: FactsClient = new FactsClientPlaceholder(),
    private readonly googleClient: GoogleCalendarClient = new GoogleCalendarClientPlaceholder(),
    private readonly microsoftClient: MicrosoftGraphCalendarClient = new MicrosoftGraphCalendarClientPlaceholder()
  ) {}

  async syncAll(): Promise<void> {
    await Promise.all([
      this.factsClient.importCsv(""),
      this.googleClient.getEvents("default"),
      this.microsoftClient.getEvents("default")
    ]);

    await this.pisignageClient.pushPlaylist("default-player", "/display/frontend");
  }
}
