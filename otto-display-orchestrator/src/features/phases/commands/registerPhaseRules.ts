import { commandService } from "../../../integration/csl-registration.js";
import type { PhaseRule } from "../models/PhaseRule.js";

export const REGISTER_PHASE_RULES_COMMAND_ID = "display.phase.register";

export interface RegisterPhaseRulesInput {
  rules: PhaseRule[];
}

export interface RegisterPhaseRulesResult {
  registered: number;
  ids: string[];
}

export async function registerPhaseRules(input: RegisterPhaseRulesInput): Promise<RegisterPhaseRulesResult> {
  const ids = input.rules.map((rule) => rule.id);
  return {
    registered: ids.length,
    ids
  };
}

commandService.register<RegisterPhaseRulesInput, RegisterPhaseRulesResult>(
  REGISTER_PHASE_RULES_COMMAND_ID,
  async (input: RegisterPhaseRulesInput) => registerPhaseRules(input)
);
