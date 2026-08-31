import type { DisplayObject } from "../../layout/models/DisplayObject.js";
import { createAnnouncementObject } from "../models/AnnouncementObject.js";
import { createCalendarObject } from "../models/CalendarObject.js";
import { createHomeworkObject } from "../models/HomeworkObject.js";
import { createWeatherObject } from "../models/WeatherObject.js";

export interface DisplayObjectRegistry {
  get(): DisplayObject[];
}

export class DisplayObjectService implements DisplayObjectRegistry {
  private readonly registry: DisplayObject[] = [
    createAnnouncementObject(),
    createHomeworkObject(),
    createWeatherObject(),
    createCalendarObject()
  ];

  get(): DisplayObject[] {
    return [...this.registry];
  }

  add(object: DisplayObject): DisplayObject[] {
    this.registry.push(object);
    return [...this.registry];
  }

  remove(id: string): DisplayObject[] {
    const next = this.registry.filter((object) => object.id !== id);
    this.registry.length = 0;
    this.registry.push(...next);
    return [...this.registry];
  }
}
