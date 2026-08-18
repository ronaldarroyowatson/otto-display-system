export interface PhaseWindow {
  phase: string;
  startsAt: string;
  endsAt: string;
}

export interface PhaseEvaluationResult {
  currentPhase: string;
  nextPhase: string | null;
  secondsRemaining: number;
}

export class PhaseEngine {
  evaluate(now: Date, phases: PhaseWindow[]): PhaseEvaluationResult {
    for (let i = 0; i < phases.length; i += 1) {
      const current = phases[i];
      const starts = new Date(current.startsAt).getTime();
      const ends = new Date(current.endsAt).getTime();
      const ts = now.getTime();

      if (ts >= starts && ts < ends) {
        const next = phases[i + 1] ?? null;
        return {
          currentPhase: current.phase,
          nextPhase: next?.phase ?? null,
          secondsRemaining: Math.max(0, Math.floor((ends - ts) / 1000))
        };
      }
    }

    return { currentPhase: "idle", nextPhase: null, secondsRemaining: 0 };
  }
}
