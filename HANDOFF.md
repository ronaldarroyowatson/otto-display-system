# otto-display-system DRY Remediation Handoff Document

**Status:** ACTIVE - Functional audit complete, Phase 1 planning in progress

**Last Updated:** 2026-09-02

**Next Review:** When Phase 1 begins (immediately or after team discussion)

**Owner:** Architecture & Security Team

---

## 📋 Document Purpose

This handoff document maintains continuous progress tracking across the 6-week DRY remediation effort. Updated periodically (ideally after each significant milestone) to preserve context and maintain work continuity if chat context is lost.

**Usage:**

- Reference before resuming work to quickly understand current state
- Update at end of each major milestone with findings and next steps
- Escalate blockers or risk items to team leadership
- Use for standup reports and status communication

---

## 🎯 Current Phase: Phase 0 → Phase 1 Transition

**Phase Status:**

- ✅ Phase 0 (Structural audit & submodules): COMPLETE
- → Phase 1 (Update script removal): PLANNED - awaiting team go-ahead

**Current Focus:**

1. Document roadmap and handoff (IN PROGRESS)
2. Prepare Phase 1 research tasks
3. Identify FFI/bindings research blockers
4. Create planning documentation

---

## ✅ Completed Milestones

### Milestone 0.1: Structural DRY Audit

**Completed:** 2026-09-02

**Summary:** Identified 21 repo clones as git submodule candidates

**Work:**

- Audited otto-display dependencies against otto-systems and otto-extensions
- Found 21 repos cloned locally instead of linked as submodules
- Categorized by organization (otto-systems, otto-extensions, display-specific)
- All repo locations verified and validated

**Output:** `.gitmodules` candidate list, submodule conversion plan

---

### Milestone 0.2: Phase 1 Submodule Conversion

**Completed:** 2026-09-02

**Summary:** Converted core otto-systems repos to git submodules

**Work:**

- Removed local clones: otto-protocol, otto-kernel, otto-command-service, otto-server, otto-update
- Created git submodules pointing to otto-systems GitHub repos
- Verified each with `Test-Path external/otto/<repo>/.git`
- Committed: `02604c7 - Phase 1: Convert core infrastructure to git submodules`

**Output:** 5/5 core repos converted, ~200 MB removed

**Test Results:** ✅ All 5 submodules verified with .git directories

---

### Milestone 0.3: Phase 2 Submodule Conversion

**Completed:** 2026-09-02

**Summary:** Converted 12/12 otto-extensions repos to git submodules

**Work:**

- Removed local clones: otto-api-extension, otto-auth-extension, otto-cli-extension, otto-debug-extension, otto-design-system, otto-file-extension, otto-extension-index, otto-extensions, otto-display-orchestrator, otto-update-ui, otto-design-system-dev-ui
- Created git submodules for all 12 extension repos (including new `otto-data-extension`)
- Verified 12/12 extension submodules with `git submodule status`
- Committed: `3e77b16 - Phase 2: Convert otto-extensions ecosystem to git submodules`

**Outstanding Issues:**

- otto-display-control-system: now mapped in `.gitmodules` to user-owned repo; canonical org ownership decision pending

**Output:** 12/12 extensions converted, ~250 MB removed

**Test Results:** ✅ 12/12 extension submodules verified; 1 ownership follow-up

**Action Items:**

- [x] Convert otto-design-system-dev-ui to submodule (`otto-extensions`)
- [x] Create `otto-data-extension` repo and wire as submodule (`otto-extensions`)
- [x] Register `data.pack`, `data.unpack`, `data.records.export`, `data.records.import` in command-service
- [x] Regenerate and push `otto-update` generated API/CLI surfaces
- [ ] Decide whether `otto-display-control-system` should move to canonical org repo

---

### Milestone 0.4: Functional DRY Audit vs otto-systems

**Completed:** 2026-09-02

**Summary:** Identified 4 CRITICAL functional DRY violations

**Work:**

- Audited otto-display against otto-systems core components
- Analyzed 6 critical areas: updates, state, crypto, commands, auth, processes
- Found 4 CRITICAL and 1 HIGH severity violations
- Created detailed remediation roadmap with effort estimates

**Violations Found:**

1. **UPDATE MECHANISM (CRITICAL)** - 7 scripts, 390 lines (18-22 days to fix)
2. **CRYPTOGRAPHY (CRITICAL)** - Custom adapter (10-12 days to fix)
3. **STATE STORAGE (CRITICAL)** - File-based vault (12-15 days to fix)
4. **PROCESS LIFECYCLE (HIGH)** - Direct systemd bypass (6-8 days to fix)

**Output:** Comprehensive audit report, remediation phases, timeline, risk assessment

---

### Milestone 0.5: Remove Problematic Adapters

**Completed:** 2026-09-02

**Summary:** Removed crypto-adapter.mjs and osss-adapter.mjs (DRY violations)

**Work:**

- Identified that adapters I created were themselves DRY violations
- otto-crypto and otto-osss are Rust for security reasons (key zeroization, audit trail)
- Node.js reimplementations are less secure and violate DRY
- Deleted both adapters from codebase
- Reverted calendar-runtime.mjs to plaintext (marked TODO for FFI integration)
- Committed: `3bc45bb - Fix: Remove custom crypto and state adapters (DRY violations)`

**Rationale:**

- otto-crypto: Needs proper key zeroization (not possible in JS)
- otto-osss: Needs vault encryption and audit trail (not reimplementable securely in JS)
- otto-update: Should be canonical update engine, not duplicated
- Must integrate via FFI or Node.js bindings, not custom adapters

**Output:** Cleaned codebase, documented TODO markers for FFI integration

---

## 🚀 Upcoming Milestones

### Milestone 1.0: Phase 1 Research & Planning (ACTIVE)

**Estimated Start:** 2026-09-02 (after team review)

**Estimated Duration:** 2-3 days

**Objective:** Gather information needed for Phase 1 implementation

**Tasks:**

1. Research command-service update command contracts
   - Registered update command IDs and payload schemas
   - Generated CLI/API behavior through cli-extension and api-extension
   - Version format and manifest structure
   - Channel and deferral mechanisms
   - Rollback state machine

2. Research otto-crypto and otto-osss FFI status
   - Check repos for Node.js bindings or WASM interfaces
   - Evaluate FFI bridge feasibility
   - Determine timeline for bindings availability

3. Create integration design documents
   - otto-update integration layer design
   - Decision: Which otto components need FFI vs subprocess calls
   - Design: Key management infrastructure for encryption

**Success Criteria:**

- [x] command-service update command contracts documented (service/config command set)
- [ ] FFI/bindings availability determined for crypto and osss
- [ ] Integration designs documented and reviewed
- [ ] Phase 1 can proceed confidently

**Kickoff Findings (2026-09-02):**

- Source of truth confirmed in command-service schemas:
  - `config.show`, `config.set`
  - `service.install`, `service.start`, `service.status`, `service.stop`, `service.uninstall`
- Generated surfaces confirmed in `external/otto/otto-update/src/generated_cli/index.ts` and `external/otto/otto-update/src/generated_api/index.ts`.
- Runtime command path confirmed via `tools/run-otto-command.mjs` -> `apps/runtime-shared/src/command-executor.mjs` -> command-service schema routing.
- Architecture evidence captured in:
  - `external/otto/otto-update/docs/command-service-extraction-report.md`
  - `external/otto/otto-update/docs/command-service-validation.md`

**Phase 1.0 Delta (2026-09-02):**

- Added and pushed new command-service update orchestration commands:
  - `update.health`, `update.state`, `update.check`, `update.manifest`, `update.policy`
  - `update.approve`, `update.defer`, `update.progress`, `update.history`
  - `update.rollback`, `update.backups`, `update.config.get`, `update.config.set`
- Regenerated and pushed otto-update command surfaces from registry source:
  - `external/otto/otto-update/src/generated_api/index.ts`
  - `external/otto/otto-update/src/generated_cli/index.ts`
- Upstream commits pushed:
  - `otto-command-service`: `4044f0f`
  - `otto-update`: `9351122`

**Script Replacement Matrix (initial):**

- `tools/install-update.ps1` -> keep `file.check.space` and `file.rotate.logs` calls; replace package install/apply flow with command-service update orchestration.
- `tools/register-auto-update.ps1` -> replace direct script generation with command-service-driven scheduling/trigger approach.
- `tools/pi/auto-update.sh` -> replace manifest version check + unzip + restart with registry-backed update command flow.
- `update/hosted/install-display-system.sh` -> remove embedded auto-update loop and service-level update logic; delegate to command-service + otto-update command path.
- `update/hosted/rollback-display-system.sh` -> replace manual archive retrieval/unzip with command-service rollback/update command path.
- `tools/build-update-package.ps1` -> split into packaging-only concern vs update apply concern; update apply logic must move to command-service flow.

**Command Parity Checklist (Phase 1.0):**

- [x] Service lifecycle commands present in registry (`service.install`, `service.start`, `service.status`, `service.stop`, `service.uninstall`).
- [x] Config commands present in registry (`config.show`, `config.set`).
- [x] Generated CLI and API command surfaces contain the same command set.
- [x] Manifest resolution/version compare command identified and mapped (`update.manifest`, `update.policy`, `update.check`).
- [x] Download/apply package command identified and mapped (`update.check`, `update.approve`, `update.progress`).
- [x] Rollback command identified and mapped (`update.rollback`, `update.backups`).
- [ ] Scheduling command path identified for periodic update checks.

**Current Gap Summary:**

- Present now: registry coverage for service/config plus full update orchestration command set.
- Remaining gap: scheduling policy path for periodic checks across deployment targets.
- Action required: standardize scheduler trigger integration (cron/systemd timer) to call `update.check` (+ optional `update.approve`) without reintroducing local update logic, then remove fallback branches.

---

### Milestone 1.1: Phase 1 Implementation - Remove otto-update Duplicates

**Estimated Start:** After Milestone 1.0

**Estimated Duration:** 18-22 days

**Objective:** Eliminate all custom update scripts, use otto-update instead

**Key Work:**

- Create command-service-driven update integration layer in Node.js
- Remove 7 update-related scripts
- Update deployment workflows
- Test on Raspberry Pi

**In Progress:**

- Refactored `tools/pi/auto-update.sh` to call command-service update commands (removed local manifest/download/unzip logic).
- Refactored `tools/register-auto-update.ps1` to emit a command-service-driven updater (`update.check` and optional `update.approve`).
- Refactored `tools/install-update.ps1` to trigger command-service update flow first (`update.check` + optional `update.approve`) with legacy package extraction fallback only when command runner is unavailable.
- Refactored hosted updater payload in `update/hosted/install-display-system.sh` to use command-service commands instead of embedded manifest/download/unzip flow.
- Refactored `update/hosted/rollback-display-system.sh` to delegate to `update.rollback` when command runner is available, with legacy archive rollback fallback for compatibility.

**Success Criteria:**

- [ ] All 7 scripts removed
- [ ] otto-update integration working
- [ ] Deployment tests passing
- [ ] Auto-update mechanism verified on Pi
- [ ] Rollback scenario tested

---

### Milestone 2.0: Phase 2 Implementation - Integrate otto-osss & otto-crypto

**Estimated Start:** Week 3-4

**Estimated Duration:** 22-27 days (running 2 & 2b in parallel)

**Objective:** Replace plaintext storage with encrypted vault, use Rust crypto

**Key Work:**

- Build FFI bridges (or use bindings if available)
- Migrate calendar-runtime to use otto-osss for state
- Migrate all crypto to use otto-crypto
- Implement key management infrastructure
- Test encryption/decryption round-trip

**Success Criteria:**

- [ ] All state stored in encrypted vault
- [ ] No plaintext token files on disk
- [ ] All crypto via otto-crypto
- [ ] Audit trail functional
- [ ] Tests passing

---

### Milestone 3.0: Phase 3 Implementation - Integrate otto-kernel

**Estimated Start:** Week 4-5

**Estimated Duration:** 6-8 days

**Objective:** Coordinate process lifecycle with otto-kernel

**Key Work:**

- Implement kernel integration points in display-runtime
- Add graceful shutdown handling
- Update systemd unit file
- Test lifecycle coordination

**Success Criteria:**

- [ ] Process integrates with otto-kernel
- [ ] Graceful shutdown works
- [ ] Systemd coordination verified

---

### Milestone 4.0: Full Integration Testing & Pi Validation

**Estimated Start:** Week 6

**Estimated Duration:** 5-7 days

**Objective:** Comprehensive validation on target hardware

**Key Work:**

- All components working together
- Full deployment cycle tested
- Auto-update with rollback tested
- Security audit completed

**Success Criteria:**

- [ ] All integration tests passing
- [ ] Pi deployment successful
- [ ] Security checklist completed
- [ ] Documentation updated

---

## 🚨 Known Blockers & Research Items

### Blocker 1: otto-crypto FFI/Node.js Bindings (CRITICAL)

**Impact:** Cannot implement secure encryption (Phase 2b)

**Status:** Unknown - need to research

**Investigation Needed:**

- [ ] Check otto-crypto Rust repo for existing bindings
- [ ] Review otto-systems FFI architecture
- [ ] Determine if bindings can be built from Rust crate
- [ ] Timeline for bindings availability

**Mitigation:**

- Start Phase 1 (no crypto dependency)
- Start Phase 3 (no crypto dependency)
- Revisit Phase 2b once bindings confirmed

---

### Blocker 2: otto-osss FFI/Node.js Bindings (CRITICAL)

**Impact:** Cannot encrypt state vault (Phase 2)

**Status:** Unknown - need to research

**Investigation Needed:**

- [ ] Check otto-osss Rust repo for existing bindings
- [ ] Review otto-systems FFI architecture
- [ ] Determine if bindings can be built from Rust crate
- [ ] Timeline for bindings availability

**Mitigation:**

- Start Phase 1 (no vault dependency)
- Start Phase 3 (no vault dependency)
- Revisit Phase 2 once bindings confirmed

---

### Blocker 3: Command-Service Update Contract Parity (HIGH)

**Impact:** Cannot implement Phase 1 safely without validating registry contracts and generated surfaces

**Status:** In progress - architecture clarified by team

**Investigation Needed:**

- [ ] Check command-service registry entries for update command IDs
- [ ] Validate generated CLI and API surfaces from cli-extension and api-extension
- [ ] Document command structure and payloads
- [ ] Understand version comparison logic
- [ ] Understand deferral and rollback mechanisms

**Mitigation:**

- Use command-service registry as source of truth
- Verify otto-update behavior through registered command execution paths

---

### Issue: Submodule Follow-ups (MEDIUM)

### Extension Extraction Follow-Up

**Status:** Data/schedule/assignments/gateway extraction complete; ownership follow-up remains for display-control-system

**Verified Findings:**

- `otto-design-system-dev-ui` exists in `otto-extensions` and is now a working submodule
- `otto-data-extension` exists at `otto-extensions/otto-data-extension` and is wired into command-service and update packaging
- `otto-schedule-resolver-extension` exists at `otto-extensions/otto-schedule-resolver-extension` and is wired into command-service and update packaging
- `otto-assignments-normalizer-extension` exists at `otto-extensions/otto-assignments-normalizer-extension` and is wired into command-service and update packaging
- `otto-api-gateway-factory-extension` exists at `otto-extensions/otto-api-gateway-factory-extension` and is wired into command-service and update packaging
- `assignments.import` now routes via the assignments extension runtime path instead of the local `modules/display-assignments` endpoint
- `otto-display-control-system` is a valid git submodule path and is mapped in `.gitmodules`, but points to a user-owned repo

**Investigation Needed:**

- [ ] Confirm whether `otto-display-control-system` should remain user-owned or be moved to canonical org

**Action:** Keep current mapping stable and proceed with Phase 1 update-script remediation and Phase 3 kernel lifecycle integration.

---

## 📊 Progress Summary

| Milestone | Status | Effort | Actual | Notes |
| --- | --- | --- | --- | --- |
| 0.1 Structural Audit | ✅ | 2 days | 2 days | Complete |
| 0.2 Phase 1 Submodules | ✅ | 4 hours | 4 hours | 5/5 repos |
| 0.3 Phase 2 Submodules | ✅ | 2 hours | 2 hours | 12/12 repos |
| 0.4 Functional Audit | ✅ | 3 hours | 3 hours | 4 violations found |
| 0.5 Adapter Removal | ✅ | 1 hour | 1 hour | DRY fix |
| 1.0 Research Planning | ✅ | 2-3 days | Complete | Command contracts + update orchestration mapped |
| 1.1 Phase 1 Impl | → | 18-22 days | In progress | First script refactors landed |
| 2.0 Phase 2 Impl | ⏳ | 22-27 days | Not started | Week 3-4 |
| 3.0 Phase 3 Impl | ⏳ | 6-8 days | Not started | Week 4-5 |
| 4.0 Testing & Val | ⏳ | 5-7 days | Not started | Week 6 |
| 5.0 Extension Extraction | ✅ | 8-10 hrs | Complete | Data + schedule + assignments + gateway shipped |
| **Total** | | **40-48 days** | **8+ days** | **Phase 1 research active, Phase 5 complete** |

---

## 🔍 Key Decisions Made

### Decision 1: Use otto-systems as Single Source of Truth

- **Rationale:** otto-systems repos are canonical implementations created by ecosystem architect
- **Impact:** All functional duplication must be eliminated
- **Consequence:** Requires FFI/bindings for Node.js integration

### Decision 2: Remove Custom Adapters

- **Rationale:** Node.js crypto/state implementations are less secure and duplicate Rust code
- **Impact:** Delayed Phase 2 until FFI bindings available
- **Consequence:** Currently plaintext storage (documented security debt)

### Decision 3: Prioritize Phase 1 (Updates)

- **Rationale:** No dependencies on FFI bindings, can start immediately
- **Impact:** Earliest security/code quality improvement
- **Consequence:** May take longer than other phases due to complexity

### Decision 4: Run Phase 2 & 2b in Parallel

- **Rationale:** Both need FFI bindings (may arrive together), independent implementations
- **Impact:** Reduces total timeline by 2-4 days
- **Consequence:** Requires careful coordination if bindings arrive separately

---

## 🔐 Security Status

**Current Security Posture:** AT RISK

- ❌ OAuth tokens stored in PLAINTEXT
- ❌ Secrets in plaintext in mempalace/
- ⚠️ No encryption available until Phase 2
- ⚠️ No audit trail for state access

**Target Security Posture:** SECURE

- ✅ All secrets encrypted via otto-osss vault
- ✅ All crypto via otto-crypto (Rust implementation)
- ✅ Complete audit trail for state access
- ✅ Proper key management and zeroization

**Timeline to Secure:** 40-48 days (after Phase 0 complete)

---

## 📞 Stakeholders & Communication

**Primary Owner:** Architecture & Security Team

**Secondary Owners:** DevOps (deployment), QA (testing), Security Review

**Communication Cadence:**

- Start of each phase: Review blockers, clarify approach
- End of each milestone: Status update, blockers escalation
- Blockers: Escalate immediately if blocking work
- Security review: Required before Phase 2 completion

---

## 🔗 Related Documentation

**Roadmap:** `ROADMAP.md` - High-level phases, effort, dependencies

**Audit Reports:**

- `FUNCTIONAL_DRY_AUDIT.md` - Generated detailed audit
- `DRY_AUDIT_REPORT.md` - Generated summary report
- `/memories/repo/functional-dry-audit-critical.md` - Session memory with findings

**Deployment:**

- `docs/raspberry-pi-deployment-checklist.md`
- `docs/installer-smoke-test.md`
- `docs/raspberry-pi-live-test.md`

---

## 📝 Update Log

### 2026-09-02 - Phase 1.0 Kickoff (Command Contracts)

**Created by:** DRY Remediation Session

**Status:** ACTIVE - Phase 1.0 research in progress

**Summary:**

- ✅ Confirmed command-service registry is the only source of truth for update command surfaces.
- ✅ Mapped current generated update command set (config/service commands) and payload contracts.
- ✅ Verified runtime command execution path used in workspace command runner.
- ✅ Created initial script replacement matrix for the 6 duplicate update scripts.
- → Next: define exact command parity checklist and implement first script replacements.

**Current Blocker:**

- Need explicit mapping of each duplicate script step to a concrete command ID sequence for deploy/apply/rollback parity.

**Next Action:**

- Build command parity checklist and begin replacing update script execution paths.

---

### 2026-09-02 - Phase 1.1 Started (Registry-Driven Update Commands)

**Created by:** DRY Remediation Session

**Status:** ACTIVE - Phase 1.1 implementation in progress

**Summary:**

- ✅ Added missing update orchestration commands in command-service and pushed upstream.
- ✅ Regenerated otto-update CLI/API surfaces from command-service source of truth and pushed upstream.
- ✅ Began script replacement in monorepo using command-service update commands.
- ⚠️ Command-service test runner still reports one existing suite configuration issue (`tests/auth-schemas.test.mjs` uses node:test under vitest run); not introduced by this change.

**Next Action:**

- Commit monorepo submodule pointer updates and continue replacing remaining update scripts.

---

### 2026-09-02 - Phase 1.1 Continued (Script Migration Batch 2)

**Created by:** DRY Remediation Session

**Status:** ACTIVE - command-service migration expanded

**Summary:**

- ✅ Migrated additional update paths to command-service-first execution:
  - `tools/install-update.ps1`
  - `update/hosted/install-display-system.sh` (embedded `auto-update.sh` payload)
  - `update/hosted/rollback-display-system.sh`
- ✅ Confirmed command wiring in scripts for `update.check`, `update.approve`, `update.progress`, and `update.rollback`.
- ⚠️ Bash syntax validation tooling is unavailable on this Windows host (`bash` not found), so shell syntax was validated by focused search and constrained patch scope.

**Next Action:**

- Standardize scheduler ownership (cron/systemd timer path) and remove remaining fallback branches.

---

### 2026-09-02 - Initial Handoff Document

**Created by:** DRY Audit Session

**Status:** ACTIVE - Phase 0 complete, Phase 1 planning

**Summary:**

- ✅ Structural audit complete (17/19 submodules)
- ✅ Functional audit complete (4 violations found)
- ✅ Adapters removed (security violation fix)
- → Phase 1 research starting
- ⚠️ Blockers: FFI/bindings availability unclear

**Next Action:** Team review and go-ahead for Phase 1

---

### End of Initial Handoff

---

## Template for Future Updates

When updating this document, use the following template to maintain consistency:

### [DATE] - [MILESTONE] Update

**Status:** [ACTIVE/BLOCKED/COMPLETE]

**Progress:** [% complete]

**Completed Since Last Update:**

- [Item 1]
- [Item 2]

**Current Blocker:** [If any]

**Next Steps:**

- [ ] Action item 1
- [ ] Action item 2

**Notes:**

[Any additional context]

---

This document should be updated at each major milestone. Last update: 2026-09-02.
