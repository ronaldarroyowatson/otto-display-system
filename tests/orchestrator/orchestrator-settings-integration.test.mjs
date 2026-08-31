import test from 'node:test';
import assert from 'node:assert/strict';

import { RotationController } from '../../modules/display-orchestrator/dist/orchestrator/rotation-controller.js';

const sampleConfig = {
  defaults: { displayId: 'hallway' },
  displays: {
    hallway: {
      pages: [
        { id: 'hallway', label: 'Hallway', modules: ['announcements'] },
        { id: 'weather', label: 'Weather', modules: ['weather'] },
        { id: 'time', label: 'Time', modules: ['time'] }
      ]
    }
  }
};

test('rotation controller builds plan from settings and config', async () => {
  const controller = new RotationController();
  await controller.updateSettings({
    enabledPages: ['hallway', 'weather', 'time'],
    rotationIntervalMs: 30000,
    rotationMode: 'time'
  });

  const plan = await controller.buildPlan(sampleConfig);
  assert.equal(plan.rotationIntervalMs, 30000);
  assert.equal(plan.rotationMode, 'time');
  assert.deepEqual(plan.pages.map((page) => page.id), ['hallway', 'weather', 'time']);
});

test('rotation controller applies weather trigger precedence', async () => {
  const controller = new RotationController();
  await controller.updateSettings({
    enabledPages: ['hallway', 'weather', 'time'],
    rotationIntervalMs: 30000,
    rotationMode: 'weather',
    weatherTriggers: { severeWeather: true, tempThreshold: 80 }
  });

  const plan = await controller.buildPlan(sampleConfig);
  assert.equal(plan.pages[0].id, 'weather');
});
