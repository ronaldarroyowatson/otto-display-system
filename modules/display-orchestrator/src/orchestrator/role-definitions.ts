export type DisplayRole = "hallway" | "sidewall" | "backwall" | "weather" | "time";

export interface RoleDefinition {
  role: DisplayRole;
  title: string;
  zones: string[];
}

export interface RoleLayoutRule {
  id: string;
  role: DisplayRole;
  zoneId: string;
  objectType: string;
  enabled: boolean;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: "hallway", title: "Hallway Board", zones: ["countdown", "announcements", "weather"] },
  { role: "sidewall", title: "Sidewall Board", zones: ["homework", "calendar", "announcements"] },
  { role: "backwall", title: "Backwall Board", zones: ["countdown", "calendar", "weather", "homework"] },
  { role: "weather", title: "Weather Test Page", zones: ["main"] },
  { role: "time", title: "Time Test Page", zones: ["main"] }
];

export const ROLE_LAYOUT_RULES: RoleLayoutRule[] = [
  { id: "layout-hallway-announcements", role: "hallway", zoneId: "TopBar", objectType: "AnnouncementList", enabled: true },
  { id: "layout-sidewall-homework", role: "sidewall", zoneId: "LeftColumn", objectType: "HomeworkPanel", enabled: true },
  { id: "layout-backwall-calendar", role: "backwall", zoneId: "Footer", objectType: "CalendarGrid", enabled: true },
  { id: "layout-weather-current", role: "weather", zoneId: "Main", objectType: "WeatherTile", enabled: true },
  { id: "layout-time-current", role: "time", zoneId: "Main", objectType: "Clock", enabled: true }
];
