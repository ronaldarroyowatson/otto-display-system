import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('dev ui orchestrator settings page contains required controls', async () => {
  const html = await read('../../external/otto/otto-design-system-dev-ui/src/pages/orchestrator-settings.html');
  assert.match(html, /rotationIntervalMs/);
  assert.match(html, /rotationMode/);
  assert.match(html, /weatherSevere/);
  assert.match(html, /scheduleClassChange/);
  assert.match(html, /phaseAssembly/);
});

test('dev ui controller uses CSL settings command', async () => {
  const js = await read('../../external/otto/otto-design-system-dev-ui/src/scripts/orchestrator-settings.js');
  assert.match(js, /orchestrator\.settings\.set/);
  assert.match(js, /orchestrator\.settings\.get/);
  assert.match(js, /orchestrator\.rotation\.plan\.get/);
  assert.match(js, /debug\.trace\.command/);
  assert.match(js, /debug\.trace\.api/);
});

test('dev ui index includes orchestrator settings navigation entry', async () => {
  const html = await read('../../external/otto/otto-design-system-dev-ui/src/pages/index.html');
  assert.match(html, /Display Orchestrator Settings/);
});
