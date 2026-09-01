import {
  createDefaultPageSettings,
  type OrchestratorSettings,
  type PageSettings
} from "../settings/OrchestratorSettings.js";

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
  rotationMode: "per-page";
  rotationIntervalMs: number;
  pages: Array<DisplayConfigPage & {
    displayDurationMs: number;
    tier: number;
    deleted: boolean;
    displayId: string;
    triggers: PageSettings["triggers"];
    timeSettings?: PageSettings["timeSettings"];
    weatherSettings?: PageSettings["weatherSettings"];
    emergencySettings?: PageSettings["emergencySettings"];
  }>;
  currentPage?: {
    id: string;
    name: string;
    tier: number;
    triggerReason: string;
    countdownMs: number;
    expiry?: string;
  };
  nextPage?: {
    id: string;
    name: string;
    tier: number;
  };
  currentTier?: number;
  nextTier?: number;
  triggerReason: string;
  countdownMs: number;
  expiry?: string;
  bumpedBy?: string;
}

function titleCase(input: string): string {
  return `${input.slice(0, 1).toUpperCase()}${input.slice(1)}`;
}

function uniqueById<T extends { id: string }>(pages: T[]): T[] {
  const seen = new Set<string>();
  const next: T[] = [];

  for (const page of pages) {
    if (seen.has(page.id)) continue;
    seen.add(page.id);
    next.push(page);
  }

  return next;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

export function generateRotationPlan(
  config: DisplayConfigDocument,
  settings: OrchestratorSettings
): RotationPlan {
  const displayId = config.defaults?.displayId ?? "hallway";
  const display = config.displays?.[displayId] ?? { pages: [] };
  const allPages = Array.isArray(display.pages) ? display.pages : [];

  const allKnownPageIds = new Set<string>([
    ...allPages.map((page) => page.id),
    ...Object.keys(settings.pages ?? {})
  ]);

  const resolvedPages = Array.from(allKnownPageIds).map((pageId) => {
    const fromConfig = allPages.find((page) => page.id === pageId);
    const fallbackConfig = {
      id: pageId,
      label: `${titleCase(pageId)} Page`,
      modules: [pageId]
    };
    const page = fromConfig ?? fallbackConfig;
    const pageSettings = settings.pages?.[pageId] ?? createDefaultPageSettings(pageId, page.label);
    return {
      ...page,
      displayDurationMs: pageSettings.displayDurationMs,
      tier: pageSettings.tier ?? 1,
      deleted: pageSettings.deleted === true,
      displayId: pageSettings.displayId ?? displayId,
      triggers: pageSettings.triggers,
      timeSettings: pageSettings.timeSettings,
      weatherSettings: pageSettings.weatherSettings,
      emergencySettings: pageSettings.emergencySettings,
      _settings: pageSettings
    };
  });

  const tierList = Array.isArray(settings.tierList) && settings.tierList.length
    ? settings.tierList
    : [0, 1, 2, 3, 4];
  const playlistOrder = settings.playlistOrder === "shuffle" ? "shuffle" : "priority";
  const shuffleSeed = Number.isFinite(Number(settings.shuffleSeed)) ? Number(settings.shuffleSeed) : Date.now();
  const manualOrder = Array.isArray(settings.manualPageOrder) ? settings.manualPageOrder : [];
  const manualRank = new Map<string, number>();
  for (let i = 0; i < manualOrder.length; i += 1) {
    manualRank.set(manualOrder[i], i);
  }

  const tierRank = new Map<number, number>();
  for (let i = 0; i < tierList.length; i += 1) {
    tierRank.set(tierList[i], i);
  }

  const triggerActive = (page: typeof resolvedPages[number]): boolean => {
    const emergencyExpiry = page.emergencySettings?.expiryTime ? Date.parse(page.emergencySettings.expiryTime) : Number.NaN;
    const emergencyExpired = Number.isFinite(emergencyExpiry) && emergencyExpiry <= Date.now();

    if (page.tier === 0) {
      return page.triggers.phaseBased && !emergencyExpired;
    }

    return Boolean(
      page.triggers.timeBased ||
      page.triggers.scheduleBased ||
      page.triggers.weatherBased ||
      page.triggers.phaseBased
    );
  };

  let pages = resolvedPages.filter((page) => page._settings.enabled && !page._settings.deleted && triggerActive(page));

  const tierZeroPages = pages.filter((page) => page.tier === 0);
  const bumpedBy = tierZeroPages.length > 0 ? "tier-0-emergency" : undefined;
  if (tierZeroPages.length > 0) {
    pages = tierZeroPages;
  }

  pages.sort((a, b) => {
    const aTierRank = tierRank.has(a.tier) ? (tierRank.get(a.tier) as number) : Number.MAX_SAFE_INTEGER;
    const bTierRank = tierRank.has(b.tier) ? (tierRank.get(b.tier) as number) : Number.MAX_SAFE_INTEGER;
    if (aTierRank !== bTierRank) return aTierRank - bTierRank;

    if (playlistOrder === "shuffle") {
      const aHash = stableHash(`${a.id}:${shuffleSeed}`);
      const bHash = stableHash(`${b.id}:${shuffleSeed}`);
      if (aHash !== bHash) return aHash - bHash;
    } else {
      const aOrder = manualRank.has(a.id) ? (manualRank.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const bOrder = manualRank.has(b.id) ? (manualRank.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }

    return a.id.localeCompare(b.id);
  });

  if (pages.length === 0) {
    const fallbackPage = allPages[0] ?? {
      id: "hallway",
      label: "Hallway Page",
      modules: ["hallway"]
    };
    const fallbackSettings = settings.pages?.[fallbackPage.id] ?? createDefaultPageSettings(fallbackPage.id, fallbackPage.label);
    pages = [{
      ...fallbackPage,
      displayDurationMs: fallbackSettings.displayDurationMs,
      tier: fallbackSettings.tier ?? 1,
      deleted: fallbackSettings.deleted === true,
      displayId: fallbackSettings.displayId ?? displayId,
      triggers: fallbackSettings.triggers,
      timeSettings: fallbackSettings.timeSettings,
      weatherSettings: fallbackSettings.weatherSettings,
      emergencySettings: fallbackSettings.emergencySettings,
      _settings: fallbackSettings
    }];
  }

  const uniquePages = uniqueById(pages).map((page) => ({
    id: page.id,
    label: page.label,
    modules: page.modules,
    displayDurationMs: page.displayDurationMs,
    tier: page.tier,
    deleted: page.deleted,
    displayId: page.displayId,
    triggers: page.triggers,
    timeSettings: page.timeSettings,
    weatherSettings: page.weatherSettings,
    emergencySettings: page.emergencySettings
  }));

  const totalCycleMs = uniquePages.reduce((sum, page) => sum + page.displayDurationMs, 0);
  const nowMs = Date.now();
  let countdownMs = uniquePages[0]?.displayDurationMs ?? 30000;
  let currentIndex = 0;

  if (totalCycleMs > 0 && uniquePages.length > 0) {
    const cycleOffset = nowMs % totalCycleMs;
    let traversed = 0;
    for (let i = 0; i < uniquePages.length; i += 1) {
      const page = uniquePages[i];
      const end = traversed + page.displayDurationMs;
      if (cycleOffset < end) {
        currentIndex = i;
        countdownMs = end - cycleOffset;
        break;
      }
      traversed = end;
    }
  }

  const currentPage = uniquePages[currentIndex];
  const nextPage = uniquePages[(currentIndex + 1) % uniquePages.length];

  const reasonForPage = (page: typeof uniquePages[number]): string => {
    if (page.tier === 0) return "Tier 0 emergency override active";
    if (page.triggers.weatherBased) return "Weather trigger: severe weather active";
    if (page.triggers.scheduleBased) return "Waiting for class change";
    if (page.triggers.phaseBased) return "Emergency/phase trigger active";
    return `Waiting for time duration: ${Math.round(page.displayDurationMs / 1000)}s`;
  };

  const triggerReason = currentPage
    ? `${reasonForPage(currentPage)} (countdown: ${Math.ceil(countdownMs / 1000)}s)`
    : "No active page";

  return {
    generatedAt: new Date().toISOString(),
    displayId,
    rotationMode: "per-page",
    rotationIntervalMs: currentPage?.displayDurationMs ?? 30000,
    pages: uniquePages,
    currentPage: currentPage
      ? {
          id: currentPage.id,
          name: currentPage.label,
          tier: currentPage.tier,
          triggerReason: reasonForPage(currentPage),
          countdownMs,
          expiry: currentPage.emergencySettings?.expiryTime
        }
      : undefined,
    nextPage: nextPage
      ? {
          id: nextPage.id,
          name: nextPage.label,
          tier: nextPage.tier
        }
      : undefined,
    currentTier: currentPage?.tier,
    nextTier: nextPage?.tier,
    triggerReason,
    countdownMs,
    expiry: currentPage?.emergencySettings?.expiryTime,
    bumpedBy
  };
}
