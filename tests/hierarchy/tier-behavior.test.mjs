import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

async function csl(command, payload = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await maybeFetch('/csl/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, payload })
    });
    if (!response) return null;
    if (response.status < 500) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('Tier 0 is immutable and overrides', async () => {
  let response = await csl('orchestrator.pageSettings.set', {
    pageId: 'emergency',
    patch: { enabled: false, tier: 2, deleted: true }
  });
  if (!response) return;
  assert.equal(response.status, 500);
  const rejection = await response.json();
  assert.match(String(rejection.details || ''), /Tier 0 pages cannot be deleted/i);

  response = await csl('orchestrator.pageSettings.set', {
    pageId: 'emergency',
    patch: { enabled: false, tier: 2 }
  });
  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.tier, 0);
  assert.equal(page.enabled, true);
  assert.equal(page.deleted, false);

  response = await csl('orchestrator.page.softDelete', { pageId: 'emergency' });
  assert.equal(response.status, 500);

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.ok(typeof plan.currentTier === 'number');
});
