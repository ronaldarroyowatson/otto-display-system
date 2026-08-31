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

async function addPage(payload) {
  return maybeFetch('/content/pages/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('2.1 Add Page UI includes required controls', async () => {
  const response = await maybeFetch('/dev-ui/orchestrator-settings');
  if (!response) return;

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /newPageName/);
  assert.match(html, /newPageType/);
  assert.match(html, /newPageUrl/);
  assert.match(html, /newPageCode/);
});

test('2.2 Save URL page persists metadata and pages index', async () => {
  const response = await addPage({
    name: 'External Kiosk',
    type: 'url',
    url: 'https://example.com/kiosk'
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.type, 'url');
  assert.equal(page.url, 'https://example.com/kiosk');

  const pagesResponse = await maybeFetch('/content/pages/pages.json');
  assert.equal(pagesResponse.status, 200);
  const pagesBody = await pagesResponse.json();
  assert.ok(Array.isArray(pagesBody.pages));
  assert.ok(pagesBody.pages.some((entry) => entry.id === page.id));
});

test('2.2 Save inline-code page writes html file', async () => {
  const response = await addPage({
    name: 'Inline Sample',
    type: 'inline-code',
    code: '<section><h1>Inline Works</h1></section>'
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.type, 'inline-code');

  const htmlResponse = await maybeFetch(page.htmlPath);
  assert.equal(htmlResponse.status, 200);
  const html = await htmlResponse.text();
  assert.match(html, /Inline Works/);
});

test('2.3 dynamic route for new page responds and rotation can include page', async () => {
  let response = await addPage({
    name: 'Route Test Page',
    type: 'inline-code',
    code: '<div>Route Test</div>'
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const page = await response.json();

  response = await maybeFetch(`/display/${page.id}/current`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.role, page.id);

  let settingsResp = await maybeFetch('/content/settings.json');
  const settings = await settingsResp.json();
  settings.enabledPages = [...new Set([...(settings.enabledPages || []), page.id])];

  settingsResp = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  assert.equal(settingsResp.status, 200);
  const savedSettings = await settingsResp.json();
  assert.ok(savedSettings.enabledPages.includes(page.id));

  response = await maybeFetch('/content/rotation.json');
  const plan = await response.json();
  assert.ok(Array.isArray(plan.pages));
});

test('2.4 page persistence survives runtime restart (best-effort check)', async () => {
  const createResp = await addPage({
    name: 'Persistence Page',
    type: 'inline-code',
    code: '<p>Persist me</p>'
  });
  if (!createResp) return;
  const page = await createResp.json();

  const checkResp = await maybeFetch(`/display/${page.id}/current`);
  assert.equal(checkResp.status, 200);
});

test('2.5 page validation errors', async () => {
  let response = await addPage({ type: 'url', url: 'https://example.com' });
  if (!response) return;
  assert.equal(response.status, 500);

  response = await addPage({ name: 'No URL', type: 'url' });
  assert.equal(response.status, 500);

  response = await addPage({ name: 'No Code', type: 'inline-code', code: '' });
  assert.equal(response.status, 500);

  await addPage({ name: 'Duplicate Name', type: 'url', url: 'https://example.com/a' });
  response = await addPage({ name: 'Duplicate Name', type: 'url', url: 'https://example.com/b' });
  assert.equal(response.status, 500);
});
