import type { PhaseRule } from "../models/PhaseRule.js";

export interface PhaseResolution {
  activePhase: string;
  applicableRules: PhaseRule[];
  overrides: Record<string, string[]>;
}

export class PhaseRuleService {
  resolvePhase(rules: PhaseRule[], currentTime = "09:30"): PhaseResolution {
    const now = currentTime;
    const applicable = rules.filter((rule) => rule.enabled && now >= rule.startTime && now <= rule.endTime);
    const activePhase = applicable[0]?.name ?? "normal";
    const overrides = Object.assign({}, ...(applicable.map((rule) => rule.zoneOverrides ?? {})));

    return {
      activePhase,
      applicableRules: applicable,
      overrides
    };
  }
}
