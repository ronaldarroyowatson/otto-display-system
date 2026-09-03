import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mergeDesignThemeConfig } from './display-config-merge.mjs';
import { executeRoutedCommand } from '../../runtime-shared/src/command-executor.mjs';
import { discoverExtensionDependencyGraph, discoverModules, discoverRequiredExtensions } from '../../runtime-shared/src/module-discovery.mjs';
import { initializeSelfHealing } from './self-healing-init.mjs';

const PORT = Number(process.env.OTTO_DISPLAY_PORT ?? 4180);
const HOST = process.env.OTTO_DISPLAY_HOST ?? '127.0.0.1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FRONTEND_DIR = path.join(ROOT, 'modules', 'display-frontend', 'public');
const DEV_UI_DIR = path.join(ROOT, 'external', 'otto', 'otto-design-system-dev-ui', 'src');
const COMMAND_SCHEMAS_DIR = path.join(ROOT, 'external', 'otto', 'otto-command-service', 'src', 'schemas');
const DISPLAY_CONTENT_PATH = path.join(ROOT, 'external', 'otto', 'otto-display-orchestrator', 'content', 'display.json');
const DISPLAY_CONTROL_CONTRACT_PATH = path.join(ROOT, 'external', 'otto', 'otto-display-control-system', 'content', 'display-control.contract.json');
const DISPLAY_CONTROL_FALLBACK_CONTRACT_PATH = path.join(ROOT, 'external', 'otto', 'otto-display-control-system', 'content', 'display-control.fallback.contract.json');
const MODULE_LOADER_CONFIG = path.join(ROOT, 'module-loader.config.json');

const DEFAULT_DISPLAY_CONTROL_CONTRACT = {
  version: '0.1.0',
  defaultTheme: 'otto-ocean',
  frontend: {
    themes: {
      'otto-ocean': {
        colors: {
          background: '#0b132b',
          surface: 'rgba(255, 255, 255, 0.10)',
          text: '#f4f7fb',
          muted: '#dfe8f5',
          accent: '#ffd166',
          border: 'rgba(110, 202, 255, 0.95)'
        },
        fonts: {
          body: '"Segoe UI", "Helvetica Neue", sans-serif'
        },
        backgrounds: {
          page: 'linear-gradient(135deg, #0b132b 0%, #1c2541 42%, #3a506b 100%)'
        },
        motion: {
          page: '320ms cubic-bezier(0.22, 1, 0.36, 1)',
          fadeDuration: '320ms',
          slideDuration: '320ms',
          dissolveDuration: '320ms'
        }
      }
    },
    appearance: {
      panel: {
        appBackground: 'rgba(13, 24, 36, 0.82)',
        headerBackground: 'rgba(11, 19, 34, 0.86)',
        panelBackground: 'rgba(17, 27, 41, 0.78)',
        tierItemBackground: 'rgba(0, 0, 0, 0.16)',
        cardBackground: 'rgba(0, 0, 0, 0.2)',
        badgeBackground: 'rgba(255, 255, 255, 0.12)'
      },
      borders: {
        appWidth: '3px',
        header: 'rgba(255, 255, 255, 0.12)',
        card: 'rgba(255, 255, 255, 0.16)',
        badge: 'rgba(255, 255, 255, 0.12)'
      },
      radii: {
        app: '12px',
        card: '16px'
      },
      shadows: {
        app: '0 0 0 1px rgba(102, 214, 255, 0.2), 0 0 32px rgba(102, 214, 255, 0.12)',
        cardInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
      },
      clock: {
        face: '#f4f7fb',
        hour: '#ffd166',
        minute: '#9be7ff',
        second: '#ff6b6b'
      }
    }
  },
  devUi: {
    colors: {
      bg: 'radial-gradient(circle at 0% 0%, #20345e 0%, #0b132b 35%, #070b18 100%)',
      panel: 'rgba(255, 255, 255, 0.08)',
      panelStrong: 'rgba(255, 255, 255, 0.12)',
      controlBg: 'rgba(6, 10, 25, 0.8)',
      buttonBg: 'rgba(9, 16, 38, 0.9)',
      tierBg: 'rgba(0, 0, 0, 0.16)',
      pageCardBg: 'rgba(0, 0, 0, 0.2)',
      border: 'rgba(255, 255, 255, 0.2)',
      text: '#f4f7fb',
      muted: '#bed0e8',
      accent: '#8be9fd',
      warn: '#ffd166',
      ok: '#7de07d'
    },
    typography: {
      body: '"Segoe UI", "Helvetica Neue", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    },
    radii: {
      card: '12px',
      control: '8px'
    }
  }
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }

  const merged = { ...base };
  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = merged[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      merged[key] = deepMerge(baseValue, overrideValue);
      continue;
    }
    merged[key] = overrideValue;
  }

  return merged;
}

async function readJsonFileOrNull(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readDisplayControlContract() {
  const fallbackContract = (await readJsonFileOrNull(DISPLAY_CONTROL_FALLBACK_CONTRACT_PATH)) ?? DEFAULT_DISPLAY_CONTROL_CONTRACT;
  const developerContract = await readJsonFileOrNull(DISPLAY_CONTROL_CONTRACT_PATH);
  return deepMerge(fallbackContract, developerContract ?? {});
}

const discoveredModules = await discoverModules(ROOT, MODULE_LOADER_CONFIG);
const dependencyGraph = await discoverExtensionDependencyGraph(ROOT);
const requiredExtensions = await discoverRequiredExtensions(ROOT);

// Initialize self-healing framework for critical display-system artifacts
initializeSelfHealing();

await executeRoutedCommand('file.rotate.logs', {
  directory: path.join(ROOT, 'logs'),
  maxFiles: 20,
  maxBytes: 4_000_000,
  activeLogFile: path.join(ROOT, 'logs', 'display-runtime.log')
});

async function traceApi(method, route, statusCode, details) {
  try {
    await executeRoutedCommand('debug.trace.api', {
      method,
      route,
      statusCode,
      details
    });
  } catch {
    // Keep API behavior resilient if tracing cannot run.
  }
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(`${JSON.stringify(payload)}\n`);
}

const DEFAULT_ORCHESTRATOR_SETTINGS = {
  enabledPages: ['hallway', 'weather', 'time'],
  rotationIntervalMs: 30000,
  rotationMode: 'time',
  weatherTriggers: { severeWeather: false, tempThreshold: 95 },
  scheduleTriggers: { classChange: true, passingPeriod: true },
  phaseTriggers: { chapel: true, assembly: true, emergency: true }
};

let cachedCommandApiRoutes;

async function getCommandApiRoutes() {
  if (cachedCommandApiRoutes) {
    return cachedCommandApiRoutes;
  }

  const routes = new Map();
  const files = (await fs.readdir(COMMAND_SCHEMAS_DIR)).filter((entry) => entry.endsWith('.json')).sort();

  for (const file of files) {
    const schema = JSON.parse(await fs.readFile(path.join(COMMAND_SCHEMAS_DIR, file), 'utf8'));
    const commandName = String(schema?.name ?? '').trim();
    const exposedAs = Array.isArray(schema?.routing?.exposedAs) ? schema.routing.exposedAs : [];
    const method = String(schema?.routing?.http?.method ?? '').toUpperCase();
    const routePath = String(schema?.routing?.http?.path ?? '').trim();

    if (!commandName || !method || !routePath || !exposedAs.includes('api')) {
      continue;
    }

    routes.set(`${method} ${routePath}`, commandName);
  }

  cachedCommandApiRoutes = routes;
  return routes;
}

function queryParamsToPayload(searchParams) {
  const payload = {};
  for (const [key, value] of searchParams.entries()) {
    payload[key] = value;
  }
  return payload;
}

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
async function readOrchestratorSettings() {
  try {
    return await executeRoutedCommand('orchestrator.settings.get');
  } catch {
    return DEFAULT_ORCHESTRATOR_SETTINGS;
  }
}

function applyOrchestratorSettingsToDisplayConfig(config, settings) {
  const nextConfig = JSON.parse(JSON.stringify(config));
  const displays = nextConfig.displays ?? {};
  const pageSettings = settings.pages && typeof settings.pages === 'object' ? settings.pages : {};
  const enabledPages = new Set(
    Object.values(pageSettings)
      .filter((page) => page && page.enabled !== false)
      .map((page) => page.id)
  );

  for (const displayName of Object.keys(displays)) {
    const display = displays[displayName];
    if (!display || !Array.isArray(display.pages)) {
      continue;
    }

    const filteredPages = display.pages.filter((page) => {
      if (enabledPages.size === 0) {
        return true;
      }

      return enabledPages.has(page.id) || enabledPages.has(displayName);
    });

    display.pages = filteredPages.length > 0 ? filteredPages : display.pages;

    if (display.pages[0]) {
      const firstPageSettings = pageSettings[display.pages[0].id];
      if (firstPageSettings?.displayDurationMs) {
        display.cycleInterval = firstPageSettings.displayDurationMs;
      }
    }
  }

  nextConfig.orchestratorSettings = settings;
  return nextConfig;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

async function resolveFrontendAssetPath(reqPath) {
  if (reqPath === '/' || reqPath === '/display' || reqPath === '/display/' || reqPath === '/display/index.html') {
    return '/index.html';
  }

  if (/^\/display(?:\/[^/]+){1,2}$/.test(reqPath)) {
    const trailing = reqPath.split('/').filter(Boolean).slice(1).at(-1) ?? '';
    if (trailing.includes('.')) {
      return `/${trailing}`;
    }
    return '/index.html';
  }

  return reqPath;
}

async function serveStatic(response, reqPath) {
  const safePath = await resolveFrontendAssetPath(reqPath);
  const filePath = path.normalize(path.join(FRONTEND_DIR, safePath));
  if (!filePath.startsWith(FRONTEND_DIR)) {
    response.statusCode = 403;
    response.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType(filePath));
    response.end(data);
  } catch {
    response.statusCode = 404;
    response.end('Not Found');
  }
}

function resolveDevUiAssetPath(reqPath) {
  if (reqPath === '/dev-ui' || reqPath === '/dev-ui/') {
    return '/pages/index.html';
  }

  if (reqPath === '/dev-ui/orchestrator-settings' || reqPath === '/dev-ui/orchestrator-settings.html') {
    return '/pages/orchestrator-settings.html';
  }

  return reqPath.replace(/^\/dev-ui/, '') || '/pages/index.html';
}

async function serveDevUiStatic(response, reqPath) {
  const safePath = resolveDevUiAssetPath(reqPath);
  const filePath = path.normalize(path.join(DEV_UI_DIR, safePath));
  if (!filePath.startsWith(DEV_UI_DIR)) {
    response.statusCode = 403;
    response.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType(filePath));
    response.end(data);
  } catch {
    response.statusCode = 404;
    response.end('Not Found');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      response.statusCode = 400;
      response.end('Bad Request');
      return;
    }

    const url = new URL(request.url, `http://${HOST}:${PORT}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      await traceApi(request.method, url.pathname, 200);
      sendJson(response, 200, {
        status: 'ok',
        moduleCount: discoveredModules.moduleCount
      });
      return;
    }

  const displayPageMatch = /^\/display\/([^/]+)\/([^/]+)\/current$/.exec(url.pathname);
  if (request.method === 'GET' && displayPageMatch) {
    try {
      const displayId = displayPageMatch[1];
      const role = displayPageMatch[2];
      const payload = await executeRoutedCommand('display.current', { role, displayId });
      await traceApi(request.method, url.pathname, 200);
      sendJson(response, 200, payload);
    } catch (error) {
      await traceApi(request.method, url.pathname, 400, error instanceof Error ? error.message : 'Invalid role');
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid role' });
    }
    return;
  }

  const displayMatch = /^\/display\/([^/]+)\/current$/.exec(url.pathname);
  if (request.method === 'GET' && displayMatch) {
    try {
      const role = displayMatch[1];
      const payload = await executeRoutedCommand('display.current', { role });
      await traceApi(request.method, url.pathname, 200);
      sendJson(response, 200, payload);
    } catch (error) {
      await traceApi(request.method, url.pathname, 400, error instanceof Error ? error.message : 'Invalid role');
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid role' });
    }
    return;
  }

  if (request.method === 'GET' && (url.pathname === '/display' || url.pathname === '/display/' || url.pathname === '/display/index.html' || /^\/display(?:\/[^/]+)?(?:\/[^/]+)?$/.test(url.pathname))) {
    await serveStatic(response, url.pathname);
    return;
  }

  if (request.method === 'GET' && (url.pathname === '/dev-ui' || url.pathname === '/dev-ui/' || url.pathname.startsWith('/dev-ui/'))) {
    await serveDevUiStatic(response, url.pathname);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/display-config.json') {
    const configPath = path.join(FRONTEND_DIR, 'display-config.json');
    try {
      const baseConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
      const designConfigPath = path.resolve(ROOT, 'design-system.config.json');
      let designConfig = {};

      try {
        designConfig = JSON.parse(await fs.readFile(designConfigPath, 'utf8'));
      } catch {
        designConfig = {};
      }

      const displayControlContract = await readDisplayControlContract();

      const mergedConfig = mergeDesignThemeConfig(baseConfig, designConfig, displayControlContract);
      const settings = await readOrchestratorSettings();
      const finalConfig = applyOrchestratorSettingsToDisplayConfig(mergedConfig, settings);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(finalConfig, null, 2));
    } catch {
      response.statusCode = 404;
      response.end('Not Found');
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/modules') {
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, {
      ...discoveredModules,
      dependencyGraph,
      requiredExtensions
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/eds/registry') {
    const payload = await executeRoutedCommand('eds.get.registry', { workspaceRoot: ROOT });
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  const edsExtensionMatch = /^\/eds\/extension\/([^/]+)$/.exec(url.pathname);
  if (request.method === 'GET' && edsExtensionMatch) {
    const extensionName = decodeURIComponent(edsExtensionMatch[1]);
    const payload = await executeRoutedCommand(`eds.get.extension.${extensionName}`, {
      workspaceRoot: ROOT
    });
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/display.json') {
    try {
      const displayContent = await fs.readFile(DISPLAY_CONTENT_PATH, 'utf8');
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(displayContent);
    } catch {
      response.statusCode = 404;
      response.end('Not Found');
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/display-control.contract.json') {
    const contract = await readDisplayControlContract();
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(`${JSON.stringify(contract, null, 2)}\n`);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/settings.json') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const settings = displayId
      ? await executeRoutedCommand('orchestrator.settings.get', { displayId })
      : await readOrchestratorSettings();
    sendJson(response, 200, settings);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/tier-list.json') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const payload = await executeRoutedCommand('orchestrator.tierList.get', { displayId });
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/tier-list.json') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.tierList.set', body);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/displays.json') {
    const payload = await executeRoutedCommand('orchestrator.displays.list', {});
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/displays/add') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.displays.add', body);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/displays/delete') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.displays.delete', body);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/displays/share-playlist') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.displays.sharePlaylist', body);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/settings/download') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const payload = await executeRoutedCommand('orchestrator.settings.download', { displayId });
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/settings/restore') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.settings.restore', body);
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/settings.json') {
    const body = await readJsonBody(request);
    const updated = await executeRoutedCommand('orchestrator.settings.set', {
      patch: body
    });
    sendJson(response, 200, updated);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/rotation.json') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const rotationPlan = await executeRoutedCommand('orchestrator.rotation.plan.get', { displayId });
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, rotationPlan);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/pages/pages.json') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const payload = await executeRoutedCommand('orchestrator.pages.list', { displayId });
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/pages/add') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.pages.add', body);
      if (request.method === 'POST' && url.pathname === '/content/pages/delete') {
        const body = await readJsonBody(request);
        const payload = await executeRoutedCommand('orchestrator.page.softDelete', body);
        sendJson(response, 200, payload);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/content/pages/restore') {
        const body = await readJsonBody(request);
        const payload = await executeRoutedCommand('orchestrator.page.restore', body);
        sendJson(response, 200, payload);
        return;
      }

    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/pages/download-all') {
    const displayId = url.searchParams.get('displayId') || undefined;
    const payload = await executeRoutedCommand('orchestrator.pages.download-all', { displayId });
    const archive = Buffer.from(String(payload.archiveBase64 ?? ''), 'base64');
    response.statusCode = 200;
    response.setHeader('Content-Type', payload.contentType ?? 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${payload.filename ?? 'pages-backup.zip'}"`);
    response.end(archive);
    return;
  }

  const pageAssetMatch = /^\/content\/pages\/([^/]+\.(?:html|js|json))$/.exec(url.pathname);
  if (request.method === 'GET' && pageAssetMatch) {
    const relativePath = `/content/pages/${pageAssetMatch[1]}`;
    const result = await executeRoutedCommand('file.read', { path: relativePath });
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType(relativePath));
    response.end(result.content);
    return;
  }

  const displayRegistryFileMatch = /^\/content\/displays\/([^/]+)\/(settings\.json|pages\.json|tierList\.json)$/.exec(url.pathname);
  if (request.method === 'GET' && displayRegistryFileMatch) {
    const displayId = decodeURIComponent(displayRegistryFileMatch[1]);
    const fileName = displayRegistryFileMatch[2];

    if (fileName === 'settings.json') {
      const payload = await executeRoutedCommand('orchestrator.settings.get', { displayId });
      sendJson(response, 200, payload);
      return;
    }

    if (fileName === 'pages.json') {
      const payload = await executeRoutedCommand('orchestrator.pages.list', { displayId });
      sendJson(response, 200, payload);
      return;
    }

    if (fileName === 'tierList.json') {
      const payload = await executeRoutedCommand('orchestrator.tierList.get', { displayId });
      sendJson(response, 200, payload);
      return;
    }
  }

  if (request.method === 'POST' && url.pathname === '/csl/command') {
    const body = await readJsonBody(request);
    const command = String(body.command ?? '').trim();
    if (!command) {
      sendJson(response, 400, { error: 'command is required' });
      return;
    }

    const payload = body.payload ?? {};
    const result = await executeRoutedCommand(command, payload);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v1/commands/calendar/providers') {
    const payload = await executeRoutedCommand('calendar.get.provider.config', queryParamsToPayload(url.searchParams));
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/commands/calendar/providers') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('calendar.set.provider.config', body);
    sendJson(response, 200, payload);
    return;
  }

  const commandApiRoutes = await getCommandApiRoutes();
  const commandName = commandApiRoutes.get(`${request.method} ${url.pathname}`);
  if (commandName) {
    const payload = request.method === 'GET'
      ? queryParamsToPayload(url.searchParams)
      : await readJsonBody(request);
    const result = await executeRoutedCommand(commandName, payload);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/calendar.json') {
    const payload = await executeRoutedCommand('calendar.refresh');
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/assignments.json') {
    const payload = await executeRoutedCommand('assignments.import');
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/debug/last') {
    const payload = await executeRoutedCommand('debug.report.last-run');
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/debug/snapshot') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('debug.snapshot.system', body);
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/debug/trace') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('debug.trace.command', body);
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

    if (request.method === 'POST' && url.pathname === '/debug/trace-api') {
      const body = await readJsonBody(request);
      const payload = await executeRoutedCommand('debug.trace.api', body);
      await traceApi(request.method, url.pathname, 200);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/oauth/callback') {
      try {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const provider = url.searchParams.get('provider');

        if (!code || !provider) {
          sendJson(response, 400, { error: 'Missing code or provider query parameter' });
          return;
        }

        // Get provider configuration (clientId, clientSecret)
        const configResult = await executeRoutedCommand('calendar.get.provider.config', {
          providerId: provider
        });

        const providerConfig = Array.isArray(configResult.value) && configResult.value[0]
          ? configResult.value[0]
          : configResult;

        if (!providerConfig.isConfigured || !providerConfig.clientId || !providerConfig.clientSecret) {
          sendJson(response, 400, { error: 'Provider not configured with OAuth credentials' });
          return;
        }

        // Determine redirect URI based on request origin
        const redirectUri = `${url.protocol}//${url.host}/oauth/callback?provider=${encodeURIComponent(provider)}`;

        // Exchange authorization code for token
        const exchangeResult = await executeRoutedCommand('oauth.exchange.token', {
          providerId: provider,
          clientId: providerConfig.clientId,
          clientSecret: providerConfig.clientSecret,
          authorizationCode: code,
          redirectUri: redirectUri
        });

        if (!exchangeResult.token) {
          sendJson(response, 400, { error: 'Failed to exchange authorization code for token' });
          return;
        }

        // Save token to calendar provider tokens store
        const currentTokens = await executeRoutedCommand('calendar.get.provider.tokens', {
          providerId: provider
        });

        const updatedTokens = {
          ...currentTokens,
          [provider]: {
            accessToken: exchangeResult.token.value,
            expiresAt: exchangeResult.token.expiresAt,
            refreshToken: exchangeResult.token.refreshToken || null
          }
        };

        await executeRoutedCommand('calendar.set.provider.tokens', {
          tokens: updatedTokens
        });

        const successHtml = `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Authentication Complete</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
  <h1 style="color: #1b7f3a; margin-top: 0;">Authentication successful</h1>
  <p>${escapeHtml(provider)} account connected.</p>
  <p>You can close this window.</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OTTO_OAUTH_CALLBACK',
          provider: ${JSON.stringify(provider)},
          status: 'success',
          state: ${JSON.stringify(state)},
          user: ${JSON.stringify(exchangeResult.user || null)}
        }, '*');
      }
    } catch {}
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`;

        await traceApi(request.method, url.pathname, 200, `OAuth callback success for ${provider}`);
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(successHtml);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
        await traceApi(request.method, url.pathname, 400, errorMessage);

        const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Authentication Error</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
  <h1 style="color: #b42318; margin-top: 0;">Authentication failed</h1>
  <p>${escapeHtml(errorMessage)}</p>
  <p>You can close this window and try again.</p>
  <script>
    try {
      const provider = ${JSON.stringify(url.searchParams.get('provider') || '')};
      if (window.opener) {
        window.opener.postMessage({
          type: 'OTTO_OAUTH_CALLBACK',
          provider,
          status: 'error',
          error: ${JSON.stringify(errorMessage)}
        }, '*');
      }
    } catch {}
  </script>
</body>
</html>`;

        response.statusCode = 400;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(errorHtml);
        return;
      }
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    const method = request.method ?? 'UNKNOWN';
    const route = request.url ?? '/unknown';
    const message = error instanceof Error ? error.message : 'Unhandled runtime error';
    const isJsonSyntaxError = error instanceof SyntaxError;
    const statusCode = isJsonSyntaxError ? 400 : 500;

    await traceApi(method, route, statusCode, message);

    if (!response.headersSent) {
      sendJson(response, statusCode, {
        error: isJsonSyntaxError ? 'Invalid JSON request body' : 'Internal Server Error',
        details: message
      });
      return;
    }

    response.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`display-runtime-ready http://${HOST}:${PORT} modules=${discoveredModules.moduleCount}`);
});

