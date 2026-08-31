import { RotationController } from "../orchestrator/rotation-controller.js";
import type { DisplayConfigDocument } from "../orchestrator/generateRotationPlan.js";

const controller = new RotationController();

export async function getRotationPlan(config: DisplayConfigDocument) {
  return controller.buildPlan(config);
}
