import { DesignSystemAdapter } from "../features/layout/adapters/DesignSystemAdapter.js";

export interface DesignSystemIntegrationOptions {
  role?: string;
  phase?: string;
  locale?: string;
}

export function designSystemIntegration(options: DesignSystemIntegrationOptions = {}) {
  const adapter = new DesignSystemAdapter();
  return adapter.resolveAppearance({
    role: options.role,
    phase: options.phase,
    locale: options.locale,
    device: "display"
  });
}
