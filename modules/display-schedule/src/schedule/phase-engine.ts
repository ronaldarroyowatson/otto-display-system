import type { ScheduleDay, SchedulePeriod } from "./schedule-loader.js";

export class SchedulePhaseEngine {
  getCurrentPeriod(now: Date, day: ScheduleDay): SchedulePeriod | null {
    for (const period of day.periods) {
      const start = new Date(period.startsAt).getTime();
      const end = new Date(period.endsAt).getTime();
      const ts = now.getTime();
      if (ts >= start && ts < end) {
        return period;
      }
    }

    return null;
  }

  getNextPeriod(now: Date, day: ScheduleDay): SchedulePeriod | null {
    return day.periods.find((period) => new Date(period.startsAt).getTime() > now.getTime()) ?? null;
  }
}
