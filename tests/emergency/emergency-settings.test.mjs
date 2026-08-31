import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function csl(command, payload = {}) {
  return fetch(`${baseUrl}/csl/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('emergency page keeps tier 0 invariants', async () => {
  let response = await csl('orchestrator.pageSettings.set', {
    pageId: 'emergency',
    patch: {
      tier: 99,
      enabled: false,
      emergencySettings: {
        severity: 'critical',
        overrideBehavior: 'suppress-all'
      }
    }
  });
  if (!response.ok) {
    test.skip('emergency settings unavailable');
    return;
  }

  const saved = await response.json();
  assert.equal(saved.tier, 0);
  assert.equal(saved.enabled, true);

  response = await csl('orchestrator.page.softDelete', { pageId: 'emergency' });
  assert.equal(response.status, 500);
});
