import type { DisplayObject } from "../../layout/models/DisplayObject.js";

export interface HomeworkObject extends DisplayObject {
  type: "HomeworkPanel";
  content: {
    assignments: Array<{ id: string; title: string; due: string; subject: string }>;
    urgentCount?: number;
  };
}

export function createHomeworkObject(): HomeworkObject {
  return {
    id: "homework-panel-main",
    type: "HomeworkPanel",
    zoneId: "LeftColumn",
    title: "Homework",
    source: "otto-assignments",
    priority: 80,
    enabled: true,
    variant: "emphasis",
    content: {
      assignments: [{ id: "h1", title: "Read chapter 7", due: "Today", subject: "English" }],
      urgentCount: 1
    }
  };
}
