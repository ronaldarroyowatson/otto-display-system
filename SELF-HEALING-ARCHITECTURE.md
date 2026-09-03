# OttoUpdate Self-Healing Framework Architecture

## Executive Summary

The **OttoUpdate Self-Healing Framework** is a reusable, built-in capability that enables ANY program using OttoUpdate to automatically validate and repair critical artifacts before updates are applied.

**Key Insight**: Instead of fixing staleness issues one program at a time (like we did with auto-update.sh), we've encoded the self-healing pattern into OttoUpdate itself. Now every program that uses OttoUpdate automatically gets:

- Pre-update validation of critical files/scripts
- Automatic detection of stale or damaged artifacts  
- Self-healing repair from canonical templates
- Blocking safeguards to prevent bad updates
- Detailed health reports and recommendations

This transforms OttoUpdate from a simple "download and apply" engine into an intelligent, self-defending update system.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Program A (otto-display-system)                                │
│  ├─ Register: auto-update.sh                                    │
│  ├─ Validator: Check for run_command, read_manifest_version...  │
│  └─ Repair: Regenerate from runtime/auto-update.sh.template    │
├─────────────────────────────────────────────────────────────────┤
│  Program B (future: otto-X, otto-Y, etc.)                       │
│  ├─ Register: critical-script.sh, config.json, etc.             │
│  ├─ Validator: Custom validation logic                          │
│  └─ Repair: Custom repair strategy                              │
├─────────────────────────────────────────────────────────────────┤
│         OttoUpdate Self-Healing Framework (Layer 2)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SelfHealingRegistry                                       │  │
│  │  ├─ register(artifact)      - Add monitored artifact       │  │
│  │  ├─ performHealthCheck()    - Validate all artifacts       │  │
│  │  ├─ performRepairs()        - Attempt to fix unhealthy     │  │
│  │  └─ performSelfHealing()    - Combined check + repair      │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PreUpdateValidator                                        │  │
│  │  └─ validateBeforeUpdate(manifest, autoRepair)            │  │
│  │     ├─ Run health checks                                   │  │
│  │     ├─ Attempt repairs if needed                           │  │
│  │     └─ Return: canProceedWithUpdate boolean               │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Core OttoUpdate Types & Interfaces (Layer 1)                   │
│  ├─ ArtifactConfig: Registration schema                         │
│  ├─ ValidationResult: Health check output                       │
│  ├─ RepairResult: Repair attempt output                         │
│  └─ RepairOptions: Context passed to repair functions           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Layer 1: Type System (`src/selfHealing/types.ts`)

Defines the contract that programs use to register artifacts:

```typescript
type ArtifactConfig = {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  path: string;                  // File to monitor
  
  validate: (content) => ValidationResult;  // Check health
  repair?: (options) => Promise<RepairResult>;  // Fix if possible
  
  criticalityLevel: "error" | "warning" | "info";  // Block on error?
  
  onValidationFailed?: (result) => void;  // Callback
  onRepairCompleted?: (result) => void;   // Callback
};
```

**Why This Design**:
- Programs define validation rules specific to their needs
- Repair logic is optional (can validate without repair)
- Criticality levels enable gradual health improvements
- Callbacks allow telemetry and logging integration

### Layer 2: SelfHealingRegistry (`src/selfHealing/registry.ts`)

Manages lifecycle of all artifacts:

```typescript
class SelfHealingRegistry {
  // Registration
  register(artifact: ArtifactConfig): void
  unregister(artifactId: string): boolean
  listArtifacts(): ArtifactConfig[]
  
  // Operations
  performHealthCheck(): Promise<SelfHealingCheckResult>
  performRepairs(): Promise<SelfHealingRepairResult>
  performSelfHealing(): Promise<{ check, repair?, ok }>
}
```

**Key Responsibilities**:
1. **Artifact Management**: Track all registered artifacts
2. **File System Operations**: Read/write with proper error handling
3. **Health Checking**: Run validators on all artifacts
4. **Repair Coordination**: Execute repair functions sequentially
5. **Results Aggregation**: Collect and summarize findings

**Example Workflow**:
```
performHealthCheck()
├─ For each registered artifact:
│  ├─ Read file from disk
│  ├─ Call artifact.validate(content)
│  ├─ Collect severity (error/warning/info)
│  └─ Fire onValidationFailed callback if needed
└─ Return SelfHealingCheckResult with all issues
```

### Layer 3: PreUpdateValidator (`src/selfHealing/preUpdateValidator.ts`)

Integrates self-healing into the update workflow:

```typescript
class PreUpdateValidator {
  validateBeforeUpdate(manifest, autoRepair = true): 
    Promise<PreUpdateValidationResult>
}
```

**Workflow**:
```
validateBeforeUpdate()
├─ Step 1: Run performHealthCheck()
│  └─ Detect all unhealthy artifacts
├─ Step 2: Analyze results
│  ├─ Separate blocking issues (error) from warnings
│  └─ Generate recommendations
├─ Step 3: If autoRepair=true, run performRepairs()
│  └─ Attempt to fix all unhealthy artifacts
└─ Step 4: Return decision
   ├─ canProceedWithUpdate: true/false
   ├─ blockingIssues: array of critical problems
   ├─ warnings: array of non-critical issues
   └─ recommendations: what to do next
```

## Real-World Example: otto-display-system

### Problem Scenario

1. **Time T=0**: Release otto-display-system v0.1 with auto-update.sh
   - Script has functions: `run_command()`, `read_manifest_version()`
   - But missing: `legacy_update_fallback()` (added in v0.2)

2. **Time T=1**: Deploy v0.1 to 50 Pi systems
   - Each Pi runs: `/opt/otto-display-system/auto-update.sh`
   - Cron scheduled every 15 minutes

3. **Time T=2**: Release v0.2 with new fallback retrieval
   - New installer embeds improved auto-update.sh
   - 48 Pis get updated via standard update flow
   - 2 Pis missed update (network issue, manual intervention, etc.)

4. **Time T=3**: Release v0.3 with fallback now required
   - v0.3 update flow depends on `legacy_update_fallback()` existing
   - Those 2 Pis with v0.1 auto-update.sh cannot perform v0.3 update
   - Update fails with cryptic error about missing function

### Solution: Self-Healing in Action

**otto-display-system registers auto-update.sh**:

```typescript
// apps/display-runtime/src/initialization.ts

const registry = new SelfHealingRegistry("/opt/otto-display-system");

registry.register({
  id: "display-auto-update-script",
  name: "Display System Auto-Update Script",
  path: "../auto-update.sh",
  
  validate: (content) => {
    const required = ["run_command", "read_manifest_version", "legacy_update_fallback"];
    const missing = required.filter(fn => !content.includes(fn));
    return {
      isHealthy: missing.length === 0,
      severity: missing.length === 0 ? "info" : "error",
      missingComponents: missing,
    };
  },
  
  repair: async (options) => {
    // Read canonical template
    const template = await options.readFile("runtime/auto-update.sh.template");
    // Validate template has all functions
    // Write to deployed location
    return { success: true, repaired: true, ... };
  },
  
  criticalityLevel: "error",  // Blocks update if unhealthy
});
```

**When v0.3 update runs on stale Pi**:

1. **Pre-Update Check**:
   ```
   validator = createPreUpdateValidator(registry)
   result = await validator.validateBeforeUpdate(v0_3_manifest, autoRepair=true)
   ```

2. **Health Detection**:
   - Reads deployed `/opt/otto-display-system/auto-update.sh`
   - Finds it's missing `legacy_update_fallback()`
   - Reports: `isHealthy: false, severity: "error"`

3. **Auto-Repair**:
   - Reads canonical template from `/opt/otto-display-system/runtime/auto-update.sh.template`
   - Validates template has all 3 functions ✓
   - Writes repaired version to `/opt/otto-display-system/auto-update.sh`
   - Returns: `success: true, repaired: true`

4. **Update Proceeds**:
   - Pre-update validation now: `canProceedWithUpdate: true`
   - v0.3 update applied successfully
   - Auto-update.sh has latest features

**Result**: 
- Both Pis (stale and current) receive v0.3 successfully
- No operator intervention needed
- No manual re-runs of installer
- System auto-heals without awareness

## Ecosystem Benefits

### For Program Developers

```typescript
// Simply register your critical artifacts once
registry.register(criticalScript);
registry.register(configFile);
registry.register(runtimeLibrary);

// Get automatic pre-update validation
const result = await validator.validateBeforeUpdate(manifest, autoRepair=true);

// Decide whether to proceed
if (result.canProceedWithUpdate) {
  await performUpdate();
}
```

**Benefits**:
- Don't need to handle staleness manually
- Validation logic defined once, reused forever
- Automatic repair means less operational overhead
- Detailed reporting for debugging

### For System Integrators

```typescript
// Different program, same framework
const appRegistry = new SelfHealingRegistry("/opt/other-app");

// Reuse the pattern
appRegistry.register({
  id: "app-critical-service",
  name: "Critical Service",
  path: "/opt/other-app/service.sh",
  validate: appSpecificValidator,
  repair: appSpecificRepair,
  criticalityLevel: "error",
});
```

**Benefits**:
- Consistent self-healing pattern across all programs
- Reduced deployment failures
- System-wide reliability improvements

### For End Users / Operators

**Before Self-Healing**:
- Manual notification: "Your system has stale scripts"
- Manual fix: Re-run installer or manual script updates
- Failed updates: Cryptic errors about missing functions
- Operator expertise required

**After Self-Healing**:
- Silent repair: System automatically detects and fixes
- Successful updates: Update process includes validation + repair
- No intervention: Scheduled updates just work
- Operational simplicity: Less expertise required

## Key Files & Locations

### In otto-update Repository

```
external/otto/otto-update/
├── src/selfHealing/
│   ├── types.ts                      # Type system (ArtifactConfig, etc.)
│   ├── registry.ts                   # SelfHealingRegistry class
│   ├── preUpdateValidator.ts         # PreUpdateValidator class
│   └── index.ts                      # Public exports
├── docs/
│   └── SELF-HEALING.md              # Complete usage guide
├── examples/
│   └── display-system-integration.ts # Real-world example
├── tests/
│   └── selfHealing.test.ts          # Test suite
├── src/index.ts                      # Updated to export self-healing
└── README.md                         # Updated with framework overview
```

### In otto-display-system Repository

```
external/otto/otto-command-service/
├── src/handlers/
│   └── updateInstallPreflight.mjs  # Uses SelfHealingRegistry for validation
│                                     # (no longer needs duplicate repair handler)

apps/display-runtime/src/
├── self-healing-init.mjs            # Initializes framework with artifacts
└── server.mjs                        # Calls initialization on startup

tools/pi/
└── auto-update.sh                   # Embeds repair flow
```

**Note**: The framework replaces what would have been separate `updateRepairAutoUpdateScript.mjs` handler. Now all repair logic is centralized in `@otto/update`'s `SelfHealingRegistry` class.

runtime/
└── auto-update.sh.template          # Canonical master template
```

## Design Patterns

### 1. Canonical Template Pattern

```typescript
// Master version stored in source control
// runtime/auto-update.sh.template

// Repair function reads it
repair: async (options) => {
  const template = await options.readFile("runtime/auto-update.sh.template");
  await options.writeFile(options.artifactPath, template);
  return { success: true, repaired: true, ... };
}

// Benefits:
// - Single source of truth
// - Version-independent (new template = new fixes automatically)
// - Git history tracks all changes
// - Works across installations
```

### 2. Tiered Criticality

```typescript
// Error: Blocking (prevents update)
{ criticalityLevel: "error" }
  ├─ Auto-update.sh (must have required functions)
  └─ Core runtime (must be healthy)

// Warning: Non-blocking but reported (shows in results)
{ criticalityLevel: "warning" }
  ├─ Optional optimizations
  └─ Deprecated but functional features

// Info: Silent (only logged)
{ criticalityLevel: "info" }
  ├─ Telemetry scripts
  └─ Optional monitoring
```

### 3. Validator as Pure Function

```typescript
// Validators don't do I/O, just content inspection
validate: (content: string) => ValidationResult

// Benefits:
// - Fast and deterministic
// - Easy to test
// - Can validate without side effects
// - Supports dry-run scenarios
```

### 4. Repair as Async Operation

```typescript
// Repairs are async and handle I/O
repair: async (options: RepairOptions) => RepairResult

// Benefits:
// - Can fetch remote templates if needed
// - Proper error handling for file operations
// - Non-blocking (other repairs can run in parallel)
// - Supports complex repair strategies
```

## Integration Points

### With OttoUpdate's Update Engine

```typescript
import { UpdateEngine } from "@otto/update";

class UpdateEngine {
  evaluate(manifest): UpdateDecision {
    // Original logic unchanged
  }
  
  // Programs can now wrap with:
  const registry = new SelfHealingRegistry();
  const validator = createPreUpdateValidator(registry);
  
  const preUpdateCheck = await validator.validateBeforeUpdate(manifest);
  if (!preUpdateCheck.canProceedWithUpdate) {
    return { shouldUpdate: false, reason: "artifact health check failed" };
  }
}
```

### With Command-Service

```typescript
// otto-command-service/src/handlers/updateInstallPreflight.mjs
// Already integrated: Checks auto-update.sh staleness as part of preflight

// New commands can use:
// - update.repair.auto-update-script (repair handler)
// - update.validate.install (preflight detection)

// Programs extend with custom repair handlers:
// - update.repair.app-config
// - update.repair.database-schema
// - etc.
```

### With Auto-Update Scripts

```bash
#!/usr/bin/env bash
# tools/pi/auto-update.sh

# Capture preflight result
preflight_result="$(run_command 'update.validate.install' 2>/dev/null || true)"

# Check if stale script detected
if echo "${preflight_result}" | grep -q '"stale_auto_update_script"'; then
  # Invoke repair
  run_command "update.repair.auto-update-script"
  # Re-execute with fixed script
  exec "$0" "$@"
fi
```

## Future Extensions

### 1. Multi-Program Registry

```typescript
// Central registry for all programs on a system
const globalRegistry = new SelfHealingRegistry("/");

// Each program registers its artifacts
globalRegistry.register(displaySystemArtifacts);
globalRegistry.register(otherAppArtifacts);

// Single health check for entire system
const systemHealth = await globalRegistry.performHealthCheck();
```

### 2. Telemetry Integration

```typescript
artifact.onValidationFailed = (result) => {
  // Send to monitoring
  telemetry.logArtifactFailure({
    artifactId: result.artifactId,
    missingComponents: result.missingComponents,
    timestamp: Date.now(),
  });
};

artifact.onRepairCompleted = (result) => {
  telemetry.logRepairAttempt({
    artifactId: result.artifactId,
    success: result.success,
    repaired: result.repaired,
  });
};
```

### 3. Staged Rollout

```typescript
// Only repair on certain hosts
artifact.repair = async (options) => {
  const canRepair = shouldRepairOnThisHost();
  if (!canRepair) {
    return { success: true, repaired: false, reason: "staged-rollout" };
  }
  // ... normal repair logic
};
```

### 4. Version Tracking

```typescript
// Track deployed vs canonical versions
artifact.onRepairCompleted = (result) => {
  if (result.repaired) {
    writeVersionMarker("auto-update.sh", "canonical-version-1.2.3");
  }
};
```

## Summary

The OttoUpdate Self-Healing Framework transforms updates from a simple "download and apply" operation into an intelligent, self-defending process:

1. **Automatic Detection**: Pre-update validation finds stale artifacts
2. **Intelligent Repair**: Regenerates from canonical templates
3. **Blocking Safeguards**: Prevents bad updates from proceeding
4. **Transparent Operation**: Runs automatically, requires no operator awareness
5. **Reusable Pattern**: Every program using OttoUpdate benefits

This architecture embeds self-healing into the ecosystem's foundation, ensuring that future programs automatically inherit the capability to detect, repair, and maintain their critical artifacts.
