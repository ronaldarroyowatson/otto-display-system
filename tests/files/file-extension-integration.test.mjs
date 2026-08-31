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

async function command(command, payload = {}) {
  return maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
}

test('3.1 file.write writes settings/pages/inline page files', async () => {
  let response = await command('file.write', {
    path: '/content/settings/orchestrator-settings.json',
    content: '{"enabledPages":["hallway"]}'
  });
  if (!response) return;
  assert.equal(response.status, 200);

  response = await command('file.write', {
    path: '/content/pages/pages.json',
    content: '[]'
  });
  assert.equal(response.status, 200);

  response = await command('file.write', {
    path: '/content/pages/test-inline.html',
    content: '<div>inline</div>'
  });
  assert.equal(response.status, 200);
});

test('3.2 file.read reads settings/pages/page files', async () => {
  let response = await command('file.read', { path: '/content/settings/orchestrator-settings.json' });
  if (!response) return;
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.match(body.content, /enabledPages/);

  response = await command('file.read', { path: '/content/pages/pages.json' });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.ok(typeof body.content === 'string');

  response = await command('file.read', { path: '/content/pages/test-inline.html' });
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
  let response = await command('file.write', { path: '/content/pages/to-delete.html', content: '<p>delete</p>' });
  if (!response) return;
  assert.equal(response.status, 200);

  response = await command('file.delete', { path: '/content/pages/to-delete.html', force: true });
  assert.equal(response.status, 200);

  response = await command('file.write', { path: '/content/settings/to-delete.json', content: '{}' });
  assert.equal(response.status, 200);

  response = await command('file.delete', { path: '/content/settings/to-delete.json', force: true });
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
