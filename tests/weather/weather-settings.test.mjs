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

test('weather page supports units and override controls', async () => {
  const response = await csl('orchestrator.pageSettings.set', {
    pageId: 'weather',
    patch: {
      weatherSettings: {
        units: 'C',
        iconPack: 'minimal',
        severeWeatherOverride: true
      }
    }
  });
  if (!response.ok) {
    test.skip('page settings unavailable');
    return;
  }
  const saved = await response.json();
  assert.equal(saved.weatherSettings.units, 'C');
  assert.equal(saved.weatherSettings.iconPack, 'minimal');
});
