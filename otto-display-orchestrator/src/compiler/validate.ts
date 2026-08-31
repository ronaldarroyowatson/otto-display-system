import type { DisplayObject } from "../features/layout/models/DisplayObject.js";
import type { LayoutRule } from "../features/layout/models/LayoutRule.js";
import { createDefaultLayoutZones } from "../features/layout/models/LayoutZone.js";

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateLayoutSpec(rules: LayoutRule[], objects: DisplayObject[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const zones = createDefaultLayoutZones();
  const zoneIds = new Set(zones.map((zone) => zone.id));

  for (const rule of rules) {
    if (!zoneIds.has(rule.zoneId)) {
      issues.push({
        code: "INVALID_ZONE",
        message: `Rule ${rule.id} references unknown zone ${rule.zoneId}`,
        severity: "error"
      });
    }
  }

  for (const object of objects) {
    if (!zoneIds.has(object.zoneId)) {
      issues.push({
        code: "INVALID_OBJECT_ZONE",
        message: `Object ${object.id} references unknown zone ${object.zoneId}`,
        severity: "error"
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
