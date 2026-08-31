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
    pages: {
      hallway: {
        id: 'hallway',
        name: 'Hallway',
        enabled: true,
        displayDurationMs: 30000,
        triggers: { timeBased: true, scheduleBased: false, weatherBased: false, phaseBased: false }
      },
      weather: {
        id: 'weather',
        name: 'Weather',
        enabled: true,
        displayDurationMs: 33000,
        triggers: { timeBased: false, scheduleBased: false, weatherBased: true, phaseBased: false }
      },
      time: {
        id: 'time',
        name: 'Time',
        enabled: true,
        displayDurationMs: 36000,
        triggers: { timeBased: true, scheduleBased: false, weatherBased: false, phaseBased: false },
        timeSettings: { timeZone: 'UTC', useDaylightSavings: true, format: '24h', style: 'digital' }
      }
    }
  });

  const plan = await controller.buildPlan(sampleConfig);
  assert.equal(plan.rotationMode, 'per-page');
  assert.ok(plan.pages.some((page) => page.id === 'hallway'));
  assert.ok(plan.pages.some((page) => page.id === 'weather'));
  assert.ok(plan.pages.some((page) => page.id === 'time'));
});

test('rotation controller applies weather trigger precedence', async () => {
  const controller = new RotationController();
  await controller.updateSettings({
    pages: {
      hallway: {
        id: 'hallway',
        name: 'Hallway',
        enabled: true,
        displayDurationMs: 30000,
        triggers: { timeBased: true, scheduleBased: false, weatherBased: false, phaseBased: false }
      },
      weather: {
        id: 'weather',
        name: 'Weather',
        enabled: true,
        displayDurationMs: 30000,
        triggers: { timeBased: false, scheduleBased: false, weatherBased: true, phaseBased: false }
      },
      time: {
        id: 'time',
        name: 'Time',
        enabled: true,
        displayDurationMs: 30000,
        triggers: { timeBased: true, scheduleBased: false, weatherBased: false, phaseBased: false },
        timeSettings: { timeZone: 'UTC', useDaylightSavings: true, format: '24h', style: 'digital' }
      }
    }
  });

  const plan = await controller.buildPlan(sampleConfig);
  assert.equal(typeof plan.triggerReason, 'string');
  assert.ok(plan.currentPage?.id);
});
