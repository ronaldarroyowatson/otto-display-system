import { compileDisplayLayout } from "../compiler/compile.js";
import { createDefaultLayoutZones } from "../features/layout/models/LayoutZone.js";
import { DisplayObjectService } from "../features/objects/services/DisplayObjectService.js";
import { ModuleDataAdapter } from "../features/layout/adapters/ModuleDataAdapter.js";

export interface DisplaySystemContext {
  role?: string;
  phase?: string;
  time?: string;
}

export async function buildDisplaySystemDocument(context: DisplaySystemContext = {}) {
  const moduleDataAdapter = new ModuleDataAdapter();
  const objectService = new DisplayObjectService();
  const data = await moduleDataAdapter.load({ role: context.role, phase: context.phase });

  const rules = [
    {
      id: "r-1",
      name: "Morning schedule",
      type: "time-based",
      scope: "time",
      enabled: true,
      priority: 100,
      zoneId: "TopBar",
      objectType: "AnnouncementList",
      conditions: [{ field: "time", operator: "gt", value: "07:00" }],
      fallback: "default"
    },
    {
      id: "r-2",
      name: "Assembly phase",
      type: "phase-based",
      scope: "phase",
      enabled: true,
      priority: 200,
      zoneId: "FullscreenOverlay",
      objectType: "AnnouncementList",
      conditions: [{ field: "phase", operator: "equals", value: "assembly" }],
      fallback: "normal"
    }
  ] as const;

  const compiled = compileDisplayLayout({
    rules: rules as any,
    objects: objectService.get(),
    role: context.role ?? data.auth.role,
    phase: context.phase ?? "normal"
  });

  return {
    ...compiled.document,
    moduleData: data,
    zones: createDefaultLayoutZones(),
    generatedAt: new Date().toISOString()
  };
}
