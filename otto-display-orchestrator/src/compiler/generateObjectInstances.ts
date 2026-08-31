import type { DisplayObject } from "../features/layout/models/DisplayObject.js";
import { createAnnouncementObject } from "../features/objects/models/AnnouncementObject.js";
import { createCalendarObject } from "../features/objects/models/CalendarObject.js";
import { createHomeworkObject } from "../features/objects/models/HomeworkObject.js";
import { createWeatherObject } from "../features/objects/models/WeatherObject.js";

export function generateObjectInstances(baseObjects: DisplayObject[] = []): DisplayObject[] {
  const defaults = [
    createAnnouncementObject(),
    createHomeworkObject(),
    createWeatherObject(),
    createCalendarObject()
  ];

  const map = new Map<string, DisplayObject>();
  for (const object of [...defaults, ...baseObjects]) {
    map.set(object.id, object);
  }

  return [...map.values()];
}
