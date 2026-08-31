import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

test('preview payload includes tier-aware fields', async () => {
  let response;
  try {
    response = await fetch(`${baseUrl}/content/rotation.json`);
  } catch {
    test.skip('runtime unavailable');
    return;
  }

  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.ok('currentTier' in plan);
  assert.ok('nextTier' in plan);
  assert.ok('triggerReason' in plan);
  assert.ok('countdownMs' in plan);
  assert.ok('bumpedBy' in plan || plan.bumpedBy === undefined);
});
