import fs from "node:fs";
import path from "node:path";

export type DataRescanResult = {
  scannedPath: string;
  entryCount: number;
  generatedAt: string;
};

export function runDataRescan(scannedPath: string): DataRescanResult {
  const normalizedPath = path.resolve(scannedPath);
  const entries = fs.existsSync(normalizedPath)
    ? fs.readdirSync(normalizedPath, { withFileTypes: true })
    : [];

  return {
    scannedPath: normalizedPath,
    entryCount: entries.length,
    generatedAt: new Date().toISOString()
  };
}
