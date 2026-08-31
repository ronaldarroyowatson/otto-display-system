import test from 'node:test';
import assert from 'node:assert/strict';

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

async function setPage(pageId, patch) {
  const response = await maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'orchestrator.pageSettings.set', payload: { pageId, patch } })
  });
  if (!response) return null;
  assert.equal(response.status, 200);
  return response.json();
}

async function addPage(name) {
  const response = await maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type: 'url', url: `https://example.com/per-page-rotation-${runId}` })
  });
  if (!response) return null;
  assert.equal(response.status, 200);
  return response.json();
}

test('rotation uses per-page durations', async () => {
  const page = await addPage(`Per-page Duration ${runId}`);
  if (!page) return;

  const updated = await setPage(page.id, {
    enabled: true,
    displayDurationMs: 15000,
    triggers: { timeBased: true, scheduleBased: false, weatherBased: false, phaseBased: false }
  });
  if (!updated) return;
  assert.equal(updated.displayDurationMs, 15000);

  const response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.ok(Array.isArray(plan.pages));
  assert.ok(plan.pages.some((item) => typeof item.displayDurationMs === 'number'));
});

test('rotation plan includes per-page trigger metadata', async () => {
  const response = await maybeFetch('/content/rotation.json');
  if (!response) return;

  assert.equal(response.status, 200);
  const plan = await response.json();
  const first = plan.pages[0];
  assert.ok(first.triggers);
  assert.equal(typeof first.triggers.timeBased, 'boolean');
  assert.equal(typeof first.triggers.scheduleBased, 'boolean');
  assert.equal(typeof first.triggers.weatherBased, 'boolean');
  assert.equal(typeof first.triggers.phaseBased, 'boolean');
});
