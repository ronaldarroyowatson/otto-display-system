import { commandService } from "../../../integration/csl-registration.js";
import { LayoutCompilerService } from "../services/LayoutCompilerService.js";
import type { DisplayObject } from "../models/DisplayObject.js";
import type { LayoutRule } from "../models/LayoutRule.js";
import { createDefaultLayoutZones } from "../models/LayoutZone.js";

export const COMPILE_LAYOUT_COMMAND_ID = "display.layout.compile";

export interface CompileLayoutInput {
  rules: LayoutRule[];
  objects: DisplayObject[];
  role?: string;
  phase?: string;
}

export async function compileLayout(input: CompileLayoutInput) {
  const service = new LayoutCompilerService();
  return service.compile({
    rules: input.rules,
    objects: input.objects,
    zones: createDefaultLayoutZones(),
    role: input.role,
    phase: input.phase
  });
}

commandService.register<CompileLayoutInput, Awaited<ReturnType<typeof compileLayout>>>(
  COMPILE_LAYOUT_COMMAND_ID,
  async (input: CompileLayoutInput) => compileLayout(input)
);
