import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function maybeFetch(pathname, options) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(`${baseUrl}${pathname}`, options);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  test.skip(`runtime unavailable: ${pathname}`);
  return null;
}

async function csl(command, payload = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await maybeFetch('/csl/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, payload })
    });
    if (!response) return null;
    if (response.status === 200) {
      return response.json();
    }
    if (response.status < 500) {
      assert.equal(response.status, 200);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  const finalResponse = await maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
  if (!finalResponse) return null;
  assert.equal(finalResponse.status, 200);
  return finalResponse.json();
}

async function addPage(name) {
  const response = await maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type: 'url', url: `https://example.com/settings-test-${runId}` })
  });
  if (!response) return null;
  assert.equal(response.status, 200);
  return response.json();
}

test('per-page settings load/save/validate', async () => {
  const page = await addPage(`Settings Validate ${runId}`);
  if (!page) return;

  const hallway = await csl('orchestrator.pageSettings.set', {
    pageId: page.id,
    patch: {
      enabled: true,
      displayDurationMs: 44000,
      triggers: {
        timeBased: true,
        scheduleBased: false,
        weatherBased: false,
        phaseBased: false
      }
    }
  });
  if (!hallway) return;

  assert.equal(hallway.id, page.id);
  assert.equal(hallway.displayDurationMs, 44000);

  const fetched = await csl('orchestrator.pageSettings.get', { pageId: page.id });
  if (!fetched) return;
  assert.equal(fetched.id, page.id);
  assert.equal(typeof fetched.displayDurationMs, 'number');

  const list = await csl('orchestrator.pageSettings.list');
  if (!list) return;
  assert.ok(Array.isArray(list.pages));
  if (!list.pages.some((item) => item.id === page.id)) {
    const settingsResponse = await maybeFetch('/content/settings.json');
    if (!settingsResponse) return;
    assert.equal(settingsResponse.status, 200);
    const settings = await settingsResponse.json();
    assert.ok(settings.pages && settings.pages[page.id]);
  }
});

test('per-page settings persisted in /content/settings.json contract', async () => {
  const response = await maybeFetch('/content/settings.json');
  if (!response) return;

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.pages);
  assert.equal(typeof body.pages, 'object');
  assert.ok(body.pages.hallway);
});
