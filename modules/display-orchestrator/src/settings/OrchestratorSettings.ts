export type RotationMode = "time" | "schedule" | "weather" | "phase";

export interface OrchestratorSettings {
  enabledPages: string[];
  rotationIntervalMs: number;
  rotationMode: RotationMode;
  weatherTriggers: {
    severeWeather: boolean;
    tempThreshold: number;
  };
  scheduleTriggers: {
    classChange: boolean;
    passingPeriod: boolean;
  };
  phaseTriggers: {
    chapel: boolean;
    assembly: boolean;
    emergency: boolean;
  };
}

export const defaultOrchestratorSettings: OrchestratorSettings = {
  enabledPages: ["hallway", "weather", "time"],
  rotationIntervalMs: 30000,
  rotationMode: "time",
  weatherTriggers: {
    severeWeather: false,
    tempThreshold: 95
  },
  scheduleTriggers: {
    classChange: true,
    passingPeriod: true
  },
  phaseTriggers: {
    chapel: true,
    assembly: true,
    emergency: true
  }
};

export function normalizeOrchestratorSettings(
  input: Partial<OrchestratorSettings> = {}
): OrchestratorSettings {
  const enabledPages = Array.isArray(input.enabledPages)
    ? input.enabledPages.filter((page) => typeof page === "string")
    : defaultOrchestratorSettings.enabledPages;

  const interval = Number(input.rotationIntervalMs ?? defaultOrchestratorSettings.rotationIntervalMs);
  const normalizedInterval = Number.isFinite(interval)
    ? Math.min(120000, Math.max(5000, Math.round(interval)))
    : defaultOrchestratorSettings.rotationIntervalMs;

  const mode = input.rotationMode ?? defaultOrchestratorSettings.rotationMode;
  const allowedModes: RotationMode[] = ["time", "schedule", "weather", "phase"];

  return {
    enabledPages: enabledPages.length > 0 ? enabledPages : defaultOrchestratorSettings.enabledPages,
    rotationIntervalMs: normalizedInterval,
    rotationMode: allowedModes.includes(mode) ? mode : defaultOrchestratorSettings.rotationMode,
    weatherTriggers: {
      severeWeather: Boolean(input.weatherTriggers?.severeWeather),
      tempThreshold: Number(input.weatherTriggers?.tempThreshold ?? defaultOrchestratorSettings.weatherTriggers.tempThreshold)
    },
    scheduleTriggers: {
      classChange: Boolean(input.scheduleTriggers?.classChange ?? defaultOrchestratorSettings.scheduleTriggers.classChange),
      passingPeriod: Boolean(input.scheduleTriggers?.passingPeriod ?? defaultOrchestratorSettings.scheduleTriggers.passingPeriod)
    },
    phaseTriggers: {
      chapel: Boolean(input.phaseTriggers?.chapel ?? defaultOrchestratorSettings.phaseTriggers.chapel),
      assembly: Boolean(input.phaseTriggers?.assembly ?? defaultOrchestratorSettings.phaseTriggers.assembly),
      emergency: Boolean(input.phaseTriggers?.emergency ?? defaultOrchestratorSettings.phaseTriggers.emergency)
    }
  };
}
