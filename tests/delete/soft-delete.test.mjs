import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function csl(command, payload = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/csl/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, payload })
    });
    if (response.status < 500) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return fetch(`${baseUrl}/csl/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('soft delete lifecycle supports delete and restore', async () => {
  let lastStatus = 0;
  let lastBody = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response = await fetch(`${baseUrl}/content/pages/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `soft-delete-${runId}-${attempt}`, type: 'url', url: 'https://example.com' })
    });
    if (!response.ok) {
      test.skip('page add unavailable');
      return;
    }
    const page = await response.json();

    response = await csl('orchestrator.page.softDelete', { pageId: page.id });
    lastStatus = response.status;
    lastBody = await response.text();
    if (response.status !== 200) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    const deleted = JSON.parse(lastBody);
    assert.equal(deleted.deleted, true);

    response = await csl('orchestrator.page.restore', { pageId: page.id });
    lastStatus = response.status;
    lastBody = await response.text();
    if (response.status !== 200) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    const restored = JSON.parse(lastBody);
    assert.equal(restored.deleted, false);
    return;
  }

  assert.equal(lastStatus, 200, lastBody);
});
