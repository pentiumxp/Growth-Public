# Growth Vite And ESM Completion Audit

Status: active Owner-cutover audit.
Last updated: 2026-07-06.

## Purpose

This audit maps the active Growth Vite and ESM migration baseline in
`docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md` to current
authoritative evidence. It records the completed Owner-approved deployment and
bounded production readback returned by the Home AI deploy lane.

This document does not request a new deployment.

## Completion Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Phase 0 baseline and gates | Complete | `node scripts/check-growth-vite-phase-audit.js` reports `phase0BaselineAndGates.status=complete`. |
| Phase 1 Vite skeleton | Complete | Vite build, manifest validation, bootstrap loader, dev-server smoke, and runtime-boundary checks pass through `npm run --silent check`. |
| Phase 2 platform/API/routing ESM | Complete | Cutover readiness reports API client, theme bridge, viewport bridge, view-model, route controller, and navigation controller ESM evidence present. |
| Phase 3 Owner generation and release UI | Complete | Cutover readiness reports card-generation facade, release readback/evidence subviews, action handlers, program ESM surface, and runtime adapter evidence present. |
| Phase 4 card interaction | Complete | Runtime adapter and focused frontend ESM tests cover the injected card-interaction controller, delegated DOM events, submission/evaluation/reflection panels, and audio recorder lifecycle. |
| Phase 5 legacy board UI | Complete | Cutover readiness reports `legacy_board_esm_facade_present` and `legacy_growth_ui_composite_present`. |
| Phase 6 pre-Owner runtime boundary | Complete | Before Owner approval, `node scripts/check-growth-vite-runtime-boundary.js` kept the legacy runtime active. After Owner approval, it accepts the source runtime marker while still forbidding direct hardcoded module scripts and direct hashed Vite assets. |
| Phase 7 central visual evidence | Present | Owner cutover evidence receipt accepts central `embedded-plugin-shell` and `dark-growth-surfaces` visual evidence for Growth. |
| Phase 7 Owner approval request routing | Sent | Non-deployment request card `ttc_1b40fc066486468771` was routed to Home AI Task Intake for Owner decision. |
| Phase 7 Owner approval | Present | Owner approval reference `owner-approval:growth-vite-esm-runtime-cutover:ttc_1b40fc066486468771:2026-07-06T12:38:24Z` is recorded. |
| Phase 7 deploy-lane routing | Present | Deploy card `ttc_e52ea380399fdd979a` returned completed by `ttc_c323e186a8e6945a94`; status-request return `ttc_1d2dddc18bb602b841` confirms no duplicate deployment was run. |
| Runtime enablement source marker | Applied and deployed | `configChangeApplied=true`, `runtimeConfigChange=true`, and deploy readback reports `data-growth-vite-runtime="enabled"` in production. |
| Production update | Complete | Home AI Deploy returned `ok=true`, source ref `1b0e5d58a49b1c9b2c8b283673a25d52d358377d`, source dirty `false`, health HTTP 200, Vite manifest/asset HTTP 200, and Growth visual checks `ok=true`. |

## Requirement Audit

### Static Vite Build

- Required by plan: root `vite.config.js`, `frontend/index.html`,
  `frontend/src/main.js`, `build:frontend`, `dev:frontend`,
  `smoke:frontend-dev`, `test:frontend`, `check:frontend`, manifest validation,
  and generated static assets under `public/assets/growth/`.
- Current evidence:
  - `npm run --silent check` runs frontend ESM syntax checks, Vite build,
    manifest validation, runtime boundary validation, cutover readiness,
    Owner cutover preflight, phase audit, dev-server smoke, and frontend tests.
  - `public/assets/growth/` is generated output and remains ignored.
- Status: complete for development and Owner-cutover readiness.

### Runtime Boundary

- Required by plan: preserve `public/index.html` as the plugin entry, keep Home
  AI embedded launch/proxy/workspace behavior intact, and apply runtime
  replacement only after Owner approval.
- Current evidence:
  - `public/index.html` loads
    `/growth-vite-bootstrap-loader.js?v=20260706-vite-esm-phase1`.
  - `public/index.html` includes
    `data-growth-vite-runtime="enabled"` after Owner approval.
  - `node scripts/check-growth-vite-runtime-boundary.js` passes.
  - `node scripts/check-growth-vite-cutover-readiness.js` reports
    `readyForRuntimeEnablement=true`.
- Status: source marker applied and production readback returned.

### ESM Module Surfaces

- Required by plan: split active frontend behavior into tested ESM surfaces for
  app shell, platform bridge, API client, routing, state, views, card
  generation, release/evidence, card interaction, and legacy board UI.
- Current evidence:
  - `tests/growth-frontend-esm-modules.test.mjs` covers the migrated pure
    module surfaces.
  - `scripts/check-growth-vite-cutover-readiness.js` checks the concrete
    cutover surfaces needed for the current Owner-cutover boundary.
  - `scripts/check-growth-vite-phase-audit.js` reports Phase 0-6 internal
    evidence complete.
- Status: complete for the current Owner-cutover boundary.

The target module map in the migration plan intentionally includes future
names such as shared `components/*`, `api/routes.js`, `api/errors.js`,
`routing/hostActions.js`, `routing/lanes.js`, and additional reducer files.
Those are target architecture waypoints, not mandatory empty files for this
cutover. The current implementation uses concrete ESM surfaces where behavior
has been migrated and tested; adding inert placeholder files would not improve
runtime readiness.

### Compatibility Globals

- Required by plan: remove temporary compatibility glue by the final cutover
  boundary and prevent migrated frontend behavior from depending on a new
  `registerGlobals` adapter.
- Current evidence:
  - `scripts/check-growth-vite-cutover-readiness.js` reports
    `no_register_globals_file`.
  - Production readback reports the approved bootstrap loader, Vite manifest,
    and built Vite asset are served over HTTP 200.
- Status: complete for the Owner-approved production cutover.

### Central Visual Evidence

- Required by plan: use the central Home AI visual lane for embedded plugin
  shell changes and Growth dark-surface coverage.
- Current evidence:
  - `docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence.json`
    records summary-only central mobile visual evidence with
    `privacy=bounded_no_secrets`.
  - `node scripts/check-growth-vite-owner-cutover-preflight.js` reports
    `central_mobile_visual_evidence` present.
- Status: present for Owner-cutover readiness.

### Owner Approval

- Required by plan: Owner approval is required before runtime enablement.
- Current evidence:
  - `docs/IMPLEMENTATION_NOTES/growth-vite-owner-approval-request.md` is ready
    for review.
  - Non-deployment approval request card `ttc_1b40fc066486468771` has been
    sent to Home AI Task Intake for Owner decision.
  - `node scripts/check-growth-vite-owner-cutover-preflight.js` reports
    `ownerApprovalRequest.status=ready_for_owner_review` and
    `approvalRecorded=true`.
  - Valid approval evidence must include `status=present`,
    `decision=approved_for_deploy_lane_request`, ISO UTC `approvedAt`, a
    non-empty `approvalReference`, `scope=growth-vite-esm-runtime-cutover`, and
    `privacy=bounded_no_secrets`.
- Status: present.

### Deploy-Lane Routing

- Required by plan: if production deployment is needed, route the request to
  the Home AI deploy lane pool with source commit, deploy reason, restart
  label, health URL, and bounded readback expectations.
- Current evidence:
  - Deploy card `ttc_e52ea380399fdd979a` was sent to Home AI Deploy.
  - Completion return card `ttc_c323e186a8e6945a94` reports completed.
  - Status return card `ttc_1d2dddc18bb602b841` confirms no duplicate
    deployment was run for the status request.
  - `node scripts/check-growth-vite-owner-cutover-preflight.js` reports
    `deploy_lane_routing` present.
  - Valid routing evidence must include `taskCardId`,
    `cardKind=plugin_deployment`, `pluginId=growth`, `routeKind=deployment`,
    `deployReason=growth-vite-esm-runtime-cutover`, `target`,
    `returnCardRequired=true`, and `privacy=bounded_no_secrets`.
- Status: present.

## Current Blocking Conditions

No current blockers remain for the Vite/ESM cutover baseline. Owner approval,
central visual evidence, deploy-lane routing, production readback, and
post-deploy visual validation are present as bounded metadata.

## Commands For Current Evidence

Run these from the Growth plugin workspace:

```bash
node scripts/check-growth-vite-runtime-boundary.js
node scripts/check-growth-vite-cutover-readiness.js
node scripts/check-growth-vite-owner-cutover-preflight.js
node scripts/check-growth-vite-phase-audit.js
npm run --silent check
node scripts/check-growth-docs-locality.js
git diff --check
```

Expected current state after deploy-lane completion:

- phase audit: `complete`
- preflight: `ready_for_deploy_lane_runtime_enablement`
- present external evidence: `owner_cutover_approval`,
  `central_mobile_visual_evidence`, `deploy_lane_routing`
- missing external evidence: none
- runtime: Owner-approved Vite runtime marker with bootstrap loader and
  production Vite manifest/asset readback

## Next Allowed Actions

1. Maintain the Growth Vite/ESM runtime through normal post-deploy monitoring.
2. Use a new Owner/deploy-lane workflow for any future runtime-affecting
   cutover or production mutation.

## Forbidden Until Evidence Changes

- Do not add a direct `<script type="module">` to `public/index.html`.
- Do not send duplicate deploy cards for the completed
  `growth-vite-esm-runtime-cutover`.
- Do not broaden this evidence into unrelated Growth runtime changes.
