import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mergeDesignThemeConfig } from './display-config-merge.mjs';
import { executeRoutedCommand } from '../../runtime-shared/src/command-executor.mjs';
import { discoverExtensionDependencyGraph, discoverModules, discoverRequiredExtensions } from '../../runtime-shared/src/module-discovery.mjs';

const PORT = Number(process.env.OTTO_DISPLAY_PORT ?? 4180);
const HOST = process.env.OTTO_DISPLAY_HOST ?? '127.0.0.1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FRONTEND_DIR = path.join(ROOT, 'modules', 'display-frontend', 'public');
const DEV_UI_DIR = path.join(ROOT, 'external', 'otto', 'otto-design-system-dev-ui', 'src');
const DISPLAY_CONTENT_PATH = path.join(ROOT, 'external', 'otto', 'otto-display-orchestrator', 'content', 'display.json');
const MODULE_LOADER_CONFIG = path.join(ROOT, 'module-loader.config.json');

const discoveredModules = await discoverModules(ROOT, MODULE_LOADER_CONFIG);
const dependencyGraph = await discoverExtensionDependencyGraph(ROOT);
const requiredExtensions = await discoverRequiredExtensions(ROOT);

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
  const enabledPages = new Set(settings.enabledPages ?? []);

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
    display.cycleInterval = settings.rotationIntervalMs ?? display.cycleInterval;
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

      const mergedConfig = mergeDesignThemeConfig(baseConfig, designConfig);
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

  if (request.method === 'GET' && url.pathname === '/content/settings.json') {
    const settings = await readOrchestratorSettings();
    sendJson(response, 200, settings);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/settings/download') {
    const payload = await executeRoutedCommand('orchestrator.settings.download');
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
    const rotationPlan = await executeRoutedCommand('orchestrator.rotation.plan.get');
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, rotationPlan);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/pages/pages.json') {
    const payload = await executeRoutedCommand('orchestrator.pages.list');
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/content/pages/add') {
    const body = await readJsonBody(request);
    const payload = await executeRoutedCommand('orchestrator.pages.add', body);
    await traceApi(request.method, url.pathname, 200);
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/pages/download-all') {
    const payload = await executeRoutedCommand('orchestrator.pages.download-all');
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

