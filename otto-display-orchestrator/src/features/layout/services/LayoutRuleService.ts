import type { LayoutRule } from "../models/LayoutRule.js";
import { createDefaultLayoutZones } from "../models/LayoutZone.js";

export interface LayoutRuleResolution {
  appliedRules: LayoutRule[];
  conflicts: string[];
}

export class LayoutRuleService {
  resolveRules(rules: LayoutRule[]): LayoutRuleResolution {
    const sorted = [...rules]
      .filter((rule) => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    const appliedRules: LayoutRule[] = [];
    const conflicts: string[] = [];
    const seen = new Set<string>();

    for (const rule of sorted) {
      if (seen.has(rule.id)) {
        conflicts.push(`Duplicate rule: ${rule.id}`);
        continue;
      }

      seen.add(rule.id);
      appliedRules.push(rule);
    }

    const zones = createDefaultLayoutZones();
    for (const rule of appliedRules) {
      const zone = zones.find((item) => item.id === rule.zoneId);
      if (!zone) {
        conflicts.push(`Unknown zone in rule: ${rule.id}`);
      }
    }

    return { appliedRules, conflicts };
  }
}
