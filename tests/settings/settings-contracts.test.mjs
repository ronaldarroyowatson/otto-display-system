import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('orchestrator settings contract contains required fields', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/settings/models/OrchestratorSettings.ts');
  assert.match(src, /pages:\s*Record<string,\s*PageSettings>/);
  assert.match(src, /displayDurationMs:\s*number/);
  assert.match(src, /timeZone:\s*string/);
  assert.match(src, /format:\s*TimeDisplayFormat/);
  assert.match(src, /style:\s*TimeDisplayStyle/);
});

test('settings command registration contains get/set/list', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/settings/commands/registerSettingsCommands.ts');
  assert.match(src, /orchestrator\.settings\.get/);
  assert.match(src, /orchestrator\.settings\.set/);
  assert.match(src, /orchestrator\.settings\.list/);
  assert.match(src, /orchestrator\.pageSettings\.get/);
  assert.match(src, /orchestrator\.pageSettings\.set/);
  assert.match(src, /orchestrator\.pageSettings\.list/);
});

test('settings compiler document exists', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/compiler/generateSettingsDocument.ts');
  assert.match(src, /generateSettingsDocument/);
  assert.match(src, /settings:/);
});
