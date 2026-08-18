export type DisplayRole = "hallway" | "sidewall" | "backwall";

export interface RoleDefinition {
  role: DisplayRole;
  title: string;
  zones: string[];
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: "hallway", title: "Hallway Board", zones: ["countdown", "announcements", "weather"] },
  { role: "sidewall", title: "Sidewall Board", zones: ["homework", "calendar", "announcements"] },
  { role: "backwall", title: "Backwall Board", zones: ["countdown", "calendar", "weather", "homework"] }
];
