import { DesignSystemAdapter } from "../adapters/DesignSystemAdapter.js";
import type { DisplayObject } from "../models/DisplayObject.js";
import type { LayoutRule } from "../models/LayoutRule.js";
import type { LayoutZone } from "../models/LayoutZone.js";

export interface LayoutCompilerOptions {
  rules: LayoutRule[];
  zones: LayoutZone[];
  objects: DisplayObject[];
  role?: string;
  phase?: string;
}

export interface CompiledLayoutDocument {
  version: string;
  generatedAt: string;
  role: string;
  phase: string;
  zones: LayoutZone[];
  objects: DisplayObject[];
  appearance: ReturnType<DesignSystemAdapter["resolveAppearance"]>;
  metadata: {
    source: "otto-display-orchestrator";
    deterministic: boolean;
    strategy: string;
  };
}

export class LayoutCompilerService {
  private readonly designSystemAdapter = new DesignSystemAdapter();

  compile(options: LayoutCompilerOptions): CompiledLayoutDocument {
    const role = options.role ?? "student";
    const phase = options.phase ?? "normal";

    const zones = [...options.zones].sort((a, b) => a.order - b.order);
    const objects = [...options.objects]
      .filter((object) => object.enabled)
      .sort((a, b) => b.priority - a.priority);

    const appearance = this.designSystemAdapter.resolveAppearance({ role, phase });

    return {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      role,
      phase,
      zones,
      objects,
      appearance,
      metadata: {
        source: "otto-display-orchestrator",
        deterministic: true,
        strategy: "rule-priority-and-phase-override"
      }
    };
  }
}
