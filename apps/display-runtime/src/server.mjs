import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { discoverModules } from '../../runtime-shared/src/module-discovery.mjs';

import { buildDisplayCurrentHandler } from '../../../modules/display-orchestrator/dist/api/current-endpoint.js';
import { getCalendarJson } from '../../../modules/display-calendar/dist/api/calendar-endpoint.js';
import { getAssignmentsJson } from '../../../modules/display-assignments/dist/api/assignments-endpoint.js';

const PORT = Number(process.env.OTTO_DISPLAY_PORT ?? 4180);
const HOST = process.env.OTTO_DISPLAY_HOST ?? '127.0.0.1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FRONTEND_DIR = path.join(ROOT, 'modules', 'display-frontend', 'public');
const MODULE_LOADER_CONFIG = path.join(ROOT, 'module-loader.config.json');

const displayCurrentHandler = buildDisplayCurrentHandler();
const discoveredModules = await discoverModules(ROOT, MODULE_LOADER_CONFIG);

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(`${JSON.stringify(payload)}\n`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function serveStatic(response, reqPath) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
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

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    response.statusCode = 400;
    response.end('Bad Request');
    return;
  }

  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      status: 'ok',
      moduleCount: discoveredModules.moduleCount
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/modules') {
    sendJson(response, 200, discoveredModules);
    return;
  }

  const displayMatch = /^\/display\/([^/]+)\/current$/.exec(url.pathname);
  if (request.method === 'GET' && displayMatch) {
    try {
      const role = displayMatch[1];
      const payload = displayCurrentHandler({ role });
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid role' });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/calendar.json') {
    sendJson(response, 200, await getCalendarJson());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/content/assignments.json') {
    sendJson(response, 200, await getAssignmentsJson());
    return;
  }

  await serveStatic(response, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`display-runtime-ready http://${HOST}:${PORT} modules=${discoveredModules.moduleCount}`);
});
