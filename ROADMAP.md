# otto-display-system DRY Audit & Refactoring Roadmap

**Status:** IN PROGRESS - Functional DRY audit complete, structural remediation in planning phase  
**Updated:** 2026-09-02  
**Owner:** Architecture & Security Team  

---

## 📊 Executive Summary

This roadmap addresses a comprehensive DRY (Don't Repeat Yourself) audit of otto-display-system against the otto-systems ecosystem. The audit identified **4 CRITICAL functional violations** where otto-display duplicates security-critical functionality that should be centralized in otto-systems.

**Total Effort:** 6 weeks (40-48 days)  
**Security Impact:** CRITICAL - OAuth token exposure, weak crypto, missing audit trails  
**Package Size Impact:** ~450 MB already removed (Phase 1-2 submodules), additional savings TBD  

---

## 🎯 Strategic Objectives

1. **Eliminate functional code duplication** - Use otto-systems as single source of truth
2. **Close security vulnerabilities** - Encrypt tokens, use Rust crypto implementations
3. **Reduce package size** - Remove duplicate scripts and adapters
4. **Improve maintainability** - Align with canonical implementations
5. **Enable ecosystem integration** - Coordinate with otto-kernel, otto-command-service

---

## 🚨 Critical Violations (4 Found)

### Violation #1: UPDATE MECHANISM (CRITICAL)
**Canonical Source:** `otto-update` (Rust implementation)  
**Location:** `/tools/*` and `/update/hosted/*`  
**Problem:** 7 custom scripts duplicate version checking, deferral logic, rollback  
**Files:**
- `tools/build-update-package.ps1` (88 lines)
- `tools/install-update.ps1` (29 lines)
- `tools/register-auto-update.ps1` (15 lines)
- `tools/pi/auto-update.sh` (48 lines)
- `update/hosted/install-display-system.sh` (154 lines)
- `update/hosted/rollback-display-system.sh` (28 lines × 2)

**Impact:** ~390 lines of duplicate version logic, potential divergence from otto-update  
**Security Risk:** Version comparison logic may diverge, causing unsafe rollbacks  
**Phase:** 1 (Week 1-2)  
**Effort:** 18-22 days

### Violation #2: CRYPTOGRAPHY (CRITICAL)
**Canonical Source:** `otto-crypto` (Rust with AES-256-GCM, HKDF, signing)  
**Location:** `apps/display-runtime/src/lib/crypto-adapter.mjs` (REMOVED ✅)  
**Problem:** Custom Node.js implementation lacks key zeroization, signing, proper security  
**Why Removed:** Adapters are themselves DRY violations - cannot use JS for crypto  
**Dependencies:**
- `external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs` (token encryption)
- Requires FFI or Node.js bindings from otto-crypto

**Impact:** Currently storing secrets in plaintext, weak encryption available but not production-safe  
**Security Risk:** CRITICAL - JS crypto without key zeroization exposes credentials  
**Phase:** 2 (Week 2-3)  
**Effort:** 10-12 days

### Violation #3: STATE STORAGE (CRITICAL)
**Canonical Source:** `otto-osss` (Rust with versioned state, vault, audit trail)  
**Location:** `apps/display-runtime/src/lib/osss-adapter.mjs` (REMOVED ✅)  
**Problem:** File-based storage without vault encryption, no audit trail, plaintext fallback  
**Why Removed:** Adapters are themselves DRY violations - cannot use JS for state vault  
**Affected Data:**
- `mempalace/calendar-provider-tokens.json` - OAuth tokens (PLAINTEXT!)
- `mempalace/calendar-provider-config.json` - OAuth secrets (PLAINTEXT!)
- Display orchestrator state
- Display assignments state

**Impact:** OAuth credentials readable to any process on system  
**Security Risk:** CRITICAL - Credential exposure, no recovery guarantees, no audit trail  
**Phase:** 2 (Week 3-4)  
**Effort:** 12-15 days

### Violation #4: PROCESS LIFECYCLE (HIGH)
**Canonical Source:** `otto-kernel` (Module discovery, lifecycle management)  
**Location:** `apps/display-runtime/src/server.mjs`, `install/otto-display-system/scripts/otto-display-system.service`  
**Problem:** Direct systemd management bypasses kernel lifecycle coordination  
**Current State:** display-runtime manages its own process independently  
**Missing Integration:**
- No graceful shutdown through kernel
- No module initialization callbacks
- Process lifecycle isolated from otto ecosystem

**Impact:** Fragile process management, no kernel coordination for updates/restarts  
**Risk:** Updates may interrupt without proper graceful shutdown  
**Phase:** 3 (Week 4-5)  
**Effort:** 6-8 days

---

## 📋 Completed Work

### ✅ Phase 0: Structural DRY Audit & Submodule Conversion
**Status:** MOSTLY COMPLETE (17/19 submodules)  
**Commits:** 
- `02604c7` - Phase 1: Convert core infrastructure (5/5 repos)
- `3e77b16` - Phase 2: Convert otto-extensions (10/12 repos)
- `3bc45bb` - Remove crypto/osss adapters (DRY violation fix)

**Completed Submodules:**
1. ✅ otto-protocol (otto-systems)
2. ✅ otto-kernel (otto-systems)
3. ✅ otto-command-service (otto-systems)
4. ✅ otto-server (otto-systems)
5. ✅ otto-update (otto-systems)
6. ✅ otto-api-extension (otto-extensions)
7. ✅ otto-auth-extension (otto-extensions)
8. ✅ otto-cli-extension (otto-extensions)
9. ✅ otto-debug-extension (otto-extensions)
10. ✅ otto-design-system (otto-extensions)
11. ✅ otto-file-extension (otto-extensions)
12. ✅ otto-extension-index (otto-extensions)
13. ✅ otto-extensions (otto-extensions)
14. ✅ otto-display-orchestrator (otto-extensions)
15. ✅ otto-update-ui (otto-extensions)
16. ✅ otto-osss (otto-systems)
17. ✅ otto-crypto (otto-systems)

**Outstanding:** 
- otto-design-system-dev-ui (not found, display-specific?)
- otto-data-extension (not found, display-specific?)

**Impact:** ~450 MB removed from package size  

### ✅ Adapter Removal
**Status:** COMPLETE  
**Removed:**
- `apps/display-runtime/src/lib/crypto-adapter.mjs` (DRY violation)
- `apps/display-runtime/src/lib/osss-adapter.mjs` (DRY violation)

**Rationale:** Node.js implementations of security-critical components are:
- Less secure (no key zeroization, plaintext fallback)
- Incomplete (missing operations like signing)
- Duplicating Rust implementations that should NOT be reimplemented

**Updated:** 
- `external/otto/otto-calendar-connector-extension/src/calendar-runtime.mjs` (reverted to plaintext with TODO markers)

---

## 🛠️ Phase-Based Remediation Roadmap

### Phase 1: Remove otto-update Duplicates (18-22 days, Week 1-2)

**Objective:** Eliminate 7 update scripts, use otto-update instead

**Tasks:**
1. Understand command-service update command contracts and integration points
   - Audit update commands registered in command-service
   - Confirm generated CLI/API surfaces from cli-extension and api-extension
   - Document version format, manifest structure
   - Identify deferral, channel, and rollback mechanisms
   - Estimated: 2-3 days

2. Create update integration layer
   - Wrapper functions for otto-update commands
   - Version comparison using otto-update logic
   - Rollback safety checks
   - Estimated: 3-4 days

3. Remove PowerShell update scripts
   - Delete: tools/build-update-package.ps1
   - Delete: tools/install-update.ps1
   - Delete: tools/register-auto-update.ps1
   - Verify: No remaining references
   - Estimated: 1-2 days

4. Remove Bash update scripts
   - Delete: tools/pi/auto-update.sh
   - Update: Pi deployment workflows
   - Verify: Auto-update mechanism via systemd timer
   - Estimated: 2-3 days

5. Refactor install/rollback scripts
   - Delete: update/hosted/install-display-system.sh
   - Delete: update/hosted/rollback-display-system.sh (both copies)
   - Create: Minimal install wrapper using otto-update
   - Update: Deployment documentation
   - Estimated: 3-4 days

6. Test and validation
   - Unit test otto-update integration
   - Pi deployment test with new mechanism
   - Rollback scenario test
   - Auto-update interval test
   - Estimated: 4-5 days

**Deliverables:**
- Removed 7 update-related scripts
- command-service-driven update integration layer in place
- Updated deployment documentation
- Passing tests on Pi

**Blockers:** 
- Need validated command IDs/payload contracts for update flows
- Need parity verification between command-service registry and generated CLI/API surfaces

**Exit Criteria:**
- All update functionality works via command-service update commands backed by otto-update
- No remaining custom update logic
- Tests pass on Raspberry Pi

---

### Phase 2: Integrate otto-osss for State Storage (12-15 days, Week 3-4)

**Objective:** Replace plaintext state storage with encrypted vault

**Tasks:**
1. Research otto-osss FFI/bindings availability
   - Check otto-osss Rust repo for Node.js bindings
   - Determine FFI bridge strategy
   - Evaluate WASM alternative
   - Estimated: 2-3 days

2. Create Node.js bridge if needed
   - If no bindings exist: Build FFI bridge or WASM wrapper
   - If bindings exist: Test integration
   - Document usage patterns
   - Estimated: 4-6 days

3. Migrate state storage
   - Update calendar-runtime.mjs to use otto-osss
   - Replace mempalace file storage with vault
   - Implement key management for encryption
   - Add versioning support
   - Estimated: 3-4 days

4. Implement vault encryption
   - Generate encryption keys
   - Store keys securely (NOT in repo)
   - Decrypt tokens on-demand
   - Add audit trail logging
   - Estimated: 2-3 days

5. Test and validation
   - Unit tests for state persistence
   - Encryption/decryption round-trip
   - Migration from plaintext state
   - Pi deployment test
   - Estimated: 2-3 days

**Deliverables:**
- OAuth tokens encrypted in vault
- Audit trail for state access
- Migration guide from plaintext
- Test coverage for state storage

**Blockers:**
- Otto-osss FFI/Node.js bindings status unknown
- May require waiting for otto-systems to deliver bindings
- Key management infrastructure needed

**Exit Criteria:**
- All state stored in encrypted vault
- No plaintext token files in mempalace
- Audit trail functional
- Tests pass on Pi

---

### Phase 2b: Integrate otto-crypto for Encryption (10-12 days, Week 2-3)

**Objective:** Use Rust crypto implementation instead of JS adapter

**Tasks:**
1. Research otto-crypto FFI/bindings availability
   - Check otto-crypto Rust repo for Node.js bindings
   - Determine FFI bridge strategy
   - Evaluate WASM alternative
   - Estimated: 2-3 days

2. Create Node.js bridge if needed
   - If no bindings exist: Build FFI bridge or WASM wrapper
   - If bindings exist: Test integration
   - Document usage patterns
   - Estimated: 4-6 days

3. Update crypto usage
   - Update calendar-runtime.mjs to use otto-crypto
   - Use AES-256-GCM for encryption
   - Implement HKDF for key derivation
   - Use signing operations if needed
   - Estimated: 2-3 days

4. Test and validation
   - Encryption/decryption tests
   - Key derivation tests
   - Signature verification tests
   - Pi deployment test
   - Estimated: 2-3 days

**Deliverables:**
- Crypto operations use Rust implementation
- Proper key zeroization
- Support for signing/verification
- Test coverage for crypto

**Blockers:**
- Otto-crypto FFI/Node.js bindings status unknown
- May require waiting for otto-systems to deliver bindings

**Exit Criteria:**
- All crypto via otto-crypto
- Keys properly zeroized
- No JS crypto implementation remaining
- Tests pass on Pi

---

### Phase 3: Integrate otto-kernel for Process Lifecycle (6-8 days, Week 4-5)

**Objective:** Coordinate process lifecycle with otto-kernel

**Tasks:**
1. Research otto-kernel integration patterns
   - Module lifecycle callbacks
   - Graceful shutdown mechanism
   - Systemd coordination
   - Estimated: 1-2 days

2. Refactor display-runtime server
   - Implement kernel integration points
   - Add lifecycle callbacks
   - Graceful shutdown handling
   - Estimated: 2-3 days

3. Update systemd unit file
   - Register with kernel
   - Remove direct process management
   - Update after-display-start.service if needed
   - Estimated: 1-2 days

4. Test and validation
   - Graceful shutdown test
   - Lifecycle callback test
   - Kernel coordination test
   - Pi systemd integration test
   - Estimated: 2-3 days

**Deliverables:**
- Process lifecycle coordinated with kernel
- Graceful shutdown working
- Systemd unit updated

**Blockers:** None anticipated

**Exit Criteria:**
- Process integrates with otto-kernel
- Graceful shutdown works
- Tests pass

---

### Phase 4: Testing & Pi Validation (5-7 days, Week 6)

**Objective:** Comprehensive validation on target hardware

**Tasks:**
1. Integration testing
   - All components working together
   - State persistence with encryption
   - Update mechanism via otto-update
   - Process lifecycle integration
   - Estimated: 2-3 days

2. Pi deployment testing
   - Full deployment cycle
   - Auto-update mechanism
   - Rollback scenario
   - Service startup/restart
   - Estimated: 2-3 days

3. Security validation
   - Credentials properly encrypted
   - No plaintext tokens on disk
   - Audit trail working
   - Key management secure
   - Estimated: 1-2 days

**Deliverables:**
- All tests passing
- Deployment documentation updated
- Security checklist completed

---

## 📦 Optional: Phase 5 Extension Extraction (8-10 hours, MEDIUM priority)

These are display-specific modules that could become reusable extensions:

**otto-schedule-resolver-extension**
- Source: `modules/display-schedule`
- Resolve phase schedules from master calendars
- Create separate repo in otto-extensions

**otto-assignments-normalizer-extension**
- Source: `modules/display-assignments`
- Normalize FACTS CSV into canonical format
- Create separate repo in otto-extensions

**otto-api-gateway-factory-extension**
- Source: `modules/display-api-interface`
- Factory for multi-provider API gateways
- Create separate repo in otto-extensions

**Why optional:** No security issues, code already works. Can do after functional remediation or in parallel.

---

## 🔄 Dependencies & Sequencing

**Hard Dependencies:**
- Phase 1 → Phase 2/2b (update removal before state/crypto migration)
- Phase 2/2b can run in parallel
- Phase 3 can run after Phase 1
- Phase 4 after all phases

**Research Blockers:**
- otto-crypto FFI/Node.js bindings (blocks Phase 2b)
- otto-osss FFI/Node.js bindings (blocks Phase 2)
- command-service update contract parity validation (blocks Phase 1)

**Recommendation:** While waiting for FFI bindings:
1. Complete Phase 1 (update script removal)
2. Complete Phase 3 (kernel integration)
3. Then Phase 2/2b when bindings available

---

## 📊 Effort Breakdown

| Phase | Description | Effort | Timeline | Status |
|-------|-------------|--------|----------|--------|
| 0 | Structural audit & submodules | 7 days | ✅ Complete | ✅ |
| 1 | Remove otto-update duplicates | 18-22 days | Week 1-2 | → NEXT |
| 2 | Integrate otto-osss vault | 12-15 days | Week 3-4 | Blocked on FFI |
| 2b | Integrate otto-crypto | 10-12 days | Week 2-3 | Blocked on FFI |
| 3 | Integrate otto-kernel | 6-8 days | Week 4-5 | Ready |
| 4 | Testing & Pi validation | 5-7 days | Week 6 | Ready |
| 5 | Extension extraction | 8-10 hrs | Optional | Low priority |
| **Total** | **Complete DRY elimination** | **40-48 days** | **6 weeks** | |

---

## 🎲 Risk Assessment

### High Risk Items
1. **otto-crypto FFI bindings unavailable**
   - Impact: Cannot implement secure crypto
   - Mitigation: Start Phase 1 & 3, revisit after otto-systems delivers bindings
   - Timeline: Determine status immediately

2. **otto-osss FFI bindings unavailable**
   - Impact: Cannot encrypt tokens
   - Mitigation: Start Phase 1 & 3, revisit after otto-systems delivers bindings
   - Timeline: Determine status immediately

3. **Command-service update contract parity mismatch**
   - Impact: Generated CLI/API behavior may drift from registry-backed command contracts
   - Mitigation: Treat command-service registry as source of truth and validate generated surfaces
   - Timeline: Investigate in Phase 1

### Medium Risk Items
1. **Pi deployment complexity**
   - Impact: Integration testing may take longer
   - Mitigation: Early Pi testing in Phase 1
   - Timeline: Test by end of week 1

2. **State migration from plaintext**
   - Impact: May lose data if not careful
   - Mitigation: Comprehensive migration testing
   - Timeline: Build migration tests early

---

## 📝 Success Criteria

**Functional Success:**
- ✅ All 4 DRY violations eliminated
- ✅ Zero custom crypto code
- ✅ Zero plaintext credential storage
- ✅ All update logic via otto-update
- ✅ Process lifecycle via otto-kernel

**Security Success:**
- ✅ OAuth tokens encrypted in vault
- ✅ Audit trail for state access
- ✅ No plaintext secrets on disk
- ✅ Proper key management
- ✅ Security review passed

**Quality Success:**
- ✅ 95%+ test coverage
- ✅ All tests passing on Pi
- ✅ Deployment cycle verified
- ✅ Rollback scenario tested
- ✅ Documentation updated

---

## 📞 Key References

**Audit Documentation:**
- `/memories/repo/functional-dry-audit-critical.md` - Critical findings
- `DRY_AUDIT_REPORT.md` - Detailed audit (generated)
- `FUNCTIONAL_DRY_AUDIT.md` - Full audit (generated)

**otto-systems Repos (Submodule Locations):**
- `external/otto/otto-update` - Update engine
- `external/otto/otto-osss` - State storage vault
- `external/otto/otto-crypto` - Cryptographic operations
- `external/otto/otto-kernel` - Process lifecycle

**Deployment Documentation:**
- `docs/raspberry-pi-deployment-checklist.md`
- `docs/installer-smoke-test.md`
- `docs/raspberry-pi-live-test.md`

---

**Last Updated:** 2026-09-02  
**Next Review:** After Phase 1 completion or when blocked on research  
**Owner:** Architecture & Security Team
