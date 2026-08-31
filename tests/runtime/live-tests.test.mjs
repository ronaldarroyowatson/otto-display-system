import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

test('live smoke checks against runtime', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/health`);
  } catch {
    test.skip('runtime unavailable for live smoke checks');
    return;
  }

  assert.equal(response.status, 200);

  const settings = await fetch(`${baseUrl}/content/settings.json`);
  assert.equal(settings.status, 200);

  const rotation = await fetch(`${baseUrl}/content/rotation.json`);
  assert.equal(rotation.status, 200);

  const tiers = await fetch(`${baseUrl}/content/tier-list.json`);
  assert.equal(tiers.status, 200);

  const displays = await fetch(`${baseUrl}/content/displays.json`);
  assert.equal(displays.status, 200);

  const result = spawnSync(process.execPath, ['--test', 'tests/settings/per-page-settings.test.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, OTTO_TEST_BASE_URL: baseUrl },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
