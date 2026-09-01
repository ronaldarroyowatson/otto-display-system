export type TimeDisplayFormat = "12h" | "24h";
export type TimeDisplayStyle = "digital" | "analog";
export type PageKind = "url" | "inline-code" | "time" | "weather" | "custom" | "emergency";
export type TriggerPhase = "chapel" | "assembly" | "emergency" | "lockdown" | "fire-drill";

export interface TimePageSettings {
  timeZone: string;
  useDaylightSavings: boolean;
  format: TimeDisplayFormat;
  style: TimeDisplayStyle;
  showSeconds: boolean;
  leadingZero: boolean;
}

export interface WeatherPageSettings {
  units: "F" | "C";
  iconPack: string;
  severeWeatherOverride: boolean;
}

export interface CustomPageSettings {
  inlineCode?: string;
  url?: string;
  assetFolder?: string;
}

export interface EmergencyPageSettings {
  expiryTime?: string;
  severity: "low" | "medium" | "high" | "critical";
  overrideBehavior: "suppress-all" | "tier-only";
}

export interface PageSettings {
  id: string;
  name: string;
  type: PageKind;
  enabled: boolean;
  tier: number;
  displayId: string;
  deleted: boolean;
  deletedAt?: string;
  displayDurationMs: number;
  triggers: {
    timeBased: boolean;
    scheduleBased: boolean;
    weatherBased: boolean;
    phaseBased: boolean;
    scheduleEvent?: string;
    weatherCondition?: string;
    phase?: TriggerPhase;
  };
  timeSettings?: TimePageSettings;
  weatherSettings?: WeatherPageSettings;
  customSettings?: CustomPageSettings;
  emergencySettings?: EmergencyPageSettings;
}

export interface OrchestratorSettings {
  pages: Record<string, PageSettings>;
  tierList: number[];
  tierNames?: Record<string, string>;
  playlistOrder?: "priority" | "shuffle";
  shuffleSeed?: number;
  manualPageOrder?: string[];
}

export const EMERGENCY_TIER = 0;

function defaultTimeSettings(): TimePageSettings {
  return {
    timeZone: "UTC",
    useDaylightSavings: true,
    format: "24h",
    style: "digital",
    showSeconds: true,
    leadingZero: true
  };
}

function defaultWeatherSettings(): WeatherPageSettings {
  return {
    units: "F",
    iconPack: "default",
    severeWeatherOverride: true
  };
}

function defaultEmergencySettings(): EmergencyPageSettings {
  return {
    expiryTime: undefined,
    severity: "critical",
    overrideBehavior: "suppress-all"
  };
}

function normalizeTierList(input: unknown): number[] {
  const raw = Array.isArray(input) ? input : [];
  const unique: number[] = [];

  for (const entry of raw) {
    const tier = Number(entry);
    if (!Number.isInteger(tier) || tier < 0) continue;
    if (unique.includes(tier)) continue;
    unique.push(tier);
  }

  if (!unique.includes(EMERGENCY_TIER)) {
    unique.unshift(EMERGENCY_TIER);
  }

  return [EMERGENCY_TIER, ...unique.filter((tier) => tier !== EMERGENCY_TIER)];
}

export function createDefaultPageSettings(pageId: string, pageName = pageId, pageType: PageKind = "custom"): PageSettings {
  const normalizedType: PageKind = pageType === "custom" && pageId === "time"
    ? "time"
    : pageType === "custom" && pageId === "weather"
      ? "weather"
      : pageType === "custom" && pageId === "emergency"
        ? "emergency"
        : pageType;
  const isTimePage = normalizedType === "time" || pageId === "time" || pageName.toLowerCase().includes("time");
  const isWeatherPage = normalizedType === "weather" || pageId === "weather";
  const isEmergencyPage = normalizedType === "emergency" || pageId === "emergency";

  return {
    id: pageId,
    name: pageName,
    type: normalizedType,
    enabled: true,
    tier: isEmergencyPage ? EMERGENCY_TIER : 1,
    displayId: "hallway",
    deleted: false,
    displayDurationMs: 30000,
    triggers: {
      timeBased: !isWeatherPage && !isEmergencyPage,
      scheduleBased: false,
      weatherBased: isWeatherPage,
      phaseBased: isEmergencyPage,
      scheduleEvent: "classChange",
      weatherCondition: isEmergencyPage ? "severe" : "any",
      phase: isEmergencyPage ? "emergency" : "assembly"
    },
    timeSettings: isTimePage ? defaultTimeSettings() : undefined,
    weatherSettings: isWeatherPage ? defaultWeatherSettings() : undefined,
    customSettings: normalizedType === "custom" || normalizedType === "inline-code" || normalizedType === "url"
      ? { inlineCode: "", url: "", assetFolder: "" }
      : undefined,
    emergencySettings: isEmergencyPage ? defaultEmergencySettings() : undefined
  };
}

export const defaultOrchestratorSettings: OrchestratorSettings = {
  tierList: [0, 1, 2, 3],
  tierNames: {
    "0": "Emergency",
    "1": "Tier 1",
    "2": "Tier 2",
    "3": "Tier 3"
  },
  playlistOrder: "priority",
  shuffleSeed: undefined,
  manualPageOrder: ["hallway", "weather", "time"],
  pages: {
    hallway: createDefaultPageSettings("hallway", "Hallway", "custom"),
    weather: createDefaultPageSettings("weather", "Weather", "weather"),
    time: createDefaultPageSettings("time", "Time", "time")
  }
};

function normalizeTierNames(input: unknown, tierList: number[]): Record<string, string> {
  const source = (input ?? {}) as Record<string, unknown>;
  const names: Record<string, string> = {
    "0": "Emergency"
  };

  for (const tier of tierList) {
    const key = String(tier);
    if (key === "0") continue;
    const value = source[key];
    names[key] = typeof value === "string" && value.trim() ? value.trim() : `Tier ${tier}`;
  }

  return names;
}

function normalizeManualPageOrder(input: unknown, pageIds: string[]): string[] {
  const source = Array.isArray(input) ? input.filter((entry): entry is string => typeof entry === "string") : [];
  const ordered = source.filter((entry) => pageIds.includes(entry));
  for (const pageId of pageIds) {
    if (!ordered.includes(pageId)) {
      ordered.push(pageId);
    }
  }
  return ordered;
}

function normalizeDuration(input: unknown): number {
  const value = Number(input);
  if (!Number.isFinite(value)) return 30000;
  return Math.min(300000, Math.max(5000, Math.round(value)));
}

function normalizeTimeSettings(input: unknown): PageSettings["timeSettings"] {
  const candidate = (input ?? {}) as Record<string, unknown>;
  const format = candidate.format === "12h" ? "12h" : "24h";
  const style = candidate.style === "analog" ? "analog" : "digital";
  return {
    timeZone: typeof candidate.timeZone === "string" && candidate.timeZone.trim() ? candidate.timeZone : "UTC",
    useDaylightSavings: candidate.useDaylightSavings !== false,
    format,
    style,
    showSeconds: candidate.showSeconds !== false,
    leadingZero: candidate.leadingZero !== false
  };
}

function normalizeWeatherSettings(input: unknown): WeatherPageSettings {
  const candidate = (input ?? {}) as Record<string, unknown>;
  return {
    units: candidate.units === "C" ? "C" : "F",
    iconPack: typeof candidate.iconPack === "string" && candidate.iconPack.trim() ? candidate.iconPack : "default",
    severeWeatherOverride: candidate.severeWeatherOverride !== false
  };
}

function normalizeCustomSettings(input: unknown): CustomPageSettings {
  const candidate = (input ?? {}) as Record<string, unknown>;
  return {
    inlineCode: typeof candidate.inlineCode === "string" ? candidate.inlineCode : "",
    url: typeof candidate.url === "string" ? candidate.url : "",
    assetFolder: typeof candidate.assetFolder === "string" ? candidate.assetFolder : ""
  };
}

function normalizeEmergencySettings(input: unknown): EmergencyPageSettings {
  const candidate = (input ?? {}) as Record<string, unknown>;
  return {
    expiryTime: typeof candidate.expiryTime === "string" && candidate.expiryTime.trim() ? candidate.expiryTime : undefined,
    severity: candidate.severity === "low" || candidate.severity === "medium" || candidate.severity === "high" ? candidate.severity : "critical",
    overrideBehavior: candidate.overrideBehavior === "tier-only" ? "tier-only" : "suppress-all"
  };
}

function normalizePageType(input: unknown, fallbackId: string): PageKind {
  if (input === "url" || input === "inline-code" || input === "time" || input === "weather" || input === "custom" || input === "emergency") {
    return input;
  }
  if (fallbackId === "time") return "time";
  if (fallbackId === "weather") return "weather";
  if (fallbackId === "emergency") return "emergency";
  return "custom";
}

export function normalizePageSettings(input: Partial<PageSettings> | undefined, fallbackId: string): PageSettings {
  const type = normalizePageType(input?.type, fallbackId);
  const base = createDefaultPageSettings(fallbackId, input?.name ?? fallbackId, type);
  const raw = (input ?? {}) as Partial<PageSettings>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name : base.name;
  const isTimePage = type === "time" || id === "time" || name.toLowerCase().includes("time");
  const isWeatherPage = type === "weather" || id === "weather";
  const isEmergencyPage = type === "emergency" || id === "emergency";
  const tierValue = Number(raw.tier ?? base.tier);
  const normalizedTier = isEmergencyPage ? EMERGENCY_TIER : Number.isInteger(tierValue) && tierValue >= 1 ? tierValue : 1;
  const deleted = raw.deleted === true;
  const deletedAt = deleted
    ? (typeof raw.deletedAt === "string" && raw.deletedAt.trim() ? raw.deletedAt : new Date().toISOString())
    : undefined;

  return {
    id,
    name,
    type,
    enabled: isEmergencyPage ? true : (deleted ? false : raw.enabled !== false),
    tier: normalizedTier,
    displayId: typeof raw.displayId === "string" && raw.displayId.trim() ? raw.displayId : "hallway",
    deleted,
    deletedAt,
    displayDurationMs: normalizeDuration(raw.displayDurationMs),
    triggers: {
      timeBased: isEmergencyPage ? false : raw.triggers?.timeBased !== false,
      scheduleBased: Boolean(raw.triggers?.scheduleBased),
      weatherBased: isWeatherPage || Boolean(raw.triggers?.weatherBased),
      phaseBased: isEmergencyPage || Boolean(raw.triggers?.phaseBased),
      scheduleEvent: typeof raw.triggers?.scheduleEvent === "string" ? raw.triggers.scheduleEvent : base.triggers.scheduleEvent,
      weatherCondition: typeof raw.triggers?.weatherCondition === "string" ? raw.triggers.weatherCondition : base.triggers.weatherCondition,
      phase: raw.triggers?.phase === "chapel" || raw.triggers?.phase === "assembly" || raw.triggers?.phase === "emergency" || raw.triggers?.phase === "lockdown" || raw.triggers?.phase === "fire-drill"
        ? raw.triggers.phase
        : base.triggers.phase
    },
    timeSettings: isTimePage ? normalizeTimeSettings(raw.timeSettings) : undefined,
    weatherSettings: isWeatherPage ? normalizeWeatherSettings(raw.weatherSettings) : undefined,
    customSettings: type === "custom" || type === "inline-code" || type === "url" ? normalizeCustomSettings(raw.customSettings) : undefined,
    emergencySettings: isEmergencyPage ? normalizeEmergencySettings(raw.emergencySettings) : undefined
  };
}

export function normalizeOrchestratorSettings(input: Partial<OrchestratorSettings> = {}): OrchestratorSettings {
  const rawPages = (input.pages ?? {}) as Record<string, Partial<PageSettings>>;
  const pages: Record<string, PageSettings> = {};

  for (const [pageId, pageSettings] of Object.entries(rawPages)) {
    pages[pageId] = normalizePageSettings(pageSettings, pageId);
  }

  if (Object.keys(pages).length === 0) {
    return defaultOrchestratorSettings;
  }

  const tierList = normalizeTierList(input.tierList);
  const maxTier = Math.max(1, ...Object.values(pages).map((page) => page.tier));
  const expanded = [...tierList];
  for (let tier = 1; tier <= maxTier; tier += 1) {
    if (!expanded.includes(tier)) {
      expanded.push(tier);
    }
  }

  return {
    pages,
    tierList: normalizeTierList(expanded),
    tierNames: normalizeTierNames(input.tierNames, normalizeTierList(expanded)),
    playlistOrder: input.playlistOrder === "shuffle" ? "shuffle" : "priority",
    shuffleSeed: Number.isFinite(Number(input.shuffleSeed)) ? Number(input.shuffleSeed) : undefined,
    manualPageOrder: normalizeManualPageOrder(input.manualPageOrder, Object.keys(pages))
  };
}
