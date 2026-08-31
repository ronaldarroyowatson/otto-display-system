import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const settingsPath = `/content/settings/test-settings-${runId}.json`;
const pagesPath = `/content/pages/test-pages-${runId}.json`;
const inlinePath = `/content/pages/test-inline-${runId}.html`;

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

async function command(command, payload = {}) {
  return maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('3.1 file.write writes settings/pages/inline page files', async () => {
  let response = await command('file.write', {
    path: settingsPath,
    content: '{"name":"integration-test-settings"}'
  });
  if (!response) return;
  assert.equal(response.status, 200);

  response = await command('file.write', {
    path: pagesPath,
    content: '[]'
  });
  assert.equal(response.status, 200);

  response = await command('file.write', {
    path: inlinePath,
    content: '<div>inline</div>'
  });
  assert.equal(response.status, 200);
});

test('3.2 file.read reads settings/pages/page files', async () => {
  let response = await command('file.read', { path: settingsPath });
  if (!response) return;
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.match(body.content, /integration-test-settings/);

  response = await command('file.read', { path: pagesPath });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.ok(typeof body.content === 'string');

  response = await command('file.read', { path: inlinePath });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.match(body.content, /inline/);
});

test('3.3 file.list lists page and settings files', async () => {
  let response = await command('file.list', { path: '/content/pages' });
  if (!response) return;
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.ok(Array.isArray(body.items));

  response = await command('file.list', { path: '/content/settings' });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.ok(Array.isArray(body.items));
});

test('3.4 file.delete deletes page/settings files', async () => {
  const deletablePage = `/content/pages/to-delete-${runId}.html`;
  const deletableSettings = `/content/settings/to-delete-${runId}.json`;

  let response = await command('file.write', { path: deletablePage, content: '<p>delete</p>' });
  if (!response) return;
  assert.equal(response.status, 200);

  response = await command('file.delete', { path: deletablePage, force: true });
  assert.equal(response.status, 200);

  response = await command('file.write', { path: deletableSettings, content: '{}' });
  assert.equal(response.status, 200);

  response = await command('file.delete', { path: deletableSettings, force: true });
  assert.equal(response.status, 200);
});

test('3.5 file command errors for invalid/missing paths', async () => {
  let response = await command('file.write', { path: '/../../outside.txt', content: 'x' });
  if (!response) return;
  assert.equal(response.status, 500);

  response = await command('file.read', { path: '/content/pages/missing-file.html' });
  assert.equal(response.status, 500);

  response = await command('file.delete', { path: '/content/pages/missing-file.html' });
  assert.equal(response.status, 500);
});
