import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultOrchestratorSettings,
  normalizeOrchestratorSettings,
  type OrchestratorSettings
} from "./OrchestratorSettings.js";

declare const process: { cwd(): string };

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const next: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      next[key] &&
      typeof next[key] === "object" &&
      !Array.isArray(next[key])
    ) {
      next[key] = deepMerge(
        next[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
      continue;
    }

    next[key] = value;
  }

  return next as T;
}

export class OrchestratorSettingsService {
  constructor(private readonly settingsPath = path.resolve(process.cwd(), "orchestrator.settings.json")) {}

  async get(): Promise<OrchestratorSettings> {
    try {
      const raw = await fs.readFile(this.settingsPath, "utf8");
      return normalizeOrchestratorSettings(JSON.parse(raw));
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        return defaultOrchestratorSettings;
      }
      throw error;
    }
  }

  async list(): Promise<OrchestratorSettings[]> {
    return [await this.get()];
  }

  async set(patch: Partial<OrchestratorSettings>): Promise<OrchestratorSettings> {
    const current = await this.get();
    const merged = deepMerge(
      current as unknown as Record<string, unknown>,
      patch as unknown as Partial<Record<string, unknown>>
    );

    const normalized = normalizeOrchestratorSettings(merged as Partial<OrchestratorSettings>);
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

    return normalized;
  }
}
