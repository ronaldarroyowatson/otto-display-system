import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('time renderer supports timezone and DST options', async () => {
  const js = await read('../../modules/display-frontend/public/time-object-renderer.js');
  assert.match(js, /timeZone/);
  assert.match(js, /useDaylightSavings/);
  assert.match(js, /Intl\.DateTimeFormat/);
});

test('time renderer supports 12h and 24h format', async () => {
  const js = await read('../../modules/display-frontend/public/time-object-renderer.js');
  assert.match(js, /format === '12h'/);
  assert.match(js, /hour12/);
});

test('analog and digital renderers are present and registered', async () => {
  const analog = await read('../../modules/display-frontend/public/time-analog-renderer.js');
  const digital = await read('../../modules/display-frontend/public/time-digital-renderer.js');
  const registry = await read('../../modules/display-frontend/public/object-renderers.js');

  assert.match(analog, /renderTimeAnalogObject/);
  assert.match(digital, /renderTimeDigitalObject/);
  assert.match(registry, /Time analog renderer/);
  assert.match(registry, /Time digital renderer/);
});
