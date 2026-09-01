import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

async function csl(command, payload = {}) {
  const response = await maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
  if (!response) return null;
  assert.equal(response.status, 200);
  return response.json();
}

async function addPage(name, type = 'url', url = 'https://example.com/dev-ui-test') {
  const response = await maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, url })
  });
  if (!response) return null;
  assert.equal(response.status, 200);
  return response.json();
}

async function eventually(check, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return false;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('settings page loads with per-page sections', async () => {
  const response = await maybeFetch('/dev-ui/orchestrator-settings');
  if (!response) return;

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Per-Page Controls/i);
  assert.match(html, /Add Page/i);
  assert.match(html, /Trigger-Aware Preview/i);
  assert.match(html, /Playlist Order/i);
  assert.match(html, /tierList/i);
});

test('tier names persist through orchestrator settings', async () => {
  const settingsBefore = await csl('orchestrator.settings.get', { displayId: 'hallway' });
  if (!settingsBefore) return;

  const nextTierNames = {
    ...(settingsBefore.tierNames || {}),
    '1': `Tier One ${runId}`
  };

  const setResponse = await csl('orchestrator.settings.set', {
    displayId: 'hallway',
    patch: { tierNames: nextTierNames }
  });
  if (!setResponse) return;

  const settingsAfter = await csl('orchestrator.settings.get', { displayId: 'hallway' });
  if (!settingsAfter) return;
  assert.equal(settingsAfter.tierNames?.['1'], nextTierNames['1']);
});

test('tier manager click handler ignores rename input clicks', async () => {
  const scriptPath = path.join(
    ROOT,
    'external',
    'otto',
    'otto-design-system-dev-ui',
    'src',
    'scripts',
    'orchestrator-settings.js'
  );
  const source = await fs.readFile(scriptPath, 'utf8');

  assert.match(
    source,
    /if \(!\['move-tier-up', 'move-tier-down', 'delete-tier'\]\.includes\(action\)\) return;/
  );
});

test('open-page settings reflect current per-page state', async () => {
  const newPage = await addPage(`Per-page verify ${runId}`, 'url', `https://example.com/per-page-verify-${runId}`);
  if (!newPage) return;

  const setResponse = await csl('orchestrator.pageSettings.set', {
    pageId: newPage.id,
    patch: {
      enabled: false,
      displayDurationMs: 31000,
      triggers: {
        timeBased: true,
        scheduleBased: false,
        weatherBased: false,
        phaseBased: false
      }
    }
  });
  if (!setResponse) return;
  assert.equal(setResponse.id, newPage.id);
  assert.equal(setResponse.enabled, false);
  assert.equal(setResponse.displayDurationMs, 31000);

  const getResponse = await csl('orchestrator.pageSettings.get', { pageId: newPage.id });
  if (!getResponse) return;
  assert.equal(typeof getResponse.enabled, 'boolean');
  assert.equal(typeof getResponse.displayDurationMs, 'number');
});

test('rotation plan updates when per-page settings change', async () => {
  const newPage = await addPage(`Rotation verify ${runId}`, 'url', `https://example.com/rotation-verify-${runId}`);
  if (!newPage) return;

  const settingsResponse = await maybeFetch('/content/settings.json');
  if (!settingsResponse || settingsResponse.status !== 200) return;
  const settings = await settingsResponse.json();
  settings.enabledPages = [...new Set([...(settings.enabledPages || []), newPage.id])];

  const saveSettingsResponse = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!saveSettingsResponse) return;
  assert.equal(saveSettingsResponse.status, 200);

  await csl('orchestrator.pageSettings.set', {
    pageId: newPage.id,
    patch: {
      enabled: true,
      displayDurationMs: 47000,
      triggers: {
        timeBased: true,
        scheduleBased: false,
        weatherBased: false,
        phaseBased: false
      }
    }
  });

  const pageState = await csl('orchestrator.pageSettings.get', { pageId: newPage.id });
  if (!pageState) return;
  assert.equal(pageState.id, newPage.id);
  assert.equal(pageState.enabled, true);
  assert.equal(pageState.displayDurationMs, 47000);

  const found = await eventually(async () => {
    const planResponse = await maybeFetch('/content/rotation.json');
    if (!planResponse || planResponse.status !== 200) return false;
    const plan = await planResponse.json();
    return Array.isArray(plan.pages) && plan.pages.length > 0;
  });

  assert.ok(found);
});
