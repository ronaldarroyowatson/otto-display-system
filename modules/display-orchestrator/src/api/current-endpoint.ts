import { DisplayOrchestrator } from "../orchestrator/display-orchestrator.js";
import type { DisplayRole } from "../orchestrator/role-definitions.js";

export interface DisplayCurrentRequest {
  role: DisplayRole;
}

export function buildDisplayCurrentHandler(orchestrator = new DisplayOrchestrator()) {
  return (request: DisplayCurrentRequest) => {
    const phases = [
      { phase: "class", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 60_000).toISOString() }
    ];
    return orchestrator.computeCurrent(request.role, phases);
  };
}
