import type { OrchestratorSettings } from "../settings/OrchestratorSettings.js";

export interface DisplayConfigPage {
  id: string;
  label: string;
  modules: string[];
}

export interface DisplayConfigDocument {
  defaults?: {
    displayId?: string;
  };
  displays?: Record<string, { pages: DisplayConfigPage[]; cycleInterval?: number }>;
}

export interface RotationPlan {
  generatedAt: string;
  displayId: string;
  rotationMode: OrchestratorSettings["rotationMode"];
  rotationIntervalMs: number;
  pages: DisplayConfigPage[];
  triggers: {
    weather: OrchestratorSettings["weatherTriggers"];
    schedule: OrchestratorSettings["scheduleTriggers"];
    phase: OrchestratorSettings["phaseTriggers"];
  };
}

function titleCase(input: string): string {
  return `${input.slice(0, 1).toUpperCase()}${input.slice(1)}`;
}

function uniqueById(pages: DisplayConfigPage[]): DisplayConfigPage[] {
  const seen = new Set<string>();
  const next: DisplayConfigPage[] = [];

  for (const page of pages) {
    if (seen.has(page.id)) continue;
    seen.add(page.id);
    next.push(page);
  }

  return next;
}

export function generateRotationPlan(
  config: DisplayConfigDocument,
  settings: OrchestratorSettings
): RotationPlan {
  const displayId = config.defaults?.displayId ?? "hallway";
  const display = config.displays?.[displayId] ?? { pages: [] };
  const allPages = Array.isArray(display.pages) ? display.pages : [];

  const contractPages = settings.enabledPages.map((pageId) => {
    const fromConfig = allPages.find((page) => page.id === pageId);
    if (fromConfig) {
      return fromConfig;
    }

    return {
      id: pageId,
      label: `${titleCase(pageId)} Page`,
      modules: [pageId]
    };
  });

  const isEnabled = (pageId: string): boolean => {
    return settings.enabledPages.length === 0 || settings.enabledPages.includes(pageId);
  };

  let pages = contractPages.length > 0 ? contractPages : allPages.slice(0, 1);

  if (settings.rotationMode === "weather" && settings.weatherTriggers.severeWeather) {
    const weather = isEnabled("weather")
      ? allPages.find((page) => page.id === "weather")
      : undefined;
    if (weather) {
      pages = [weather, ...pages];
    }
  }

  if (settings.rotationMode === "schedule" && settings.scheduleTriggers.classChange) {
    const hallway = isEnabled("hallway")
      ? pages.find((page) => page.id === "hallway") ?? allPages.find((page) => page.id === "hallway")
      : undefined;
    if (hallway) {
      pages = [hallway, ...pages];
    }
  }

  if (settings.rotationMode === "phase" && settings.phaseTriggers.assembly) {
    const timePage = isEnabled("time")
      ? pages.find((page) => page.id === "time") ?? allPages.find((page) => page.id === "time")
      : undefined;
    if (timePage) {
      pages = [timePage, ...pages];
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    displayId,
    rotationMode: settings.rotationMode,
    rotationIntervalMs: settings.rotationIntervalMs,
    pages: uniqueById(pages),
    triggers: {
      weather: settings.weatherTriggers,
      schedule: settings.scheduleTriggers,
      phase: settings.phaseTriggers
    }
  };
}
