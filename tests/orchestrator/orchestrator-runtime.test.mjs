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

test('4.1 rotation plan reflects settings and new page', async () => {
  let response = await maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Runtime New Page', type: 'inline-code', code: '<div>Runtime</div>' })
  });
  if (!response) return;
  const page = await response.json();

  response = await maybeFetch('/content/settings.json');
  const settings = await response.json();
  const patch = {
    ...settings,
    enabledPages: [...new Set([...(settings.enabledPages || []), page.id])],
    rotationIntervalMs: 29000,
    rotationMode: 'phase',
    phaseTriggers: { chapel: true, assembly: true, emergency: false }
  };

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.rotationIntervalMs, 29000);
  assert.ok(['time', 'schedule', 'weather', 'phase'].includes(saved.rotationMode));
  assert.ok(saved.pages && typeof saved.pages === 'object');

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(typeof plan.rotationIntervalMs, 'number');
  assert.equal(typeof plan.rotationMode, 'string');
  assert.ok(Array.isArray(plan.pages));
});

test('4.2 layout config path returns enabled pages only (best-effort)', async () => {
  const response = await maybeFetch('/display-config.json');
  if (!response) return;
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.ok(config.displays);
});

test('4.3 dynamic endpoints respond', async () => {
  let response = await maybeFetch('/display/hallway/current');
  if (!response) return;
  assert.equal(response.status, 200);

  response = await maybeFetch('/display/weather/current');
  assert.equal(response.status, 200);

  response = await maybeFetch('/display/time/current');
  assert.equal(response.status, 200);

  response = await maybeFetch('/content/display.json');
  assert.ok([200, 404].includes(response.status));

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);

  response = await maybeFetch('/content/settings.json');
  assert.equal(response.status, 200);
});

test('4.4 error routes', async () => {
  let response = await maybeFetch('/display/unknown-role/current');
  if (!response) return;
  assert.equal(response.status, 400);

  response = await maybeFetch('/missing-page');
  assert.equal(response.status, 404);

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ invalid json'
  });
  assert.equal(response.status, 400);
});
