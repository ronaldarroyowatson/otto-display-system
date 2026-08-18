export interface PiSignageClient {
  pushPlaylist(playerId: string, playlistUrl: string): Promise<void>;
}

export class PiSignageClientPlaceholder implements PiSignageClient {
  async pushPlaylist(): Promise<void> {
    throw new Error("PiSignage integration is not configured yet.");
  }
}
