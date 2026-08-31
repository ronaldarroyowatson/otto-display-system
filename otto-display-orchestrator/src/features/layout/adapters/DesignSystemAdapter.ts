export type DesignSystemComponentVariant = "default" | "compact" | "emphasis" | "neutral";

export interface DesignSystemAppearance {
  tokens: Record<string, string>;
  spacing: Record<string, number>;
  typography: Record<string, string>;
  motion: Record<string, string>;
  components: Record<string, DesignSystemComponentVariant>;
}

export interface DesignSystemContext {
  role?: string;
  phase?: string;
  locale?: string;
  device?: "display" | "tablet" | "kiosk";
}

export class DesignSystemAdapter {
  private static readonly defaultAppearance: DesignSystemAppearance = {
    tokens: {
      colorBrand: "#0b5fff",
      colorSurface: "#101828",
      colorPanel: "#1f2937",
      colorAccent: "#fbbf24",
      colorText: "#f9fafb",
      colorMuted: "#cbd5e1"
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      xxl: 32
    },
    typography: {
      heading: "600 1.5rem/1.2 Inter, sans-serif",
      body: "400 1rem/1.5 Inter, sans-serif",
      label: "600 0.75rem/1.2 Inter, sans-serif"
    },
    motion: {
      transition: "180ms ease-in-out",
      emphasis: "240ms ease-in-out"
    },
    components: {
      AnnouncementList: "default",
      HomeworkPanel: "emphasis",
      WeatherTile: "compact",
      CalendarGrid: "default"
    }
  };

  resolveAppearance(context: DesignSystemContext = {}): DesignSystemAppearance {
    const role = context.role ?? "default";
    const palette = { ...DesignSystemAdapter.defaultAppearance.tokens };

    if (role === "principal" || role === "admin") {
      palette.colorAccent = "#22c55e";
    }

    return {
      ...DesignSystemAdapter.defaultAppearance,
      tokens: palette,
      components: {
        ...DesignSystemAdapter.defaultAppearance.components,
        ...(context.phase === "assembly" ? { AnnouncementList: "emphasis" } : {})
      }
    };
  }

  resolveComponentVariant(type: string, context: DesignSystemContext = {}): DesignSystemComponentVariant {
    const appearance = this.resolveAppearance(context);
    return appearance.components[type] ?? "default";
  }
}
