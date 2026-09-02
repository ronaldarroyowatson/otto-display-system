/**
 * Calendar Runtime Bridge
 * Provides runtime-safe calendar operations for command-service handlers.
 * Stores credentials and tokens locally only (not committed to repos).
 * Uses OSSS for versioned state management and otto-crypto for encryption.
 *
 * Note: Uses display-runtime adapters for OSSS and crypto (Node.js implementations).
 * Those adapters follow contracts from external/otto/otto-osss and external/otto/otto-crypto.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Optional: Import OSSS adapter from display-runtime
// Fallback to basic file I/O if not available
let StateManager;
try {
  const displayRuntimeLib = await import("../../../../../../apps/display-runtime/src/lib/osss-adapter.mjs");
  StateManager = displayRuntimeLib.StateManager;
} catch (err) {
  // OSSS adapter not available; use fallback
  StateManager = null;
}

// Optional: Import crypto adapter from display-runtime
// Fallback to plaintext if not available
let CryptoAdapter;
try {
  const displayRuntimeCrypto = await import("../../../../../../apps/display-runtime/src/lib/crypto-adapter.mjs");
  CryptoAdapter = displayRuntimeCrypto.CryptoAdapter;
} catch (err) {
  // Crypto adapter not available; use fallback
  CryptoAdapter = null;
}

const EXT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVIDER_CONFIG_PATH = path.join(EXT_ROOT, "mempalace", "calendar-provider-config.json");
const PROVIDER_TOKENS_PATH = path.join(EXT_ROOT, "mempalace", "calendar-provider-tokens.json");

// OSSS manager instances (if available)
let configStateManager = null;
let tokensStateManager = null;

function initStateManagers() {
  if (!StateManager) return;
  if (!configStateManager) {
    configStateManager = new StateManager(PROVIDER_CONFIG_PATH, "1.0.0");
  }
  if (!tokensStateManager) {
    tokensStateManager = new StateManager(PROVIDER_TOKENS_PATH, "1.0.0");
  }
}

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
  initStateManagers();
  const store = cloneDefaultProviders();
  
  try {
    // Try OSSS first if available
    if (StateManager && configStateManager) {
      const osssData = await configStateManager.load();
      const providers = Array.isArray(osssData?.providers) ? osssData.providers : [];
      for (const entry of providers) {
        if (!entry || typeof entry !== "object") continue;
        const providerId = String(entry.providerId ?? "").trim();
        if (!providerId || !store[providerId]) continue;
        
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
      return store;
    }
    
    // Fallback: read raw file
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
  initStateManagers();
  
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
  
  // Try OSSS first if available
  if (StateManager && configStateManager) {
    await configStateManager.save(payload);
    return;
  }
  
  // Fallback: write raw file
  await fs.mkdir(path.dirname(PROVIDER_CONFIG_PATH), { recursive: true });
  await fs.writeFile(PROVIDER_CONFIG_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Token storage (separate from credentials for better security)
 */
const DEFAULT_TOKENS = {
  microsoft: { accessToken: null, expiresAt: null, refreshToken: null },
  google: { accessToken: null, expiresAt: null, refreshToken: null }
};

async function loadProviderTokens() {
  initStateManagers();
  const tokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
  
  try {
    // Try OSSS first if available
    if (StateManager && tokensStateManager) {
      const osssData = await tokensStateManager.load();
      const providerTokens = osssData?.providers || {};
      for (const [providerId, data] of Object.entries(providerTokens)) {
        if (tokens[providerId] && typeof data === "object") {
          tokens[providerId] = {
            accessToken: data.accessToken || null,
            expiresAt: data.expiresAt || null,
            refreshToken: data.refreshToken || null
          };
        }
      }
      return tokens;
    }
    
    // Fallback: read raw file
    const raw = await fs.readFile(PROVIDER_TOKENS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const providerTokens = parsed?.providers || {};
    for (const [providerId, data] of Object.entries(providerTokens)) {
      if (tokens[providerId] && typeof data === "object") {
        tokens[providerId] = {
          accessToken: data.accessToken || null,
          expiresAt: data.expiresAt || null,
          refreshToken: data.refreshToken || null
        };
      }
    }
  } catch {
    // First-run or invalid state falls back to defaults.
  }
  return tokens;
}

async function saveProviderTokens(tokens) {
  initStateManagers();
  
  const payload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    providers: tokens
  };
  
  // Try OSSS first if available
  if (StateManager && tokensStateManager) {
    await tokensStateManager.save(payload);
    return;
  }
  
  // Fallback: write raw file
  await fs.mkdir(path.dirname(PROVIDER_TOKENS_PATH), { recursive: true });
  await fs.writeFile(PROVIDER_TOKENS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

async function setProviderConfig(providerId, clientId, clientSecret, encryptionKey = null) {
  validateProviderId(providerId);
  if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
    throw new Error("clientId is required and must be a non-empty string");
  }
  if (!clientSecret || typeof clientSecret !== "string" || !clientSecret.trim()) {
    throw new Error("clientSecret is required and must be a non-empty string");
  }

  const store = await loadProviderStore();
  const provider = store[providerId];
  
  // Optionally encrypt clientSecret if crypto is available and key provided
  let secretToStore = clientSecret.trim();
  if (CryptoAdapter && encryptionKey) {
    try {
      const encrypted = CryptoAdapter.encrypt(secretToStore, encryptionKey);
      secretToStore = JSON.stringify(encrypted);
      provider.__encrypted = true;
    } catch (err) {
      // Fallback to plaintext if encryption fails
      console.warn(`Failed to encrypt clientSecret: ${err.message}`);
    }
  }
  
  provider.clientId = clientId.trim();
  provider.clientSecret = secretToStore;
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

/**
 * Authenticate provider by exchanging auth code for token
 * Calls the oauth.exchange.token command from command-service
 */
async function authenticateProvider(providerId, authorizationCode, redirectUri, executeCommand, encryptionKey = null) {
  validateProviderId(providerId);
  
  if (!authorizationCode || typeof authorizationCode !== "string") {
    throw new Error("authorizationCode is required");
  }
  if (!redirectUri || typeof redirectUri !== "string") {
    throw new Error("redirectUri is required");
  }

  const store = await loadProviderStore();
  const provider = store[providerId];

  if (!provider.isConfigured) {
    throw new Error(`Provider ${providerId} is not configured with credentials`);
  }

  try {
    // Call the OAuth token exchange handler
    // This requires executeCommand to be passed from the runtime
    // In real usage, this would be called through the command-service
    if (!executeCommand) {
      throw new Error("Command executor not available");
    }

    // Decrypt clientSecret if encrypted
    let clientSecret = provider.clientSecret;
    if (provider.__encrypted && CryptoAdapter && encryptionKey) {
      try {
        const encrypted = JSON.parse(clientSecret);
        clientSecret = CryptoAdapter.decrypt(encrypted, encryptionKey);
      } catch (err) {
        throw new Error(`Failed to decrypt clientSecret: ${err.message}`);
      }
    }

    const tokenResult = await executeCommand("oauth.exchange.token", {
      providerId,
      clientId: provider.clientId,
      clientSecret,
      authorizationCode,
      redirectUri
    });

    if (!tokenResult || !tokenResult.token) {
      throw new Error("Failed to obtain access token");
    }

    // Store token locally (not in credentials file)
    const tokens = await loadProviderTokens();
    tokens[providerId] = {
      accessToken: tokenResult.token.value,
      expiresAt: tokenResult.token.expiresAt,
      refreshToken: tokenResult.token.refresh_token || null
    };
    await saveProviderTokens(tokens);

    // Update provider authentication status
    provider.isAuthenticated = true;
    provider.error = null;
    provider.lastSyncAt = new Date().toISOString();
    await saveProviderStore(store);

    return {
      providerId,
      name: provider.name,
      isAuthenticated: true,
      message: `Successfully authenticated ${provider.name}`,
      user: tokenResult.user || null
    };
  } catch (error) {
    // Update error but don't expose details that might contain secrets
    const provider = store[providerId];
    provider.isAuthenticated = false;
    provider.error = "Authentication failed - check credentials and try again";
    await saveProviderStore(store);

    throw new Error("Authentication failed");
  }
}

/**
 * Get valid access token for provider (refresh if needed)
 */
async function getAccessToken(providerId) {
  validateProviderId(providerId);
  
  const tokens = await loadProviderTokens();
  const token = tokens[providerId];

  if (!token || !token.accessToken) {
    return null;
  }

  // Check if expired and still has refresh token
  if (token.expiresAt) {
    const expiresAt = new Date(token.expiresAt).getTime();
    if (expiresAt < Date.now() && token.refreshToken) {
      // Token expired, would need refresh logic here
      // For now, return null to trigger re-authentication
      return null;
    }
  }

  return token.accessToken;
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
