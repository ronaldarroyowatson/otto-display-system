import { LayoutCompilerService } from "../features/layout/services/LayoutCompilerService.js";
import { createDefaultLayoutZones } from "../features/layout/models/LayoutZone.js";
import type { DisplayObject } from "../features/layout/models/DisplayObject.js";
import type { LayoutRule } from "../features/layout/models/LayoutRule.js";
import { validateLayoutSpec } from "./validate.js";
import { generateObjectInstances } from "./generateObjectInstances.js";
import { generateLayoutDocument } from "./generateLayoutDocument.js";

export interface CompileLayoutOptions {
  rules: LayoutRule[];
  objects?: DisplayObject[];
  role?: string;
  phase?: string;
}

export interface CompileLayoutResult {
  valid: boolean;
  document: ReturnType<typeof generateLayoutDocument>;
  warnings: string[];
}

export function compileDisplayLayout(options: CompileLayoutOptions): CompileLayoutResult {
  const rules = [...options.rules];
  const objects = generateObjectInstances(options.objects ?? []);
  const validation = validateLayoutSpec(rules, objects);

  const compiler = new LayoutCompilerService();
  const compiled = compiler.compile({
    rules,
    objects,
    zones: createDefaultLayoutZones(),
    role: options.role,
    phase: options.phase
  });

  const document = generateLayoutDocument({
    rules,
    objects,
    role: options.role,
    phase: options.phase
  });

  return {
    valid: validation.valid,
    document,
    warnings: validation.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message)
  };
}
