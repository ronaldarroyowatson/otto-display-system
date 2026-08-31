import type { DisplayConfigDocument, RotationPlan } from "./generateRotationPlan.js";
import { generateRotationPlan } from "./generateRotationPlan.js";
import { OrchestratorSettingsService } from "../settings/OrchestratorSettingsService.js";

export class RotationController {
  private startedAtMs = Date.now();

  constructor(private readonly settingsService = new OrchestratorSettingsService()) {}

  async getSettings() {
    return this.settingsService.get();
  }

  async updateSettings(patch: Parameters<OrchestratorSettingsService["set"]>[0]) {
    return this.settingsService.set(patch);
  }

  async listSettings() {
    return this.settingsService.list();
  }

  async buildPlan(config: DisplayConfigDocument): Promise<RotationPlan> {
    const settings = await this.settingsService.get();
    const plan = generateRotationPlan(config, settings);
    return {
      ...plan,
      triggerReason: plan.triggerReason,
      countdownMs: plan.countdownMs
    };
  }

  getRuntimeAgeMs(): number {
    return Date.now() - this.startedAtMs;
  }
}
