import { RotationController } from "../orchestrator/rotation-controller.js";
import type { OrchestratorSettings } from "../settings/OrchestratorSettings.js";

const controller = new RotationController();

export async function getOrchestratorSettings() {
  return controller.getSettings();
}

export async function setOrchestratorSettings(patch: Partial<OrchestratorSettings>) {
  return controller.updateSettings(patch);
}

export async function listOrchestratorSettings() {
  return controller.listSettings();
}
