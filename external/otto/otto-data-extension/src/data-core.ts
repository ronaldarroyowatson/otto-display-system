export type DataBlobRecord = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  checksum?: string;
};

export function createDataBlobRecord(name: string, size: number): DataBlobRecord {
  return {
    id: `blob-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    size,
    createdAt: new Date().toISOString()
  };
}

export function summarizeBlobRecords(records: DataBlobRecord[]) {
  return {
    count: records.length,
    totalBytes: records.reduce((total, record) => total + record.size, 0)
  };
}
