import type { DisplayObject } from "../../layout/models/DisplayObject.js";

export interface WeatherObject extends DisplayObject {
  type: "WeatherTile";
  content: {
    temperature: number;
    condition: string;
    location: string;
  };
}

export function createWeatherObject(): WeatherObject {
  return {
    id: "weather-tile-main",
    type: "WeatherTile",
    zoneId: "RightColumn",
    title: "Weather",
    source: "otto-schedule",
    priority: 60,
    enabled: true,
    variant: "compact",
    content: {
      temperature: 72,
      condition: "Sunny",
      location: "Campus"
    }
  };
}
