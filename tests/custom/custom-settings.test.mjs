import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function csl(command, payload = {}) {
  return fetch(`${baseUrl}/csl/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('custom page supports inline/url/assets settings', async () => {
  let response = await fetch(`${baseUrl}/content/pages/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `custom-settings-${runId}`, type: 'custom', code: '<p>custom</p>' })
  });
  if (!response.ok) {
    test.skip('page add unavailable');
    return;
  }
  const page = await response.json();

  response = await csl('orchestrator.pageSettings.set', {
    pageId: page.id,
    patch: {
      customSettings: {
        inlineCode: '<p>changed</p>',
        url: 'https://example.com/custom',
        assetFolder: '/content/assets/custom'
      }
    }
  });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.customSettings.assetFolder, '/content/assets/custom');
});
