import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relPath) {
  return fs.readFile(new URL(relPath, import.meta.url), 'utf8');
}

test('WeatherObject contract test', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/objects/models/WeatherObject.ts');
  assert.match(src, /interface\s+WeatherObject/);
  assert.match(src, /conditions:\s*string/);
  assert.match(src, /icon:\s*string/);
  assert.match(src, /zoneId:\s*"Main"/);
});

test('TimeObject contract test', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/objects/models/TimeObject.ts');
  assert.match(src, /interface\s+TimeObject/);
  assert.match(src, /currentTime/);
  assert.match(src, /updatesEverySeconds:\s*1/);
  assert.match(src, /format:\s*"HH:MM:SS"/);
});

test('AnnouncementObject contract test', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/objects/models/AnnouncementObject.ts');
  assert.match(src, /AnnouncementObject/);
  assert.match(src, /items:/);
});

test('CalendarObject contract test', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/objects/models/CalendarObject.ts');
  assert.match(src, /CalendarObject/);
  assert.match(src, /events:/);
});

test('HomeworkObject contract test', async () => {
  const src = await read('../../external/otto/otto-display-orchestrator/src/features/objects/models/HomeworkObject.ts');
  assert.match(src, /HomeworkObject/);
  assert.match(src, /assignments:/);
});
