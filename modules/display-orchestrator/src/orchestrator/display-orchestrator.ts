import { PhaseEngine, type PhaseWindow } from "./phase-engine.js";
import { ROLE_DEFINITIONS, type DisplayRole } from "./role-definitions.js";

export interface DisplayPayload {
  role: DisplayRole;
  currentEvent: string;
  currentPhase: string;
  nextPhase: string | null;
  countdownSeconds: number;
  content: Record<string, unknown>;
}

export class DisplayOrchestrator {
  constructor(private readonly phaseEngine = new PhaseEngine()) {}

  computeCurrent(role: DisplayRole, phaseWindows: PhaseWindow[]): DisplayPayload {
    const roleDefinition = ROLE_DEFINITIONS.find((item) => item.role === role);
    if (!roleDefinition) {
      throw new Error(`Unknown role: ${role}`);
    }

    const phaseResult = this.phaseEngine.evaluate(new Date(), phaseWindows);
    return {
      role,
      currentEvent: "scheduled-day",
      currentPhase: phaseResult.currentPhase,
      nextPhase: phaseResult.nextPhase,
      countdownSeconds: phaseResult.secondsRemaining,
      content: {
        zones: roleDefinition.zones
      }
    };
  }
}
