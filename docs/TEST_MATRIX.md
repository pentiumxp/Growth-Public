# Growth Test Matrix

Last updated: 2026-06-17.

## Purpose

This is the Growth plugin local test-selection matrix. Use it after
`.agent-context/PROJECT_CONTEXT.md`, `.agent-context/HANDOFF.md`,
`docs/HOME_AI_PLATFORM_CONTRACT.md`, and `docs/GROWTH_DOCS_INDEX.md`.

The matrix is intentionally local to the Growth workspace. Home AI platform
visual, deployment, Action Inbox, and Web Push harnesses remain in the Home AI
app workspace and are referenced from the platform contract instead of copied
here.

## Baseline Gates

Run these for any non-trivial Growth behavior, persistence, route, release, or
documentation change:

| Gate | Command | Meaning |
| --- | --- | --- |
| Syntax and coverage registration | `npm run --silent check` | Every runtime JS file under `scripts`, `src`, and `public` is syntax-checked and registered in `scripts/check-growth-syntax-coverage.js`. |
| Docs locality | `node scripts/check-growth-docs-locality.js` | Growth-specific durable docs exist in this plugin workspace and avoid stale Home AI Growth doc pointers. |
| Whitespace | `git diff --check` | No trailing whitespace or patch format issues. |
| Full local suite | `npm test` | Full plugin-local Node test suite. |
| CodeGraph freshness | `codegraph status` after edits; `codegraph sync` when needed | Structural claims use the current indexed source. |

## Focused Harness Rows

Use the smallest row that covers the change, then widen when a touched contract
crosses rows.

| Change area | Focused harness | Smoke or operational check |
| --- | --- | --- |
| Plugin-owned SQLite store/runtime readback | `tests/growth-learning-sqlite-store.test.js`; add the focused store test when changing connection runtime settings such as `GROWTH_SQLITE_BUSY_TIMEOUT_MS` or integrity DTO fields. | `node --check src/stores/growth-learning-sqlite-store.js src/config/env.js src/app/services.js`; sequential release smoke readbacks remain local evidence only. |
| Card authoring, Gateway authoring, card generation, graph binding, target selection | `tests/learning-card-authoring-service.test.js`, `tests/learning-card-authoring-validation-service.test.js`, `tests/learning-card-generation-service.test.js`, `tests/learning-card-generation-recipe-policy-service.test.js`, `tests/learning-target-provisioning-service.test.js`, `tests/growth-planner-readiness-smoke-script.test.js`, `tests/growth-target-provisioning-smoke-script.test.js`, `tests/growth-card-authoring-boundary.test.js`, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js`; planner-readiness smoke top-level readback changes must assert `plannerReadiness*` fields mirror the nested planner readiness DTO, and target-provisioning smoke top-level readback changes must assert `targetProvisioning*` fields mirror the nested service DTO without adding writes, Gateway calls, publication, generation, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. | `npm run smoke:planner-readiness` when planner context or target readiness is involved; `npm run smoke:target-provisioning` for target/domain-pack scope readiness. |
| Learner submission, one-shot evaluation, reflection, audio playback, reward settlement | `tests/growth-learning-sqlite-audio.test.js`, `tests/growth-evaluation-service.test.js`, `tests/learning-card-evaluation-service.test.js`, `tests/learning-learner-cycle-service.test.js`, `tests/growth-learner-cycle-smoke-script.test.js`, `tests/growth-routes.test.js`; learner-cycle smoke top-level readback changes must assert `learnerCycle*` fields mirror the nested `growth.learningLearnerCycleSmoke.v1` DTO without adding writes, Gateway calls, publication, generation, evaluation semantics, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. | `npm run smoke:learner-cycle` defaults to audit-only; write operations require explicit `--allow-write`. |
| Evidence ledger, Profile V2, profile delta, recommendation lifecycle, loop state | `tests/learning-evidence-ledger-service.test.js`, `tests/learning-profile-v2-service.test.js`, `tests/learning-profile-delta-service.test.js`, `tests/learning-profile-feedback-evidence-service.test.js`, `tests/learning-loop-state-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, `tests/growth-recommendation-lifecycle-smoke-script.test.js`; loop-state smoke top-level readback changes must assert `learningLoopState*` fields mirror the nested `growth.learningLoopState.v1` DTO, cycle-history smoke top-level readback changes must assert `cycleHistory*` fields mirror the nested `growth.learningCycleHistory.v1` DTO, profile-feedback smoke top-level readback changes must assert `profileFeedback*` fields mirror the nested `growth.learningProfileFeedbackEvidence.v1` DTO, and recommendation-lifecycle smoke top-level readback changes must assert `recommendationLifecycle*` fields mirror the nested `growth.recommendationLifecycle.v1` DTO without adding writes, Gateway calls, publication, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. | `npm run smoke:profile-feedback`, `npm run smoke:learning-loop-state`, `npm run smoke:cycle-history`, `npm run smoke:recommendation-lifecycle`. |
| Owner daily loop, plan draft/publish, cycle audit, Owner correction | `tests/learning-daily-loop-service.test.js`, `tests/learning-plan-publisher-service.test.js`, `tests/learning-plan-audit-service.test.js`, `tests/learning-cycle-audit-service.test.js`, `tests/learning-owner-correction-service.test.js`, `tests/growth-daily-loop-preview-smoke-script.test.js`, `tests/growth-owner-audit-smoke-script.test.js`, `tests/growth-routes.test.js`; daily-loop preview and controlled daily-loop smoke top-level readback changes must assert `dailyLoop*` fields mirror nested preview/draft/publish DTOs, and Owner-audit smoke top-level readback changes must assert `ownerAudit*` fields mirror nested audit/readback DTOs without adding writes, Gateway calls, publication, evaluation, reward settlement, scheduler, notification, stage activation, or direct repository access. | `npm run smoke:daily-loop-preview`; `npm run smoke:daily-loop` writes only with explicit `--allow-write`; `npm run smoke:owner-audit` correction writes only with explicit `--allow-write`. |
| Stage checkpoint separation and controls | `tests/learning-stage-assessment-service.test.js`, `tests/learning-stage-checkpoint-controls-service.test.js`, `tests/growth-stage-assessment-smoke-script.test.js`, `tests/growth-stage-checkpoint-controls-smoke-script.test.js`, `tests/growth-routes.test.js`; stage-assessment smoke top-level readback changes must assert `stageAssessment*` fields mirror the nested readiness/activation/completion DTO without adding Gateway bypasses, plan publication, evaluation, automation, direct repository access, or learner-state mutation outside `learning-stage-assessment-service`; stage-checkpoint controls smoke top-level readback changes must assert `stageCheckpointControls*` fields mirror the nested `growth.stageCheckpointControls.v1` DTO without adding writes, Gateway calls, publication, generation, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or browser-side eligibility recomputation. | `npm run smoke:stage-assessment`, `npm run smoke:stage-checkpoint-controls`. |
| Automation proposal, digest, failure policy, action handoff | `tests/learning-automation-proposal-service.test.js`, `tests/learning-automation-digest-service.test.js`, `tests/learning-automation-failure-policy-service.test.js`, `tests/learning-automation-action-handoff-service.test.js`, matching smoke-script tests, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js`; proposal smoke top-level readback changes must assert `automationProposal*` fields mirror the nested proposal/list/create/review/publish DTOs without adding write permission, Gateway calls, direct plan publication, direct card generation, evaluation, scheduler execution/ticks, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI; digest smoke top-level readback changes must assert `automationDigest*` fields mirror nested list/get/create/review DTOs without adding write permission, scheduler execution, publication, notifications, action handoff, Gateway calls, or learner-state mutation; action-handoff smoke top-level readback changes must assert `automationActionHandoff*` fields mirror nested list/create/deliver DTOs without adding write permission, publication, evaluation, scheduler execution/ticks, Gateway calls, stage activation, learner-state mutation, or direct repository access from the CLI. | `npm run smoke:proposal`, `npm run smoke:digest`, `npm run smoke:failure-policy`, `npm run smoke:action-handoff`. |
| Scheduler dry-run, Owner-explicit execution, scheduler run, worker target, worker lease | `tests/learning-automation-scheduler-service.test.js`, `tests/learning-automation-scheduler-execution-service.test.js`, `tests/learning-automation-scheduler-run-service.test.js`, `tests/learning-automation-scheduler-worker-target-service.test.js`, `tests/learning-automation-scheduler-worker-service.test.js`, matching smoke-script tests, `tests/growth-architecture-boundary.test.js`; scheduler-execution smoke top-level readback changes must assert `automationSchedulerExecution*` fields mirror nested list/execute DTOs, including the default-disabled blocked audit row, without adding write permission, Gateway calls, publication bypasses, scheduler dry-run bypasses, scheduler ticks, action-handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI; scheduler-run smoke top-level readback changes must assert `automationSchedulerRun*` fields mirror nested list/run DTOs, including the default-disabled blocked run audit row and no-direct flags, without adding write permission, Gateway calls, publication, scheduler dry-run bypasses, scheduler execution bypasses, action-handoff delivery, worker timers, stage activation, learner-state mutation, or direct repository access from the CLI; worker-target smoke top-level readback changes must assert `automationSchedulerWorkerTarget*` fields mirror nested list/runnable/create/review DTOs, including target provisioning, Owner review, runnable target ids, and `productionSchedulingAllowed=false`, without adding worker timers, scheduler run/execution bypasses, action-handoff delivery, Gateway calls, publication, stage activation, learner-state mutation, or direct repository access from the CLI; worker smoke top-level readback changes must assert `automationSchedulerWorker*` fields mirror disabled status and tick/tick-targets DTOs without exposing lease tokens or adding worker enablement, Gateway calls, publication, scheduler bypasses, action-handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI. | `npm run smoke:scheduler-dry-run`, `npm run smoke:scheduler-execution`, `npm run smoke:scheduler-run`, `npm run smoke:scheduler-worker-target`, `npm run smoke:scheduler-worker`. |
| Release readiness, release evidence, release approvals, platform action, central visual, UI evidence | `tests/learning-automation-release-readiness-service.test.js`, `tests/learning-automation-release-evidence-service.test.js`, `tests/learning-automation-release-approval-service.test.js`, `tests/learning-automation-platform-action-evidence-service.test.js`, `tests/learning-automation-central-visual-evidence-service.test.js`, `tests/learning-automation-ui-evidence-service.test.js`, `tests/growth-automation-release-evidence-smoke-script.test.js`, matching smoke-script tests, `tests/growth-architecture-boundary.test.js` | `npm run smoke:release-readiness`, `npm run smoke:release-evidence`, `npm run smoke:release-approval`, `npm run smoke:platform-action-evidence`, `npm run smoke:central-visual-evidence`, `npm run smoke:ui-evidence`. |
| Release package, evidence collection, decision, review, authorization, closure, activation, runtime enablement, controls, inventory, dashboard, workbench, workbench action/audit, preflight, artifact-template | `npm run test:release-union`; add `tests/learning-automation-release-evidence-artifact-template-service.test.js` and `tests/growth-release-artifact-template-smoke-script.test.js` when artifact-template/readback fields change; package smoke readback changes are covered by `tests/growth-release-package-script.test.js`; action wrapper/audit changes are covered by `tests/learning-automation-release-workbench-action-service.test.js`, `tests/learning-automation-release-workbench-action-repository.test.js`, `tests/growth-release-workbench-action-smoke-script.test.js`, and `tests/growth-routes.test.js` so write-then-list audit readback stays service-first; collection action semantics and collection smoke readback changes must cover both partial-success evidence-record writes and no-record blocked failures through `tests/growth-release-evidence-collection-smoke-script.test.js`. | Matching smoke scripts: `smoke:release-package`, `smoke:release-evidence-collection`, `smoke:release-decision`, `smoke:release-review`, `smoke:release-authorization`, `smoke:release-closure`, `smoke:release-activation`, `smoke:runtime-enablement`, `smoke:release-controls`, `smoke:release-inventory`, `smoke:release-dashboard`, `smoke:release-workbench`, `smoke:release-workbench-action`, `smoke:release-preflight`, `smoke:release-artifact-template`. |
| Embedded plugin UI adapter or learner UI behavior | `tests/growth-frontend-adapter.test.js`, `tests/growth-embedded-layout.test.js`, `tests/growth-routes.test.js` | Run Home AI central embedded-plugin visual harness before production UI release. |
| Docs-only Growth contract change | `tests/growth-docs-locality.test.js` plus `node scripts/check-growth-docs-locality.js` | No production or runtime evidence is implied. |

When changing persisted release-evidence bag fields consumed by
release-readiness, run both
`tests/learning-automation-release-evidence-service.test.js` and
`tests/learning-automation-release-readiness-service.test.js`. The focused
assertion must prove pass records keep `summaryOnly`, `privacyClass`,
`schemaVersion`, `evidenceKey`, and `checkKey` in the bag projection.

When changing release-workbench Owner action route bodies, run
`tests/learning-automation-release-workbench-service.test.js`,
`tests/growth-release-workbench-smoke-script.test.js`, and
`tests/learning-automation-release-workbench-action-service.test.js`. The
focused assertion must prove collection-owned evidence keys are routed through
`release_evidence_collection` instead of concrete direct pass
`release_evidence` actions, artifact-backed collection tasks advertise
`requiresPreparation` plus the artifact-template read route, and generic
record-route templates do not become browser-filled pass evidence shortcuts.
For readiness state prerequisites such as reviewed digest, active failure
policy, delivered action handoff, and reviewed enabled worker target, the
focused assertion must prove they are projected as
`releaseStatePrerequisiteActions`, not as
`unsupportedReleaseEvidenceCollectionKeys`, not as collection task ids, and not
as direct pass release evidence.

When changing release artifact-template checklist or action-plan fields, run
`tests/learning-automation-release-evidence-artifact-template-service.test.js`
and `tests/growth-release-artifact-template-smoke-script.test.js`. The focused
assertion must prove artifact-backed tasks remain behind the manifest template,
state prerequisites are counted as `release_state_prerequisite`, and truly
unknown manual evidence remains under unsupported/manual evidence. It must also
prove phase gating: downstream approval/record actions are visible but not
submittable while artifact, collection, write-gated, state, or unsupported
evidence prerequisites remain; once evidence prerequisites clear, approvals can
become the next submittable action while records remain approval-blocked.
When changing release-package, release-decision, release-review, release-authorization, release-readiness, release-controls, release-closure,
release-activation, runtime-enablement, release-evidence-collection,
release-inventory, release-dashboard, workbench, release-preflight, or
artifact-template smoke CLI
top-level readback projection fields, run the matching smoke-script test:
`tests/growth-release-package-script.test.js`,
`tests/growth-release-decision-smoke-script.test.js`,
`tests/growth-release-review-smoke-script.test.js`,
`tests/growth-release-authorization-smoke-script.test.js`,
`tests/growth-release-readiness-smoke-script.test.js`,
`tests/growth-release-controls-smoke-script.test.js`,
`tests/growth-release-closure-smoke-script.test.js`,
`tests/growth-release-activation-smoke-script.test.js`,
`tests/growth-runtime-enablement-smoke-script.test.js`,
`tests/growth-release-evidence-collection-smoke-script.test.js`,
`tests/growth-release-inventory-smoke-script.test.js`,
`tests/growth-release-dashboard-smoke-script.test.js`,
`tests/growth-release-workbench-smoke-script.test.js`,
`tests/growth-release-preflight-smoke-script.test.js`, and/or
`tests/growth-release-artifact-template-smoke-script.test.js`. The focused
assertion must prove top-level operator fields mirror the nested service DTO
without adding writes, runtime-config mutation, Gateway calls, or raw artifact
paths.

When changing `release_evidence_collection` workbench action success/failure
semantics, run `tests/learning-automation-release-workbench-action-service.test.js`
and `tests/growth-release-workbench-action-smoke-script.test.js`. The focused
assertion must prove collections that wrote or deduped release-evidence records
can complete the wrapper action, while collections blocked before any
release-evidence record produce a visible blocked action plus bounded audit
readback.

## Release Union Harness

`npm run test:release-union` runs the release readback and gate chain that is
too long to keep copying into handoffs. Use it when a change touches release
package, release evidence, release review, authorization, closure, controls,
dashboard, inventory, workbench, preflight, activation, or runtime enablement
readbacks.

This command is still local evidence only. It does not replace real Home AI
platform Action Inbox/Web Push evidence, central visual artifacts, production
smoke output, explicit release approvals, or deployment checks.
