export interface FactsClient {
  importCsv(csvContent: string): Promise<Record<string, unknown>[]>;
}

export class FactsClientPlaceholder implements FactsClient {
  async importCsv(): Promise<Record<string, unknown>[]> {
    return [];
  }
}
