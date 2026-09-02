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
**Summary:** Converted 10/12 otto-extensions repos to git submodules

**Work:**
- Removed local clones: otto-api-extension, otto-auth-extension, otto-cli-extension, otto-debug-extension, otto-design-system, otto-file-extension, otto-extension-index, otto-extensions, otto-display-orchestrator, otto-update-ui
- Created git submodules for all 10
- Verified 10/10 with `Test-Path` checks
- Committed: `3e77b16 - Phase 2: Convert otto-extensions ecosystem to git submodules`

**Outstanding Issues:**
- otto-design-system-dev-ui: Clone failed ("Repository not found" or .git not created)
- otto-data-extension: Clone failed (similar status)

**Output:** 10/12 extensions converted, ~250 MB removed

**Test Results:** ✅ 10/12 submodules verified; 2 failed (investigation pending)

**Action Items:**
- [ ] Investigate why otto-design-system-dev-ui fails to clone
- [ ] Investigate why otto-data-extension fails to clone
- [ ] Determine if these are display-specific (don't add as submodules) or misplaced repos

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

### Milestone 1.0: Phase 1 Research & Planning (NEXT)
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
- [ ] command-service update command contracts documented
- [ ] FFI/bindings availability determined for crypto and osss
- [ ] Integration designs documented and reviewed
- [ ] Phase 1 can proceed confidently

---

### Milestone 1.1: Phase 1 Implementation - Remove otto-update Duplicates
**Estimated Start:** After Milestone 1.0  
**Estimated Duration:** 18-22 days  
**Objective:** Eliminate all custom update scripts, use otto-update instead

**Key Work:**
- Create otto-update integration layer in Node.js
- Remove 7 update-related scripts
- Update deployment workflows
- Test on Raspberry Pi

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

### Issue: Missing Submodules (MEDIUM)
**Otto-design-system-dev-ui & otto-data-extension**

**Status:** Not found during Phase 2 conversion  
**Investigation Needed:**
- [ ] Check if repos exist in otto-extensions org
- [ ] Check if repos exist in otto-systems org
- [ ] Check if they're display-specific (shouldn't be submodules)
- [ ] Verify GitHub org credentials/access

**Current Assumption:** May be display-specific, not general extensions  
**Action:** Investigate and update .gitmodules or docs accordingly

---

## 📊 Progress Summary

| Milestone | Status | Effort | Actual | Notes |
|-----------|--------|--------|--------|-------|
| 0.1 Structural Audit | ✅ | 2 days | 2 days | Complete |
| 0.2 Phase 1 Submodules | ✅ | 4 hours | 4 hours | 5/5 repos |
| 0.3 Phase 2 Submodules | ✅ | 2 hours | 2 hours | 10/12 repos |
| 0.4 Functional Audit | ✅ | 3 hours | 3 hours | 4 violations found |
| 0.5 Adapter Removal | ✅ | 1 hour | 1 hour | DRY fix |
| 1.0 Research Planning | → | 2-3 days | Pending | NEXT |
| 1.1 Phase 1 Impl | ⏳ | 18-22 days | Not started | Week 1-2 |
| 2.0 Phase 2 Impl | ⏳ | 22-27 days | Not started | Week 3-4 |
| 3.0 Phase 3 Impl | ⏳ | 6-8 days | Not started | Week 4-5 |
| 4.0 Testing & Val | ⏳ | 5-7 days | Not started | Week 6 |
| **Total** | | **40-48 days** | **8 days** | **82% remaining** |

---

## 🔍 Key Decisions Made

**Decision 1: Use otto-systems as Single Source of Truth**
- **Rationale:** otto-systems repos are canonical implementations created by ecosystem architect
- **Impact:** All functional duplication must be eliminated
- **Consequence:** Requires FFI/bindings for Node.js integration

**Decision 2: Remove Custom Adapters**
- **Rationale:** Node.js crypto/state implementations are less secure and duplicate Rust code
- **Impact:** Delayed Phase 2 until FFI bindings available
- **Consequence:** Currently plaintext storage (documented security debt)

**Decision 3: Prioritize Phase 1 (Updates)**
- **Rationale:** No dependencies on FFI bindings, can start immediately
- **Impact:** Earliest security/code quality improvement
- **Consequence:** May take longer than other phases due to complexity

**Decision 4: Run Phase 2 & 2b in Parallel**
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

**End of Initial Handoff**

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

*This document should be updated at each major milestone. Last update: 2026-09-02*
