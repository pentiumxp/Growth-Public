# Growth Vite Owner Approval Request

Last updated: 2026-07-06.

## Purpose

This document records the Owner approval request and the completed deploy-lane
routing for the Growth Vite/ESM cutover. It does not request a new deployment.

The authoritative implementation baseline remains
`docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md`. The current
evidence packet is
`docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md`.
The machine-readable deploy-lane request draft is
`docs/IMPLEMENTATION_NOTES/growth-vite-deploy-lane-request-draft.json`.

## Requested Owner Decision

Owner should choose one decision:

| Decision | Meaning |
| --- | --- |
| `approved_for_deploy_lane_request` | The local Growth Vite/ESM cutover evidence is acceptable, and the Growth thread may prepare/send a deploy-lane task card for controlled runtime enablement and production readback. |
| `changes_required` | Owner requires additional local changes, evidence, or scope adjustments before a deploy-lane task card can be prepared. |
| `rejected` | Owner does not approve this Vite/ESM cutover path. |

Suggested approval wording:

```text
Owner approves Growth Vite/ESM cutover evidence for a deploy-lane request.
Approval covers the current Growth plugin workspace state, the accepted central
mobile visual evidence, and a controlled Home AI deploy-lane runtime enablement
request. Do not deploy outside the Home AI deploy lane.
```

## Evidence Summary

Current local preflight:

```bash
node scripts/check-growth-vite-owner-cutover-preflight.js
```

Current expected result:

- `ok=true`;
- `status=ready_for_deploy_lane_runtime_enablement`;
- `internalReadyForOwnerEvidence=true`;
- `readyForOwnerCutover=true`;
- `readyForRuntimeEnablement=true`;
- `configChangeApplied=true`;
- `runtimeConfigChange=true`;
- `presentExternalEvidence=["owner_cutover_approval","central_mobile_visual_evidence","deploy_lane_routing"]`;
- `missingExternalEvidence=[]`.

Accepted central mobile visual evidence:

- Request card: `ttc_1ae511cb582afb18f4`.
- Return card: `ttc_663347c3a581e5ea9d`.
- Home AI Worker Lane A thread:
  `019f1b7b-93bd-71c1-a0b9-5500bc7a1342`.
- Preflight passed with `liveDebug.ok=true`, `appium.ok=true`,
  `wda.ok=true`, and `failureLayer=""`.
- `embedded-plugin-shell --plugin-id growth` passed.
- `dark-growth-surfaces` passed.
- Screenshot artifacts:
  - `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260706T120356Z.png`
  - `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260706T120432Z.png`

Latest local validation evidence:

```bash
npm run --silent check
node scripts/check-growth-docs-locality.js
npm test -- --test-reporter=spec
node /Users/hermes-dev/HermesMobileDev/app/scripts/plugin-workspace-platform-contract-check.js --plugin growth --json
git diff --check
```

Recent known pass state:

- `npm run --silent check` passed with runtime syntax coverage
  `runtimeCount=247`, `checkedCount=248`, no missing/stale/duplicate entries,
  and frontend ESM checked count `86`.
- `npm test -- --test-reporter=spec` passed `1161/1161`.
- Central platform contract check passed for Growth with no issues or warnings.
- `git diff --check` passed.

## Approval Request Routing

The Owner approval request has been routed as a non-deployment task card:

- Request card: `ttc_1b40fc066486468771`.
- Target thread: `Home AI Task Intake`
  (`019f091a-6ce0-7932-97b2-a5ba38556f51`).
- Card kind: `owner_approval_request`.
- Category: `growth-vite-esm-cutover`.
- Plugin id: `growth`.
- Status: completed.
- Owner decision was returned as
  `approved_for_deploy_lane_request` with approval reference
  `owner-approval:growth-vite-esm-runtime-cutover:ttc_1b40fc066486468771:2026-07-06T12:38:24Z`.
- The `owner_cutover_approval` receipt is recorded in
  `docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence.json`.

This routing record alone was not an Owner approval receipt and did not satisfy
`deploy_lane_routing`. The later approval receipt and deploy-lane completion
return are the authoritative completion evidence.

## Runtime Boundary After Approval

Owner approval and deploy-lane completion have been recorded. These invariants
must remain true after production cutover:

- `public/index.html` does not include a direct `<script type="module">`.
- `public/index.html` sets the approved
  `data-growth-vite-runtime="enabled"` source marker.
- `public/index.html` loads the bootstrap loader:
  `/growth-vite-bootstrap-loader.js?v=20260706-vite-esm-phase1`.
- Generated Vite output remains ignored under `public/assets/growth/`.
- Production deployment completed through Home AI Deploy.
- No duplicate deploy-lane task card should be sent for this cutover.

## Deploy-Lane Task Card Draft

The deploy-lane task card has been sent and completed. The draft below is kept
as the historical request shape, not as an active instruction to deploy again.

```markdown
Title: Deploy Growth Vite ESM runtime cutover

cardKind: plugin_deployment
pluginId: growth
target: Home AI deploy lane pool
source workspace: /Users/hermes-dev/HermesMobileDev/plugins/growth
deploy reason: growth-vite-esm-runtime-cutover

## Request

Deploy the Owner-approved Growth Vite/ESM runtime cutover through the central
Home AI Mac deploy contract only.

## Source Evidence

- Migration plan:
  docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md
- Owner evidence packet:
  docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md
- Owner approval receipt:
  <insert source-thread approval reference>
- Central visual evidence:
  request card ttc_1ae511cb582afb18f4, return card ttc_663347c3a581e5ea9d
- Local checks:
  npm run --silent check
  npm test -- --test-reporter=spec
  node /Users/hermes-dev/HermesMobileDev/app/scripts/plugin-workspace-platform-contract-check.js --plugin growth --json
  git diff --check

## Required Deploy-Lane Work

1. Re-read the central Mac deploy contract before mutation.
2. Verify the source commit/ref and source dirty status.
3. Apply the approved Growth runtime cutover only through the central deploy
   path.
4. Preserve bounded evidence and do not include secrets, launch tokens, raw
   learner payloads, cookies, private paths beyond approved artifact pointers,
   raw deployment logs, or full prompts.
5. Run bounded production readback after deploy:
   - Growth manifest/health readback;
   - runtime asset/readback showing the approved Vite runtime is active;
   - central iOS PWA visual scenario `embedded-plugin-shell --plugin-id growth`;
   - any additional central visual scenario required by the deploy contract.

## Non-Goals

- Do not deploy from the Growth plugin thread.
- Do not bypass the Home AI deploy lane.
- Do not expose raw credentials or private payloads.
- Do not broaden the deployment beyond Growth.

## Return Card Required

Return a bounded completion or blocker card with source commit/ref, deploy
result, production readback, visual evidence summary, privacy confirmation, and
any exact blocker.
```

## Owner Approval Receipt Fields

If Owner approves, record only summary fields in
`docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence.json`:

```json
{
  "owner_cutover_approval": {
    "status": "present",
    "decision": "approved_for_deploy_lane_request",
    "approvedAt": "<ISO timestamp>",
    "approvalReference": "<source-thread approval reference>",
    "scope": "growth-vite-esm-runtime-cutover",
    "privacy": "bounded_no_secrets"
  }
}
```

Do not record raw prompts, private payloads, credentials, launch tokens, or
long logs as approval evidence.

## Deploy-Lane Routing Receipt Fields

After Owner approval and after the deploy-lane task card is actually sent,
record only summary routing fields in
`docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence.json`:

```json
{
  "deploy_lane_routing": {
    "status": "present",
    "taskCardId": "<deploy-lane task card id>",
    "cardKind": "plugin_deployment",
    "pluginId": "growth",
    "routeKind": "deployment",
    "deployReason": "growth-vite-esm-runtime-cutover",
    "target": "Home AI deploy lane pool",
    "returnCardRequired": true,
    "privacy": "bounded_no_secrets"
  }
}
```

This receipt records routing only. It is not production deployment evidence and
must not claim runtime enablement, production readback, or visual readback until
the deploy lane returns bounded completion evidence.

The deploy lane has returned bounded completion evidence:

- Deploy card: `ttc_e52ea380399fdd979a`.
- Completion return: `ttc_c323e186a8e6945a94`.
- Status request return: `ttc_1d2dddc18bb602b841`.
- Source ref deployed:
  `1b0e5d58a49b1c9b2c8b283673a25d52d358377d`.
- Source dirty status: `false`.
- Backup path:
  `/Users/hermes-host/HermesMobile/backups/deploy/20260706T125417Z-plugin-growth-growth-vite-esm-runtime-cutover`.
- Runtime marker: `data-growth-vite-runtime="enabled"`.
- Health URL: HTTP 200, plugin id `growth`.
- Vite manifest and built asset: HTTP 200.
- Visual checks: `embedded-plugin-shell --plugin-id growth` and
  `dark-growth-surfaces` both `ok=true`.
- Privacy: `bounded_no_secrets`.
