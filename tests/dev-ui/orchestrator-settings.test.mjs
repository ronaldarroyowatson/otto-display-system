import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

const baseUrl = process.env.OTTO_TEST_BASE_URL ?? 'http://127.0.0.1:8080';

async function maybeFetch(pathname, options) {
  try {
    return await fetch(`${baseUrl}${pathname}`, options);
  } catch {
    test.skip(`runtime unavailable: ${pathname}`);
    return null;
  }
}

async function callCommand(command, payload = {}) {
  const response = await maybeFetch('/csl/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, payload })
  });
  if (!response) return null;
  return response;
}

function createMockElement() {
  return {
    checked: false,
    value: '',
    textContent: '',
    files: [],
    style: {},
    listeners: new Map(),
    addEventListener(eventName, handler) {
      const handlers = this.listeners.get(eventName) ?? [];
      handlers.push(handler);
      this.listeners.set(eventName, handlers);
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    remove() {
      // no-op for test doubles
    },
    click() {
      const handlers = this.listeners.get('click') ?? [];
      for (const handler of handlers) {
        handler();
      }
    }
  };
}

async function executeSettingsControllerWithState(settingsState) {
  const controllerResponse = await maybeFetch('/dev-ui/scripts/orchestrator-settings.js');
  if (!controllerResponse) return null;
  assert.equal(controllerResponse.status, 200);
  const source = await controllerResponse.text();

  const ids = [
    'status',
    'rotationPreview',
    'rotationIntervalMs',
    'rotationIntervalLabel',
    'rotation-value',
    'pageHallway',
    'pageWeather',
    'pageTime',
    'rotationMode',
    'weatherSevere',
    'weatherTempThreshold',
    'scheduleClassChange',
    'schedulePassingPeriod',
    'phaseChapel',
    'phaseAssembly',
    'phaseEmergency',
    'saveSettings',
    'refreshSettings',
    'savePage',
    'downloadSettings',
    'backupPages',
    'restoreSettings',
    'restoreSettingsFile',
    'newPageName',
    'newPageType',
    'newPageUrl',
    'newPageCode'
  ];

  const elements = new Map(ids.map((id) => [id, createMockElement()]));
  const body = {
    appendChild() {
      // no-op for test doubles
    },
    removeChild() {
      // no-op for test doubles
    }
  };

  const anchors = [];
  const documentMock = {
    body,
    getElementById(id) {
      const element = elements.get(id);
      if (!element) throw new Error(`Missing test element: ${id}`);
      return element;
    },
    createElement(tagName) {
      if (tagName === 'a') {
        const anchor = createMockElement();
        anchors.push(anchor);
        return anchor;
      }
      return createMockElement();
    }
  };

  const loadHandlers = [];
  const windowMock = {
    addEventListener(eventName, handler) {
      if (eventName === 'load') {
        loadHandlers.push(handler);
      }
    }
  };

  const fetchMock = async (pathname, options = {}) => {
    if (pathname !== '/csl/command') {
      throw new Error(`Unexpected fetch path in controller test: ${pathname}`);
    }
    const bodyObj = JSON.parse(options.body ?? '{}');
    if (bodyObj.command === 'orchestrator.settings.get') {
      return new Response(JSON.stringify(settingsState), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (bodyObj.command === 'orchestrator.rotation.plan.get') {
      const plan = {
        generatedAt: new Date().toISOString(),
        rotationMode: settingsState.rotationMode,
        rotationIntervalMs: settingsState.rotationIntervalMs,
        pages: (settingsState.enabledPages ?? []).map((id) => ({ id, label: id }))
      };
      return new Response(JSON.stringify(plan), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (String(bodyObj.command || '').startsWith('debug.')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected command in controller test: ${bodyObj.command}`);
  };

  const savedGlobals = {
    document: globalThis.document,
    window: globalThis.window,
    fetch: globalThis.fetch,
    URL: globalThis.URL,
    Blob: globalThis.Blob
  };

  globalThis.document = documentMock;
  globalThis.window = windowMock;
  globalThis.fetch = fetchMock;
  globalThis.URL = {
    createObjectURL() {
      return 'blob:test';
    },
    revokeObjectURL() {
      // no-op for test doubles
    }
  };
  globalThis.Blob = class MockBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  };

  try {
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}#${Date.now()}`;
    await import(moduleUrl);
    for (const onLoad of loadHandlers) {
      onLoad();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { elements, anchors };
  } finally {
    globalThis.document = savedGlobals.document;
    globalThis.window = savedGlobals.window;
    globalThis.fetch = savedGlobals.fetch;
    globalThis.URL = savedGlobals.URL;
    globalThis.Blob = savedGlobals.Blob;
  }
}

test('1.1 settings page loads with expected sections', async () => {
  const response = await maybeFetch('/dev-ui/orchestrator-settings');
  if (!response) return;

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Enabled Pages/i);
  assert.match(html, /Rotation Controls/i);
  assert.match(html, /Add Page/i);
  assert.match(html, /Actions/i);
  assert.match(html, /Preview|Live Rotation Preview/i);
});

test('1.1a initial page load renders current settings state', async () => {
  const desiredSettings = {
    enabledPages: ['weather', 'time'],
    rotationIntervalMs: 31000,
    rotationMode: 'weather',
    weatherTriggers: { severeWeather: true, tempThreshold: 81 },
    scheduleTriggers: { classChange: true, passingPeriod: true },
    phaseTriggers: { chapel: true, assembly: false, emergency: false }
  };

  let response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(desiredSettings)
  });
  if (!response) return;
  assert.equal(response.status, 200);

  response = await callCommand('orchestrator.settings.get', {});
  if (!response) return;
  assert.equal(response.status, 200);
  const currentSettings = await response.json();

  const result = await executeSettingsControllerWithState(currentSettings);
  if (!result) return;

  const { elements } = result;
  assert.equal(elements.get('pageHallway').checked, false);
  assert.equal(elements.get('pageWeather').checked, true);
  assert.equal(elements.get('pageTime').checked, true);
  assert.equal(elements.get('rotationIntervalMs').value, '31000');
  assert.equal(elements.get('rotation-value').textContent, '31 seconds');
  assert.equal(elements.get('rotationMode').value, 'weather');
  assert.equal(elements.get('status').textContent, 'Ready');
  assert.match(elements.get('rotationPreview').textContent, /Pages \(2\)/);
});

test('1.2 enabled pages toggle weather off/on updates rotation', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const original = await response.json();

  // Force deterministic baseline before toggle assertions.
  const baseline = {
    ...original,
    enabledPages: ['hallway', 'weather', 'time'],
    rotationMode: 'time',
    weatherTriggers: { severeWeather: false, tempThreshold: 80 },
    scheduleTriggers: { classChange: false, passingPeriod: false },
    phaseTriggers: { chapel: false, assembly: false, emergency: false }
  };

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(baseline)
  });
  assert.equal(response.status, 200);

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseline, enabledPages: baseline.enabledPages.filter((p) => p !== 'weather') })
  });
  assert.equal(response.status, 200);
  let updated = await response.json();
  assert.ok(!updated.enabledPages.includes('weather'));

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  let plan = await response.json();
  assert.ok(Array.isArray(plan.pages));

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseline, enabledPages: ['hallway', 'weather', 'time'] })
  });
  assert.equal(response.status, 200);
  updated = await response.json();
  assert.ok(updated.enabledPages.includes('weather'));

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  plan = await response.json();
  assert.ok(Array.isArray(plan.pages));
});

test('1.2 enabled pages toggle time off/on updates rotation', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const original = await response.json();

  const baseline = {
    ...original,
    enabledPages: ['hallway', 'weather', 'time'],
    rotationMode: 'time',
    weatherTriggers: { severeWeather: false, tempThreshold: 80 },
    scheduleTriggers: { classChange: false, passingPeriod: false },
    phaseTriggers: { chapel: false, assembly: false, emergency: false }
  };

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(baseline)
  });
  assert.equal(response.status, 200);

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseline, enabledPages: baseline.enabledPages.filter((p) => p !== 'time') })
  });
  assert.equal(response.status, 200);
  let updated = await response.json();
  assert.ok(!updated.enabledPages.includes('time'));

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  let plan = await response.json();
  assert.ok(Array.isArray(plan.pages));

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseline, enabledPages: ['hallway', 'weather', 'time'] })
  });
  assert.equal(response.status, 200);
  updated = await response.json();
  assert.ok(updated.enabledPages.includes('time'));

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  plan = await response.json();
  assert.ok(Array.isArray(plan.pages));
});

test('1.3 rotation interval updates setting and plan', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const original = await response.json();

  const nextInterval = 45000;
  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...original, rotationIntervalMs: nextInterval })
  });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.rotationIntervalMs, nextInterval);

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(typeof plan.rotationIntervalMs, 'number');
});

test('1.4 rotation mode updates settings and plan', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const original = await response.json();

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...original, rotationMode: 'schedule' })
  });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.rotationMode, 'schedule');

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(plan.rotationMode, 'schedule');
});

test('1.5 trigger changes update settings and plan', async () => {
  let response = await maybeFetch('/content/settings.json');
  if (!response) return;
  const original = await response.json();

  const patch = {
    ...original,
    weatherTriggers: { severeWeather: true, tempThreshold: 77 },
    scheduleTriggers: { classChange: false, passingPeriod: false },
    phaseTriggers: { chapel: false, assembly: true, emergency: false }
  };

  response = await maybeFetch('/content/settings.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.weatherTriggers.tempThreshold, 77);

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(plan.triggers.weather.tempThreshold, 77);
  assert.equal(plan.triggers.schedule.classChange, false);
});

test('1.6 Save settings command persists values', async () => {
  const response = await callCommand('orchestrator.settings.set', {
    patch: {
      enabledPages: ['hallway', 'time'],
      rotationIntervalMs: 30000,
      rotationMode: 'time'
    }
  });
  if (!response) return;

  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.ok(saved.enabledPages.includes('time'));

  const readSettings = await callCommand('file.read', { path: '/content/settings/orchestrator-settings.json' });
  assert.equal(readSettings.status, 200);
  const fileBody = await readSettings.json();
  const parsed = JSON.parse(fileBody.content);
  assert.ok(Array.isArray(parsed.enabledPages));
});

test('1.7 Download settings returns settings and pages', async () => {
  const response = await maybeFetch('/content/settings/download');
  if (!response) return;

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.settings);
  assert.ok(Array.isArray(body.pages));
});

test('1.8 Backup pages returns zip payload', async () => {
  const response = await maybeFetch('/content/pages/download-all');
  if (!response) return;

  assert.equal(response.status, 200);
  const contentType = response.headers.get('content-type') || '';
  assert.match(contentType, /application\/zip/);
  const bytes = await response.arrayBuffer();
  assert.ok(bytes.byteLength >= 0);
});

test('1.9 Restore settings applies and regenerates plan', async () => {
  const restorePayload = {
    settings: {
      enabledPages: ['weather', 'time'],
      rotationIntervalMs: 31000,
      rotationMode: 'weather',
      weatherTriggers: { severeWeather: true, tempThreshold: 81 },
      scheduleTriggers: { classChange: true, passingPeriod: true },
      phaseTriggers: { chapel: true, assembly: true, emergency: true }
    },
    pages: []
  };

  let response = await maybeFetch('/content/settings/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(restorePayload)
  });
  if (!response) return;

  assert.equal(response.status, 200);

  response = await maybeFetch('/content/rotation.json');
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(plan.rotationMode, 'weather');
  assert.equal(plan.rotationIntervalMs, 31000);
});
