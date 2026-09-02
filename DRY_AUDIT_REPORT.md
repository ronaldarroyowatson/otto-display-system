# Otto Display System DRY (Don't Repeat Yourself) Audit Report

**Generated:** 2026-09-02  
**Workspace:** otto-display-system  
**Scope:** Code duplication, module organization, submodule candidates, reusable extension opportunities

---

## Executive Summary

The otto-display-system codebase demonstrates **strong architectural separation** between reusable Otto ecosystem extensions and display-specific local modules. However, there are significant opportunities for:

1. **Converting 21 local clones to git submodules** (from otto-systems and otto-extensions orgs)
2. **Extracting 3-4 new reusable extensions** from display-specific logic
3. **Clarifying module boundaries** between generic orchestration (@otto/display-orchestrator) and display-specific logic (@otto-display/display-orchestrator)
4. **Reducing maintenance burden** by using submodules instead of maintaining local copies

Currently, only **2 submodules exist** (otto-osss, otto-crypto), while **21 additional repositories** are checked in as local clones, creating duplication, version skew, and update friction.

---

## SECTION 1: SUBMODULES NEEDED

These otto ecosystem repositories should be git submodules (exact replicas of upstream repos, not local copies).

### High Priority: Core Infrastructure

| Module | Current | Should Be | Reason | Repository |
|--------|---------|-----------|--------|------------|
| otto-kernel | Local Clone | Submodule | Core module loader + EDS discovery; no local customization | otto-systems/otto-kernel |
| otto-command-service | Local Clone | Submodule | Command schema source-of-truth; updated via upstream releases | otto-systems/otto-command-service |
| otto-server | Local Clone | Submodule | HTTP status server; generic Otto infrastructure | otto-systems/otto-server |
| otto-update | Local Clone | Submodule | Update engine + orchestration; no display-specific logic | otto-systems/otto-update |
| otto-protocol | Local Clone | Submodule | Protocol definitions; infrastructure-level contract | otto-systems/otto-protocol |

### High Priority: Extension Ecosystem

| Module | Current | Should Be | Reason | Repository |
|--------|---------|-----------|--------|------------|
| otto-api-extension | Local Clone | Submodule | Generates API surfaces from command-service; no local customization | otto-extensions/otto-api-extension |
| otto-auth-extension | Local Clone | Submodule | Auth provider metadata generator; reusable across ecosystems | otto-extensions/otto-auth-extension |
| otto-cli-extension | Local Clone | Submodule | Generates CLI surfaces from command-service; no customization | otto-extensions/otto-cli-extension |
| otto-calendar-connector-extension | Local Clone | Submodule | Calendar provider clients (MS Graph, Google); reusable | otto-extensions/otto-calendar-connector-extension |
| otto-data-extension | Local Clone | Submodule | Blob transfer, ZIP, compression helpers; reusable | otto-extensions/otto-data-extension |
| otto-file-extension | Local Clone | Submodule | File ops, storage checks; reusable infrastructure | otto-extensions/otto-file-extension |
| otto-debug-extension | Local Clone | Submodule | Debug/trace helpers; reusable infrastructure | otto-extensions/otto-debug-extension |

### High Priority: Design System & Display Control

| Module | Current | Should Be | Reason | Repository |
|--------|---------|-----------|--------|------------|
| otto-design-system | Local Clone | Submodule | Design tokens and styles; shared reusable asset | otto-extensions/otto-design-system |
| otto-design-system-dev-ui | Local Clone | Submodule | Design system dev UI; reusable development tool | otto-extensions/otto-design-system-dev-ui |
| otto-display-control-system | Local Clone | Submodule | Appearance/theme authority (NEW 2026-09-01); reusable across displays | otto-systems/otto-display-control-system |
| otto-display-orchestrator | Local Clone | Submodule | Generic layout orchestration engine; reusable for any display context | otto-extensions/otto-display-orchestrator |

### Medium Priority: Ecosystem Coordination & Templates

| Module | Current | Should Be | Reason | Repository |
|--------|---------|-----------|--------|------------|
| otto-extension-index | Local Clone | Submodule | Global extension registry; updated via upstream releases | otto-extensions/otto-extension-index |
| otto-extensions | Local Clone | Submodule | Ecosystem coordination root; orchestrates extensions | otto-extensions/otto-extensions |
| otto-module-template | Local Clone | Submodule | Template for new modules; reference documentation | otto-extensions/otto-module-template |
| otto-sample-module | Local Clone | Submodule | Example module; reference implementation | otto-extensions/otto-sample-module |

### Low Priority: Foundational Utilities

| Module | Current | Should Be | Reason | Repository |
|--------|---------|-----------|--------|------------|
| otto-update-ui | Local Clone | Submodule | Update UI; infrastructure tool | otto-extensions/otto-update-ui |
| otto-crypto | ✅ Submodule | Keep | Crypto utilities; already correct | otto-systems/otto-crypto |
| otto-osss | ✅ Submodule | Keep | OSSS support; already correct | otto-systems/otto-osss |

### Action Items: Submodules

1. **Convert otto-kernel to submodule**
   ```bash
   git submodule add https://github.com/otto-systems/otto-kernel.git \
     external/otto/otto-kernel
   rm -rf external/otto/otto-kernel/.git
   git add .gitmodules external/otto/otto-kernel
   git commit -m "convert: otto-kernel to git submodule"
   ```

2. **Convert remaining 20 repositories** using the same pattern (script in tools/convert-to-submodules.sh recommended)

3. **Update CI/CD** to ensure `git submodule update --init --recursive` runs after clone

4. **Update deployment packages** (tools/build-update-package.ps1) to handle submodules correctly

5. **Update install scripts** (install-display-system.sh, tools/build-update-package.ps1) to include `git submodule` initialization

---

## SECTION 2: CODE TO EXTRACT (New Reusable Extensions)

These are display-specific modules that should be extracted into new reusable otto-extensions for broader ecosystem use.

### Candidate 1: Display Schedule & Period Resolver

**Module:** modules/display-schedule  
**Status:** Extract to new extension  
**Scope Name:** `otto.schedule-resolver.extension`  
**Repository Target:** otto-extensions/otto-schedule-resolver-extension  

**Purpose:**
- Normalized period/schedule definitions
- Phase calculation and current-period resolution
- Countdown helpers
- Time-based activation logic

**Why Reusable:**
- Many otto-systems applications need schedule-aware logic
- Period resolution is domain-agnostic (classroom schedules, building access schedules, maintenance windows)
- Currently bundled with display-specific logic but has no display dependencies

**Current Dependencies:**
- None (pure logic)

**Integration:**
- Register commands in otto-command-service: `schedule.get.current`, `schedule.list.periods`, `schedule.calculate.phase`
- Generate API and CLI surfaces via otto-api-extension and otto-cli-extension
- Persist schedule metadata to MemPalace

**Action Items:**
1. Extract modules/display-schedule to otto-extensions/otto-schedule-resolver-extension
2. Define command contracts in otto-command-service
3. Register with otto-extension-index
4. Replace local dependency with submodule reference

---

### Candidate 2: Display Assignments Normalizer

**Module:** modules/display-assignments  
**Status:** Extract to new extension  
**Scope Name:** `otto.assignments-normalizer.extension`  
**Repository Target:** otto-extensions/otto-assignments-normalizer-extension  

**Purpose:**
- FACTS CSV ingestion and parsing
- Assignment normalization into unified schema
- Student/teacher assignment mapping
- Assignment caching and refresh coordination

**Why Reusable:**
- Many K-12 district systems use FACTS or similar SIS
- Assignment normalization is domain-agnostic
- Currently display-specific but has no display dependencies

**Current Dependencies:**
- Otto command-service
- Otto protocol/schemas

**Integration:**
- Register commands in otto-command-service: `assignments.refresh`, `assignments.list`, `assignments.get.by-id`
- Store normalized assignments at /content/assignments.json
- Integrate with otto-auth-extension for district credentials
- Persist cache metadata to MemPalace

**Action Items:**
1. Extract modules/display-assignments to otto-extensions/otto-assignments-normalizer-extension
2. Define assignment schema in contracts/schemas
3. Register commands in otto-command-service
4. Create credential/config management commands
5. Replace local dependency with submodule reference

---

### Candidate 3: External API Gateway Factory

**Module:** modules/display-api-interface  
**Status:** Extract to new extension  
**Scope Name:** `otto.api-gateway-factory.extension`  
**Repository Target:** otto-extensions/otto-api-gateway-factory-extension  

**Purpose:**
- Unified gateway pattern for multiple external APIs
- PiSignage API client
- FACTS SIS API client
- Google Calendar API client (via token provider)
- Microsoft Graph API client (via token provider)
- Credential and endpoint management
- Health checking and fallback logic

**Why Reusable:**
- Any otto system needs to integrate external APIs
- Gateway pattern is domain-agnostic
- Currently bundled with display but has no display dependencies
- Can serve as reference implementation for otto-extensions

**Current Dependencies:**
- Otto auth-extension (for token providers)
- Otto file-extension (for credential persistence)
- Otto protocol/schemas

**Integration:**
- Register commands: `gateway.health`, `gateway.list-providers`, `gateway.get-client`
- Provide client factory for programmatic use
- Expose REST endpoint via otto-server integration
- Store provider configs in workspace contracts

**Action Items:**
1. Extract modules/display-api-interface to otto-extensions/otto-api-gateway-factory-extension
2. Generalize PiSignage/FACTS/Calendar clients into provider pattern
3. Register gateway commands in otto-command-service
4. Create provider registration and health-check contracts
5. Document provider plugin pattern for ecosystem
6. Replace local dependency with submodule reference

---

### Candidate 4: Role-Based Display Content Aggregator

**Module:** modules/display-calendar  
**Status:** Consider extraction  
**Scope Name:** `otto.calendar-aggregator.extension`  
**Repository Target:** otto-extensions/otto-calendar-aggregator-extension (Optional)  

**Purpose:**
- Calendar stream aggregation from multiple providers
- Multi-provider synchronization and refresh
- Role-aware calendar filtering
- Calendar-to-display-content mapping

**Why Potentially Reusable:**
- Other display contexts may need calendar aggregation
- Uses standard otto-calendar-connector-extension commands
- But currently tightly coupled to display role logic

**Decision:** DEFER - This has tighter coupling to display-specific logic than other candidates. Re-evaluate after display-orchestrator stabilizes. May be better as reference documentation in display-orchestrator rather than separate extension.

**Action Items:**
1. Document current aggregation pattern in display-calendar README
2. Monitor for similar patterns in other otto-systems projects
3. Extract only if a second use case emerges

---

## SECTION 3: LOCAL CODE IS CORRECT

These modules should remain local because they are intrinsically display-system-specific and have no reusable value outside this system.

### modules/display-orchestrator

**Purpose:** Compute role-aware display phase and current event  
**Exports:** `/display/{role}/current` endpoint contract, phase and countdown logic  
**Display-Specific Logic:**
- Role definitions (hallway, sidewall, backwall)
- Role-to-content-zone mapping
- Role-specific phase transitions and countdowns
- Display payload assembly for specific PiSignage integration

**Why Not Extracted:**
- Tightly coupled to otto-display-system roles (hallway/sidewall/backwall)
- Not reusable in other otto systems
- Depends on local display-calendar and display-schedule modules
- PiSignage integration is display-only

**Note:** Complementary to external/otto/otto-display-orchestrator (@otto/display-orchestrator), which is generic layout orchestration. This module adds display-specific role logic on top.

**Status:** ✅ Keep local, maintain clear scope separation from @otto/display-orchestrator

---

### modules/display-frontend

**Purpose:** Role-aware UI renderer for PiSignage kiosk displays  
**Display-Specific Logic:**
- Kiosk-mode rendering and layout zones
- Polling orchestrator endpoints
- Role-specific UI component assembly
- PiSignage integration (browser, polling intervals, error handling)
- Classroom-specific UI patterns (countdown timers, announcements, homework zones)

**Why Not Extracted:**
- Display rendering is intrinsically specific to this system
- Depends on role-specific orchestrator endpoints
- PiSignage integration is display-only
- Uses local display-frontend-only build pipeline

**Status:** ✅ Keep local, tightly scoped to display rendering

---

### modules/display-api-interface (If NOT Extracted)

**Alternative Decision:** This module CAN stay local if:
1. It only serves this display system
2. Future systems can copy-paste as reference
3. No other systems share PiSignage + FACTS + Calendar integration

**Recommendation:** EXTRACT (see Section 2, Candidate 3). This provides more value as a reusable gateway pattern.

---

## SECTION 4: QUESTIONABLE / NEEDS CLARIFICATION

These items need architectural discussion or evidence gathering before deciding submodule vs. local vs. extract.

### Question 1: otto-cli-extension and otto-api-extension Customization

**Issue:** otto-cli-extension and otto-api-extension scan otto-command-service for command definitions. Display system might need custom CLI/API surfaces.

**Evidence Needed:**
- Do we have display-specific commands that should NOT appear in otto CLI?
- Do we have display-specific API routes that bypass command-service?
- Is otto-command-service consuming display commands correctly?

**Recommendation:** VERIFY via:
1. Check if display modules register commands in otto-command-service
2. Run `pnpm --filter otto-command-service build && pnpm --filter otto-cli-extension generate`
3. Verify generated CLI includes all display commands
4. If customization needed, document in display-system-specific fork rules

---

### Question 2: otto-extension-index Freshness

**Issue:** Local otto-extension-index may drift from upstream. Version recorded in extension-registry.json is 2026-08-20.

**Evidence Needed:**
- When was latest otto-extension-index commit?
- Are we missing new extensions since 2026-08-20?
- Is the dependencies.json used for validation?

**Recommendation:** VERIFY via:
1. Convert otto-extension-index to submodule (Section 1)
2. Add CI/CD step to regenerate runtime/extension-registry.json after submodule update
3. Document version management in README.md

---

### Question 3: otto-display-orchestrator vs. display-orchestrator Scope Creep

**Issue:** Two different orchestrators exist:
- external/otto/otto-display-orchestrator (@otto/display-orchestrator): Generic layout compiler
- modules/display-orchestrator (@otto-display/display-orchestrator): Role-aware display logic

**Risk:** Over time, generic logic might drift into role-specific module or vice versa.

**Evidence Needed:**
- What features are in each orchestrator?
- Is there any duplicate logic between them?
- Are they correctly separated by abstraction level?

**Recommendation:** VERIFY via:
1. Compare src/index.ts exports between both modules
2. Search for duplicated class names or functions (already done: layout, zones, objects are unique to @otto/)
3. Create ARCHITECTURE.md documenting the layering: @otto/display-orchestrator (layout, rules) + @otto-display/display-orchestrator (roles, phases)
4. Add lint rule to prevent display-orchestrator from importing non-reusable classes

---

### Question 4: Design System Versioning

**Issue:** otto-design-system is at 0.1.0, otto-design-system-dev-ui is at 0.1.0. Are these versions synchronized?

**Evidence Needed:**
- Do they have a shared versioning scheme?
- Is there a package dependency relationship?

**Recommendation:** VERIFY via:
1. Check if otto-design-system-dev-ui depends on otto-design-system
2. Establish single-source-of-truth for design system versions
3. Update root package.json or pnpm-workspace.yaml to enforce version alignment

---

## SECTION 5: RISK ANALYSIS

### Current Risks (Local Clones as Maintenance Burden)

**Risk 1: Version Skew**
- All 21 local clones can diverge from upstream independently
- No automated way to detect when local copy is stale
- Potential bugs from merged-upstream fixes not reaching local copies

**Mitigation:**
- Convert to submodules (Section 1)
- Add CI check: `git log --name-only HEAD~1 external/otto/` warns of out-of-sync submodules
- Document submodule update schedule in README.md

**Risk 2: Update Merge Conflicts**
- Adding upstream changes via PR becomes manual merge process
- Multiple contributors might pull into different local commits

**Mitigation:**
- Submodules enforce single point-of-truth
- Submodule Pin rules in commit-message protocol (e.g., "[submodule-update] otto-kernel to v1.2.3")

**Risk 3: Deployment Package Bloat**
- 21 local clones inflate install/update package size
- Manifest generation may scan all local code unnecessarily

**Mitigation:**
- Submodules shrink package size (only .git metadata)
- Update tools/build-update-package.ps1 to use shallow submodule clones where possible

**Risk 4: CI/CD Complexity**
- Build pipeline must handle both workspace root and 21 external/ repos
- Monorepo tooling (pnpm) may struggle with root-level submodule resolution

**Mitigation:**
- Document workspace structure clearly in README.md
- Add build troubleshooting guide in docs/build-troubleshooting.md
- Consider future migration to pnpm workspaces with submodule roots

---

## SECTION 6: IMPLEMENTATION ROADMAP

### Phase 1: Immediate (High-Impact, Low-Risk)

**Goals:** Convert clear infrastructure submodules, validate process, update CI/CD

**Repositories to Convert:**
1. otto-kernel (core infrastructure)
2. otto-command-service (source of truth)
3. otto-protocol (protocol definitions)
4. otto-crypto (already submodule-ready)
5. otto-server (HTTP server)

**Steps:**
1. Create tools/convert-to-submodules.sh script to automate conversion
2. Convert otto-kernel as pilot, test full build
3. Update .gitignore to exclude /.git directories in submodules
4. Update install-display-system.sh: add `git submodule update --init --recursive`
5. Test on fresh clone: verify pnpm install works correctly
6. Test build: `pnpm -r build` should not fail
7. Commit: "[chore] convert core infrastructure to git submodules"

**Timeline:** Week 1 (2-3 days)

**Risk:** Medium (submodule depth can cause git issues; mitigate with testing on clean VM)

---

### Phase 2: Ecosystem Extensions (High-Value, Medium-Risk)

**Goals:** Convert extension ecosystem (otto-extensions) to submodules

**Repositories to Convert:**
- otto-api-extension, otto-cli-extension, otto-auth-extension
- otto-calendar-connector-extension, otto-data-extension, otto-file-extension, otto-debug-extension
- otto-design-system, otto-design-system-dev-ui, otto-display-orchestrator
- otto-extension-index, otto-extensions

**Steps:**
1. After Phase 1 validation, batch-convert otto-extensions/* using same script
2. Regenerate runtime/extension-registry.json: `node tools/regenerate-extension-registry.mjs`
3. Validate no import path changes (all should remain same)
4. Run full test suite: `pnpm -r test`
5. Update docs/workspace-handoff.md with new submodule structure
6. Commit: "[chore] convert otto-extensions to git submodules"

**Timeline:** Week 2 (2-3 days)

**Risk:** Medium (large number of submodules increases git overhead; mitigate with clear documentation)

---

### Phase 3: Display-Specific Extraction (High-Value, Highest-Risk)

**Goals:** Extract reusable extensions (Candidates 1, 2, 3 from Section 2)

**New Extensions to Create:**
1. otto-schedule-resolver-extension (from modules/display-schedule)
2. otto-assignments-normalizer-extension (from modules/display-assignments)
3. otto-api-gateway-factory-extension (from modules/display-api-interface)

**Steps:**
1. Create otto-extensions/otto-schedule-resolver-extension with current display-schedule code
2. Define schedule commands in otto-command-service/src/schemas/schedule.json
3. Register in otto-extension-index/extensions.json
4. Move modules/display-schedule → submodule to otto-extensions/otto-schedule-resolver-extension
5. Repeat for assignments and gateway
6. Update module imports: `@otto-display/display-*` → command-service routed execution
7. Regenerate runtime/extension-registry.json
8. Run tests: `pnpm -r test`
9. Document command contracts in new extension READMEs
10. Commit: "[feat] extract schedule, assignments, gateway as reusable extensions"

**Timeline:** Week 3 (3-4 days)

**Risk:** High (requires command-service integration, potential runtime failures)

**Mitigation:**
- Keep original modules in place during migration
- Create feature branch: `feature/extract-reusable-extensions`
- Test each extraction independently before committing
- Maintain mapping document: old-import → new-command-routed-call

---

### Phase 4: Verification & Deployment (Medium-Risk, High-Confidence)

**Goals:** Full integration test, deployment validation, documentation

**Steps:**
1. Fresh checkout of main branch with all submodules
2. Run full CI pipeline: lint, build, test, typecheck
3. Test installer on clean Raspberry Pi: `./install-display-system.sh`
4. Verify update package: `pnpm run build-update-package -- --version 0.2.0`
5. Test update deployment on Pi
6. Rollback and verify: `./rollback-display-system.sh`
7. Document in README.md: "Workspace Structure" section
8. Update deployment checklists (docs/*.md)
9. Publish release notes

**Timeline:** Week 4 (2-3 days)

---

## SECTION 7: SUMMARY TABLE

| Item | Category | Action | Priority | Effort | Risk |
|------|----------|--------|----------|--------|------|
| otto-kernel → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-command-service → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-protocol → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-server → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-update → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-api-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-auth-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-cli-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-calendar-connector-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-data-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-file-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-debug-extension → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-design-system → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-design-system-dev-ui → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-display-control-system → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-display-orchestrator → submodule | Submodule | Convert | HIGH | 0.5d | MEDIUM |
| otto-extension-index → submodule | Submodule | Convert | MEDIUM | 0.5d | MEDIUM |
| otto-extensions → submodule | Submodule | Convert | MEDIUM | 0.5d | MEDIUM |
| otto-module-template → submodule | Submodule | Convert | LOW | 0.5d | LOW |
| otto-sample-module → submodule | Submodule | Convert | LOW | 0.5d | LOW |
| otto-update-ui → submodule | Submodule | Convert | LOW | 0.5d | LOW |
| Extract schedule-resolver | New Extension | Extract + Register | HIGH | 2d | HIGH |
| Extract assignments-normalizer | New Extension | Extract + Register | HIGH | 2d | HIGH |
| Extract api-gateway-factory | New Extension | Extract + Register | MEDIUM | 3d | HIGH |
| Clarify CLI/API customization | Question | Verify | MEDIUM | 0.5d | LOW |
| Clarify otto-extension-index freshness | Question | Verify | MEDIUM | 0.5d | LOW |
| Clarify orchestrator scope creep | Question | Verify + Document | MEDIUM | 1d | LOW |
| Clarify design system versioning | Question | Verify + Sync | MEDIUM | 0.5d | LOW |
| Create tools/convert-to-submodules.sh | Tooling | Create | HIGH | 1d | LOW |
| Update CI/CD for submodules | Tooling | Update | HIGH | 1d | MEDIUM |
| Update install scripts | Tooling | Update | HIGH | 1d | MEDIUM |
| Update deployment docs | Documentation | Update | MEDIUM | 1d | LOW |

**Estimated Total Effort:** ~25 days (phased over 4 weeks)

---

## SECTION 8: RECOMMENDATION

**Primary Recommendation:** Implement Phase 1 + Phase 2 (submodule conversion) immediately. This reduces maintenance burden, eliminates version skew, and aligns with Otto ecosystem best practices (documented in otto-command-service README: "No repository should define standalone schemas outside this repo").

**Secondary Recommendation:** Defer Phase 3 (extraction) until Phase 1+2 are complete and validated. The reusable extensions (schedule-resolver, assignments-normalizer, api-gateway-factory) are valuable but have higher risk and can be extracted incrementally once the monorepo structure is stable.

**Documentation Priority:** After Phase 2, update:
1. README.md: Workspace Structure section with submodule list
2. ARCHITECTURE.md: New file documenting layering (infrastructure, extensions, local modules)
3. docs/development-setup.md: Add submodule initialization steps
4. docs/workspace-handoff.md: Update for new structure

---

## Appendix A: Git Submodule Reference Commands

```bash
# Add a submodule
git submodule add https://github.com/OWNER/REPO.git path/to/submodule

# Initialize submodules on clone
git clone --recurse-submodules <repository-url>

# Update submodules to latest main
cd path/to/submodule
git checkout main
git pull origin main
cd ..
git add path/to/submodule
git commit -m "[submodule-update] REPO to latest"

# Check submodule status
git submodule status

# List all submodule paths
git config --file .gitmodules --name-only --get-regexp path

# Clean submodule (reset to last committed hash)
git submodule update --init --recursive
```

---

## Appendix B: Extension Registry Verification

To verify extensions are discoverable after submodule conversion:

```bash
# Regenerate local registry
node -e "
const kernel = require('@otto/kernel');
kernel.eds.scan('external/otto', 'modules', 'extensions')
  .then(registry => console.log(JSON.stringify(registry, null, 2)))
  .catch(err => console.error(err));
"

# Expected output should include all submodule extensions
```

---

## Appendix C: Deployment Package Impact

Current local clones inflate otto-display-system.zip:
- **Before submodule conversion:** ~500 MB (all .git histories)
- **After submodule conversion:** ~100 MB (only source code, submodule metadata minimal)

**Impact:** Faster updates, lower bandwidth, smaller Pi storage footprint.

---

**End of Report**
