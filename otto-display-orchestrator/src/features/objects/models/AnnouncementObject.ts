import type { DisplayObject } from "../../layout/models/DisplayObject.js";

export interface AnnouncementObject extends DisplayObject {
  type: "AnnouncementList";
  content: {
    items: Array<{ id: string; text: string; priority: "low" | "normal" | "high" }>;
    maxItems?: number;
  };
}

export function createAnnouncementObject(): AnnouncementObject {
  return {
    id: "announcement-list-main",
    type: "AnnouncementList",
    zoneId: "TopBar",
    title: "Announcements",
    source: "otto-schedule",
    priority: 70,
    enabled: true,
    variant: "default",
    content: {
      items: [{ id: "a1", text: "Welcome to campus.", priority: "normal" }],
      maxItems: 4
    }
  };
}
