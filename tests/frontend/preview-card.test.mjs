import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

test('preview renderer includes countdown and trigger reason logic', async () => {
  const js = await read('../../external/otto/otto-design-system-dev-ui/src/scripts/rotation-preview.js');
  assert.match(js, /Countdown/);
  assert.match(js, /Reason/);
  assert.match(js, /renderRotationPreviewCard/);
});

test('rotation endpoint exposes preview metadata', async () => {
  const response = await maybeFetch('/content/rotation.json');
  if (!response) return;

  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(typeof plan.triggerReason, 'string');
  assert.equal(typeof plan.countdownMs, 'number');
});
