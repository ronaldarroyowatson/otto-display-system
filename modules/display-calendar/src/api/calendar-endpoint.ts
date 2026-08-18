import { CalendarAggregator } from "../services/calendar-aggregator.js";

export async function getCalendarJson(aggregator = new CalendarAggregator()) {
  const events = await aggregator.refresh();
  return {
    generatedAt: new Date().toISOString(),
    events
  };
}
