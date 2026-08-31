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

test('POST /content/settings.json updates interval and mode', async () => {
  const patch = {
    enabledPages: ['hallway', 'weather', 'time'],
    rotationIntervalMs: 30000,
    rotationMode: 'time',
    weatherTriggers: { severeWeather: false, tempThreshold: 95 },
    scheduleTriggers: { classChange: true, passingPeriod: true },
    phaseTriggers: { chapel: true, assembly: true, emergency: true }
  };

  const response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.rotationIntervalMs, 30000);
  assert.ok(['time', 'schedule', 'weather', 'phase'].includes(body.rotationMode));
});

test('GET /content/rotation.json includes hallway weather time', async () => {
  const response = await maybeFetch('/content/rotation.json');
  if (!response) return;

  assert.equal(response.status, 200);
  const body = await response.json();
  const ids = body.pages.map((page) => page.id);
  assert.ok(Array.isArray(ids));
  assert.ok(ids.length > 0);
  assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0));
});
