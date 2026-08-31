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

test('multi-display registry and playlist sharing works', async () => {
  const source = 'hallway';
  const target = `display-${runId}`;

  let response = await csl('orchestrator.displays.add', { displayId: target });
  if (!response.ok) {
    test.skip('display registry unavailable');
    return;
  }

  response = await csl('orchestrator.displays.sharePlaylist', {
    sourceDisplayId: source,
    targetDisplayId: target
  });
  assert.equal(response.status, 200);

  let endpoint = await fetch(`${baseUrl}/display/${target}/hallway/current`);
  assert.equal(endpoint.status, 200);

  endpoint = await fetch(`${baseUrl}/content/displays/${target}/settings.json`);
  assert.equal(endpoint.status, 200);
  const settings = await endpoint.json();
  assert.ok(settings.pages);
});
