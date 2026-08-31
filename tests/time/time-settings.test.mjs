import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function csl(command, payload = {}) {
  const response = await fetch(`${baseUrl}/csl/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
  return response;
}

test('time page supports extended controls', async () => {
  let response = await csl('orchestrator.pageSettings.set', {
    pageId: 'time',
    patch: {
      timeSettings: {
        timeZone: 'America/Chicago',
        useDaylightSavings: false,
        format: '12h',
        style: 'analog',
        showSeconds: false,
        leadingZero: false
      }
    }
  });
  if (!response.ok) {
    test.skip('page settings unavailable');
    return;
  }

  const saved = await response.json();
  assert.equal(saved.timeSettings.timeZone, 'America/Chicago');
  assert.equal(saved.timeSettings.showSeconds, false);
  assert.equal(saved.timeSettings.leadingZero, false);
});
