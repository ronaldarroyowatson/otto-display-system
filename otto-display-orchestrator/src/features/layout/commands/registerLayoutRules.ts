import { commandService } from "../../../integration/csl-registration.js";
import type { LayoutRule } from "../models/LayoutRule.js";

export const REGISTER_LAYOUT_RULES_COMMAND_ID = "display.layout.register.rules";

export interface RegisterLayoutRulesInput {
  rules: LayoutRule[];
}

export interface RegisterLayoutRulesResult {
  registered: number;
  ids: string[];
}

export async function registerLayoutRules(input: RegisterLayoutRulesInput): Promise<RegisterLayoutRulesResult> {
  const ids = input.rules.map((rule) => rule.id);
  return {
    registered: ids.length,
    ids
  };
}

commandService.register<RegisterLayoutRulesInput, RegisterLayoutRulesResult>(
  REGISTER_LAYOUT_RULES_COMMAND_ID,
  async (input: RegisterLayoutRulesInput) => registerLayoutRules(input)
);
