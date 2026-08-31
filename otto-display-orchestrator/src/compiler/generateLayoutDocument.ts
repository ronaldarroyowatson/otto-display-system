import type { DisplayObject } from "../features/layout/models/DisplayObject.js";
import type { LayoutRule } from "../features/layout/models/LayoutRule.js";
import { createDefaultLayoutZones } from "../features/layout/models/LayoutZone.js";
import { DesignSystemAdapter } from "../features/layout/adapters/DesignSystemAdapter.js";

export interface GeneratedLayoutDocument {
  version: string;
  timestamp: string;
  role: string;
  phase: string;
  zones: ReturnType<typeof createDefaultLayoutZones>;
  objects: DisplayObject[];
  rules: LayoutRule[];
  appearance: ReturnType<DesignSystemAdapter["resolveAppearance"]>;
}

export function generateLayoutDocument(
  input: {
    rules: LayoutRule[];
    objects: DisplayObject[];
    role?: string;
    phase?: string;
  }
): GeneratedLayoutDocument {
  const designSystem = new DesignSystemAdapter();

  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    role: input.role ?? "student",
    phase: input.phase ?? "normal",
    zones: createDefaultLayoutZones(),
    objects: input.objects,
    rules: input.rules,
    appearance: designSystem.resolveAppearance({
      role: input.role ?? "student",
      phase: input.phase ?? "normal"
    })
  };
}
