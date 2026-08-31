import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createDefaultPageSettings,
  normalizePageSettings,
  defaultOrchestratorSettings,
  normalizeOrchestratorSettings,
  type PageSettings,
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

  private normalizeLegacyOrCurrent(input: Record<string, unknown>): OrchestratorSettings {
    if (input.pages && typeof input.pages === "object") {
      return normalizeOrchestratorSettings(input as Partial<OrchestratorSettings>);
    }

    const enabledPages = Array.isArray(input.enabledPages)
      ? input.enabledPages.filter((entry): entry is string => typeof entry === "string")
      : ["hallway", "weather", "time"];
    const rotationIntervalMs = Number(input.rotationIntervalMs ?? 30000);
    const weatherMode = input.rotationMode === "weather";
    const scheduleMode = input.rotationMode === "schedule";
    const phaseMode = input.rotationMode === "phase";

    const pages: Record<string, PageSettings> = {
      hallway: normalizePageSettings(
        {
          ...createDefaultPageSettings("hallway", "Hallway"),
          enabled: enabledPages.includes("hallway"),
          displayDurationMs: rotationIntervalMs,
          triggers: {
            timeBased: !scheduleMode && !weatherMode && !phaseMode,
            scheduleBased: Boolean((input.scheduleTriggers as Record<string, unknown> | undefined)?.classChange),
            weatherBased: false,
            phaseBased: false
          }
        },
        "hallway"
      ),
      weather: normalizePageSettings(
        {
          ...createDefaultPageSettings("weather", "Weather"),
          enabled: enabledPages.includes("weather"),
          displayDurationMs: rotationIntervalMs,
          triggers: {
            timeBased: !weatherMode,
            scheduleBased: false,
            weatherBased: Boolean((input.weatherTriggers as Record<string, unknown> | undefined)?.severeWeather),
            phaseBased: false
          }
        },
        "weather"
      ),
      time: normalizePageSettings(
        {
          ...createDefaultPageSettings("time", "Time"),
          enabled: enabledPages.includes("time"),
          displayDurationMs: rotationIntervalMs,
          triggers: {
            timeBased: !phaseMode,
            scheduleBased: false,
            weatherBased: false,
            phaseBased: Boolean((input.phaseTriggers as Record<string, unknown> | undefined)?.assembly)
          }
        },
        "time"
      )
    };

    return normalizeOrchestratorSettings({ pages });
  }

  async get(): Promise<OrchestratorSettings> {
    try {
      const raw = await fs.readFile(this.settingsPath, "utf8");
      return this.normalizeLegacyOrCurrent(JSON.parse(raw) as Record<string, unknown>);
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

  async getPageSettings(pageId: string): Promise<PageSettings> {
    const settings = await this.get();
    return settings.pages[pageId] ?? createDefaultPageSettings(pageId, pageId);
  }

  async setPageSettings(pageId: string, patch: Partial<PageSettings>): Promise<PageSettings> {
    const settings = await this.get();
    const currentPage = settings.pages[pageId] ?? createDefaultPageSettings(pageId, pageId);
    const merged = deepMerge(
      currentPage as unknown as Record<string, unknown>,
      patch as unknown as Partial<Record<string, unknown>>
    );
    settings.pages[pageId] = normalizePageSettings(merged as Partial<PageSettings>, pageId);
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    return settings.pages[pageId];
  }

  async listPageSettings(): Promise<PageSettings[]> {
    const settings = await this.get();
    return Object.values(settings.pages);
  }
}
