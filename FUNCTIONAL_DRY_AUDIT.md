# Otto Display System - Functional DRY Audit

## Against Otto Systems Core Infrastructure

**Date:** 2026-09-02  
**Audit Scope:** Identify code duplication where otto-display reimplements otto-systems canonical functionality  
**Format:** Component → Purpose → Current Implementation → DRY Violation → Recommendation

---

## SECTION 1: CRITICAL VIOLATIONS

### 1. UPDATE MECHANISM - ⛔ CRITICAL VIOLATION

**Component:** `otto-update`  
**Source of Truth:** `external/otto/otto-update/` (Rust state machine, safety policies, rollback engine)  
**Purpose:** Centralized update orchestration with:

- Channel management (stable/beta/canary)
- Deferral policies (pause updates, hold versions)
- Rollback coordination (versioned backups, state recovery)
- Safety validation (pre-flight checks, post-apply verification)

#### Current Status in otto-display

Otto-display implements **custom update logic** instead of delegating to otto-update:

**Custom Update Scripts (DUPLICATION):**

- [tools/build-update-package.ps1](tools/build-update-package.ps1) - Creates ZIP payload from source folders
- [tools/install-update.ps1](tools/install-update.ps1) - Extracts and deploys ZIP directly
- [tools/register-auto-update.ps1](tools/register-auto-update.ps1) - Registers PowerShell auto-update script
- [tools/pi/auto-update.sh](tools/pi/auto-update.sh) - Bash auto-update (version check → download → extract → restart)
- [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh) - Monolithic installer (154 lines)
- [update/hosted/rollback-display-system.sh](update/hosted/rollback-display-system.sh) - Manual rollback script
- [install/otto-display-system/scripts/rollback-display-system.sh](install/otto-display-system/scripts/rollback-display-system.sh) - Duplicate rollback

**Duplicate Functionality:**

```bash
# auto-update.sh logic:
1. Fetch manifest.json → parse version
2. Compare local vs remote
3. Download package ZIP
4. Backup old version
5. Extract new ZIP
6. Restart systemd service

# otto-update Rust engine already does:
1. Manifest polling + versioning
2. Channel-based release management
3. Deferral/pause policies
4. Transactional rollback
5. State machine validation
6. Pre-flight safety checks
```

**Code Duplication Analysis:**

- Version comparison logic: Implemented locally in bash (auto-update.sh:16-27)
  - otto-update has: Manifest versioning + semantic version comparison
- Backup strategy: Local timestamp-based naming
  - otto-update has: Structured backup indexes + recovery guarantees
- Rollback mechanism: Simple unzip + restart
  - otto-update has: State machine tracking + failure recovery

**DRY Violation Severity:** 🔴 **CRITICAL**

- 3 duplicate rollback scripts (logic repeated)
- 2 platform-specific update runners (same logic, different shells)
- No integration with otto-update's safety policies or deferral engine
- Version skew risk: display-specific update logic can diverge from otto-update

#### Recommendation

**REFACTOR:** Delegate to otto-update service

1. Convert display-runtime to call otto-update API instead of manual scripting
2. Remove [tools/build-update-package.ps1](tools/build-update-package.ps1), [tools/install-update.ps1](tools/install-update.ps1), [tools/register-auto-update.ps1](tools/register-auto-update.ps1)
3. Replace [tools/pi/auto-update.sh](tools/pi/auto-update.sh) with otto-update client
4. Remove [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh), [update/hosted/rollback-display-system.sh](update/hosted/rollback-display-system.sh)
5. Remove [install/otto-display-system/scripts/rollback-display-system.sh](install/otto-display-system/scripts/rollback-display-system.sh)

**Effort:** 8-10 days  
**Risk:** Systemd integration, install sequence validation

---

### 2. STATE STORAGE - ⛔ CRITICAL VIOLATION

**Component:** `otto-osss` (Ordered State Storage Service)  
**Source of Truth:** `external/otto/otto-osss/` (Rust with versioned state, audit events, vault operations)  
**Purpose:** Centralized, versioned state persistence:

- Ordered session management (tokens, auth state)
- Vault operations (encrypted secrets storage)
- Audit trail generation (tamper evidence)
- ACID-like guarantees for state recovery

#### Current Status in otto-display

Otto-display implements **custom state adapters** that DO NOT use otto-osss:

**Duplicate State Implementations:**

1. **File-Based State Adapter** [apps/display-runtime/src/lib/osss-adapter.mjs](apps/display-runtime/src/lib/osss-adapter.mjs)
   - Claims to "follow contracts from otto-osss"
   - Actually implements **file I/O mimicry**, not real OSSS
   - No versioning, no audit trail, no vault encryption
   - Code: ~220 lines of local state management

2. **Calendar Runtime State** [external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs](external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs) (lines 1-80)

   ```typescript
   // Tries to load osss-adapter as fallback:
   let StateManager;
   try {
     const displayRuntimeLib = await import("../../../../../../apps/display-runtime/src/lib/osss-adapter.mjs");
     StateManager = displayRuntimeLib.StateManager;
   } catch (err) {
     StateManager = null;  // Falls back to plaintext file I/O!
   }
   ```

   - Stores provider config in: `mempalace/calendar-provider-config.json`
   - Stores tokens in: `mempalace/calendar-provider-tokens.json`
   - **No encryption, no versioning, no audit**

3. **Display Runtime Server** [apps/display-runtime/src/server.mjs](apps/display-runtime/src/server.mjs) (lines 180-210)
   - Manages state via custom file paths
   - No integration with otto-osss vault

**Duplicate Functionality:**

- Local KeyManager: Implements key loading from env/file/inline (crypto-adapter.mjs:120-190)
  - otto-osss has: Structured key management + vault storage
- State versioning: Calendar runtime tracks state manually
  - otto-osss has: Automatic versioning + rollback snapshots
- No audit trail: Silent file mutations
  - otto-osss has: Audit event emission (contracts.rs:28)

**Code Duplication Analysis:**

```javascript
// osss-adapter.mjs (local reimplementation)
export class StateManager {
  async read() { return JSON.parse(fs.readFile(...)) }
  async write() { fs.writeFile(...) }
  async delete() { fs.unlink(...) }
}

// otto-osss (canonical - what should be used)
pub trait VaultContract {
  fn read_entry(&self, cmd: ReadVaultEntryCommand) -> Result<Vec<u8>, OsssError>;
  fn write_entry(&self, cmd: WriteVaultEntryCommand) -> Result<(), OsssError>;
  fn delete_entry(&self, cmd: DeleteVaultEntryCommand) -> Result<(), OsssError>;
}
pub trait AuditContract {
  fn emit_audit_event(&self, cmd: EmitAuditEventCommand) -> Result<(), OsssError>;
}
```

**DRY Violation Severity:** 🔴 **CRITICAL**

- StateManager class reimplements OSSS read/write/delete without vault semantics
- OAuth credentials stored in plaintext JSON (calendar-provider-tokens.json)
- No tamper detection, no recovery guarantees
- Each runtime has its own state directory (not coordinated via OSSS)

#### Recommendation

**REFACTOR:** Use otto-osss service instead of local adapters

1. Remove [apps/display-runtime/src/lib/osss-adapter.mjs](apps/display-runtime/src/lib/osss-adapter.mjs)
2. Implement OSSS client in display-runtime to call otto-osss API
3. Migrate calendar tokens from `mempalace/calendar-provider-tokens.json` → otto-osss vault
4. Add audit event emission for all state changes
5. Implement vault encryption for sensitive config

**Effort:** 12-15 days  
**Risk:** Token migration, audit log initialization

---

### 3. CRYPTOGRAPHY - ⛔ CRITICAL VIOLATION

**Component:** `otto-crypto`  
**Source of Truth:** `external/otto/otto-crypto/` (Rust with AES-256-GCM, HKDF, signing, KDF)  
**Purpose:** Centralized cryptographic operations:

- Authenticated encryption (AES-256-GCM)
- Key derivation (HKDF, PBKDF2, Argon2id)
- Signing/verification (Ed25519)
- Key handle management (prevent key exposure)

#### Current Status in otto-display

Otto-display implements **custom crypto adapter** that reimplements otto-crypto functionality:

**Duplicate Crypto Implementation** [apps/display-runtime/src/lib/crypto-adapter.mjs](apps/display-runtime/src/lib/crypto-adapter.mjs) (~190 lines)

```javascript
// Local reimplementation (crypto-adapter.mjs):
export class CryptoAdapter {
  static encrypt(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    // ... AES-256-GCM implementation
  }
  static deriveKey(password) {
    return crypto.pbkdf2Sync(password, 'otto-crypto-salt', 100000, 32, 'sha256');
  }
}

// otto-crypto (canonical - Rust):
pub trait EncryptionContract {
  fn encrypt(&self, cmd: EncryptCommand) -> Result<Vec<u8>, CryptoError>;
  fn decrypt(&self, cmd: DecryptCommand) -> Result<Vec<u8>, CryptoError>;
}
pub trait KeyDerivationContract {
  fn derive_key(&self, cmd: DeriveKeyCommand) -> Result<String, CryptoError>;
  fn zeroize_key(&self, key_handle: &str) -> Result<(), CryptoError>;
}
```

**Duplicate Functionality:**

- AES-256-GCM: Implemented locally (crypto-adapter.mjs:12-43)
  - otto-crypto has: Hardware-accelerated Rust implementation
- PBKDF2 key derivation: Implemented locally (crypto-adapter.mjs:77-82)
  - otto-crypto has: HKDF, PBKDF2, Argon2id (DeriveKeyCommand, kdf.rs)
- Key management: Local KeyManager class (crypto-adapter.mjs:95-158)
  - otto-crypto has: Key handle abstraction (prevents key leakage)

**Code Duplication Analysis:**

```javascript
// Local code (NOT using otto-crypto):
KeyManager.registerKey('app-key', {
  source: 'env',
  envVarName: 'APP_KEY_HEX'
});
let key = await manager.getKey('app-key');
encrypted = CryptoAdapter.encrypt(data, key);  // Key exposed to JS layer!

// otto-crypto (canonical):
KeyDerivationCommand { master_key_handle, ... }  // Handle, not key
encrypt(EncryptCommand { plaintext, key_handle })  // Never exposes actual key
```

**Security Issues:**

- Keys loaded as JS Buffer objects (can be inspected in memory)
- otto-crypto zeroizes keys after use (memory safety)
- No signing/verification available locally
- No Argon2id support (strong password hashing)

**DRY Violation Severity:** 🔴 **CRITICAL**

- 190-line crypto adapter reimplements otto-crypto features
- JS-based crypto is less secure than Rust implementations
- Key management doesn't follow handle pattern (security risk)
- No signing/verification operations available

#### Recommendation

**REFACTOR:** Use otto-crypto service instead of local crypto

1. Remove [apps/display-runtime/src/lib/crypto-adapter.mjs](apps/display-runtime/src/lib/crypto-adapter.mjs)
2. Implement otto-crypto client in display-runtime
3. Call otto-crypto for all encryption/decryption/signing operations
4. Migrate key storage to otto-crypto key handle registry
5. Remove KeyManager class, use otto-crypto's key management

**Effort:** 10-12 days  
**Risk:** Key migration, performance (network calls vs local crypto)

---

### 4. BACKEND PROCESS SECURITY - 🔴 HIGH VIOLATION

**Component:** `otto-kernel`  
**Source of Truth:** `external/otto/otto-kernel/` (Module discovery, lifecycle management)  
**Purpose:** Process lifecycle orchestration:

- Module loading + initialization
- Graceful shutdown coordination
- Extension discovery (EDS)
- Process health monitoring

#### Current Status in otto-display

Otto-display manages process lifecycle via **custom systemd units** instead of otto-kernel:

**Direct Systemd Management (NO otto-kernel integration):**

1. **Display Runtime Service Unit** [install/otto-display-system/scripts/otto-display-system.service](install/otto-display-system/scripts/otto-display-system.service)

   ```ini
   [Unit]
   Description=Otto Display System Runtime
   After=network-online.target

   [Service]
   Type=simple
   WorkingDirectory=/opt/otto-display-system/current
   ExecStart=/usr/bin/env node apps/display-runtime/src/server.mjs
   Restart=on-failure
   RestartSec=5
   ProtectHome=true
   ProtectSystem=full
   ```

   - Direct node process execution
   - No otto-kernel module loader
   - No EDS integration

2. **Installer Creates Systemd Unit** [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh) (lines 52-74)

   ```bash
   cat > "$SERVICE_FILE" <<EOF
   ExecStart=/usr/bin/env node apps/display-runtime/src/server.mjs
   EOF
   systemctl daemon-reload
   systemctl enable --now "$SERVICE_NAME"
   ```

   - Bypasses otto-kernel's process coordination
   - No module lifecycle callbacks
   - No graceful shutdown through kernel

**Missing otto-kernel Integration:**

- Module discovery: display-runtime loads modules ad-hoc
  - otto-kernel has: EDS + manifests/module.json scanning
- Graceful shutdown: Relies on systemd SIGTERM handling
  - otto-kernel has: Coordinated shutdown sequence for all modules
- Health monitoring: No module health checks
  - otto-kernel has: Module status tracking

**Code Usage Analysis:**

```typescript
// otto-kernel is used for EDS only:
import { executeEdsCommand } from "external/otto/otto-kernel/src/eds/eds-runtime.mjs";
const result = await executeEdsCommand("eds.scan");  // ✓ Used

// But process lifecycle is custom:
// apps/display-runtime/src/server.mjs
// Direct node server startup with no kernel integration
process.on('SIGTERM', () => { ... });  // Custom signal handling
```

**DRY Violation Severity:** 🟡 **HIGH**

- Systemd units reimplementing what otto-kernel should manage
- Process coordination not integrated with otto ecosystem
- No graceful shutdown through kernel
- EDS is used, but process lifecycle is not

#### Recommendation

**REFACTOR:** Delegate process lifecycle to otto-kernel

1. Modify [apps/display-runtime/src/server.mjs](apps/display-runtime/src/server.mjs) to register with otto-kernel
2. Remove direct `ExecStart=/usr/bin/env node ...` systemd pattern
3. Use otto-kernel's module initialization callbacks
4. Implement graceful shutdown through kernel
5. Move systemd units to otto-kernel templates

**Effort:** 6-8 days  
**Risk:** Service startup timing, graceful shutdown validation

---

## SECTION 2: MEDIUM VIOLATIONS

### 5. COMMAND SERVICE - 🟡 MEDIUM (Mostly Correct)

**Component:** `otto-command-service`  
**Source of Truth:** `external/otto/otto-command-service/`  
**Purpose:** Command routing, schema validation, handler dispatch

#### Current Status in otto-display

Otto-display **correctly uses** otto-command-service with minimal duplication:

**Proper Usage Patterns:**

1. **Command Executor** [apps/runtime-shared/src/command-executor.mjs](apps/runtime-shared/src/command-executor.mjs)

   ```javascript
   const schemas = await loadSchemas();  // Load from otto-command-service/src/schemas
   const schema = schemas.find(s => s.name === commandName);
   const modulePath = path.join(COMMAND_SERVICE_ROOT, 'handlers', schema.routing.handlerModule);
   const handler = await import(modulePath);  // Load handler from otto-command-service
   return await handler[schema.routing.handlerExport](payload);
   ```

   ✓ Loads schemas from otto-command-service
   ✓ Loads handlers from otto-command-service
   ✓ No reimplementation

2. **Otto-Kernel Command Router** [external/otto/otto-kernel/src/kernel/commandRouter.ts](external/otto/otto-kernel/src/kernel/commandRouter.ts)

   ```typescript
   export class CommandRouter {
     register(commandName: string, handler: CommandHandler): void
     async route(command: CommandEnvelope): Promise<unknown>
   }
   ```

   ✓ Proper abstraction, no duplication

**DRY Violation Severity:** 🟢 **NONE** (Correct pattern)

- Command loading properly delegated to otto-command-service
- Schema source-of-truth respected
- No local reimplementation

---

### 6. AUTHENTICATION - 🟡 MEDIUM (Minor duplication)

**Component:** `otto-auth-extension`  
**Source of Truth:** `external/otto/otto-auth-extension/`  
**Purpose:** OAuth provider integration, token exchange, auth state

#### Current Status in otto-display

Otto-display uses otto-auth-extension properly with minor duplication in calendar runtime:

**Proper Usage:**

1. **OAuth Token Exchange** [external/otto/otto-command-service/src/handlers/oauthExchangeToken.mjs](external/otto/otto-command-service/src/handlers/oauthExchangeToken.mjs)

   ```javascript
   import { exchangeMicrosoftToken, exchangeGoogleToken } from "../../../otto-auth-extension/src/oauth-token-exchanger.js";
   ```

   ✓ Calls otto-auth-extension functions
   ✓ No reimplementation

2. **Calendar Runtime Token Storage** [external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs](external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs) (lines 290-360)

   ```javascript
   // Issue: Stores tokens in plaintext JSON instead of using otto-osss vault
   await saveProviderStore(store);  // Writes to mempalace/calendar-provider-tokens.json
   ```

   - **Minor duplication:** Token storage logic instead of delegating to otto-osss
   - This is secondary to the OSSS violation (already flagged as CRITICAL)

**DRY Violation Severity:** 🟡 **MEDIUM** (Resolved by OSSS refactor)

- OAuth exchange is correctly delegated
- Token storage duplication is secondary to OSSS violation
- Once OSSS is implemented, this becomes NONE

---

## SECTION 3: SUMMARY TABLE

| Component | Source of Truth | Current Status | Severity | Duplication Type | Effort | Critical Path |
| ----------- | ----------------- | ----------------- | ---------- | ------------------ | -------- | ---------------- |
| **Update Engine** | otto-update (Rust) | 3x custom scripts | 🔴 CRITICAL | Reimplemented state machine + policy engine | 8-10 days | Remove build/install/auto-update scripts |
| **State Storage** | otto-osss (Rust) | File-based adapter | 🔴 CRITICAL | Custom StateManager mimics OSSS without vault/audit | 12-15 days | Integrate OSSS API, migrate tokens |
| **Cryptography** | otto-crypto (Rust) | Node.js adapter | 🔴 CRITICAL | 190-line AES/PBKDF2 reimplementation | 10-12 days | Use otto-crypto API, remove adapter |
| **Process Lifecycle** | otto-kernel | Systemd-only | 🟡 HIGH | Process management bypasses kernel | 6-8 days | Register with kernel, orchestrate via EDS |
| **Command Service** | otto-command-service | Delegated (correct) | 🟢 NONE | Properly loads from otto-command-service | — | Keep as-is |
| **Authentication** | otto-auth-extension | Delegated (mostly) | 🟡 MEDIUM | Token storage issue (secondary to OSSS) | Covered by OSSS | Implement as part of OSSS refactor |

---

## SECTION 4: REMEDIATION ROADMAP

### Phase 1: Foundation (Weeks 1-2) - 18-22 days

**Focus:** Core infrastructure duplications that block other fixes

**Week 1 (Days 1-5):**

- Remove [tools/build-update-package.ps1](tools/build-update-package.ps1), [tools/install-update.ps1](tools/install-update.ps1), [tools/register-auto-update.ps1](tools/register-auto-update.ps1)
- Remove [tools/pi/auto-update.sh](tools/pi/auto-update.sh) (replace with otto-update client)
- Remove [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh)
- Implement otto-update client wrapper

**Week 2 (Days 6-10):**

- Remove [apps/display-runtime/src/lib/crypto-adapter.mjs](apps/display-runtime/src/lib/crypto-adapter.mjs)
- Implement otto-crypto client
- Migrate encryption calls to otto-crypto API

### Phase 2: State Layer (Weeks 3-4) - 12-15 days

**Focus:** State management and audit trail

- Remove [apps/display-runtime/src/lib/osss-adapter.mjs](apps/display-runtime/src/lib/osss-adapter.mjs)
- Implement otto-osss client
- Migrate calendar tokens to vault
- Implement audit event emission

### Phase 3: Process Orchestration (Week 5) - 6-8 days

**Focus:** otto-kernel integration

- Modify [apps/display-runtime/src/server.mjs](apps/display-runtime/src/server.mjs) to register with kernel
- Update systemd units to call kernel instead of direct node
- Implement graceful shutdown through kernel

### Phase 4: Validation & Hardening (Week 6) - 5-7 days

**Focus:** Testing and rollback safety

- Integration testing with all otto services
- Live Pi deployment validation
- Rollback scenario testing

---

## SECTION 5: RISK ASSESSMENT

### High-Risk Areas

1. **Update Mechanism:** If otto-update client has issues, deployments break
   - Mitigation: Extensive local testing, gradual rollout to canary Pi
2. **Cryptography:** Any change to encryption format breaks existing tokens
   - Mitigation: Support both formats during migration period
3. **OSSS Integration:** Token migration is one-way
   - Mitigation: Backup vault before migration, test recovery

### Dependencies

- otto-update must be fully functional before removing custom scripts
- otto-osss client must be ready before token migration
- otto-crypto must support all current algorithms

---

## SECTION 6: ACCEPTANCE CRITERIA

For each phase to be DONE:

**Phase 1 - Update Mechanism:**

- ✅ otto-update client invoked successfully
- ✅ Version checking works through otto-update API
- ✅ Rollback succeeds from otto-update state machine
- ✅ Live Pi updates using otto-update, not custom scripts

**Phase 2 - Cryptography:**

- ✅ All encryption calls proxied to otto-crypto
- ✅ No direct crypto module usage in display-runtime
- ✅ Key migration successful (test read old tokens, encrypt with otto-crypto)

**Phase 3 - State Storage:**

- ✅ Calendar tokens stored in otto-osss vault
- ✅ Audit trail emitted for all token operations
- ✅ OSSS recovery works (import backup, verify tokens)

**Phase 4 - Process Lifecycle:**

- ✅ otto-kernel starts display-runtime
- ✅ EDS provides extension registry to runtime
- ✅ Graceful shutdown through kernel signal handling
- ✅ Live Pi service lifecycle correct

---

## APPENDIX: File Locations Reference

**Update Mechanism Files (to remove/refactor):**

- [tools/build-update-package.ps1](tools/build-update-package.ps1)
- [tools/install-update.ps1](tools/install-update.ps1)
- [tools/register-auto-update.ps1](tools/register-auto-update.ps1)
- [tools/pi/auto-update.sh](tools/pi/auto-update.sh)
- [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh)
- [update/hosted/rollback-display-system.sh](update/hosted/rollback-display-system.sh)
- [install/otto-display-system/scripts/rollback-display-system.sh](install/otto-display-system/scripts/rollback-display-system.sh)

**Cryptography Files (to remove/refactor):**

- [apps/display-runtime/src/lib/crypto-adapter.mjs](apps/display-runtime/src/lib/crypto-adapter.mjs)

**State Storage Files (to remove/refactor):**

- [apps/display-runtime/src/lib/osss-adapter.mjs](apps/display-runtime/src/lib/osss-adapter.mjs)

**Process Management Files (to modify):**

- [apps/display-runtime/src/server.mjs](apps/display-runtime/src/server.mjs)
- [install/otto-display-system/scripts/otto-display-system.service](install/otto-display-system/scripts/otto-display-system.service)
- [update/hosted/install-display-system.sh](update/hosted/install-display-system.sh)
