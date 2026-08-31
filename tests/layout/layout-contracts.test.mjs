import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('LayoutRule contract includes core fields', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/layout/models/LayoutRule.ts');
  assert.match(src, /interface\s+LayoutRule/);
  assert.match(src, /zoneId/);
  assert.match(src, /objectType/);
  assert.match(src, /conditions/);
});

test('LayoutZone contract includes Main zone', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/layout/models/LayoutZone.ts');
  assert.match(src, /"Main"/);
  assert.match(src, /allowedObjectTypes/);
});

test('PhaseRule contract includes overrides and enable flag', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/phases/models/PhaseRule.ts');
  assert.match(src, /interface\s+PhaseRule/);
  assert.match(src, /zoneOverrides/);
  assert.match(src, /enabled/);
});

test('Layout rule command includes weather/time page rules', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/layout/commands/registerLayoutRules.ts');
  assert.match(src, /layout-weather-current/);
  assert.match(src, /layout-time-current/);
  assert.match(src, /field:\s*"role"/);
});

test('Compiler contract files are present and referenced', async () => {
  const objectSrc = await read('../../external/otto/otto-display-orchestrator/src/compiler/generateObjectInstances.ts');
  const layoutSrc = await read('../../external/otto/otto-display-orchestrator/src/compiler/generateLayoutDocument.ts');
  const validateSrc = await read('../../external/otto/otto-display-orchestrator/src/compiler/validate.ts');

  assert.match(objectSrc, /createTimeObject/);
  assert.match(layoutSrc, /GeneratedLayoutDocument/);
  assert.match(validateSrc, /validateLayoutSpec/);
});
