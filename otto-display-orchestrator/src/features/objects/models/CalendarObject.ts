import type { DisplayObject } from "../../layout/models/DisplayObject.js";

export interface CalendarObject extends DisplayObject {
  type: "CalendarGrid";
  content: {
    events: Array<{ id: string; title: string; start: string; end?: string }>;
    dayLabel?: string;
  };
}

export function createCalendarObject(): CalendarObject {
  return {
    id: "calendar-grid-main",
    type: "CalendarGrid",
    zoneId: "Footer",
    title: "Calendar",
    source: "otto-calendar",
    priority: 55,
    enabled: true,
    variant: "default",
    content: {
      events: [{ id: "evt-1", title: "Assembly", start: "09:30" }],
      dayLabel: "Today"
    }
  };
}
