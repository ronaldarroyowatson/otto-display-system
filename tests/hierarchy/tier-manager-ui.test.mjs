import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

test('Tier Manager UI is present', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/dev-ui/orchestrator-settings`);
  } catch {
    test.skip('runtime unavailable');
    return;
  }

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Tier Manager/i);
  assert.match(html, /displaySelector/);
  assert.match(html, /tierList/);
  assert.match(html, /playlistOrderMode/);
});

test('Tier Manager script includes rename-tier control rendering', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/dev-ui/scripts/orchestrator-settings.js`);
  } catch {
    test.skip('runtime unavailable');
    return;
  }

  assert.equal(response.status, 200);
  const script = await response.text();
  assert.match(script, /data-action="rename-tier"/i);
});
