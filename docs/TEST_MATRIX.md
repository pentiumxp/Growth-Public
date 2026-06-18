# Growth Test Matrix

Last updated: 2026-06-18.

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
| Docs locality | `node scripts/check-growth-docs-locality.js` | Growth-specific durable docs exist in this plugin workspace, avoid stale Home AI Growth doc pointers, and reference only existing local `tests/*.test.js` Harness files from the core Harness docs. |
| Whitespace | `git diff --check` | No trailing whitespace or patch format issues. |
| Full local suite | `npm test` | Full plugin-local Node test suite. |
| CodeGraph freshness | `codegraph status` after edits; `codegraph sync` when needed | Structural claims use the current indexed source. |

## Central Visual Gate

Growth does not own the Home AI Appium/live-debug visual toolchain. For any
mobile layout, embedded-shell, dark-mode, or production UI-release claim, run
the central Home AI harness from `/Users/hermes-dev/HermesMobileDev/app`.

For local dev validation of the current Growth workspace, start Growth on a
non-production port with a dev registration-key path, point Home AI dev at that
manifest through `HERMES_MOBILE_GROWTH_PLUGIN_MANIFEST_URL`, and provision the
workspace through the Home AI grant route. Do not hand-edit authorization JSON
or copy raw keys into docs. The current local reference topology is Growth
`127.0.0.1:14881`, Home AI `18797`, and iOS live-debug `19073`.

Latest local central visual evidence for this package:

| Scenario | Result | Artifact |
| --- | --- | --- |
| `embedded-plugin-shell --plugin-id growth` | `ok=true` | `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260617T223324Z.png` |
| `dark-growth-surfaces` | `ok=true` | `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260617T223337Z.png` |

These artifacts prove local shell loading, mobile framing, and Growth dark
surface contrast/token assertions. They do not prove production deployment,
production Gateway, release approval, scheduler permission, or persisted release
evidence.

## Release UI Evidence Artifact Builder Gate

Growth can adapt one Home AI central visual summary into release UI evidence
artifact files, but it still does not own the visual toolchain. Use this only
after the Home AI central visual report already exists:

```bash
npm run build:release-ui-evidence-artifacts -- \
  --central-visual-evidence-file <home-ai-central-visual-summary.json> \
  --output-dir <tmp-output-dir> \
  --json

npm run smoke:release-evidence-collection -- \
  --workspace-id weixin_stephen \
  --learner-id weixin_stephen \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --task owner_daily_ui \
  --task owner_audit_ui \
  --task proposal_review_ui \
  --task release_package_review_ui \
  --task automation_digest_ui \
  --task automation_action_handoff_ui \
  --task scheduler_execution_ui \
  --task scheduler_run_ui \
  --task scheduler_worker_target_ui \
  --required-task owner_daily_ui \
  --required-task owner_audit_ui \
  --required-task proposal_review_ui \
  --required-task release_package_review_ui \
  --required-task automation_digest_ui \
  --required-task automation_action_handoff_ui \
  --required-task scheduler_execution_ui \
  --required-task scheduler_run_ui \
  --required-task scheduler_worker_target_ui \
  --release-evidence-artifact-manifest-file <manifest.json> \
  --json
```

Focused coverage is
`tests/growth-release-ui-evidence-artifacts-script.test.js`,
`tests/growth-ui-evidence-smoke-script.test.js`, and
`tests/learning-automation-ui-evidence-service.test.js`. The builder must emit
nine validator-ready `growth.learningAutomationReleaseUiEvidenceArtifact.v1`
files and one manifest. Public artifact JSON must store only screenshot
presence, artifact basename, bytes, marker coverage, assertions, and boundary
flags. The manifest may carry transient local file paths only so the collection
CLI can read the files. The builder must not run Home AI visual tooling, call
Gateway, persist release evidence, approve release state, mutate runtime
config, grant scheduler permission, deploy, publish cards, evaluate learner
work, or mutate learner state.

## Production Deployment Health Gate

Growth owns only the summary evidence collector and validator for production
deployment health. Home AI still owns deployment and service restart. Use:

```bash
npm run collect:production-deployment-evidence -- \
  --output-file /tmp/growth-production-health-evidence/growth-production-deployment-health-YYYYMMDD.json \
  --json

npm run smoke:production-deployment-evidence -- \
  --workspace-id weixin_stephen \
  --learner-id weixin_stephen \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --production-deployment-evidence-file /tmp/growth-production-health-evidence/growth-production-deployment-health-YYYYMMDD.json \
  --json
```

The collector must remain read-only and summary-only: it may parse launchd
state, the public plugin manifest, and the public Growth status endpoint; it
must not echo raw launchd output, raw environment, credentials, private paths,
deployment logs, stdout/stderr logs, or raw service payloads. It must not
deploy, restart, mutate runtime config, grant scheduler permission, call
Gateway, publish cards, or mutate learner state.

To persist accepted evidence under the current release scope, run release
evidence collection with `--task production_deployment_health`,
`--required-task production_deployment_health`, the evidence file, and the
explicit collection write flags. This writes only summary release evidence
records; it does not make the release ready by itself.

Latest real readback for `weixin_stephen/science/daily_plan`: collection run
`lgacrn_e8307dddd7c9db67e4`, evidence record
`lgarev_dc8adeef1ae47200ff`, release-readiness `passCheckCount=30`,
`missingRequiredCount=17`, and persisted key
`productionDeploymentHealthEvidence=true`.

## Focused Harness Rows

Use the smallest row that covers the change, then widen when a touched contract
crosses rows.

| Change area | Focused harness | Smoke or operational check |
| --- | --- | --- |
| Plugin-owned SQLite store/runtime readback | `tests/growth-learning-sqlite-store.test.js`; add the focused store test when changing connection runtime settings such as `GROWTH_SQLITE_BUSY_TIMEOUT_MS` or integrity DTO fields. | `node --check src/stores/growth-learning-sqlite-store.js src/config/env.js src/app/services.js`; sequential release smoke readbacks remain local evidence only. |
| Card authoring, Gateway authoring, card generation, graph binding, target selection | `tests/learning-card-authoring-service.test.js`, `tests/learning-card-authoring-validation-service.test.js`, `tests/learning-card-generation-service.test.js`, `tests/learning-card-generation-context-service.test.js`, `tests/learning-card-generation-recipe-policy-service.test.js`, `tests/learning-card-rubric-policy-service.test.js`, `tests/learning-target-provisioning-service.test.js`, `tests/growth-planner-readiness-smoke-script.test.js`, `tests/growth-target-provisioning-smoke-script.test.js`, `tests/growth-card-authoring-boundary.test.js`, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js`; generation-context changes must prove recipe defaults are applied before target provisioning and graph suggestion, rubric policy changes must prove subject-aware dimension ids and evidence mappings stay summary-only and are passed through generation without bypassing graph planning or authoring validation, formal stage-assessment rubric changes must also prove `stage_assessment` resolves before daily subject fallback and reaches Gateway authoring plus persisted card `raw_json`, subject-catalog changes must also prove at least one non-English/non-science subject passes through generation and evaluation with the expected rubric dimension ids, plan-publisher changes must prove selected recipes propagate into card generation, Gateway planner/authoring/evaluation HTTP failure changes must prove fetch-like 4xx/5xx Responses objects normalize to bounded `gateway_http_error`, status, and gateway error code/type without raw response bodies or provider messages, planner-readiness smoke top-level readback changes must assert `plannerReadiness*` fields mirror the nested planner readiness DTO including bounded Gateway failure fields, and target-provisioning smoke top-level readback changes must assert `targetProvisioning*` fields mirror the nested service DTO without adding writes, Gateway calls, publication, generation, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. | `npm run smoke:planner-readiness` when planner context or target readiness is involved; `npm run smoke:target-provisioning` for target/domain-pack scope readiness. |
| Learner submission, one-shot evaluation, reflection, audio playback, reward settlement | `tests/growth-learning-sqlite-audio.test.js`, `tests/growth-evaluation-service.test.js`, `tests/learning-card-evaluation-service.test.js`, `tests/learning-learner-cycle-service.test.js`, `tests/growth-learner-cycle-smoke-script.test.js`, `tests/growth-routes.test.js`, `tests/learning-card-ai-loop-harness.test.js`, `tests/growth-learning-sqlite-evidence-writes.test.js`, and `tests/growth-learning-sqlite-store.test.js`; learner-cycle smoke top-level readback changes must assert `learnerCycle*` fields mirror the nested `growth.learningLearnerCycleSmoke.v1` DTO, including formal stage-assessment completion/cooldown readback from evaluation results, without adding writes, Gateway calls, publication, generation, evaluation semantics, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. The AI-loop harness must prove one Fanfan science card generated through daily-loop advance is visible in board/detail, completes through one submit/evaluate/reflect cycle, and rejects second daily submission/reflection attempts; it must also prove the same one-shot learner cycle holds for a non-sample explicit-provision learner generated through daily-loop advance without Fanfan row leakage. It must also prove formal stage assessment cards can be activated by Owner, surface in board/detail, complete through one submit/evaluate/reflect cycle, reject second formal submission/reflection attempts, pass formal rubric policy into evaluation, write high-weight rubric-bearing mastery evidence, and move the assessment cycle into cooldown. SQLite store coverage must prove formal cards project `reflection_required` after evaluation until the one formal reflection is submitted. | `npm run smoke:learner-cycle` defaults to audit-only; write operations require explicit `--allow-write`. |
| Evidence ledger, Profile V2, profile delta, Owner review signal, recommendation lifecycle, loop state | `tests/learning-evidence-ledger-service.test.js`, `tests/learning-card-rubric-policy-service.test.js`, `tests/learning-evidence-audit-service.test.js`, `tests/learning-cycle-audit-service.test.js`, `tests/learning-profile-v2-service.test.js`, `tests/learning-profile-delta-service.test.js`, `tests/learning-owner-review-signal-service.test.js`, `tests/learning-profile-feedback-evidence-service.test.js`, `tests/learning-loop-state-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, `tests/growth-recommendation-lifecycle-smoke-script.test.js`; Owner review signal changes must prove summary-only readback over persisted audit-review rows, no Owner notes/raw learner/model content, no write path, no Gateway, and no profile/evidence mutation. Rubric/evidence mapping changes must prove ledger `summary_json` stores only bounded rubric summaries, evidence audit and cycle audit project rubric policy/dimension/weak-stable summaries without raw payloads, Profile V2 carries rubric dimension coverage into capability states, and profile feedback summarizes rubric evidence counts for the next-loop readiness check. Loop-state smoke top-level readback changes must assert `learningLoopState*` fields mirror the nested `growth.learningLoopState.v1` DTO, including Owner review status/decision/count/follow-up fields, active stage-checkpoint status/cycle/task-card, and cooldown reason/readback. Active stage-checkpoint readback is capability-scoped: callers and harnesses must pass `capabilityClusterId` plus `assessmentCoverageNodeIds` when verifying the same checkpoint that was activated. Owner UI/client changes that surface `stage_checkpoint_active` must prove the query forwards those selectors and the panel opens the existing formal task card instead of recomputing eligibility or generating a replacement card. Cycle-history smoke top-level readback changes must assert `cycleHistory*` fields mirror the nested `growth.learningCycleHistory.v1` DTO, profile-feedback smoke top-level readback changes must assert `profileFeedback*` fields mirror the nested `growth.learningProfileFeedbackEvidence.v1` DTO including non-required Owner review summaries, and recommendation-lifecycle smoke top-level readback changes must assert `recommendationLifecycle*` fields mirror the nested `growth.recommendationLifecycle.v1` DTO without adding writes, Gateway calls, publication, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. | `npm run smoke:profile-feedback`, `npm run smoke:learning-loop-state`, `npm run smoke:cycle-history`, `npm run smoke:recommendation-lifecycle`. |
| Growth plugin reference contract | `tests/learning-reference-contract-service.test.js`, `tests/growth-reference-contract-smoke-script.test.js`, `tests/growth-mcp-schemas.test.js`, `tests/growth-mcp-wrapper.test.js`, `tests/growth-routes.test.js`, `tests/growth-frontend-adapter.test.js`, and `tests/growth-architecture-boundary.test.js`; reference changes are H1 when they alter API/MCP/object-type behavior because they affect future Reference / Memory Graph composition. UI-only consumption changes remain in the embedded UI row unless they alter the reference API/MCP/object-type contract. The focused assertion must prove `reference_object_types`, `reference_get`, and `reference_summarize` stay Growth-service owned, visible-target scoped, workspace-bound for MCP, and summary-only for programs, task cards, submissions, evaluations, reflections, mastery profiles, learning graph plans, plan drafts, and completed-cycle `profile_feedback` readbacks. `profile_feedback` references must delegate to `learning-profile-feedback-evidence-service.evaluate()` and keep only readiness/count/reward/recommendation/next-action summaries, not raw ledger/profile/reward records. Owner Reference Chain UI coverage must prove the browser calls only object-types and summary routes, constructs reference requests from existing summary DTO ids, renders partial failures visibly, includes selected-cycle profile-feedback when a completed-cycle task/evaluation id exists, and does not fabricate references or include raw learner answers/reflections, transcripts, raw prompts, hidden answers, full instruction bodies, full `teachingFlow`, full plan JSON, provider config, private paths, credentials, or tokens. It must also prove routes and smoke scripts do not inspect SQLite directly. | `npm run smoke:references` defaults to read-only `object-types`; `get` and `summarize` are read-only and require `--workspace-id`, `--object-type`, and `--object-id`. |
| Owner daily loop, plan draft/advance/publish, cycle audit, Owner correction | `tests/learning-daily-loop-service.test.js`, `tests/learning-plan-publisher-service.test.js`, `tests/learning-plan-audit-service.test.js`, `tests/learning-cycle-audit-service.test.js`, `tests/learning-owner-correction-service.test.js`, `tests/growth-daily-loop-preview-smoke-script.test.js`, `tests/growth-daily-loop-smoke-script.test.js`, `tests/growth-owner-audit-smoke-script.test.js`, `tests/growth-routes.test.js`, `tests/growth-frontend-adapter.test.js`, `tests/learning-card-ai-loop-harness.test.js`; daily-loop preview and controlled daily-loop smoke top-level readback changes must assert `dailyLoop*` fields mirror nested preview/draft/advance/publish DTOs, Owner `advance` changes must prove service-level draft-then-publish delegation plus Owner-only route/API/UI/smoke wiring, service-side context-scope hydration before publication, publish-stage reuse of draft target `displayName`/`label` for sample target provisioning, recipe propagation into card generation, board/detail visibility for the generated card, and no browser-side state recomputation. Non-sample target changes must prove explicit provision, same recipe/context path, target-workspace-owned rows, next loop-state, and profile-feedback evidence instead of using Fanfan sample fallback. Recipe-switching UI changes must prove context refresh uses `recipeId` without stale graph selectors, and Owner-audit smoke top-level readback changes must assert `ownerAudit*` fields mirror nested audit/readback DTOs without adding writes, Gateway calls, publication, evaluation, reward settlement, scheduler, notification, stage activation, or direct repository access. | `npm run smoke:daily-loop-preview`; `npm run smoke:daily-loop` writes only with explicit `--allow-write`; `npm run smoke:owner-audit` correction writes only with explicit `--allow-write`. |
| Owner audit review closure | `tests/learning-owner-audit-review-repository.test.js`, `tests/learning-owner-audit-review-service.test.js`, `tests/learning-owner-review-signal-service.test.js`, `tests/growth-owner-audit-review-smoke-script.test.js`, `tests/learning-planner-context-service.test.js`, `tests/learning-profile-feedback-evidence-service.test.js`, `tests/learning-loop-state-service.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, `tests/learning-automation-release-evidence-task-registry.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, `tests/learning-automation-release-readiness-service.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/learning-automation-release-evidence-service.test.js`, `tests/growth-routes.test.js`, `tests/growth-frontend-adapter.test.js`, and `tests/growth-architecture-boundary.test.js`; review changes are H1 when they alter the Owner-only `POST /api/v1/growth/owner-audit/reviews` write boundary or summary-only `learning_growth_owner_audit_reviews` schema, and H2 when they alter readback signal/projection or embedded UI consumption only. Coverage must prove profile-feedback delegation before record, completed-cycle selector or explicit auto-select requirement, `correction_recorded` correction-id requirement, visible-target scoped list route, Owner-only write route, CLI `--allow-write` gate, blocked-dependency review semantics, embedded Owner UI direct/proxy list and record API helpers, selected-cycle payload construction, visible record/progress/error states, correction-id gated `correction_recorded` controls, read-only signal projection into planner context/profile feedback/loop-state evidence, default release-bundle `owner_audit_review` collection into `productionOwnerAuditReviewSmokeEvidence`, release-readiness key `production_owner_audit_review_smoke_evidence` with bounded review-summary validation, canonical persisted release evidence key mapping, privacy rejection, and no Gateway, card generation, evaluation, evidence-ledger write, scheduler, notification, stage activation, browser-side profile-feedback computation, or learner-state mutation outside the review row. | `npm run smoke:owner-audit-review` defaults to read-only list/history; `--operation record --allow-write` is required for writing one review row. |
| Owner operating-loop execution facade | `tests/learning-operating-loop-run-repository.test.js`, `tests/learning-operating-loop-service.test.js`, `tests/growth-operating-loop-smoke-script.test.js`, `tests/growth-routes.test.js`, `tests/growth-frontend-adapter.test.js`, `tests/growth-architecture-boundary.test.js`; operating-loop smoke top-level readback changes must assert `operatingLoop*` fields mirror the nested `growth.learningOperatingLoop.v1` execution DTO and `growth.learningOperatingLoopRuns.v1` history DTO without adding writes in `recommend` or `runs` / `list-runs`, without allowing `run-next` / `advance` unless `--allow-write` is present, and without formal checkpoint activation unless explicit Owner stage confirmation is present. Repository/service coverage must prove summary-only run-audit persistence, privacy fail-closed behavior before persistence, history readback through the service boundary, only-current-`nextAction` execution, daily actions delegating to `learning-daily-loop-service`, stage assessment activation delegating to `learning-stage-assessment-service`, and learner/audit/provision/graph/config actions returning visible blocked separate-flow states. Browser coverage must prove direct and Home AI proxy API client paths for `GET /api/v1/growth/learning-loop/runs` and `POST /api/v1/growth/learning-loop/advance`, `闭环执行` panel rendering, the primary Owner `生成卡片` button using the same `learning-loop/advance` facade instead of direct `daily-loop/advance`, run-next payload construction from service DTO selectors, visible progress/error/readback state, generated-card id handoff to the existing preview/open-card path, non-daily next-action blocking into dedicated panels, and no raw prompt/transcript/private field leakage. | `npm run smoke:operating-loop` defaults to no-write; `runs` / `list-runs` / `history` are no-write readbacks; `run-next` / `advance` require `--allow-write`, and formal checkpoint activation also requires `--allow-stage-activation` or `--confirm-stage-assessment`. |
| Stage checkpoint separation and controls | `tests/learning-stage-assessment-service.test.js`, `tests/learning-stage-checkpoint-controls-service.test.js`, `tests/growth-stage-assessment-smoke-script.test.js`, `tests/growth-stage-checkpoint-controls-smoke-script.test.js`, `tests/growth-routes.test.js`; stage-assessment smoke top-level readback changes must assert `stageAssessment*` fields mirror the nested readiness/activation/completion DTO without adding Gateway bypasses, plan publication, evaluation, automation, direct repository access, or learner-state mutation outside `learning-stage-assessment-service`; activation changes must prove target domain-pack/domain/subject scope and formal rubric policy are forwarded through the delegated card-generation request; stage-checkpoint controls smoke top-level readback changes must assert `stageCheckpointControls*` fields mirror the nested `growth.stageCheckpointControls.v1` DTO, including bounded formal rubric policy id/dimension/evidence-key readback when present, without adding writes, Gateway calls, publication, generation, evaluation, reward settlement, scheduler, notification, stage activation, direct repository access, or browser-side eligibility/rubric recomputation. | `npm run smoke:stage-assessment`, `npm run smoke:stage-checkpoint-controls`. |
| Automation proposal, digest, failure policy, action handoff | `tests/learning-automation-proposal-service.test.js`, `tests/learning-automation-digest-service.test.js`, `tests/learning-automation-failure-policy-service.test.js`, `tests/learning-automation-action-handoff-service.test.js`, matching smoke-script tests, `tests/growth-routes.test.js`, `tests/growth-frontend-adapter.test.js`, `tests/growth-architecture-boundary.test.js`; proposal smoke top-level readback changes must assert `automationProposal*` fields mirror the nested proposal/list/create/review/publish DTOs without adding write permission, Gateway calls, direct plan publication, direct card generation, evaluation, scheduler execution/ticks, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI; proposal service changes must also cover the explicit existing-draft path (`existingPlanDraftId` / `--existing-plan-draft-id`) proving it loads only through `learning-plan-publisher-service.getPlanDraft`, rejects already published drafts, rechecks target provisioning from the selected item, does not call `draftPlan`, and does not treat that path as planner-readiness evidence. Owner proposal UI changes must prove terminal `accepted`/`skipped`/`expired`/`superseded` controls, visible blocked-action feedback for non-proposed/non-publishable rows, and refresh of proposal, digest, failure-policy, action-handoff, scheduler execution/run, worker-target, and release-workbench readbacks after proposal create/review/publish. Digest smoke top-level readback changes must assert `automationDigest*` fields mirror nested list/get/create/review DTOs without adding write permission, scheduler execution, publication, notifications, action handoff, Gateway calls, or learner-state mutation; Owner failure-policy UI changes must prove direct/proxy list and readiness helpers, summary-only create/review payloads, ready/draft/active readback, visible create/review/error states, downstream action-handoff/scheduler/release refresh after policy writes, `writefulSchedulingAllowed=false`, `maxAutomaticRetries=0`, and no browser-side scheduler permission; failure-policy smoke top-level readback changes must assert `automationFailurePolicy*` fields mirror nested readiness/list/create/review DTOs without adding write permission, Gateway calls, publication, evaluation, scheduler execution/ticks, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI; action-handoff smoke top-level readback changes must assert `automationActionHandoff*` fields mirror nested list/create/deliver DTOs without adding write permission, publication, evaluation, scheduler execution/ticks, Gateway calls, stage activation, learner-state mutation, or direct repository access from the CLI. | `npm run smoke:proposal`, `npm run smoke:digest`, `npm run smoke:failure-policy`, `npm run smoke:action-handoff`. |
| Scheduler dry-run, Owner-explicit execution, scheduler run, worker target, worker lease | `tests/learning-automation-scheduler-service.test.js`, `tests/learning-automation-scheduler-execution-service.test.js`, `tests/learning-automation-scheduler-run-service.test.js`, `tests/learning-automation-scheduler-worker-target-service.test.js`, `tests/learning-automation-scheduler-worker-service.test.js`, matching smoke-script tests, `tests/growth-architecture-boundary.test.js`; scheduler-dry-run smoke top-level readback changes must assert `schedulerDryRun*` fields mirror the nested dry-run DTO without adding write permission, Gateway calls, publication, scheduler execution/ticks, action-handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI; scheduler-execution smoke top-level readback changes must assert `automationSchedulerExecution*` fields mirror nested list/execute DTOs, including the default-disabled blocked audit row, without adding write permission, Gateway calls, publication bypasses, scheduler dry-run bypasses, scheduler ticks, action-handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI; scheduler-run smoke top-level readback changes must assert `automationSchedulerRun*` fields mirror nested list/run DTOs, including the default-disabled blocked run audit row and no-direct flags, without adding write permission, Gateway calls, publication, scheduler dry-run bypasses, scheduler execution bypasses, action-handoff delivery, worker timers, stage activation, learner-state mutation, or direct repository access from the CLI; worker-target smoke top-level readback changes must assert `automationSchedulerWorkerTarget*` fields mirror nested list/runnable/create/review DTOs, including target provisioning, Owner review, runnable target ids, and `productionSchedulingAllowed=false`, without adding worker timers, scheduler run/execution bypasses, action-handoff delivery, Gateway calls, publication, stage activation, learner-state mutation, or direct repository access from the CLI; worker smoke top-level readback changes must assert `automationSchedulerWorker*` fields mirror disabled status and tick/tick-targets DTOs without exposing lease tokens or adding worker enablement, Gateway calls, publication, scheduler bypasses, action-handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI. | `npm run smoke:scheduler-dry-run`, `npm run smoke:scheduler-execution`, `npm run smoke:scheduler-run`, `npm run smoke:scheduler-worker-target`, `npm run smoke:scheduler-worker`. |
| Release readiness, release evidence, release approvals, platform action, central visual, UI evidence | `tests/learning-automation-release-readiness-service.test.js`, `tests/learning-automation-release-evidence-service.test.js`, `tests/learning-automation-release-approval-service.test.js`, `tests/learning-automation-platform-action-evidence-service.test.js`, `tests/learning-automation-central-visual-evidence-service.test.js`, `tests/learning-automation-production-deployment-evidence-service.test.js`, `tests/growth-production-deployment-evidence-collector.test.js`, `tests/learning-automation-ui-evidence-service.test.js`, `tests/learning-automation-owner-review-evidence-service.test.js`, `tests/growth-automation-owner-review-evidence-smoke-script.test.js`, `tests/growth-automation-release-approval-smoke-script.test.js`, `tests/growth-automation-release-evidence-smoke-script.test.js`, `tests/growth-home-ai-proxy-smoke-script.test.js`, matching smoke-script tests, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js`; platform-action evidence route/smoke readback changes must assert the public DTO mirrors the nested summary DTO without adding writes, Gateway calls, publication, scheduler execution/ticks, handoff delivery, platform notification delivery, runtime config mutation, learner-state mutation, Home AI Action Inbox/Web Push internals access, release permission, scheduler permission, or direct repository access from the route/CLI; planner-readiness proxy-route changes must assert Owner-only visible-target access and delegation to `learningPlanOrchestratorService.smokePlannerReadiness()` without exposing plugin bearer credentials; Home AI proxy smoke changes must assert proxy URL/header/body construction, default write rejection, bounded top-level projection, and absence of raw access keys or key-file paths in output. Production-deployment evidence route/smoke/read-only collector changes must assert the public DTO or `productionDeploymentEvidence*` fields mirror the nested summary DTO without adding writes, Gateway calls, deploy/restart commands, runtime config mutation, scheduler permission, learner-state mutation, raw local artifact paths, raw launchd output, raw environment, server-local artifact file reads from HTTP, or direct repository access from the route/CLI; central-visual evidence route/smoke readback changes must assert the public DTO or `centralVisualEvidence*` fields mirror the nested summary DTO without adding writes, Gateway calls, publication, scheduler execution/ticks, visual tooling execution, release-evidence persistence, runtime config mutation, learner-state mutation, raw local artifact paths, Home AI visual internals access, or direct repository access from the route/CLI. Central visual artifact-shape changes must also cover object-shaped `screenshot.path`, nested `metrics.clientVersion`, checked-at fallback, lane summaries, and absence of `"[object Object]"` or raw local paths. UI evidence route/smoke readback changes must assert the public DTO or `uiEvidence*` fields mirror the nested summary DTO without adding writes, Gateway calls, publication, scheduler execution/ticks, visual tooling execution, release-evidence persistence, runtime config mutation, learner-state mutation, raw local artifact paths, server-local artifact file reads from HTTP, or direct repository access from the route/CLI; owner-review-evidence smoke top-level readback changes must assert `automationOwnerReviewEvidence*` fields mirror the nested summary DTO without adding writes, Gateway calls, publication, scheduler execution/ticks, handoff delivery, stage activation, runtime config mutation, learner-state mutation, or direct repository access from the CLI; release-approval smoke top-level readback changes must assert `automationReleaseApproval*` fields mirror nested list/bag/record DTOs without adding write permission, Gateway calls, publication, scheduler execution/ticks, runtime config mutation, learner-state mutation, or direct repository access from the CLI; release-evidence smoke top-level readback changes must assert `automationReleaseEvidence*` fields mirror nested list/bag/record DTOs without adding write permission, Gateway calls, publication, scheduler execution/ticks, runtime config mutation, learner-state mutation, or direct repository access from the CLI. | `npm run collect:production-deployment-evidence`, `npm run smoke:release-readiness`, `npm run smoke:home-ai-proxy`, `npm run smoke:owner-review-evidence`, `npm run smoke:release-evidence`, `npm run smoke:release-approval`, `npm run smoke:platform-action-evidence`, `npm run smoke:central-visual-evidence`, `npm run smoke:production-deployment-evidence`, `npm run smoke:ui-evidence`. |
| Release package, evidence bundle/collection, collection-run, decision, review, authorization, closure, activation, runtime enablement, controls, inventory, dashboard, workbench, workbench action/audit, preflight, artifact-template | `npm run test:release-union`; add `tests/learning-automation-release-evidence-artifact-template-service.test.js` and `tests/growth-release-artifact-template-smoke-script.test.js` when artifact-template/readback fields change; add `tests/growth-frontend-adapter.test.js` and `tests/growth-architecture-boundary.test.js` when the Owner UI consumes artifact-template/checklist/action-plan, action-audits, release status readback fields, release evidence/approval ledger list fields, or release lifecycle record list/write fields. Bundle smoke readback changes are covered by `tests/growth-release-evidence-bundle-script.test.js`; central visual and production-deployment bundle/collection projection changes must also run `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/learning-automation-release-evidence-collection-service.test.js`, and `tests/growth-release-evidence-collection-smoke-script.test.js` so bounded `visualEvidence` / `centralBoundary` and `deploymentEvidence` / `deploymentBoundary` fields survive from the validated artifact through bundle output and persisted release evidence records. Bundle-audit smoke readback changes are covered by `tests/growth-release-evidence-bundle-audit-smoke-script.test.js`; collection-run smoke readback changes are covered by `tests/growth-release-collection-run-smoke-script.test.js`; package smoke readback changes are covered by `tests/growth-release-package-script.test.js`; activation/runtime/preflight record behavior is covered by `tests/growth-release-activation-smoke-script.test.js`, `tests/growth-runtime-enablement-smoke-script.test.js`, `tests/growth-release-preflight-smoke-script.test.js`, and route/service repository tests; workbench-action smoke readback changes are covered by `tests/growth-release-workbench-action-smoke-script.test.js`; Home AI proxy operator-harness changes are covered by `tests/growth-home-ai-proxy-smoke-script.test.js`; action wrapper/audit changes are covered by `tests/learning-automation-release-workbench-action-service.test.js`, `tests/learning-automation-release-workbench-action-repository.test.js`, `tests/growth-release-workbench-action-smoke-script.test.js`, and `tests/growth-routes.test.js` so write-then-list audit readback stays service-first; collection action semantics and collection smoke readback changes must cover both partial-success evidence-record writes and no-record blocked failures through `tests/growth-release-evidence-collection-smoke-script.test.js`. | Matching smoke scripts: `smoke:release-evidence-bundle`, `smoke:release-evidence-bundle-audit`, `smoke:release-collection-run`, `smoke:release-package`, `smoke:release-evidence-collection`, `smoke:release-decision`, `smoke:release-review`, `smoke:release-authorization`, `smoke:release-closure`, `smoke:release-activation`, `smoke:runtime-enablement`, `smoke:release-controls`, `smoke:release-inventory`, `smoke:release-dashboard`, `smoke:release-workbench`, `smoke:release-workbench-action`, `smoke:home-ai-proxy`, `smoke:release-preflight`, `smoke:release-artifact-template`. |
| Embedded plugin UI adapter or learner UI behavior | `tests/growth-frontend-adapter.test.js`, `tests/growth-embedded-layout.test.js`, `tests/growth-routes.test.js`; Owner Reference Chain UI changes must prove API client proxy/non-proxy reference paths, summary-only panel rendering, visible partial failures, and no browser-side policy reconstruction. Owner stage-checkpoint UI changes must prove formal rubric readback is rendered from bounded service DTO fields, not recomputed in the browser. Owner operating-loop UI changes must prove API client proxy/non-proxy runs/advance paths, summary-only run-history rendering, service-projected run-next payloads, and visible progress/errors without browser-side learning-policy selection. Owner audit-review UI changes must prove direct/proxy list and record helpers, selected-cycle selector payloads, visible review rows/action states, `correction_recorded` correction-id gating, and no browser-side profile-feedback computation, cycle fabrication, Gateway calls, card generation, evaluation, scheduler, or learner-state mutation. Owner proposal-review UI changes must prove blocked controls remain click-observable through `data-automation-proposal-blocked-reason` and do not use browser-side policy to bypass the service. Owner failure-policy UI changes must prove the browser only renders Growth service readbacks and sends bounded create/review commands, never deriving scheduler permission locally. Owner release artifact-template UI changes must prove no-write template/checklist/action-plan rendering, direct/proxy API helper paths, release-workbench-coupled refresh wiring, and no raw artifact path/file upload/visual-tool execution in the browser. Owner release action-audit UI changes must prove direct/proxy action-audits paths, `操作审计` summary-only rendering, refresh wiring, and no browser access to raw request/write-result payloads, release storage, runtime config, or scheduler permission. Owner release status UI changes must prove direct/proxy release controls/dashboard/inventory/review/authorization/closure/preflight/activation/runtime readback paths, `发布总览` summary-only rendering, refresh wiring, and no browser writes to release decisions, package records, preflight reports, activation/runtime rows, runtime config, release permission, or scheduler permission. Owner release evidence ledger UI changes must prove direct/proxy release-evidence and release-approval list paths, `证据账本` summary-only rendering, refresh wiring, and no browser-side evidence writes, approval writes, evidence collection execution, direct release storage access, runtime config mutation, scheduler permission, Gateway call, or learner-state mutation. Owner release lifecycle record UI changes must prove direct/proxy preflight-report, activation-record, and runtime-enablement list/write helpers, `发布记录` summary-only rendering, visible record progress/error/result state, refresh wiring, and no browser-side runtime config mutation, scheduler permission, release approval, evidence collection, Gateway call, or learner-state mutation. | Run Home AI central embedded-plugin visual harness before production UI release. |
| Docs-only Growth contract change | `tests/growth-docs-locality.test.js` plus `node scripts/check-growth-docs-locality.js` | No production or runtime evidence is implied. |

When changing persisted release-evidence bag fields consumed by
release-readiness, run both
`tests/learning-automation-release-evidence-service.test.js` and
`tests/learning-automation-release-readiness-service.test.js`. The focused
assertion must prove pass records keep `summaryOnly`, `privacyClass`,
`schemaVersion`, `evidenceKey`, and `checkKey` in the bag projection.
When changing the release evidence bundle task evidence wrapper, run
`tests/learning-automation-release-evidence-bundle-service.test.js`,
`tests/growth-release-evidence-bundle-script.test.js`,
`tests/learning-automation-release-readiness-service.test.js`, and
`tests/growth-release-readiness-smoke-script.test.js`. The focused assertion
must prove each bundle evidence object is itself summary-only
(`privacyClass=summary_only`, `summaryOnly=true`, `schemaVersion` present), so
`npm run smoke:release-readiness -- --evidence-bundle-file <bundle>` can consume
pass evidence without reporting `release_evidence_summary_only_required`.
When changing the readiness evidence catalog membership or catalog cardinality,
also run the downstream release package, inventory, dashboard, and
`npm run test:release-union` gates. The focused assertion must prove persisted
release package dashboard summaries and persisted readiness snapshot readbacks
keep the correct `readinessEvidencePresentCount`,
`readinessEvidenceMissingCount`, `latestReadinessEvidencePresentCount`, and
`latestReadinessEvidenceMissingCount` values.

When changing release-workbench Owner action route bodies, run
`tests/learning-automation-release-workbench-service.test.js`,
`tests/growth-release-workbench-smoke-script.test.js`, and
`tests/learning-automation-release-workbench-action-service.test.js`. The
focused assertion must prove collection-owned evidence keys are routed through
`release_evidence_collection` instead of concrete direct pass
`release_evidence` actions, artifact-backed collection tasks advertise
`requiresPreparation` plus the artifact-template read route, and generic
record-route templates do not become browser-filled pass evidence shortcuts.
Service-smoke release evidence keys that are collected by bundle tasks must be
mapped to their collection task ids, including
`production_operating_loop_history_smoke_evidence` ->
`operating_loop_history`, instead of being reported as unsupported/manual
evidence or direct pass evidence.
Collection-owned outputs such as `release_evidence_bundle_audit` must also stay
out of `unsupportedReleaseEvidenceCollectionKeys`; they are produced by the
collection pass rather than supplied as manual evidence.
The architecture guard must also derive release-readiness evidence/check keys
from the readiness service and prove every key is mapped to a collection task,
write-gated task, or collection-owned output.
For readiness state prerequisites such as reviewed digest, active failure
policy, delivered action handoff, and reviewed enabled worker target, the
focused assertion must prove they are projected as
`releaseStatePrerequisiteActions` with internal release-workbench action
templates plus GET follow-up routes, not as
`unsupportedReleaseEvidenceCollectionKeys`, not as collection task ids, and not
as direct pass release evidence. Action-facade coverage must prove the selected
endpoint delegates only to the owning digest, failure-policy, action-handoff,
or worker-target service and keeps all scheduling/runtime mutation flags false.

When changing release artifact-template checklist or action-plan fields, run
`tests/learning-automation-release-evidence-artifact-template-service.test.js`
and `tests/growth-release-artifact-template-smoke-script.test.js`. The focused
assertion must prove artifact-backed tasks remain behind the manifest template,
state prerequisites are counted as `release_state_prerequisite`, and truly
unknown manual evidence remains under unsupported/manual evidence. It must also
prove registry-driven task-key mapping for both camelCase and snake_case
release-evidence keys such as `productionOperatingLoopHistorySmokeEvidence` /
`production_operating_loop_history_smoke_evidence` so non-UI service-smoke
tasks appear in collection actions when missing, prove workbench-advertised
fallback collection tasks are used only when real
evidence/check/collection-run gaps exist, so ready states do not widen into
default collection actions.
It must also
prove phase gating: downstream approval/record actions are visible but not
submittable while artifact, collection, write-gated, state, or unsupported
evidence prerequisites remain; once evidence prerequisites clear, approvals can
become the next submittable action while records remain approval-blocked.

When changing release evidence task definitions, default task membership,
service-smoke evidence-key mapping, collection-owned output keys, write-gated
task mapping, release evidence bundle schema constants, or the mapping consumed
by release workbench/artifact-template, run
`tests/learning-automation-release-evidence-task-registry.test.js`,
`tests/learning-automation-release-evidence-bundle-service.test.js`,
`tests/learning-automation-release-evidence-bundle-audit-service.test.js`,
`tests/learning-automation-release-workbench-service.test.js`,
`tests/learning-automation-release-evidence-artifact-template-service.test.js`,
`tests/growth-release-evidence-bundle-script.test.js`,
`tests/growth-release-evidence-bundle-audit-smoke-script.test.js`,
`tests/growth-release-workbench-smoke-script.test.js`,
`tests/growth-release-artifact-template-smoke-script.test.js`, and
`tests/growth-architecture-boundary.test.js`. Workbench
and artifact-template changes must include a regression where the missing
release key list is longer than the compact UI display count, and late
artifact-backed gates such as `central_visual_evidence` still produce
`central_visual`, `centralVisualEvidenceFile`, and the required checklist/action
rows. The focused assertion must prove
the registry, not bundle/workbench/template services, owns the canonical task
map; safe collection tasks, write-gated tasks, and collection-owned outputs
remain separated; and schema consumers do not load smoke-runner services only
to compare bundle artifact schema versions.
When changing release-evidence-bundle, release-evidence-bundle-audit,
release-package, release-collection-run, release-decision, release-review,
release-authorization, release-readiness, release-controls, release-closure,
release-activation, runtime-enablement, release-evidence-collection,
release-inventory, release-dashboard, workbench, workbench-action,
release-preflight, or
artifact-template smoke CLI
top-level readback projection fields, run the matching smoke-script test:
`tests/growth-release-package-script.test.js`,
`tests/growth-release-evidence-bundle-script.test.js`,
`tests/growth-release-evidence-bundle-audit-smoke-script.test.js`,
`tests/growth-release-collection-run-smoke-script.test.js`,
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
`tests/growth-release-workbench-action-smoke-script.test.js`,
`tests/growth-release-preflight-smoke-script.test.js`, and/or
`tests/growth-release-artifact-template-smoke-script.test.js`. The focused
assertion must prove top-level operator fields mirror the nested service DTO
without adding writes, runtime-config mutation, Gateway calls, or raw artifact
paths.
For release-preflight production closure gate fields, run
`tests/learning-automation-release-preflight-service.test.js` and
`tests/growth-release-preflight-smoke-script.test.js`. The focused assertion
must prove `productionClosureGateSummary` / `productionClosureGates` classify
Growth backend readiness, Home AI visual/UI artifacts, Home AI Action Inbox/Web
Push receipts, Owner release activation, runtime enablement readback, and
production deployment/health evidence; `production_deployment_health` must be validated through `learning-automation-production-deployment-evidence-service` or a matching release-evidence record and must stay
external and pending in Growth local preflight, and top-level smoke fields must
mirror the nested gate status/count/pending-count/next-action projection.

When changing the release evidence bundle default task set, run
`tests/learning-automation-release-evidence-bundle-service.test.js`,
`tests/growth-release-evidence-bundle-script.test.js`, and
`tests/growth-architecture-boundary.test.js`. The focused assertion must prove
new default tasks are no-write unless explicitly documented otherwise. For
`operating_loop_history`, the bundle must call only
`npm run smoke:operating-loop -- --operation list-runs`, map the result into
`productionOperatingLoopHistorySmokeEvidence`, and never execute `run-next`,
Gateway, publication, evaluation, scheduler, notification, stage activation, or
direct repository access.

When changing `release_evidence_collection` workbench action success/failure
semantics, run `tests/learning-automation-release-workbench-action-service.test.js`
and `tests/growth-release-workbench-action-smoke-script.test.js`. The focused
assertion must prove collections that wrote or deduped release-evidence records
can complete the wrapper action, while collections blocked before any
release-evidence record produce a visible blocked action plus bounded audit
readback.

## Local Full-Cycle Harness

Use `npm run smoke:local-daily-cycle` only for local implementation evidence
after a change touches daily-loop publication, learner-cycle execution,
Gateway planner/authoring/evaluation boundaries, evidence/profile projection,
profile-feedback, or next-card recommendation.

Minimum focused coverage for this harness row:

- `tests/growth-daily-loop-smoke-script.test.js`
- `tests/growth-learner-cycle-smoke-script.test.js`
- `tests/growth-profile-feedback-smoke-script.test.js`
- `tests/growth-learning-loop-state-smoke-script.test.js`
- `tests/learning-card-evaluation-service.test.js`
- `tests/learning-mastery-profile-service.test.js`
- `tests/learning-card-trajectory-service.test.js`
- `tests/learning-card-recommendation-service.test.js`
- `node --check scripts/smoke-growth-local-daily-cycle.js`

The operational command shape is:

```bash
npm run smoke:local-daily-cycle -- --allow-write \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --domain-pack-id <domain-pack> \
  --domain <domain> \
  --subject <subject> \
  --target-node-id <graph-node> \
  --json
```

The harness starts a local fake Gateway for the Growth generic `{kind,input}`
protocol and then delegates to existing Growth smoke/service boundaries for
daily-loop advance, learner-cycle full, profile-feedback, and loop-state. A
passing run must keep graph target ids clean, propagate recipe ids, complete
one submission/evaluation/reflection cycle, pass profile-feedback, and expose
the next loop action.

This harness writes local SQLite rows only with `--allow-write`. It must not
be recorded as production Gateway evidence, production release evidence, Home
AI central visual/UI evidence, platform Action Inbox/Web Push evidence,
scheduler permission, runtime enablement, or deployment health evidence.

## Release Union Harness

`npm run test:release-union` runs the release readback and gate chain that is
too long to keep copying into handoffs. Use it when a change touches release
package, release evidence, release review, authorization, closure, controls,
dashboard, inventory, workbench, preflight, activation, or runtime enablement
readbacks.

This command is still local evidence only. It does not replace real Home AI
platform Action Inbox/Web Push evidence, central visual artifacts, production
smoke output, explicit release approvals, or Home AI macOS deployment-health
checks; Growth can only validate the bounded deployment-health summary through
`npm run smoke:production-deployment-evidence` or an already persisted pass
release-evidence record.

## Operational Backend Evidence Batch

When the task is to advance release-readiness evidence without changing
runtime code, run `npm run smoke:release-evidence-collection` first without
write flags over the intended backend task list and record which tasks pass or
block. A write replay may include only the pass task ids from that same scope,
with `--write-collection-run --write-release-evidence-records --allow-write`
and an explicit Owner/requested-by actor. Blocked tasks must keep their real
bounded reasons such as missing Gateway config, missing completed-cycle
selector, or missing graph/provision target data. This operational batch is
local advisory evidence only; it does not replace UI artifacts, platform
Action Inbox/Web Push evidence, production deployment health, explicit
approvals, package/review/authorization/closure/preflight/activation/runtime
records, broad checks, or deployment.

If a backend batch blocks because `learning_graph_*` or
`learning_growth_domain_pack_provisions` data is absent, recover the data
foundation before replaying release evidence: run
`node scripts/import-learning-graph-pack.js --dry-run --expected-sha256 ...`,
then write only the validated KG seed with `--target-db ... --write`, verify
readback, create the explicit Owner provision through
`npm run smoke:target-provisioning -- --operation provision --allow-write`,
and only then rerun target/stage release-evidence collection with the real
domain pack and target node selectors.
