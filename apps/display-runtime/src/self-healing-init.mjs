/**
 * Self-Healing Framework Initialization
 * 
 * Registers critical display-system artifacts with the OttoUpdate self-healing framework.
 * This replaces duplicate validation/repair logic with a single reusable pattern.
 * 
 * Called once during server startup to initialize the global SelfHealingRegistry.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the global registry from the built @otto/update module
// Uses the compiled dist/ output instead of source TypeScript
import { getGlobalSelfHealingRegistry } from '../../../external/otto/otto-update/dist/selfHealing/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Validator for auto-update.sh
 * Checks if the script contains all required functions needed for update fallback
 */
function validateAutoUpdateScript(content) {
  const REQUIRED_FUNCTIONS = [
    'legacy_update_fallback',
    'read_manifest_version',
    'run_command'
  ];

  const missingFunctions = [];

  for (const funcName of REQUIRED_FUNCTIONS) {
    const patterns = [
      new RegExp(`\\b${funcName}\\s*\\(\\s*\\)\\s*\\{`),
      new RegExp(`\\bfunction\\s+${funcName}\\s*\\{`)
    ];

    const found = patterns.some((pattern) => pattern.test(content));
    if (!found) {
      missingFunctions.push(funcName);
    }
  }

  return {
    isHealthy: missingFunctions.length === 0,
    severity: missingFunctions.length > 0 ? 'error' : 'info',
    missingComponents: missingFunctions,
    message: missingFunctions.length > 0
      ? `Missing required functions: ${missingFunctions.join(', ')}`
      : 'Auto-update script is healthy'
  };
}

/**
 * Repair function for auto-update.sh
 * Regenerates from canonical template if validation fails
 */
async function repairAutoUpdateScript(options = {}) {
  const installRoot = options.installRoot || '/opt/otto-display-system';
  const autoUpdatePath = path.join(installRoot, 'auto-update.sh');

  try {
    // Try to read canonical template from deployed location first
    const runtimeTemplate = path.join(ROOT, 'runtime', 'auto-update.sh.template');
    let canonicalContent = null;

    try {
      canonicalContent = await fs.readFile(runtimeTemplate, 'utf8');
    } catch {
      // Fallback: try source location
      const toolsTemplate = path.join(ROOT, 'tools', 'pi', 'auto-update.sh');
      try {
        canonicalContent = await fs.readFile(toolsTemplate, 'utf8');
      } catch {
        return {
          success: false,
          repaired: false,
          reason: 'canonical-template-not-found',
          message: 'Could not find canonical template in runtime/ or tools/pi/'
        };
      }
    }

    // Validate the canonical template before deploying it
    const templateValidation = validateAutoUpdateScript(canonicalContent);
    if (!templateValidation.isHealthy) {
      return {
        success: false,
        repaired: false,
        reason: 'canonical-template-invalid',
        message: `Canonical template is invalid: ${templateValidation.message}`
      };
    }

    // Write the canonical template
    await fs.mkdir(path.dirname(autoUpdatePath), { recursive: true });
    await fs.writeFile(autoUpdatePath, canonicalContent, { mode: 0o755 });

    return {
      success: true,
      repaired: true,
      reason: 'regenerated-from-canonical-template',
      message: 'Auto-update script regenerated from canonical template'
    };
  } catch (error) {
    return {
      success: false,
      repaired: false,
      reason: 'repair-failed',
      message: error instanceof Error ? error.message : 'Unknown error during repair'
    };
  }
}

/**
 * Initialize the self-healing framework with display-system artifacts
 * Called once during server startup
 */
export function initializeSelfHealing() {
  const registry = getGlobalSelfHealingRegistry();

  // Register auto-update.sh as a critical artifact
  registry.register({
    id: 'display-auto-update-script',
    name: 'Auto-Update Script',
    path: '/opt/otto-display-system/auto-update.sh',
    criticalityLevel: 'error',
    validate: (content) => validateAutoUpdateScript(content),
    repair: (options) => repairAutoUpdateScript(options),
    onValidationFailed: (result) => {
      console.warn(
        `[SelfHealing] Auto-update script validation failed: ${result.message}`
      );
    },
    onRepairCompleted: (result) => {
      if (result.success) {
        console.log(`[SelfHealing] Auto-update script repaired: ${result.message}`);
      } else {
        console.error(`[SelfHealing] Auto-update script repair failed: ${result.message}`);
      }
    }
  });

  console.log('[SelfHealing] Display-system artifacts registered with framework');
  return registry;
}

export default initializeSelfHealing;
