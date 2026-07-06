# Growth Vite Owner Cutover Evidence Packet

Last updated: 2026-07-06.

## Purpose

This packet is the local Owner-review baseline for the Growth Vite/ESM
migration. It summarizes the evidence required before the disabled Vite
runtime can be enabled and before any production deployment can be requested.

This document is not an approval record, a deploy request, or a runtime config
change. It must remain advisory until the external evidence listed below is
provided by the appropriate Owner, central visual, and deploy-lane channels.

## Current Local Readiness

Local internal readiness is complete through Phase 6 of
`docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md`.

The current local gates prove:

- the committed `public/index.html` keeps the legacy classic-script runtime
  active;
- the disabled Vite bootstrap loader is present and loaded last;
- no direct Vite module script is loaded before cutover;
- `data-growth-vite-runtime="enabled"` is absent;
- generated Vite assets remain ignored under `public/assets/growth/`;
- Vite/ESM syntax coverage includes the migrated frontend modules;
- frontend tests, Vite build validation, runtime-boundary validation,
  cutover-readiness validation, Owner-cutover preflight, phase audit,
  docs-locality, full check, full tests, and the central platform contract
  check pass locally.

The local preflight command currently reports:

```bash
node scripts/check-growth-vite-owner-cutover-preflight.js
```

Expected status after accepted central visual evidence and before Owner
approval/deploy routing:

- `ok=true`;
- `status=blocked_pending_external_owner_cutover_evidence`;
- `internalReadyForOwnerEvidence=true`;
- `readyForOwnerCutover=false`;
- `readyForRuntimeEnablement=false`;
- `configChangeApplied=false`;
- `runtimeConfigChange=false`;
- `advisoryOnly=true`.
- `presentExternalEvidence=["central_mobile_visual_evidence"]`;
- `missingExternalEvidence=["owner_cutover_approval","deploy_lane_routing"]`.

## Required External Evidence

These items must be present before runtime enablement:

| Evidence key | Required before | Required source |
| --- | --- | --- |
| `owner_cutover_approval` | runtime enablement | Owner approval in the source task thread or release authorization record |
| `central_mobile_visual_evidence` | runtime enablement | Central Home AI visual Harness evidence for the concrete Growth UI change |
| `deploy_lane_routing` | production update | Home AI deploy lane task card with source commit, restart label, and bounded readback |

The preflight reads the summary-only receipt in
`docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence.json`. Local
tests, generated assets, synthetic summaries, or handoff notes must not be used
to fabricate external signals.

## External Evidence Status

The following external evidence has been accepted into the local Owner cutover
receipt:

| Evidence key | Status | Tracking reference | Notes |
| --- | --- | --- | --- |
| `central_mobile_visual_evidence` | present | Request card `ttc_1ae511cb582afb18f4`; return card `ttc_663347c3a581e5ea9d`; Home AI Worker Lane A thread `019f1b7b-93bd-71c1-a0b9-5500bc7a1342` | Central iOS PWA visual preflight passed; `embedded-plugin-shell --plugin-id growth` passed; `dark-growth-surfaces` passed; no deploy, runtime enablement, or Growth workspace edits were performed by the visual worker. |

Accepted central visual commands:

```bash
npm run ios:pwa:visual -- --debug-url http://127.0.0.1:19073/ --preflight-only --json
npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/
npm run ios:pwa:visual -- --scenario dark-growth-surfaces --debug-url http://127.0.0.1:19073/
```

Accepted artifacts:

- `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260706T120356Z.png`
- `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260706T120432Z.png`

Remaining missing evidence:

| Evidence key | Status | Required source |
| --- | --- | --- |
| `owner_cutover_approval` | missing | Owner approval in the source task thread or release authorization record |
| `deploy_lane_routing` | missing | Home AI deploy lane task card with source commit, restart label, and bounded readback |

## Owner Review Questions

Owner review should answer:

1. Is the local Growth Vite/ESM migration scope acceptable as the runtime
   cutover baseline?
2. Is the central mobile visual evidence sufficient for this concrete Growth
   UI change?
3. Is runtime enablement authorized for a controlled deploy-lane request?
4. If deployment is approved, what source commit/ref, restart label, health
   URL, and bounded readback expectations should be used in the deploy card?

## Cutover Sequence

The cutover sequence must remain ordered:

1. Keep `public/index.html` in disabled-loader mode.
2. Run local validation:
   - `npm run --silent check:frontend`;
   - `npm run --silent check`;
   - `npm test -- --test-reporter=spec`;
   - `node scripts/check-growth-docs-locality.js`;
   - `node /Users/hermes-dev/HermesMobileDev/app/scripts/plugin-workspace-platform-contract-check.js --plugin growth --json`;
   - `git diff --check`.
3. Run Owner preflight:
   - `node scripts/check-growth-vite-owner-cutover-preflight.js`.
4. Confirm the accepted central Home AI mobile visual evidence remains current
   for the concrete Growth UI change.
5. Obtain explicit Owner approval.
6. Only after Owner approval, prepare the deploy-lane task card with source
   commit/ref, deploy reason, restart label, health URL, and bounded readback
   expectations.
7. Only after the deploy lane applies the approved runtime config change, run
   production readback and record the bounded result.

## Non-Goals

- Do not enable `data-growth-vite-runtime="enabled"` in this packet.
- Do not add a direct `<script type="module">` to `public/index.html` in this
  packet.
- Do not commit generated files under `public/assets/growth/`.
- Do not send a deploy card without explicit Owner approval.
- Do not treat local Vite build output as production deployment evidence.
- Do not record raw launch tokens, credentials, learner submissions, private
  payloads, raw deployment logs, or full prompts.
