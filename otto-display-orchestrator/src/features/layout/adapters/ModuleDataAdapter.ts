export interface ScheduleSnapshot {
  periodName?: string;
  nextEvent?: string;
  currentDay?: string;
}

export interface CalendarSnapshot {
  events: Array<Record<string, unknown>>;
  todayLabel?: string;
}

export interface AssignmentSnapshot {
  items: Array<Record<string, unknown>>;
  urgentCount: number;
}

export interface AuthSnapshot {
  role?: string;
  displayName?: string;
  isAuthenticated: boolean;
}

export interface ModuleDataContext {
  role?: string;
  date?: string;
  phase?: string;
}

export interface ModuleDataSnapshot {
  schedule: ScheduleSnapshot;
  calendar: CalendarSnapshot;
  assignments: AssignmentSnapshot;
  auth: AuthSnapshot;
  generatedAt: string;
}

export class ModuleDataAdapter {
  async load(context: ModuleDataContext = {}): Promise<ModuleDataSnapshot> {
    const now = new Date().toISOString();

    return {
      schedule: {
        periodName: "Period 2",
        nextEvent: "Lunch",
        currentDay: context.date ?? "2026-08-31"
      },
      calendar: {
        events: [{ title: "Team meeting", start: "09:00" }],
        todayLabel: "Today"
      },
      assignments: {
        items: [{ title: "Science lab", due: "Today" }],
        urgentCount: 1
      },
      auth: {
        role: context.role ?? "student",
        displayName: "Display Guest",
        isAuthenticated: true
      },
      generatedAt: now
    };
  }
}
