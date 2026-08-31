import { PhaseEngine, type PhaseWindow } from "./phase-engine.js";
import { ROLE_DEFINITIONS, ROLE_LAYOUT_RULES, type DisplayRole } from "./role-definitions.js";

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

  private ensureRoleHasRule(role: DisplayRole): void {
    const hasRule = ROLE_LAYOUT_RULES.some((rule) => rule.role === role && rule.enabled);
    if (!hasRule) {
      throw new Error(`No enabled layout rule for role: ${role}`);
    }
  }

  private buildDynamicContent(role: DisplayRole): Record<string, unknown> {
    if (role === "weather") {
      return {
        zone: "main",
        object: {
          type: "WeatherObject",
          temperature: 72,
          conditions: "Partly Cloudy",
          icon: "partly-cloudy"
        }
      };
    }

    if (role === "time") {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      return {
        zone: "main",
        object: {
          type: "TimeObject",
          currentTime: `${hours}:${minutes}:${seconds}`,
          updatesEverySeconds: 1,
          format: "HH:MM:SS"
        }
      };
    }

    const roleDefinition = ROLE_DEFINITIONS.find((item) => item.role === role);
    return {
      zones: roleDefinition?.zones ?? []
    };
  }

  computeCurrent(role: DisplayRole, phaseWindows: PhaseWindow[]): DisplayPayload {
    const roleDefinition = ROLE_DEFINITIONS.find((item) => item.role === role);
    if (!roleDefinition) {
      throw new Error(`Unknown role: ${role}`);
    }

    this.ensureRoleHasRule(role);

    const phaseResult = this.phaseEngine.evaluate(new Date(), phaseWindows);
    return {
      role,
      currentEvent: "scheduled-day",
      currentPhase: phaseResult.currentPhase,
      nextPhase: phaseResult.nextPhase,
      countdownSeconds: phaseResult.secondsRemaining,
      content: this.buildDynamicContent(role)
    };
  }
}
