import test from 'node:test';
import assert from 'node:assert/strict';

import { DisplayOrchestrator } from '../../modules/display-orchestrator/dist/orchestrator/display-orchestrator.js';
import { ROLE_LAYOUT_RULES } from '../../modules/display-orchestrator/dist/orchestrator/role-definitions.js';

const phaseWindows = [
  {
    phase: 'class',
    startsAt: new Date(Date.now() - 30_000).toISOString(),
    endsAt: new Date(Date.now() + 30_000).toISOString()
  }
];

test('object registry test: dynamic roles emit orchestrator objects', () => {
  const orchestrator = new DisplayOrchestrator();
  const weather = orchestrator.computeCurrent('weather', phaseWindows);
  const time = orchestrator.computeCurrent('time', phaseWindows);

  assert.equal(weather.content.object.type, 'WeatherObject');
  assert.equal(time.content.object.type, 'TimeObject');
});

test('layout rule registry test: weather and time roles are rule-gated', () => {
  const weatherRule = ROLE_LAYOUT_RULES.find((rule) => rule.role === 'weather' && rule.enabled);
  const timeRule = ROLE_LAYOUT_RULES.find((rule) => rule.role === 'time' && rule.enabled);

  assert.ok(weatherRule, 'missing enabled weather layout rule');
  assert.ok(timeRule, 'missing enabled time layout rule');
  assert.equal(weatherRule.zoneId, 'Main');
  assert.equal(timeRule.zoneId, 'Main');
});

test('compiler output test: orchestrator content file exists with zones', async () => {
  const fs = await import('node:fs/promises');
  const raw = await fs.readFile(
    new URL('../../external/otto/otto-display-orchestrator/content/display.json', import.meta.url),
    'utf8'
  );
  const parsed = JSON.parse(raw);

  assert.equal(parsed.version, '1.0.0');
  assert.ok(Array.isArray(parsed.zones));
});

test('zone assignment test: weather and time use main zone', () => {
  const orchestrator = new DisplayOrchestrator();
  const weather = orchestrator.computeCurrent('weather', phaseWindows);
  const time = orchestrator.computeCurrent('time', phaseWindows);

  assert.equal(weather.content.zone, 'main');
  assert.equal(time.content.zone, 'main');
});

test('phase override test: current phase follows evaluated window', () => {
  const orchestrator = new DisplayOrchestrator();
  const payload = orchestrator.computeCurrent('hallway', phaseWindows);

  assert.equal(payload.currentPhase, 'class');
  assert.equal(payload.currentEvent, 'scheduled-day');
});
