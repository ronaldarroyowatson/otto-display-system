import type { LayoutZoneId } from "./LayoutZone.js";

export type DisplayObjectType =
  | "AnnouncementList"
  | "HomeworkPanel"
  | "WeatherTile"
  | "CalendarGrid"
  | "Clock"
  | "StatusBadge";

export interface DisplayObject {
  id: string;
  type: DisplayObjectType;
  zoneId: LayoutZoneId;
  title?: string;
  source: string;
  priority: number;
  enabled: boolean;
  variant?: string;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class DisplayObjectInstance implements DisplayObject {
  id: string;
  type: DisplayObjectType;
  zoneId: LayoutZoneId;
  title?: string;
  source: string;
  priority: number;
  enabled: boolean;
  variant?: string;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  constructor(input: DisplayObject) {
    this.id = input.id;
    this.type = input.type;
    this.zoneId = input.zoneId;
    this.title = input.title;
    this.source = input.source;
    this.priority = input.priority;
    this.enabled = input.enabled;
    this.variant = input.variant;
    this.content = input.content ?? {};
    this.metadata = input.metadata ?? {};
  }
}
