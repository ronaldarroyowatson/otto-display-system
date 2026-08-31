import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

test('collapsible trigger menus and phases exist in controller', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/dev-ui/scripts/orchestrator-settings.js`);
    if (response.status === 404) {
      response = await fetch(`${baseUrl}/dev-ui/src/scripts/orchestrator-settings.js`);
    }
  } catch {
    test.skip('runtime unavailable');
    return;
  }

  assert.equal(response.status, 200);
  const source = await response.text();
  assert.match(source, /Trigger Modes/);
  assert.match(source, /Time-based/);
  assert.match(source, /Schedule-based/);
  assert.match(source, /Weather-based/);
  assert.match(source, /Phase-based/);
  assert.match(source, /chapel/);
  assert.match(source, /assembly/);
  assert.match(source, /emergency/);
  assert.match(source, /lockdown/);
  assert.match(source, /fire-drill/);
});
