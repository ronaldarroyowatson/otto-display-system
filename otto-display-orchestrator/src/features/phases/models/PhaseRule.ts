export type PhaseRuleName = "normal" | "chapel" | "assembly" | "fire-drill" | "event";

export interface PhaseRule {
  id: string;
  name: PhaseRuleName;
  startTime: string;
  endTime: string;
  zoneOverrides?: Record<string, string[]>;
  allowFullscreenOverlay?: boolean;
  enabled: boolean;
}

export class PhaseRuleDefinition implements PhaseRule {
  id: string;
  name: PhaseRuleName;
  startTime: string;
  endTime: string;
  zoneOverrides?: Record<string, string[]>;
  allowFullscreenOverlay?: boolean;
  enabled: boolean;

  constructor(input: PhaseRule) {
    this.id = input.id;
    this.name = input.name;
    this.startTime = input.startTime;
    this.endTime = input.endTime;
    this.zoneOverrides = input.zoneOverrides ?? {};
    this.allowFullscreenOverlay = input.allowFullscreenOverlay ?? false;
    this.enabled = input.enabled;
  }
}
