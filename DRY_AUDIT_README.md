# otto-display-system DRY Audit - Navigation Hub

**Quick Start:** New to this effort? Start here. Then read ROADMAP.md for details.

---

## 🎯 What Happened?

We completed a comprehensive **DRY (Don't Repeat Yourself) audit** of otto-display-system and discovered that we're duplicating critical functionality that already exists in the otto-systems ecosystem:

- ❌ 7 custom update scripts (otto-update already does this)
- ❌ Custom crypto adapter (otto-crypto Rust implementation exists)
- ❌ Custom state storage (otto-osss Rust vault exists)
- ❌ Direct systemd process management (otto-kernel already handles this)

**Result:** 4 CRITICAL violations requiring 6 weeks of refactoring to fix properly.

---

## 📚 Documentation Map

### For Quick Understanding
1. **[ROADMAP.md](ROADMAP.md)** - Start here! Comprehensive 6-week plan
   - Executive summary of all 4 violations
   - Phase-by-phase breakdown (Phase 1-5)
   - Effort estimates and dependencies
   - Risk assessment and blockers

### For Tracking Progress
2. **[HANDOFF.md](HANDOFF.md)** - Living progress document
   - Current status and focus
   - Completed milestones
   - Upcoming work with success criteria
   - Known blockers and issues
   - Update log for continuous tracking

### For Technical Deep Dives
3. **[FUNCTIONAL_DRY_AUDIT.md](FUNCTIONAL_DRY_AUDIT.md)** - Generated detailed audit
   - Code-level violations with examples
   - Security impact analysis
   - File locations and line counts

4. **[DRY_AUDIT_REPORT.md](DRY_AUDIT_REPORT.md)** - Generated summary report
   - High-level findings
   - Recommendations
   - Timeline breakdown

### For Team Communication
5. **[/memories/repo/functional-dry-audit-critical.md](/memories/repo/functional-dry-audit-critical.md)** - Session memory (critical findings)
   - Quick reference of 4 violations
   - Current status of work
   - Next steps

---

## 🚀 Current Status

**Phase:** 1.0 active (command-contract mapping)  
**Progress:** 8+ / 48 days complete

### ✅ Completed (Phase 0)
- Structural audit (identified 21 submodule candidates)
- Created 17/19 git submodules (~450 MB removed)
- Functional audit (found 4 violations)
- Removed problematic adapters
- Created roadmap and handoff docs

### → Next (Phase 1)
- Research command-service update command contracts and generated CLI/API surfaces
- Remove 7 update-related scripts
- Timeline: Week 1-2 (18-22 days)

Kickoff completed:
- Confirmed command IDs: `config.show`, `config.set`, `service.install`, `service.start`, `service.status`, `service.stop`, `service.uninstall`
- Confirmed generated surfaces in `external/otto/otto-update/src/generated_cli/index.ts` and `external/otto/otto-update/src/generated_api/index.ts`

---

## 🚨 Critical Items

### Know These 4 Violations
1. **UPDATE MECHANISM** - 7 duplicate scripts (390 lines)
   - Remove: tools/build-update-package.ps1 + 6 others
   - Use: otto-update instead

2. **CRYPTOGRAPHY** - ❌ Adapter removed, needs FFI
   - Status: Currently plaintext (INSECURE)
   - Fix: Integrate otto-crypto via FFI bindings
   - Timeline: Phase 2b (10-12 days)

3. **STATE STORAGE** - ❌ Adapter removed, needs FFI
   - Status: OAuth tokens in plaintext (CRITICAL SECURITY RISK)
   - Fix: Integrate otto-osss for encrypted vault
   - Timeline: Phase 2 (12-15 days)

4. **PROCESS LIFECYCLE** - Direct systemd, should use kernel
   - Fix: Integrate otto-kernel
   - Timeline: Phase 3 (6-8 days)

---

## 🔒 Security Status

**Current:** AT RISK
- OAuth tokens stored in plaintext
- No encryption or audit trail

**Target:** SECURE (after Phase 2)
- All secrets encrypted via otto-osss vault
- All crypto via otto-crypto
- Complete audit trail

**Timeline:** 40-48 days to reach secure state

---

## 🛣️ 6-Week Roadmap at a Glance

| Week | Phase | Work | Days |
|------|-------|------|------|
| 1-2 | 1 | Remove otto-update duplicates | 18-22 |
| 2-3 | 2b | Integrate otto-crypto via FFI | 10-12 |
| 3-4 | 2 | Integrate otto-osss via FFI | 12-15 |
| 4-5 | 3 | Integrate otto-kernel | 6-8 |
| 5-6 | 4 | Test & validate on Pi | 5-7 |
| - | 5 | (Optional) Extract 3 extensions | 8-10 hrs |

**Total: 40-48 days**

---

## ⚠️ Key Blockers

### Need to Research (Do This First!)
1. **otto-crypto FFI/Node.js bindings**
   - Status: Unknown if they exist
   - Blocks: Phase 2b (encryption)
   - Action: Check otto-crypto GitHub repo

2. **otto-osss FFI/Node.js bindings**
   - Status: Unknown if they exist
   - Blocks: Phase 2 (state vault)
   - Action: Check otto-osss GitHub repo

3. **Command-service update contract parity**
   - Status: Architecture clarified: registry is source of truth
   - Blocks: Phase 1 only if command parity is unverified
   - Action: Validate command-service registry contracts and generated CLI/API surfaces

---

## 📋 Recommended Reading Order

**First Time?**
1. This file (navigation hub)
2. [ROADMAP.md](ROADMAP.md) - Executive summary + phases
3. [HANDOFF.md](HANDOFF.md) - Current status and progress

**Resuming After Context Loss?**
1. [HANDOFF.md](HANDOFF.md) - See where we left off
2. [ROADMAP.md](ROADMAP.md) - Refresh on phases and timeline
3. Specific phase documentation as needed

**For Security Review?**
1. [ROADMAP.md](ROADMAP.md) - "Security Success" section
2. [FUNCTIONAL_DRY_AUDIT.md](FUNCTIONAL_DRY_AUDIT.md) - Violation details
3. This file's "Security Status" section

**For Team Standup?**
1. [HANDOFF.md](HANDOFF.md) - "Progress Summary" table
2. This file's "Current Status" section
3. [HANDOFF.md](HANDOFF.md) - "Blockers & Research Items"

---

## 🔗 Related Repositories (Git Submodules)

All now accessible at `external/otto/<repo>/`:
- `otto-update` - Update engine (Phase 1 dependency)
- `otto-osss` - State vault (Phase 2 dependency)
- `otto-crypto` - Cryptography (Phase 2b dependency)
- `otto-kernel` - Process lifecycle (Phase 3 dependency)

---

## ✉️ Questions?

**"What's the highest priority?"** → Phase 1 (remove update scripts, no FFI dependency)

**"When can we ship this?"** → 6 weeks (40-48 days) if FFI bindings available

**"What's the security impact?"** → CRITICAL until Phase 2 (OAuth tokens currently plaintext)

**"How much code is being deleted?"** → ~390 lines of update scripts, plus adapters

**"Do I need to know Rust?"** → No, just need FFI/bindings available for crypto and state

---

## 📞 Key Contacts

- **Architecture & Security:** Lead this effort
- **DevOps:** Will handle Pi deployment testing
- **QA:** Will verify integration tests
- **Security Review:** Required before Phase 2 completion

---

## 🔄 How to Update This Document

When resuming work:
1. Check current status in HANDOFF.md
2. Update HANDOFF.md with new milestone progress
3. Keep ROADMAP.md as-is (reference document)
4. This file doesn't need updates (just reference content)

---

**Last Updated:** 2026-09-02  
**Status:** ACTIVE - Phase 0 complete, Phase 1 planning  
**Next Review:** When Phase 1 begins

---

*For the full detailed roadmap, see [ROADMAP.md](ROADMAP.md)*  
*For progress tracking, see [HANDOFF.md](HANDOFF.md)*  
*For technical details, see [FUNCTIONAL_DRY_AUDIT.md](FUNCTIONAL_DRY_AUDIT.md)*
