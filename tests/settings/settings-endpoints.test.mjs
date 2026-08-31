import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

test('/content/settings.json responds with settings contract', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/content/settings.json`);
  } catch {
    test.skip('runtime unavailable for endpoint test');
    return;
  }

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.enabledPages));
  assert.equal(typeof body.rotationIntervalMs, 'number');
  assert.ok(['time', 'schedule', 'weather', 'phase'].includes(body.rotationMode));
});

test('/content/rotation.json responds with rotation plan', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/content/rotation.json`);
  } catch {
    test.skip('runtime unavailable for endpoint test');
    return;
  }

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.pages));
  assert.equal(typeof body.rotationIntervalMs, 'number');
});
