export interface AssignmentRecord {
  course: string;
  title: string;
  dueAt: string;
  notes?: string;
}

export class AssignmentIngestionPipeline {
  async importCsv(filePath: string): Promise<AssignmentRecord[]> {
    if (!filePath) {
      throw new Error("A CSV file path is required.");
    }

    return [];
  }
}
