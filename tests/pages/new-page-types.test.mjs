import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

async function addPage(payload) {
  return maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('create time page', async () => {
  const response = await addPage({ name: `Runtime Time Page ${runId}`, type: 'time' });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.type, 'time');
});

test('create weather page', async () => {
  const response = await addPage({ name: `Runtime Weather Page ${runId}`, type: 'weather' });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.type, 'weather');
});

test('create custom page', async () => {
  const response = await addPage({ name: `Runtime Custom Page ${runId}`, type: 'custom', code: '<section>Custom</section>' });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.type, 'custom');
});
