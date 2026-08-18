import { promises as fs } from "node:fs";

export interface SchedulePeriod {
  label: string;
  startsAt: string;
  endsAt: string;
}

export interface ScheduleDay {
  name: string;
  periods: SchedulePeriod[];
}

export interface DisplaySchedule {
  days: ScheduleDay[];
}

export async function loadSchedule(pathToSchedule: string): Promise<DisplaySchedule> {
  const raw = await fs.readFile(pathToSchedule, "utf8");
  return JSON.parse(raw) as DisplaySchedule;
}
