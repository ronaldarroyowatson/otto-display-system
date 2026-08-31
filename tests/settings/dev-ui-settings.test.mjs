import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('dev ui settings page includes per-page controls and preview card', async () => {
  const html = await read('../../external/otto/otto-design-system-dev-ui/src/pages/orchestrator-settings.html');
  assert.match(html, /Per-Page Controls/);
  assert.match(html, /pageSettingsCards/);
  assert.match(html, /rotationPreviewCard/);
  assert.match(html, /newPageType/);
});

test('dev ui controller and preview scripts use page settings commands', async () => {
  const controller = await read('../../external/otto/otto-design-system-dev-ui/src/scripts/orchestrator-settings.js');
  const preview = await read('../../external/otto/otto-design-system-dev-ui/src/scripts/rotation-preview.js');
  assert.match(controller, /orchestrator\.pageSettings\.set/);
  assert.match(controller, /orchestrator\.pages\.add/);
  assert.match(preview, /renderRotationPreviewCard/);
});
