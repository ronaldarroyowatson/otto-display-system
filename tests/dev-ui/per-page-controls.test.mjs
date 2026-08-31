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

test('dev-ui renders per-page control shell', async () => {
  const response = await maybeFetch('/dev-ui/orchestrator-settings');
  if (!response) return;

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Per-Page Controls/);
  assert.match(html, /pageSettingsCards/);
  assert.match(html, /Trigger-Aware Preview/);
  assert.match(html, /rotationPreviewCard/);
});

test('dev-ui controller uses page settings commands and rotation preview', async () => {
  const response = await maybeFetch('/dev-ui/scripts/orchestrator-settings.js');
  if (!response) return;

  assert.equal(response.status, 200);
  const js = await response.text();
  assert.match(js, /orchestrator\.pageSettings\.set/);
  assert.match(js, /orchestrator\.settings\.get/);
  assert.match(js, /orchestrator\.pages\.list/);
});

test('time page controls can be configured via page settings command', async () => {
  const response = await maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: 'orchestrator.pageSettings.set',
      payload: {
        pageId: 'time',
        patch: {
          timeSettings: {
            timeZone: 'America/Chicago',
            useDaylightSavings: true,
            format: '12h',
            style: 'analog'
          }
        }
      }
    })
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.timeSettings.timeZone, 'America/Chicago');
  assert.equal(body.timeSettings.format, '12h');
  assert.equal(body.timeSettings.style, 'analog');
});
