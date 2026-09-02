/**
 * Calendar Runtime Bridge
 * Provides runtime-safe calendar operations for command-service handlers.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVIDER_CONFIG_PATH = path.join(EXT_ROOT, "mempalace", "calendar-provider-config.json");

const DEFAULT_PROVIDERS = {
  microsoft: {
    providerId: "microsoft",
    name: "Microsoft Outlook",
    isConfigured: false,
    clientId: "",
    clientSecret: "",
    isAuthenticated: false,
    lastSyncAt: null,
    error: "No OAuth credentials configured"
  },
  google: {
    providerId: "google",
    name: "Google Calendar",
    isConfigured: false,
    clientId: "",
    clientSecret: "",
    isAuthenticated: false,
    lastSyncAt: null,
    error: "No OAuth credentials configured"
  }
};

function cloneDefaultProviders() {
  return {
    microsoft: { ...DEFAULT_PROVIDERS.microsoft },
    google: { ...DEFAULT_PROVIDERS.google }
  };
}

async function loadProviderStore() {
  const store = cloneDefaultProviders();
  try {
    const raw = await fs.readFile(PROVIDER_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const providers = Array.isArray(parsed?.providers) ? parsed.providers : [];
    for (const entry of providers) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const providerId = String(entry.providerId ?? "").trim();
      if (!providerId || !store[providerId]) {
        continue;
      }
      store[providerId] = {
        ...store[providerId],
        clientId: typeof entry.clientId === "string" ? entry.clientId : "",
        clientSecret: typeof entry.clientSecret === "string" ? entry.clientSecret : "",
        isConfigured: Boolean(entry.clientId && entry.clientSecret),
        isAuthenticated: Boolean(entry.isAuthenticated),
        lastSyncAt: entry.lastSyncAt ?? null,
        error: entry.error ?? null
      };
      if (!store[providerId].isConfigured) {
        store[providerId].error = "No OAuth credentials configured";
      }
    }
  } catch {
    // First-run or invalid state falls back to defaults.
  }
  return store;
}

async function saveProviderStore(store) {
  await fs.mkdir(path.dirname(PROVIDER_CONFIG_PATH), { recursive: true });
  const payload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    providers: Object.values(store).map((provider) => ({
      providerId: provider.providerId,
      clientId: provider.clientId,
      clientSecret: provider.clientSecret,
      isAuthenticated: provider.isAuthenticated,
      lastSyncAt: provider.lastSyncAt,
      error: provider.error
    }))
  };
  await fs.writeFile(PROVIDER_CONFIG_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function validateProviderId(providerId) {
  if (!providerId || !["microsoft", "google"].includes(providerId)) {
    throw new Error("providerId must be 'microsoft' or 'google'");
  }
}

function toProviderSummary(provider) {
  return {
    providerId: provider.providerId,
    name: provider.name,
    isConfigured: provider.isConfigured,
    isAuthenticated: provider.isAuthenticated,
    lastSyncAt: provider.lastSyncAt,
    error: provider.error,
    clientId: provider.clientId
  };
}

async function getProviderConfig(providerId) {
  const store = await loadProviderStore();
  if (!providerId) {
    return Object.values(store).map(toProviderSummary);
  }
  validateProviderId(providerId);
  return [toProviderSummary(store[providerId])];
}

async function setProviderConfig(providerId, clientId, clientSecret) {
  validateProviderId(providerId);
  if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
    throw new Error("clientId is required and must be a non-empty string");
  }
  if (!clientSecret || typeof clientSecret !== "string" || !clientSecret.trim()) {
    throw new Error("clientSecret is required and must be a non-empty string");
  }

  const store = await loadProviderStore();
  const provider = store[providerId];
  provider.clientId = clientId.trim();
  provider.clientSecret = clientSecret.trim();
  provider.isConfigured = true;
  provider.isAuthenticated = false;
  provider.error = null;

  await saveProviderStore(store);

  return {
    providerId: provider.providerId,
    name: provider.name,
    isConfigured: provider.isConfigured,
    message: `OAuth credentials saved for ${provider.name}.`
  };
}

export async function executeCalendarCommand(commandName, input = {}) {
  switch (commandName) {
    case "calendar.get.provider.config":
      return getProviderConfig(input.providerId);
    case "calendar.set.provider.config":
      return setProviderConfig(input.providerId, input.clientId, input.clientSecret);
    case "calendar.list.events":
      return [];
    case "calendar.sync":
      return { providers: [], totalEventCount: 0, generatedAt: new Date().toISOString() };
    default:
      throw new Error(`Unknown calendar command: ${commandName}`);
  }
}
