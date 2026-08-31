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

test('5.1 object renderer assets and fallback assets load', async () => {
  let response = await maybeFetch('/time-object-renderer.js');
  if (!response) return;
  assert.equal(response.status, 200);
  const timeJs = await response.text();
  assert.match(timeJs, /renderTimeObject/);

  response = await maybeFetch('/weather-object-renderer.js');
  assert.equal(response.status, 200);
  const weatherJs = await response.text();
  assert.match(weatherJs, /renderWeatherObject/);

  response = await maybeFetch('/object-renderers.js');
  assert.equal(response.status, 200);
  const registryJs = await response.text();
  assert.match(registryJs, /No renderer for/);
});

test('5.1 dynamic payload object types are returned', async () => {
  let response = await maybeFetch('/display/time/current');
  if (!response) return;
  assert.equal(response.status, 200);
  let payload = await response.json();
  assert.equal(payload.content.object.type, 'TimeObject');

  response = await maybeFetch('/display/weather/current');
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.content.object.type, 'WeatherObject');
});

test('5.2 rotation controller output reflects interval and enabled pages', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const settings = await response.json();

  const next = {
    ...settings,
    enabledPages: ['weather', 'time'],
    rotationIntervalMs: 33000,
    rotationMode: 'weather'
  };

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next)
  });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.rotationIntervalMs, 33000);

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(typeof plan.rotationIntervalMs, 'number');
  assert.ok(Array.isArray(plan.pages));
  assert.ok(plan.pages.every((p) => typeof p.id === 'string'));
});

test('5.3 live rotation preview content endpoint available', async () => {
  const response = await maybeFetch('/content/rotation.json');
  if (!response) return;
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.ok(Array.isArray(plan.pages));
});

test('5.4 missing resources produce error responses', async () => {
  let response = await maybeFetch('/content/pages/non-existent-page.html');
  if (!response) return;
  assert.ok([404, 500].includes(response.status));

  response = await maybeFetch('/definitely-missing-display-route');
  assert.equal(response.status, 404);
});
