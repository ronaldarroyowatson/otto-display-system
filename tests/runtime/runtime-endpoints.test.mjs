import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { mergeDesignThemeConfig } from '../../apps/display-runtime/src/display-config-merge.mjs';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function fetchOrSkip(pathname) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`);
    return response;
  } catch {
    test.skip(`endpoint unavailable: ${pathname}`);
    return null;
  }
}

test('/display/hallway/current endpoint', async () => {
  const response = await fetchOrSkip('/display/hallway/current');
  if (!response) return;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'hallway');
});

test('/display/weather/current endpoint', async () => {
  const response = await fetchOrSkip('/display/weather/current');
  if (!response) return;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'weather');
  assert.equal(body.content.object.type, 'WeatherObject');
});

test('/display/time/current endpoint', async () => {
  const first = await fetchOrSkip('/display/time/current');
  if (!first) return;
  assert.equal(first.status, 200);
  const firstBody = await first.json();

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const second = await fetchOrSkip('/display/time/current');
  if (!second) return;
  assert.equal(second.status, 200);
  const secondBody = await second.json();

  assert.equal(firstBody.role, 'time');
  assert.equal(firstBody.content.object.type, 'TimeObject');
  assert.notEqual(firstBody.content.object.currentTime, secondBody.content.object.currentTime);
});

test('/content/display.json endpoint', async () => {
  const response = await fetchOrSkip('/content/display.json');
  if (!response) return;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.version, '1.0.0');
});

test('/content/display-control.contract.json endpoint', async () => {
  const response = await fetchOrSkip('/content/display-control.contract.json');
  if (!response) return;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(typeof body.version, 'string');
  assert.ok(body.frontend && typeof body.frontend === 'object');
  assert.ok(body.devUi && typeof body.devUi === 'object');
});

test('/display-config.json endpoint', async () => {
  const response = await fetchOrSkip('/display-config.json');
  if (!response) return;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.themes);
});

test('design-system merge test', async () => {
  const base = {
    dsc: { theme: 'midnight' },
    themes: {
      midnight: {
        colors: { accent: '#ffd166', surface: '#111827', text: '#f9fafb' },
        fonts: { body: 'Segoe UI' },
        motion: { page: '300ms ease' }
      }
    }
  };

  const design = {
    colors: { surface: '#0f172a', text: '#e2e8f0', primary: '#1f6feb' },
    typography: { families: { body: 'Inter, ui-sans-serif, system-ui, sans-serif' } },
    motion: { durations: { normal: 240 }, curves: { standard: 'cubic-bezier(0.2, 0, 0, 1)' } }
  };

  const merged = mergeDesignThemeConfig(base, design);
  assert.equal(merged.themes.midnight.colors.surface, '#0f172a');
  assert.equal(merged.themes.midnight.colors.text, '#e2e8f0');
  assert.equal(merged.themes.midnight.fonts.body, 'Inter, ui-sans-serif, system-ui, sans-serif');
  assert.equal(merged.themes.midnight.motion.page, '240ms cubic-bezier(0.2, 0, 0, 1)');
});

test('display-config merge test using workspace files', async () => {
  const baseRaw = await fs.readFile(new URL('../../modules/display-frontend/public/display-config.json', import.meta.url), 'utf8');
  const designRaw = await fs.readFile(new URL('../../design-system.config.json', import.meta.url), 'utf8');

  const merged = mergeDesignThemeConfig(JSON.parse(baseRaw), JSON.parse(designRaw));
  assert.ok(merged.themes.midnight.colors.surface);
  assert.ok(merged.themes.midnight.fonts.body);
});

test('orchestrator contract merge test: role layout rules are present in module runtime', async () => {
  const mod = await import('../../modules/display-orchestrator/dist/orchestrator/role-definitions.js');
  const weatherRule = mod.ROLE_LAYOUT_RULES.find((rule) => rule.role === 'weather');
  const timeRule = mod.ROLE_LAYOUT_RULES.find((rule) => rule.role === 'time');

  assert.ok(weatherRule?.enabled);
  assert.ok(timeRule?.enabled);
});
