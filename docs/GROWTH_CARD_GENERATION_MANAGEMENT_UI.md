# Growth Card Generation Management UI

Last updated: 2026-06-18.

This document defines the Growth-owned Owner UI for generating learning cards
inside the Growth plugin.

The system scheme for the broader AI-driven learning loop is
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`; the execution blueprint is
`docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`. This UI document should
follow those documents for state ownership, model boundaries, audit fields, and
harness sequencing.

V1 implementation status: the Owner `生成` tab, context route, frontend API
helpers, daily English/science payload builders, generated-card learner
submission / evaluation / optional-reflection UI, stage-assessment controls, target
domain-pack/subject controls, and focused harness are implemented in the
plugin workspace. The backend operating-loop slice also exposes planner
readiness, Profile V2, evidence audit, `graphOptions`, plan draft/publish
services, Owner-only daily-loop preview/draft/publish backend facade routes,
compact learning-loop state readback through
`GET /api/v1/growth/learning-loop/state`, no-write learning-loop state smoke,
and a no-write planner readiness smoke. The Owner `生成` tab now reads that
state after loading generation context, renders a summary-only status/next
action panel, forwards the selected subject/capability/coverage selectors so
active checkpoint readback is scoped to the same graph target, shows a direct
`打开阶段测评` action when the state reports an active formal checkpoint,
applies recipe defaults before target-provisioning and graph suggestion, lets
Owner switch recipe by refreshing context with `recipeId` instead of stale
graph selectors, renders `targetProvisioning` plus filtered `graphOptions`, lets
Owner apply a selected domain pack/subject to context refresh, and can call the
Owner-only `POST /api/v1/growth/domain-pack-provisions` route for explicit
target enablement. The same Owner tab now also reads
`GET /api/v1/growth/automation/release-workbench` and renders a summary-only
release workbench panel. From that panel Owner can call
`POST /api/v1/growth/automation/release-workbench/actions` for advertised
`release_evidence`, `release_approval`, `release_evidence_collection`,
`release_decision`, `release_package`, `release_activation`, and
`runtime_enablement` actions. `release_evidence_collection` runs only the
bounded task list derived by the backend workbench template, can persist the
collection-run row plus canonical pass release-evidence records only when the
template forwards explicit write flags, and may complete while overall
readiness remains incomplete. `release_decision` sends only summary decision
metadata plus the explicit latest-ready collection-run auto-selection flag; the
decision service still owns collection-run lookup, ready-run validation, and
record persistence. `release_package` is a two-step browser flow: Owner first
builds a summary-only
`growth.learningAutomationReleasePackage.v1` candidate through
`POST /api/v1/growth/automation/release-packages/build`, then records that
candidate through the workbench action facade. A placeholder route body is
never enough to record a package. The build route remains no-write by default
for this UI path, while backend/CLI callers may request package audit
persistence only with explicit write flags and Owner or `--allow-write`
authorization; the workbench action backend can also accept an explicit
`buildReleasePackage` / `build_and_record_package` request that delegates build
plus package-record persistence to the package service.
The same release workbench panel now also reads the no-write
`GET /api/v1/growth/automation/release-artifact-template` readback and renders
a `证据清单` subpanel. That subpanel shows only the service-projected artifact
slots, checklist items, action-plan rows, next action, manifest schema, and
refresh state. It does not accept local file paths, run the Home AI visual
toolchain, validate UI artifacts, persist release evidence, apply approvals,
or enable scheduling; filled artifact manifests still enter Growth only through
the existing release workbench action / release evidence collection boundary.
The release workbench panel also reads the existing Owner-only
`GET /api/v1/growth/automation/release-workbench/action-audits` boundary and
renders a summary-only `操作审计` subpanel. The browser can list recent wrapper
audit rows and refresh them after release-workbench readback, but it must not
inspect raw request bodies, delegated `writeResult` payloads, local artifact
paths, release storage, or use audit presence as release approval or scheduler
permission.
The same release workbench panel now also renders a read-only `发布总览`
subpanel backed by existing release readbacks:
`release-controls`, `release-dashboard`, `release-inventory`,
`release-review`, `release-authorization`, `release-closure`,
`release-preflight`, `release-activation`, and `runtime-enablement`. The
browser batches those reads only to show bounded status/next-action summaries;
that read-only subpanel does not record preflight reports,
activation/runtime enablement rows, release decisions, package records, runtime
config changes, release permission, or scheduler permission.
The same release workbench panel now also renders a read-only `证据账本`
subpanel backed by the existing visible-target scoped
`GET /api/v1/growth/automation/release-evidence` and
`GET /api/v1/growth/automation/release-approvals` routes. The browser batches
those reads only to list public summary DTO fields such as evidence record id,
evidence/check key, approval id/key, status, and timestamp. It does not record
release evidence, create release approvals, run evidence collection, approve a
release, inspect SQLite/release storage directly, mutate runtime config, grant
scheduler permission, or call Gateway.
The same release workbench panel now also renders a `发布记录` subpanel backed
by `GET /api/v1/growth/automation/release-preflight-reports`,
`GET /api/v1/growth/automation/release-activations`, and
`GET /api/v1/growth/automation/runtime-enablements`. From that subpanel Owner
can explicitly call the existing Owner-only record routes for one
summary-only preflight report, activation audit record, or runtime enablement
audit record. The payload is limited to visible target scope,
`requested_by=owner`, bounded activation gates, and record-only/advisory
decision summaries. It does not apply runtime config, grant scheduler
permission, run release evidence collection, approve a release, deploy, call
Gateway, or mutate learner state.
Central `embedded-plugin-shell` visual evidence passed for `pluginId=growth`
again on 2026-06-18 through the Home AI visual toolchain and has been persisted
locally through Growth release evidence as `centralVisualEvidence=pass` plus
`releaseEvidenceBundleAudit=pass`. The persisted record keeps only bounded
summary fields such as screenshot file name, client version, assertion counts,
and Home-AI-owned visual-boundary flags. This proves the embedded shell/iframe
gate for the current Growth UI, not full release readiness. Remaining closure
still includes proposal/digest/action-handoff/scheduler-execution/scheduler-run/
worker-target production evidence, real UI summary artifacts such as
`releasePackageReviewUiEvidence`, platform Action Inbox/Web Push evidence,
explicit release approvals, package/review/authorization/closure, preflight,
activation/runtime enablement, deployment, and broad validation.

## Objective

Owner should be able to generate Growth cards for learners who have the Growth
plugin provisioned, without using Codex as the operational interface.

V1 is deliberately narrow:

- Owner-only card generation surface inside the Growth plugin.
- Initial sample target is Fanfan.
- Initial default recipe is a daily English card.
- Fanfan science uses `daily_science_v1` from the imported UK/HK curriculum
  domain pack, with service-side recipe defaults applied before target
  provisioning and graph suggestion.
- The generated card uses the existing Growth card renderer and board shape.
- The model boundary is Gateway only.
- Published daily cards use the `daily_score_once` policy from
  `docs/GROWTH_CARD_GENERATION_RULES.md`.

## Non-goals

- No direct OpenAI, Claude, DeepSeek, or vendor-specific calls from Growth.
- No Home AI old Growth server route imports or calls.
- No free-form prompt box as the primary authoring path.
- No raw transcript, full homework, hidden answer key, raw model response, or
  private source dump in model input.
- No new learner-facing card UI shape in V1. Generated cards should render like
  existing Growth learning cards.
- No pass/fail retry loop for ordinary daily cards.

## Product Contract

Growth owns card authoring. Home AI can provide the platform Gateway
configuration and authorization boundary, but the plugin owns:

- selecting the target learner workspace;
- assembling the structured authoring request;
- calling Gateway through `growth-gateway-authoring-client`;
- parsing Gateway SSE or JSON output;
- validating the authoring draft;
- writing the accepted card into Growth SQLite;
- showing the published card through the existing Growth board/card UI.

Owner is the actor. The learner workspace is the target. Owner permissions must
not cause writes to fall back into the Owner's own learner data.

Target visibility and learning target provisioning are separate checks:

- `GET /api/v1/growth/view-targets` says which learners Owner can see;
- `learning-target-provisioning-service` says which domain pack, domain,
  subject, and graph node set Growth may use for planning/generation;
- a visible non-sample learner is not enabled for card generation until Owner
  creates an active provision for the requested domain pack/subject;
- the Fanfan sample fallback may stay enabled during V1 so the first science
  vertical remains operable before all targets have explicit provisions.

In Home AI embedded proxy mode, the iframe may keep `workspaceId=owner` in the
URL so the host can authorize the Owner actor. Growth card generation therefore
keeps a separate plugin-local `selectedWorkspaceId` for the learner target.
Readiness, target-row active state, and generation payloads must use that
selected learner target, not the iframe's Owner workspace.

## V1 Owner Flow

1. Owner opens Growth plugin.
2. Owner opens the Owner management area and selects the `生成` tab.
3. Growth selects the Fanfan sample learner automatically when the current
   Owner workspace is not a supported generation target.
   If the host target list omits the sample target, V1 may fall back to the
   provisioned Fanfan workspace id `weixin_stephen` and then render the target
   returned by the Growth context endpoint.
4. Growth loads card generation context for the selected target learner.
5. Growth reads compact learning-loop state for the selected target through
   `GET /api/v1/growth/learning-loop/state` and shows the current status, next
   action, weakness count, audit-gap count, and stage-checkpoint state. This
   query must include the current `subjectId`, `capabilityClusterId`, and
   `assessmentCoverageNodeIds` when available, because active formal
   checkpoints are capability-scoped. If the state returns
   `stage_checkpoint_active`, the panel shows the existing formal task-card id
   as an open-card action instead of drafting another daily card. This panel is
   read-only UI glue over the backend state service.
6. Growth reads compact release workbench state for the selected target through
   `GET /api/v1/growth/automation/release-workbench`. This panel is UI glue
   over backend release services. It may record only advertised Owner actions
   through `POST /api/v1/growth/automation/release-workbench/actions`. For
   `release_package`, it first delegates package candidate construction to the
   Owner-only `POST /api/v1/growth/automation/release-packages/build` route and
   records only the returned summary-only package artifact. The default browser
   path does not ask the build route to write package records. Backend/CLI
   tooling may use the explicit `buildReleasePackage` workbench action flag for
   build-and-record, but the embedded browser path keeps the package artifact
   visible before recording it. It must not run smoke scripts in the browser,
   flip runtime config, schedule work, notify users, call Gateway, or mutate
   learner state directly.
   The same surface reads
   `GET /api/v1/growth/automation/release-workbench/action-audits` for recent
   summary-only workbench wrapper audit rows and displays them as `操作审计`.
   This is audit visibility only and does not expose raw request/write-result
   payloads or grant any release permission.
   It also batches the existing release controls/dashboard/inventory/review/
   authorization/closure/preflight/activation/runtime-enablement readbacks into
   a summary-only `发布总览` panel. This panel is release-status visibility only
   and cannot write records, approve release state, mutate runtime config, or
   enable scheduling.
7. Owner can switch back to the Fanfan sample learner if a future navigation
   state lands on another target.
8. Owner selects the `日常英语卡` or `日常科学卡` recipe.
   The context service applies the recipe's domain/subject defaults before
   target provisioning and graph suggestion, so Owner does not need to hand-type
   science selectors for the Fanfan sample path. The browser sends only
   `recipeId` during recipe switching so an older English domain pack/subject
   draft cannot override the science recipe defaults.
9. Growth shows readiness:
   - learner workspace is provisioned;
   - learning graph is imported;
   - mastery/history summary is available;
   - Gateway authoring boundary is configured;
   - Gateway evaluation boundary is shown separately so Owner can see whether
     the post-submit AI loop is model-backed;
   - there is no blocking open generation job.
10. Growth renders a front-loaded `生成操作` panel immediately after target
    provisioning and readiness. It must show the graph target, daily completion
    policy, evidence requirements, and the `刷新状态` / `生成卡片` /
    `规划下一张` / `发布为卡片` actions before long audit, scheduler, and release
    workbench panels. This is a mobile readability requirement: Owner must not
    need to scroll through release evidence or automation panels just to start a
    normal daily card.
11. Owner reviews the structured plan preview:
   - learning graph plan;
   - learner/mastery summary;
   - recent experience signals;
   - card role, difficulty, and evidence requirements;
   - `daily_score_once` completion policy.
12. Owner presses `生成卡片`.
13. Growth immediately renders a visible progress box with four bounded stages:
   `prepare`, `gateway`, `validation`, and `publish`. The progress box is
   shown inside the plugin UI, uses `role="status"` / `aria-live="polite"`,
   and must remain visible on mobile embedded viewports without relying on the
   user scrolling back to the generate button.
14. Growth calls the Owner operating-loop path,
    `POST /api/v1/growth/learning-loop/advance` with `action=run_next`. The
    older `daily-loop/advance` route remains a compatibility/Harness route, but
    the browser primary generate button must use the operating-loop boundary.
15. The service-owned loop path drafts the plan, publishes the selected item,
    and returns bounded draft/publish summaries.
16. Gateway output is converted to an authoring draft through the existing
    Growth Gateway authoring boundary.
17. Validation passes or returns a visible authoring error.
18. A validated card is transactionally published to Growth SQLite, including
    the native program/draft parent rows required by the card table.
19. Owner sees the generated card preview and can open the card on the learner
    board.
20. The learner can submit the generated card from the plugin card detail,
    optionally attach a recording, see one-shot evaluation feedback, and submit
    one optional reflection without Codex involvement. The detailed learner
    flow is defined in `docs/GROWTH_CARD_INTERACTION_FLOW.md`.

Formal stage-assessment generation is not part of the daily recipe flow.
Owner/manual or learner challenge assessment creation must call the dedicated
stage-assessment API boundary:

- `POST /api/v1/growth/stage-assessments/eligibility`;
- `POST /api/v1/growth/stage-assessments/activate`;
- `POST /api/v1/growth/stage-assessments/challenge`.

Those routes delegate to `learning-stage-assessment-service`. The generated
formal card still uses the same authoring/publisher pipeline, but the service
adds `stageAssessmentCycleId`, activation metadata, assessment coverage, and
`cardRole=stage_assessment`. The Owner UI can surface these controls in a
tab section without reimplementing eligibility or generation policy in the
frontend.

Implemented V1 Owner stage-assessment controls:

- the `生成` tab renders a compact `阶段测评` section under the learning profile
  panel;
- `检查条件` calls
  `POST /api/v1/growth/stage-assessments/eligibility` and shows the returned
  eligible/dormant/cooldown/active state;
- `生成阶段测评` calls
  `POST /api/v1/growth/stage-assessments/activate` with
  `activation_source=owner_manual`;
- the section shows coverage-node count, formal completion marker, default
  `300` coin reward metadata, cooldown date when present, the formal
  `rubric:stage_assessment_v1:<subject>` policy id, one-evaluation /
  one-reflection / 25-30 minute assessment policy, bounded rubric dimension
  ids, evidence keys, and the published card open action;
- frontend state is only progress/error/result state. Eligibility, cooldown,
  Owner override, generation policy, and rubric policy remain backend-owned.

## Planner-Backed Owner Flow

This browser operation is implemented through the supervised operating-loop
facade. The primary embedded Owner action is the one-click `run_next` path;
direct daily-loop routes remain compatibility and two-step inspection
boundaries.

1. Owner opens Growth and selects `生成`.
2. Growth loads `GET /api/v1/growth/card-generation/context` for the selected
   target learner.
3. Growth renders `targetProvisioning`:
   - enabled for Fanfan sample fallback or an explicit active provision;
   - blocked for a visible non-sample learner without an active provision;
   - selected domain pack, domain, subject, and bounded failure reason when
     blocked.
4. Growth renders provisioned `graphOptions`:
   - domain-pack selector, initially showing the imported UK/HK curriculum
     foundation pack when available;
   - subject selector, for example `science`;
   - current learner/profile/evidence summary for the selected target.
5. Owner selects a horizon and time budget, normally `daily_plan` and
   `15` minutes for a daily card.
6. Owner normally clicks `生成卡片`.
7. UI calls `POST /api/v1/growth/learning-loop/advance` with `action=run_next`
   plus target workspace, learner id, selected domain pack, subject, horizon,
   available minutes, and graph target selectors. The operating-loop service
   executes the current service-projected next action. For the ordinary daily
   card path, that next action delegates to the daily-loop draft and publish
   services through the backend facade, then returns bounded draft/publish and
   run-audit summaries.
8. Direct `POST /api/v1/growth/daily-loop/advance` remains available only as a
   compatibility route and Harness target. It is not the primary browser policy
   selector for the embedded Owner `生成卡片` button.
9. If Owner wants inspection first, Owner clicks `规划下一张`; UI calls
   `POST /api/v1/growth/daily-loop/draft` and renders an Owner-safe plan
   preview:
   - plan id and validation status;
   - target graph nodes and labels;
   - card role and mapped generation role;
   - difficulty/support level;
   - estimated minutes;
   - evidence requirements;
   - bounded reason and basis evidence ids.
10. In the two-step path, Owner clicks `发布为卡片`.
11. UI calls `POST /api/v1/growth/daily-loop/publish` for the selected plan
    item. The facade delegates to the existing plan-publisher publish
    boundary, strips generated authoring draft internals, and refreshes audit
    and completeness DTOs.
11. Growth shows the existing generation progress surface, then preserves the
    published card preview and refreshes context/audit state.

The `生成` tab mobile layout is part of the product contract. At 402px iOS
viewport width, the Owner settings tab list must keep the active `生成` tab
inside the viewport, `documentElement.scrollWidth` must equal the viewport
width, and the primary action panel must appear before `画像反馈`, automation,
scheduler, and release workbench readbacks. Long release/workbench panels remain
available for audit closure, but they are not allowed to obscure the daily card
generation workflow.

In iOS APP/PWA mode, the Growth iframe must not place page headers, sticky
tabs, cards, or first actionable controls in the physical status-bar / Dynamic
Island region. The plugin root must reserve the greater of CSS
`env(safe-area-inset-top)` and the Home AI `hermes.plugin.viewport`
`hostTopSafeArea` / `safeAreaTop` metric before rendering scroll content.

The UI must not call Gateway directly, must not generate from a free-form
prompt, and must not publish a plan item without backend validation. The route
layer remains HTTP glue; selection, validation, role mapping, authoring, and
SQLite writes stay service-owned.

For the first browser-complete science path, the default selectors are:

| Selector | Default |
| --- | --- |
| Learner | Fanfan target from `viewTargets` |
| Learner id | `fanfan` |
| Domain pack | UK/HK curriculum foundation |
| Domain | `science` |
| Subject | `science` |
| Horizon | `daily_plan` |
| Available minutes | `15` |

The UI should treat these defaults as a sample operating path, not as hard
coded business policy. A later non-sample learner must use the same controls
after target visibility and explicit target provisioning pass. The service
Harness proves that this backend path is not Fanfan-only: a provisioned
non-sample learner can use the same science recipe/context, one-click
daily-loop advance, board/detail projection, learner submit/evaluate/reflect
cycle, next loop-state readback, and profile-feedback evidence while keeping
all rows scoped to the target workspace.

The generated daily card is browser-complete only when all of these happen
without Codex or database-console intervention:

1. context loads for the selected target and subject;
2. a planner draft is created and shown to Owner;
3. one selected daily item is explicitly published;
4. the published card can be opened from the existing card renderer;
5. the learner can submit one answer, receive one evaluation, and optionally
   submit one reflection;
6. Owner can refresh audit context and see bounded plan, evidence, profile
   delta, correction, and next-recommendation summaries.

The progress surface must cover both planner and authoring publication. A
button press cannot be a silent no-op. While drafting or publishing, the UI
must show a visible status row or box with `aria-live="polite"` and a bounded
stage label such as `context`, `planner`, `validation`, `authoring`,
`publish`, `audit_refresh`, `done`, or `failed`.

If publishing fails or is policy-blocked, the UI must preserve the plan preview
and render the bounded `publishAttempt` status/error/stage returned by the
publish response, plan audit, or cycle audit. The UI must not infer publish
state from button state alone.

After the learner completes a generated card, the backend evaluation result can
include a bounded `profile_delta` audit summary and persist it for historical
audit readback. The same Owner management surface should later render:

- evaluation id, score band, and completion policy;
- evidence ledger ids written for the card;
- Profile V2 capability changes by graph node;
- changed planner hints or next recommendation;
- visible non-fatal audit failure if profile-delta projection failed.

This audit panel must consume the backend profile-delta DTO. The browser must
not compare raw Profile V2 payloads itself and must not display raw answers,
transcripts, prompts, model output, source bodies, private paths, or provider
configuration. For historical review, it should consume the implemented
`GET /api/v1/growth/profile-delta-audits` public read DTO rather than
transient evaluation response data.

The implemented card-generation context also exposes `ownerAudit`, which
combines persisted profile-delta audit DTOs and Owner profile-correction DTOs
for the selected target. The UI should treat `ownerAudit` as the default
readback surface for the `生成` tab. Direct profile-delta route reads are useful
for drilldown/history screens, and direct learning-cycle route reads are useful
for one-card cycle drilldown. The daily generation screen should first render
the already-scoped context DTO so target selection, provisioning, Profile V2,
evidence audit, corrections, and next recommendation stay in one refresh
cycle. When Owner opens a specific card/evaluation/plan audit, the UI should
call `GET /api/v1/growth/learning-cycles/audit` rather than joining plan,
evidence, profile-delta, and correction routes in browser code.

Current implementation status: the Owner `生成` tab now renders an
`ownerAudit` panel from the card-generation context. It shows bounded plan
audit counts, published-card ids, persisted profile-delta summaries, recent
Owner correction history, and a compact Owner correction form. The correction
form calls `POST /api/v1/growth/profile-corrections` through
`growth-api-client.js`, writes only a summary-only review action and short
reason over selected graph node ids, then refreshes the same context and
`growth.learningLoopState.v1` readback. Browser code does not mutate Profile
V2 optimistically and does not call Gateway, repositories, or Profile V2
projection logic directly. The Owner `生成` tab now also renders a single-card
cycle drilldown panel. The panel derives a bounded query from the current
context, latest plan draft/publish result, generated card id, and `ownerAudit`
DTO; it then calls `GET /api/v1/growth/learning-cycles/audit` and
`GET /api/v1/growth/learning-cycles/completeness` through
`growth-api-client.js`. It shows only summary counts, a bounded timeline,
`missingRequired`, and finding/remediation labels. It must not join audit
tables in browser code, read repositories, display raw answers/transcripts,
prompts, source bodies, raw model output, private paths, credentials, or
provider configuration, and must not treat `readyForAutomation` as scheduling
permission.

For a compact "can this cycle be trusted for closure" badge, the UI should call
`GET /api/v1/growth/learning-cycles/completeness`. That route is read-only,
visible-target scoped, and delegates to `learning-audit-completeness-service`.
The UI may render `complete`, `readyForAutomation`, `missingRequired`, and
bounded finding messages, but it must not treat `readyForAutomation` as an
instruction to schedule work. The first automation UI should be proposal
review: Owner may request a bounded next-learning proposal for a complete
source cycle, but publication remains a separate explicit Owner action.
Scheduling remains a future Owner-policy slice after proposal review, audit UI,
automation digest review, active failure policy, and notification/action
handoff are proven. The digest plan is
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`; the failure-policy backend
contract is `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`.

### Release Workbench Panel

The Owner `生成` tab includes a compact `发布工作台` panel backed by
`GET /api/v1/growth/automation/release-workbench`. This panel renders only the
summary DTO returned by `learning-automation-release-workbench-service`:

- workbench status and next Owner action;
- Owner action count;
- missing evidence/check keys;
- missing approval keys;
- missing release record kinds;
- bounded action labels and endpoint keys.

The panel may call
`POST /api/v1/growth/automation/release-workbench/actions` only for endpoint
keys that are both advertised by the backend workbench and supported by the
embedded UI:

- `release_evidence`;
- `release_approval`;
- `release_evidence_collection`;
- `release_decision`;
- `release_package`;
- `release_activation`;
- `runtime_enablement`.

The UI action payload is constructed from the selected target context plus the
backend action template. It sends summary-only scope fields, the endpoint key,
the action key, and the minimal evidence/approval/gate fields required by the
action facade. It must not send raw visual logs, screenshots, transcripts,
private local paths, provider config, raw prompts, model output, access tokens,
or raw smoke output. Success and failure are rendered in the same panel; a
record action cannot be a silent no-op.

For `release_approval`, the embedded UI sends only the advertised approval key
and config gate plus summary-only action metadata. It must not send
`writefulSchedulingAllowed`, runtime config values, private evidence payloads,
or any field that implies scheduler permission.

For `release_evidence_collection`, the embedded UI sends only summary scope,
action metadata, bounded `tasks`, bounded `required_task_ids`,
`write_collection_run=true`, and `write_release_evidence_records=true` when
those flags come from the backend action template. The Owner button is allowed
to complete with a collection DTO whose readiness status remains `incomplete`;
that is a release-evidence state, not a UI/action transport failure. The
backend template may derive the bounded task list from missing release evidence
such as profile feedback, platform action, or central visual evidence; UI/manual
evidence and write-gated evidence are surfaced in the workbench read model but
are not auto-collected by the normal button. The payload must not send raw
prompts, transcripts, raw smoke output, private paths, Gateway/model payloads,
package artifacts, release decisions, runtime config values, or scheduler
permission fields.

For `release_decision`, the embedded UI sends only the advertised status,
summary-only decision metadata, and
`auto_select_latest_ready_collection_run=true` when the backend action template
provides it. Collection-run lookup, ready-run validation, and decision
persistence remain owned by `learning-automation-release-decision-service`.

For `release_package`, the embedded UI must first call the Owner-only package
build route and retain the returned summary-only
`growth.learningAutomationReleasePackage.v1` candidate in local UI state. The
record button stays blocked until such a candidate exists. The later workbench
action payload may include only that package candidate plus summary-only action
metadata. Backend/CLI tooling can alternatively set the explicit
`buildReleasePackage` / `build_and_record_package` flag so the workbench action
delegates build-and-record to the package service, but the embedded UI keeps the
candidate-review step visible. It must not send a placeholder
`{ summaryOnly: true }` body as the package, raw bundle output, raw smoke logs,
private paths, transcripts, raw prompts, model output, or scheduler permission
fields.

The release workbench panel does not grant scheduling permission. It does not
apply runtime config, publish cards, call Gateway, notify users, or mutate
learner state. Package candidate building is delegated only to
`POST /api/v1/growth/automation/release-packages/build`; the browser does not
run smoke scripts or construct package internals itself, and it records package
audit rows through the advertised workbench action only after a real candidate
exists. The release artifact-template subpanel is read-only guidance for
Owner/release tooling: it displays missing Home AI central visual/UI artifact
slots, supported collection tasks, state prerequisites, manual gaps, and
phase-blocked action templates, but it does not upload evidence or turn a blank
manifest into a pass record. Its source readback must preserve all bounded
release missing evidence/check keys before deriving artifact slots; a compact
display limit must not hide late gates such as `central_visual_evidence`. The
current `weixin_stephen/science` readback exposes `central_visual`,
`centralVisualEvidenceFile`, and UI artifact slots in the blank manifest
template, while the actual central visual pass record is written only by the
release evidence collection boundary under the matching release scope. Runtime
enablement action records are audit/readback records only; external
configuration verification still happens outside Growth and must be represented
as bounded summary evidence before scheduler execution can proceed.

The `发布总览` and `发布记录` subpanels are intentionally separate. `发布总览`
is read-only ladder visibility over controls/dashboard/inventory/review/
authorization/closure/preflight/activation/runtime. `发布记录` is an explicit
Owner audit writer over only the existing preflight-report, activation-record,
and runtime-enablement-record routes. Neither panel can flip runtime config,
approve scheduler execution, run a worker, publish learning cards, or convert
missing UI/visual evidence into a pass record.

### Owner Daily Loop Screen Contract

The planner-backed `生成` tab should be split into four compact panels. They
can be visually simple, but each panel has a service-backed responsibility:

| Panel | Purpose | Source DTO |
| --- | --- | --- |
| Target and scope | Select learner, domain pack, subject, horizon, and available minutes. | `viewTargets`, `graphOptions`, `targetProvisioning`, request selectors. |
| Readiness and profile | Explain whether Growth can plan, author, and evaluate for the target. | `plannerReadiness`, Gateway readiness flags, `profileV2`, `evidenceAudit`. |
| Plan and publish | Draft one plan, show validated item rationale, publish one selected daily item, and show failed/blocked publish-attempt state when no card was created. | `daily-loop/draft`, `daily-loop/publish`, bounded generation ids, `publishAttempt`, cycle audit, completeness. |
| Audit and next step | Show what changed after completion, whether the required audit evidence is present, and what Growth recommends next. | `ownerAudit`, `learning-cycles/completeness`, `nextCardRecommendation`, `recommendationLifecycle`, profile corrections. |
| Proposal review | Show a stored supervised next-learning proposal for a completed auditable cycle, let Owner record `accepted`/`skipped`/`expired`/`superseded`, and keep actual card publication on an explicit publish action. | `automation/proposals`, `automation/proposals/:proposalId/decision`, `automation/proposals/:proposalId/publish`, `learning-cycles/completeness`, existing plan publish route. |
| Automation digest review | Scheduling-adjacent panel that creates one persisted dry-run digest from the current bounded scope, lists persisted dry-run digest packets, shows would-publish/blocked/skipped/manual-action counts, and lets Owner mark a pending digest `reviewed`, `archived`, or `superseded` without executing it. | Implemented backend `automation/digests`, `automation/digests/:digestId/review`, `automation/failure-policies`, `automation/failure-policies/readiness`, scheduler dry-run DTOs, proposal readback, audit completeness, and embedded Owner create/read/refresh/review UI. Digest creation is explicit Owner UI glue only: it never publishes, schedules, calls Gateway, evaluates, notifies, or grants release permission. |
| Automation action handoff | Lists persisted handoff records, lets Owner create a handoff from a reviewed digest, and lets Owner deliver bounded platform action metadata. Delivery records `delivered` or `delivery_failed`; it must not publish cards, run scheduler actions, call Gateway, evaluate submissions, or mutate learner state. | Implemented backend `automation/action-handoffs`, `automation/action-handoffs/:handoffId/deliver`, reviewed digest gate, active failure-policy readiness, and Growth event boundary. Platform Action Inbox/Web Push product evidence remains a separate release gate. |
| Scheduler execution | Lists persisted scheduler execution attempts, lets Owner explicitly attempt one execution from a delivered handoff, and shows `published`, `blocked`, or `failed` outcomes. With default config disabled, the service records a bounded blocked execution row and does not publish. | Implemented backend `automation/scheduler/executions` and `automation/scheduler/execute-once`, release authorization, release activation audit, runtime enablement readback, delivered handoff/digest/failure-policy rechecks, and accepted-proposal publish delegation. The embedded UI is explicit Owner glue only; worker-target UI and production scheduler-execution evidence remain separate gates. |
| Scheduler run | Lists persisted scheduler run/tick rows, lets Owner explicitly request one supervised `background_supervised_tick`, and shows `completed`, `partial`, `skipped`, `blocked`, or `failed` outcomes. With default background config disabled, the service records a bounded blocked run and does not inspect handoffs or execute actions. | Implemented backend `automation/scheduler/runs` and `automation/scheduler/run-once`, delivered action-handoff scan only behind `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, and delegation only to `learning-automation-scheduler-execution-service.executeOnce`. The embedded UI is explicit Owner glue only; it does not enable a background worker, mutate runtime config, call Gateway, publish cards, evaluate submissions, deliver handoffs, or create/review worker targets. Worker-target UI and production scheduler-run UI evidence remain separate gates. |
| Scheduler worker target | Lists persisted worker target configuration rows, lets Owner create a `proposed` target for a visible/provisioned learner scope, and lets Owner review it as `enabled`, `disabled`, or `archived`. Even an `enabled` row is only reviewed configuration evidence; `productionSchedulingAllowed` remains false from this UI. | Implemented backend `automation/scheduler/worker-targets` and `automation/scheduler/worker-targets/:targetId/review`, target-provisioning rechecks, summary-only policy/readiness persistence, and runnable-target readback for the worker service. The embedded UI is explicit Owner glue only; it does not start workers, claim leases, call scheduler run/execution, call Gateway, publish cards, evaluate submissions, deliver handoffs, mutate runtime config, or grant release permission. Production scheduler-worker-target UI evidence remains a separate gate. |
| Cycle drilldown | Explain one generated card or evaluation as a bounded timeline. | `learning-cycles/audit` aggregate DTO. |

The screen must keep child pressure low:

- daily card duration is a backend validation and persistence contract:
  ordinary generated cards must validate within 10-15 minutes and persist
  `expected_duration_minutes_min=10` /
  `expected_duration_minutes_max=15`;
- the primary daily path publishes at most one selected item at a time;
- low scores are shown as evidence for future planning, not as failure gates;
- reflection remains one optional post-evaluation action;
- stage assessment controls stay separate from the daily plan publish action.

Owner correction should be explicit and bounded. The UI may provide a compact
correction action only after rendering the relevant profile-delta or Profile V2
item. That action must call `POST /api/v1/growth/profile-corrections` and must
not mutate local Profile V2 state optimistically as if the correction already
changed durable evidence. After a successful correction write, the UI refreshes
the context route and renders the corrected state from service DTOs. The first
implemented form offers one textarea, one review-action selector, and one
submit button; it is intended for bounded Owner review notes, not raw learner
answers, transcripts, prompts, model output, or source material.

Before production deploy of this flow, run the no-write Gateway readiness
smoke with the same target selectors:

```bash
npm run smoke:planner-readiness -- \
  --workspace-id weixin_stephen \
  --learner-id fanfan \
  --domain-pack-id domain_pack_fanfan_cambridge_pathway_v1 \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --available-minutes 15 \
  --json
```

The smoke output must remain bounded. It may show readiness state, planner
context counts, schema version, horizon, item count, and target node ids. It
must not print raw planner text, raw prompts, raw learner answers, transcripts,
answer keys, private paths, secrets, or provider configuration.

## UI Placement

Add one Owner-only tab to the existing Owner management tabs:

| Tab | Current status | V1 change |
| --- | --- | --- |
| `总览` | existing | unchanged |
| `画像` | existing | unchanged |
| `任务` | existing | unchanged |
| `奖励` | existing | unchanged |
| `AI分析` | existing | unchanged |
| `生成` | new | Owner card generation management |

The `生成` tab should use the existing settings-tab visual language:

- compact tab row;
- 8px or smaller card/control radii for new UI;
- dense operational rows instead of a marketing page;
- existing Growth card preview style for generated output;
- no nested decorative cards.

## Screen Layout

Desktop layout:

- Top summary bar: selected target, recipe, readiness, last generated result.
- Left column: target learner list and generation history.
- Middle column: recipe, target provisioning, readiness, the primary
  `生成操作` action panel, and compact learning-loop state.
- Secondary readbacks under the middle column are grouped into default-collapsed
  disclosures: `画像与证据`, `闭环与自动化`, and `发布与审计`.
- Right column: plan/card preview. The structured input JSON and validation
  audit are also default-collapsed so they remain available for Owner audit
  without becoming the first reading burden.

Mobile layout:

- Target selector becomes a horizontal compact row.
- Recipe and readiness appear before the generate button.
- The primary `生成操作` panel appears before profile feedback, automation,
  scheduler, release, and structured-input readbacks.
- Generated plan/card preview appears before long audit readbacks.
- Profile/evidence, automation, release, and structured-input readbacks are
  default-collapsed. Owner should open one group at a time instead of reading an
  endless vertical log wall.

Mobile scroll contract:

- The Owner management page is embedded inside a Home AI iframe, so scrolling
  must not depend only on iframe root scrolling.
- Growth must consume the Home AI `hermes.plugin.viewport` message in
  `embed=hermes` mode and apply the host iframe height to
  `--app-height` / `--app-viewport-height` before relying on internal scroll
  panels. The iframe height is the root sizing source; raw `100vh` /
  `100dvh` is not sufficient inside the embedded shell.
- Growth must also consume the host top safe-area metric and expose it as
  `--growth-host-top-safe-area`; `.growth-shell` reserves
  `--growth-shell-top-reserve` so the first page header and sticky controls do
  not render under the iOS APP status-bar / Dynamic Island region.
- The settings shell must use a fixed-height internal grid and the active tab
  panel must own vertical scrolling with `overflow-y: auto`,
  `-webkit-overflow-scrolling: touch`, and `touch-action: pan-y`.
- The `生成` tab inherits that active-panel scroll surface so the lower
  controls, including `生成卡片`, remain reachable on mobile viewports.
- Long audit, automation, scheduler, release, and structured-input panels must
  live under `data-card-generation-secondary-readbacks` or a sibling
  `data-card-generation-disclosure`. The main action panel must render before
  that secondary-readback region, and the structured preview must default to a
  collapsed disclosure.
- Release validation for mobile layout must include the central Home AI visual
  toolchain:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- \
  --scenario embedded-plugin-shell \
  --plugin-id growth \
  --debug-url http://127.0.0.1:19073/
```

  If the visual toolchain fails at the Appium, WDA, WebView attach, or live
  debug server layer, classify and recover that layer per the central platform
  contract before treating the result as UI evidence.

- The release package review row has its own release-readiness UI evidence gate:
  `releasePackageReviewUiEvidence` / `release_package_review_ui_evidence`.
  The summary artifact must cover package candidate build, package candidate
  status, and record package action before it can be persisted as pass release
  evidence. A successful candidate build or package record alone is not the UI
  evidence artifact.

## V1 Controls

| Control | Type | V1 behavior |
| --- | --- | --- |
| Learner target | segmented/list row | Visible targets are selectable. Fanfan may be enabled by sample fallback; non-sample targets show a provisioning-required state until an explicit active provision exists. |
| Recipe | segmented control | `日常英语卡` selected; future recipes hidden or disabled. |
| Target provisioning | status row / Owner action | Shows `targetProvisioning.targetEnabled`, mode, selected domain pack/subject, and bounded block reason. The Owner action calls `POST /api/v1/growth/domain-pack-provisions` only after an explicit click. |
| Domain pack | select/menu | Reads `graphOptions.domainPacks`; applying the selector refreshes generation context with `domainPackId`, `domain`, and `subject`. |
| Subject | segmented/select | Reads `graphOptions.subjects`; `science` is the first non-English sample subject. |
| Graph target | bounded selector | V1 can use a recommended English graph node from the context endpoint. Planner-backed UI should normally let the plan choose the exact target node from the selected domain pack/subject. |
| Difficulty | segmented control | default comes from recipe and history summary; Owner can choose one bounded value later. |
| Evidence requirements | read-only chips | shows what the generated card must collect. |
| Structured input preview | collapsed detail | summary-only JSON families, not raw source payloads. |
| Plan draft | preview panel | Shows validated planner item, reason, target node ids, estimated minutes, role, support level, and evidence requirements before publish. |
| Publish attempt | status row | Shows latest bounded `publishAttempt.status`, `error`, `stage`, selected item id, and attempted timestamp when publication failed or was blocked. |
| Profile delta audit | read-only panel | Planned UI panel backed by implemented persisted/public `profile_delta` audit DTO readback; shows bounded changed capability states and evidence basis ids after a generated card is completed. |
| Generate | primary button | ready state submits generation; blocked readiness state stays clickable with `aria-disabled` and must show a visible reason instead of silently using native `disabled`; after a real submit it becomes native disabled and a progress box must appear immediately. |
| Progress box | fixed status panel | shows `prepare`, `gateway`, `validation`, and `publish` stages; no raw model output or private payload is displayed. |
| Open card | secondary button | opens the generated task card in the existing card renderer. |
| Regenerate | secondary/destructive caution | disabled in V1 unless the previous draft failed before publish. |

## Frontend State

Add a plugin-local state slice, for example:

```js
cardGeneration: {
  status: "idle" | "loading_context" | "ready" | "generating" | "published" | "failed",
  selectedWorkspaceId: "", // plugin-local generation target; does not change the iframe's Owner workspace context
  selectedTargetWorkspaceId: "", // legacy alias if a future controller split needs it
  selectedLearnerId: "",
  selectedRecipeId: "daily_english_v1",
  selectedGraphNodeId: "",
  context: null,
  targetProvisioning: null,
  readiness: null,
  generatedCard: null,
  publishAttempt: null,
  progressStep: "prepare" | "gateway" | "validation" | "publish" | "done" | "failed",
  progressMessage: "",
  error: null
}
```

The UI should be implemented in a new plugin-owned module rather than growing
`public/app.js`:

- `public/growth-card-generation-ui.js`;
- optionally `public/growth-card-generation-controller.js` if event handling is
  large enough to justify a split.

`public/app.js` should only wire loading, state, and render calls.

## API Contract

Existing write endpoint:

```http
POST /api/v1/growth/cards/generate
```

Recommended new read endpoint:

```http
GET /api/v1/growth/card-generation/context?targetWorkspaceId={targetWorkspaceId}
```

Implemented route:

```http
GET /api/v1/growth/card-generation/context?targetWorkspaceId={targetWorkspaceId}
```

Implemented daily-loop facade routes:

```http
GET /api/v1/growth/daily-loop/preview
POST /api/v1/growth/daily-loop/draft
POST /api/v1/growth/daily-loop/advance
POST /api/v1/growth/daily-loop/publish
```

`daily-loop/advance` is the product-visible one-click Owner path for daily
card generation. It delegates to `learning-daily-loop-service.advance()`, which
first drafts a validated daily plan through the existing planner/publisher
boundary and then publishes the selected daily item through the existing
publish boundary. It is still an explicit Owner write action, not background
scheduling or browser-side state recomputation. The separate `规划下一张` and
`发布为卡片` buttons remain available for inspection and recovery.

The Owner browser may pass only the selected recipe and target workspace for
the normal sample path. `learning-daily-loop-service` must hydrate the
domain-pack/domain/subject/target-node scope from card-generation context before
delegating to plan publication, and `learning-plan-publisher-service` must pass
the selected recipe into card generation. This keeps Fanfan science generation
service-owned instead of depending on duplicated browser selectors.

Implemented lower-level planner routes:

```http
POST /api/v1/growth/learning-plans/draft
POST /api/v1/growth/learning-plans/{planDraftId}/publish
```

Implemented audit read routes:

```http
GET /api/v1/growth/evidence/audit
GET /api/v1/growth/learning-plans/audit
GET /api/v1/growth/learning-cycles/audit
GET /api/v1/growth/learning-cycles/completeness
GET /api/v1/growth/profile-delta-audits
GET /api/v1/growth/profile-corrections
GET /api/v1/growth/owner-audit/reviews
POST /api/v1/growth/owner-audit/reviews
```

The Owner generation page includes a `完成周期审核` panel over
`owner-audit/reviews`. The panel is for closure review after a completed daily
cycle: Owner selects a history cycle, optionally enters one bounded summary
note, then records `accepted`, `needs_follow_up`, `correction_recorded`, or
`blocked`. The panel does not create correction evidence; `correction_recorded`
is enabled only when the selected cycle already has a correction id from the
separate Owner correction flow. The browser does not compute profile feedback,
fabricate cycle selectors, call Gateway, generate or evaluate cards, schedule,
or mutate learner state directly. It only lists review rows and submits
selected-cycle selectors, decision, and bounded note to the service-owned
Owner-only write route.

Implemented supervised proposal routes:

```http
GET /api/v1/growth/automation/proposals
POST /api/v1/growth/automation/proposals
POST /api/v1/growth/automation/proposals/:proposalId/decision
POST /api/v1/growth/automation/proposals/:proposalId/publish
```

These routes are visible-target scoped and return bounded public DTOs only.
`GET /api/v1/growth/learning-plans/audit` and
`GET /api/v1/growth/learning-cycles/audit` include latest bounded plan
`publishAttempt` metadata so the UI can explain failed or blocked publication
without reading SQLite tables.
`GET /api/v1/growth/learning-cycles/completeness` evaluates the public cycle
audit DTO for required findings and missing evidence. It is the preferred UI
source for readiness/closure badges and for later automation dry-run gates.
`POST /api/v1/growth/automation/proposals` is Owner-only and may create a new
validated plan draft for proposal review only after source-cycle completeness
and target provisioning pass. It returns a proposal plus the explicit Owner
publish action; the UI must still call the existing plan publish route to
create a card.
`POST /api/v1/growth/automation/proposals/:proposalId/decision` is Owner-only
and records only the Owner proposal decision. Valid decisions are `accepted`,
`skipped`, `expired`, and `superseded`. An accepted decision may return the
same explicit publish action for the UI, but it must not publish the card or
schedule any work.
`POST /api/v1/growth/automation/proposals/:proposalId/publish` is Owner-only
and publishes only an already accepted proposal. It delegates to the same
backend plan publisher as `POST /api/v1/growth/learning-plans/:planDraftId/publish`,
records bounded proposal execution metadata, returns a visible failure when
publication fails, and does not schedule future work. The current embedded
Owner panel implements the selected-cycle create/read/review/accepted-publish
part of this boundary: it creates a proposal from the selected historical
cycle's service-provided selectors, lists proposals for the selected visible
target and scoped learner/domain-pack/subject, records `accepted`, `skipped`,
`expired`, or `superseded`, and calls the accepted proposal publish route only
after explicit Owner action. Expired and superseded proposal decisions are
terminal review states only; they must not expose a publish action, schedule
work, or mutate recommendation lifecycle rows.
Recommendation lifecycle decisions are separate: the same Owner generation
surface can mark a pending next-card recommendation `skipped` or `expired`
through `POST /api/v1/growth/recommendations/lifecycle/review`, then refreshes
the context readback. This does not create a proposal, publish a card, call
Gateway, or schedule work.
The daily generation screen should prefer the scoped context DTO for its first
refresh, while history/drilldown views can call the direct audit routes. The
cycle audit route is the preferred drilldown API when the UI has a
`taskCardId`, `evaluationId`, or `planDraftId`.

Target/domain-pack provision route:

```http
POST /api/v1/growth/domain-pack-provisions
```

This route is Owner-only and must still pass Growth view-target visibility for
the target workspace before writing a provision. It delegates to
`learning-target-provisioning-service`; the route must not validate domain
pack policy or write `learning_growth_domain_pack_provisions` directly.

Direct plugin-port callers may still use `workspaceId` for backward-compatible
workspace-bearer reads. Home AI same-origin proxy callers must use
`targetWorkspaceId` for context reads and must send the generation target only
in the POST body as `workspace_id`; the proxied URL itself remains under the
Owner workspace authorization context.

The frontend API client must build Growth API paths from path segments instead
of hard-coded `/api/...` string literals. The Home AI same-origin proxy rewrites
static plugin assets and appends the actor `workspaceId`; hard-coded API
literals inside JavaScript can therefore be rewritten into the wrong query
shape. Growth JS and CSS URLs in `public/index.html` should carry a version
query for card-generation releases so mobile WebViews fetch the current API
client and UI state code. The current frontend cache key is
`20260616-worker-target-ui-v1`; the frontend adapter harness asserts that
older `20260614-growth-navigation-v1`, `20260614-stage-assessment-ui-v1`, and
`20260614-evaluation-failure-ui-v1`, and
`20260614-owner-evaluation-retry-v1`, and
`20260614-owner-evaluation-retry-ui-v1`, and
`20260614-owner-evaluation-status-ui-v1`,
`20260614-recommendation-rationale-ui-v1`, and
`20260616-action-handoff-ui-v1`, and
`20260616-scheduler-execution-ui-v1`, and
`20260616-scheduler-run-ui-v1` keys are no longer present.

Recommended context response:

```json
{
  "target": {
    "workspaceId": "weixin_fanfan",
    "learnerId": "fanfan",
    "displayName": "凡凡",
    "enabled": true
  },
  "targetProvisioning": {
    "ok": true,
    "targetEnabled": true,
    "mode": "sample_default",
    "selectedDomainPackId": "domain_pack_fanfan_cambridge_pathway_v1",
    "selectedDomain": "science",
    "selectedSubject": "science",
    "error": ""
  },
  "recipes": [
    {
      "id": "daily_english_v1",
      "label": "日常英语卡",
      "cardRole": "practice",
      "completionPolicy": "daily_score_once"
    }
  ],
  "generationDefaults": {
    "domain": "english",
    "subject": "english",
    "defaultCardRole": "practice",
    "defaultDifficultyBand": "foundation",
    "cardSchemaVersion": "growth.card.authoring.v1"
  },
  "graphOptions": {
    "ok": true,
    "available": true,
    "selectedDomainPackId": "domain_pack_fanfan_cambridge_pathway_v1",
    "selectedDomain": "science",
    "selectedSubject": "science",
    "subjects": ["science", "physics"],
    "domainPacks": [
      {
        "domainPackId": "domain_pack_fanfan_cambridge_pathway_v1",
        "importId": "kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1",
        "domain": "cross_subject_curriculum",
        "title": "Fanfan Cambridge Lower Secondary to IGCSE and A Level pathway seed",
        "version": "2026-05-27-v1",
        "nodeCount": 294,
        "subjectCount": 9,
        "subjects": ["cross_subject", "english", "mathematics", "science", "english_esl", "biology", "chemistry", "physics", "computer_science"]
      }
    ]
  },
  "readiness": {
    "workspaceProvisioned": true,
    "learningGraphReady": true,
    "historySummaryReady": true,
    "gatewayConfigured": true,
    "authoringGatewayConfigured": true,
    "evaluationGatewayConfigured": true,
    "aiLoopGatewayReady": true,
    "blockingOpenGeneration": false
  },
  "suggestedPlan": {
    "targetNodeId": "node_english_daily_reading_foundation",
    "domain": "english",
    "difficulty": "foundation",
    "evidenceRequirements": ["short_answer", "self_reflection_optional"]
  },
  "nextCardRecommendation": {
    "selectionMode": "recommendation",
    "recommendationMode": "trajectory",
    "strategy": "repair",
    "cardRole": "teaching",
    "difficultyBand": "repair",
    "targetNodeId": "kg_english_evidence_answering",
    "reason": "Latest evaluation trajectory asks for one evidence repair card."
  },
  "recommendationLifecycle": [
    {
      "trajectoryId": "traj_accepted_1",
      "status": "accepted",
      "strategy": "repair",
      "targetNodeIds": ["kg_english_evidence_answering"],
      "reason": "Generated an evidence repair card.",
      "taskCardId": "ltask_1",
      "sourceEvaluationId": "eval_1",
      "generatedTaskCardId": "ltask_generated_1",
      "generatedLearningGraphPlanId": "lgp_generated_1",
      "acceptedAt": "2026-06-14T08:10:00.000Z",
      "statusUpdatedAt": "2026-06-14T08:10:00.000Z"
    },
    {
      "trajectoryId": "traj_superseded_1",
      "status": "superseded",
      "strategy": "stretch",
      "targetNodeIds": ["kg_english_main_idea"],
      "reason": "Older stretch suggestion was replaced.",
      "supersededByTrajectoryId": "traj_accepted_1",
      "supersededAt": "2026-06-14T08:12:00.000Z"
    }
  ],
  "historySummary": {
    "recentCards": 6,
    "recentEvaluations": 4,
    "recentReflections": 1
  },
  "learningProfile": {
    "summary": {
      "masteryStateCount": 2,
      "weaknessCount": 1,
      "strengthCount": 1,
      "recentExperienceSignalCount": 1,
      "recentTrajectoryCount": 1
    },
    "weaknesses": [
      {
        "nodeId": "kg_english_evidence_answering",
        "status": "developing",
        "score": 64,
        "summary": "Needs exact text evidence."
      }
    ],
    "recentExperienceSignals": [
      {
        "targetNodeId": "kg_english_evidence_answering",
        "signalType": "not_learned",
        "summary": "Needs another focused practice."
      }
    ],
    "recentTrajectory": [
      {
        "taskCardId": "ltask_1",
        "strategy": "stabilize",
        "performanceSummary": "Score 64; evidence was vague."
      }
    ],
    "nextCardStrategy": {
      "strategy": "stabilize",
      "reason": "Use one more short evidence-answering card."
    }
  }
}
```

The context endpoint must be read-only and summary-only. It must not expose raw
learner submissions, raw transcripts, raw prompts, hidden answer keys, or raw
model output. `targetProvisioning`, `graphOptions`, `learningProfile`,
`profileV2`, `evidenceAudit`, `plannerContextPreview`,
`nextCardRecommendation`, and `recommendationLifecycle` are target-workspace
scoped; Owner viewing a learner must see that learner's provision,
graph/profile/evidence projections, and recommendation lifecycle, not the
Owner workspace's rows.

The Owner UI renders `recommendationLifecycle` as the "推荐闭环" panel. Rows may
show lifecycle status, strategy, target node id, short reason, generated
card/plan ids, superseded-by trajectory id, and bounded timestamps. Pending
rows may expose only two explicit Owner actions: `skipped` and `expired`.
Those buttons call the API client helper for
`POST /api/v1/growth/recommendations/lifecycle/review`, show submitting /
reviewed / failed state, and refresh the selected learner context after
success. The UI must not mark `accepted`, infer lifecycle state from raw
trajectory JSON, mutate `superseded`, display raw learner content, call
Gateway, publish/generate cards, evaluate submissions, schedule work, or
deliver notifications.

After a daily card or stage-assessment card publishes, the embedded UI must
refresh `GET /api/v1/growth/card-generation/context` for the selected learner
without calling the full loading path. This keeps the published card preview
and open-card button visible while updating `recommendationLifecycle` so the
Owner sees the consumed recommendation move out of pending state. If the
context refresh fails, the card remains published and the UI shows a bounded
refresh warning instead of rolling back the visible result.

`learningProfile.recentExperienceSignals` can come from two Growth-owned
sources: evaluation-derived mastery updates and learner-facing difficulty
feedback written by `learning-experience-signal-service` through
`POST /api/v1/growth/cards/:taskCardId/experience-signals`. The Owner
generation page only reads these summary-only signals; it does not write
difficulty feedback from the Owner generation surface.

## Generate Request

The UI should call the existing generation endpoint with a bounded recipe
request. The Owner UI may display the suggested graph target, role, difficulty,
and recommendation rationale, but ordinary daily generation must not require
the browser to submit those graph-policy fields:

```json
{
  "workspace_id": "weixin_fanfan",
  "learner_id": "fanfan",
  "recipe_id": "daily_english_v1",
  "card_schema_version": "growth.card.authoring.v1"
}
```

`learning-card-generation-recipe-policy-service` normalizes the recipe,
English domain/subject defaults, card schema version, and `daily_score_once`
policy. `learning-card-next-target-service` then chooses the graph target from
the selected learner's trajectory/profile before graph fallback. Stage
assessment generation remains a separate explicit coverage flow and does not
use this compact daily recipe payload.

## Daily English Recipe

V1 recipe definition:

| Field | Value |
| --- | --- |
| `recipeId` | `daily_english_v1` |
| Label | `日常英语卡` |
| Role | `practice` or `teaching`, chosen by graph/history summary |
| Duration | 10-15 minutes |
| Evidence | short answer plus optional reflection |
| Completion | first evaluation completes the card |
| Reflection | one optional reflection only |
| Reward | score-proportional up to the card reward cap |
| Tone | low-pressure daily learning, not an exam |

The generated card must include a valid `teachingFlow`:

- learning target;
- prerequisites;
- micro lesson;
- worked example;
- guided practice;
- quick check;
- too-hard fallback;
- evidence to record;
- difficulty basis;
- support level.

## Error States

| State | UI behavior |
| --- | --- |
| Not Owner | Hide the `生成` tab. |
| Target not enabled | Show disabled target row and no generate button. |
| Target not provisioned | Show `learning_target_not_provisioned` or a mapped bounded message, keep the primary action visible with a reason, and offer Owner provision action when the actor is Owner. |
| Missing Gateway config | Disable generate and show a bounded configuration status. |
| Missing graph | Disable generate and link to graph import/readiness status. |
| Missing history | Allow generation only if recipe declares history optional. |
| Gateway timeout | Show retryable authoring failure. |
| Empty output | Show validation failure; do not publish. |
| Invalid JSON after repair | Show validation failure; do not publish. |
| Schema or privacy failure | Show Owner review required; do not publish. |
| DB transaction failure | Show publish failure; no generated program, draft, graph binding, or half-card should exist. |

## Production Wiring

The Owner UI calls only Growth plugin routes. It must not call Gateway from the
browser.

When the plugin is embedded through the Home AI same-origin proxy, browser-side
Growth API calls must use the plugin proxy prefix, for example
`/api/hermes-plugins/growth/proxy/api/v1/growth/card-generation/context`.
Absolute browser calls to Home AI root `/api/v1/growth/...` are invalid in
embedded mode because they bypass the plugin proxy dispatcher.

Production generation requires:

- a configured Gateway authoring endpoint:
  `GROWTH_GATEWAY_AUTHORING_ENDPOINT`;
- the official Gateway Responses protocol, either explicit through
  `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint;
- `GROWTH_GATEWAY_AUTHORING_MODEL` when the selected Gateway worker requires an
  explicit model;
- the Gateway token through `GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH` or the
  platform secret boundary.
- a configured Gateway evaluation endpoint:
  `GROWTH_GATEWAY_EVALUATION_ENDPOINT`;
- the official Gateway Responses protocol for evaluation, either explicit
  through `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint;
- the evaluation Gateway token through
  `GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN_PATH` or the platform secret
  boundary.

The Home AI same-origin plugin proxy is the expected UI path. It checks Hermes
workspace access first, then attaches the server-side Growth workspace bearer
to proxied write requests. Direct calls to `http://127.0.0.1:4881` still need
`Authorization: Bearer <workspace-local .hermes-growth/access-key.txt>`.

## Implementation Slices

1. Add read-only context service:
   - `learning-card-generation-context-service`;
   - uses view targets, graph repository, profile projection, and history
     summary;
   - returns readiness, recipe options, selected learner profile/trajectory,
     and next-card strategy reason.
2. Add route:
   - `GET /api/v1/growth/card-generation/context`.
3. Add frontend API helpers:
   - `fetchCardGenerationContext(targetWorkspaceId)`;
   - `fetchLearningLoopState(targetWorkspaceId, context)`;
   - `fetchGrowthReleaseWorkbench(targetWorkspaceId, context)`;
   - `recordGrowthReleaseWorkbenchAction(payload, targetWorkspaceId)`;
   - `advanceGrowthDailyLoop(payload, targetWorkspaceId)`;
   - `draftGrowthDailyLoop(payload, targetWorkspaceId)`;
   - `publishGrowthDailyLoop(payload, targetWorkspaceId)`;
   - `fetchGrowthCycleAudit(payload, targetWorkspaceId)`;
   - `fetchGrowthCycleCompleteness(payload, targetWorkspaceId)`;
   - `generateGrowthCard(payload, targetWorkspaceId)` remains only as a
     compatibility helper for the legacy direct card-generation route.
4. Add Owner UI:
   - `growth-card-generation-ui.js`;
   - render inside Owner `生成` tab;
   - expose separate `规划下一张` and `发布为卡片` actions.
5. Add controller:
   - load context when Owner opens the tab or changes target;
   - draft one daily plan through
     `POST /api/v1/growth/daily-loop/draft`;
   - show bounded plan preview before publication;
   - publish one selected item through
     `POST /api/v1/growth/daily-loop/publish`;
   - refresh board, card-generation context, and learning-loop state after
     publish;
   - refresh release workbench state after context load, target provisioning,
     plan draft, and publish/context refresh;
   - refresh single-card cycle audit/completeness after publish when a cycle
     anchor is available, while keeping failures visible only inside the audit
     drilldown panel.
6. Keep existing card renderer:
   - published card appears in board lanes using the existing DTO path.

Implemented V1 files:

- `src/services/learning-card-generation-context-service.js`;
- `src/services/learning-profile-projection-service.js`;
- `GET /api/v1/growth/card-generation/context` in
  `src/routes/growth-routes.js`;
- `public/growth-card-generation-ui.js`;
- `public/growth-homeai-legacy.css`;
- `public/growth-api-client.js`;
- Owner `生成` tab integration in `public/growth-legacy-ui.js`;
- Owner management entry and generation event handling in `public/app.js`.

Next planner/provisioning files:

- `src/services/learning-target-provisioning-service.js`;
- `src/stores/growth-learning-sqlite/domain-pack-provisions.js`;
- Owner-only `POST /api/v1/growth/domain-pack-provisions` in
  `src/routes/growth-routes.js`;
- `targetProvisioning` projection in
  `learning-card-generation-context-service`.

## Harness Plan

Add focused tests before broad regression runs:

| Boundary | Harness |
| --- | --- |
| Recipe policy service | normalizes compact `daily_english_v1` requests, exposes public recipe context, and leaves stage assessment outside daily defaults |
| Context service | returns Fanfan sample, readiness, separate planner/authoring/evaluation Gateway status, recipe, `graphOptions`, graph suggestion, bounded history summary, Profile V2, evidence audit, and selected learner profile projection |
| Graph option projection | `tests/learning-graph-repository.test.js` proves domain-pack and subject options project from native graph tables without `raw_json` |
| Planner readiness smoke CLI | `tests/growth-planner-readiness-smoke-script.test.js` proves bounded argument parsing and target-node id de-duplication |
| Planner draft/publish service | `tests/learning-plan-publisher-service.test.js` proves validated plan drafts persist summary-only previews and publish selected items only through the card-generation service |
| Daily-loop backend facade | `tests/learning-daily-loop-service.test.js`, `tests/learning-plan-publisher-service.test.js`, `tests/growth-daily-loop-smoke-script.test.js`, `tests/growth-routes.test.js`, and `tests/learning-card-ai-loop-harness.test.js` prove Owner-only preview/draft/advance/publish delegation, visible-target scope, context-scope hydration, recipe propagation into card generation, bounded generation projection, board/detail visibility, publish failure visibility, daily card duration persistence, audit/completeness refresh, one submit/evaluate/reflect learner cycle, duplicate daily submission/reflection rejection, privacy-risk input rejection, and non-sample explicit-provision daily-loop completion without Fanfan row leakage |
| Automation proposal repository/service | `tests/learning-automation-proposal-repository.test.js` and `tests/learning-automation-proposal-service.test.js` prove source-cycle id, audit-completeness gate, target provisioning, idempotent summary-only proposal persistence, Owner decision statuses, accepted-only publish execution, execution metadata, legacy decision/execution-column migration, DB-level privacy-class/privacy-key rejection, and no direct card-generation/Gateway/scheduler call |
| Target provisioning service | `tests/learning-target-provisioning-service.test.js` proves sample fallback, non-sample blocking, explicit provision success, cross-subject domain-pack plus subject-domain selection, subject mismatch rejection, graph-node mismatch rejection, and summary-only public DTOs |
| Target provisioning smoke CLI | `tests/growth-target-provisioning-smoke-script.test.js` and `npm run smoke:target-provisioning`; the CLI defaults to read-only resolve, requires explicit `--allow-write` for provision writes, delegates to `learning-target-provisioning-service`, and supports production cross-subject packs such as `domain_pack_fanfan_cambridge_pathway_v1` with `subject=science` |
| Domain-pack provision route | `tests/growth-routes.test.js` proves Owner-only provision writes and view-target scoping |
| Profile projection service | returns bounded mastery, weakness, signal, trajectory, and next-card strategy without raw answer/source-ref leakage |
| Context route | Owner-scoped workspace target, not actor-as-target fallback |
| API client | GET context with target/domain-pack/subject query handling, GET learning-loop state with subject/capability/coverage selectors, legacy POST generate compatibility, daily-loop advance/draft/publish helpers, profile-correction POST helper, recommendation lifecycle review POST helper, domain-pack provision POST helper, and workspace query/proxy handling |
| UI render | Owner sees `生成`; learner does not; Owner generation page renders target provisioning, domain-pack/subject selectors, learning-loop state, active checkpoint open-card action, formal stage-checkpoint rubric readback from the controls DTO, learning profile/trajectory projection, Owner audit/correction summary, one-click `生成卡片`, separate draft/publish buttons, visible progress, and bounded plan preview |
| UI closed-loop action plan | renders `data-automation-closed-loop-action-plan-panel` before operating-loop execution, calls the no-write action-plan route through `fetchGrowthAutomationClosedLoopActionPlan`, shows the service-provided next action, phase rows, readiness booleans, and visible action/error state, refreshes after context/proposal/digest/failure-policy/handoff changes, and dispatches only supported next actions to existing Growth-owned functions (`learning-loop/advance`, cycle-closure prepare, review-advancement advance, and action-handoff delivery). Unsupported next actions remain visible and blocked instead of silently doing nothing. The browser must not call Gateway, generate/evaluate cards directly, execute schedulers, infer scheduler permission, reconstruct policy, or include raw prompts/transcripts/private payloads. |
| UI profile feedback | renders `data-profile-feedback-panel` near learning-loop state and learner profile, calls Owner-only `GET /api/v1/growth/profile-feedback` through `fetchGrowthProfileFeedback`, and shows completed-cycle selector, evidence count, profile-delta count, reward coins, Owner review signal, recommendation strategy, and next action from the summary-only service DTO. Missing or blocked completed-cycle evidence must remain visible as `待补齐` / `无完成周期` rather than becoming a generic network failure. The browser may pass selected-cycle selectors or explicit read-only auto-selection flags, but it must not compute Profile V2, fabricate cycle selectors, inspect ledger/profile/reward storage, call Gateway, generate/evaluate cards, schedule work, or mutate learner state. |
| UI release workbench | renders `data-release-workbench-panel`, release status/missing evidence/approval/record counts, advertised Owner actions, action result/error state, and constructs summary-only `release-workbench/actions` payloads for supported evidence/approval/evidence-collection/decision/package/activation/runtime enablement endpoints without package placeholders. It also renders `data-release-artifact-template-panel` from the no-write release artifact-template readback, including artifact slots, checklist rows, action-plan rows, manifest schema status, refresh state, and direct/proxy API client coverage for `GET /api/v1/growth/automation/release-artifact-template`. It renders `data-release-status-readbacks-panel` as read-only release ladder visibility, renders `data-release-evidence-ledger-panel` as read-only persisted release evidence/approval ledger visibility over the existing list routes, and renders `data-release-lifecycle-records-panel` for explicit Owner record/list coverage over preflight reports, activation records, and runtime enablement records. The frontend harness explicitly covers `release_approval` payloads with `approval_key`/`config_gate`, `release_evidence_collection` payloads with missing-evidence-derived bounded `tasks` / `required_task_ids` / `write_collection_run` / `write_release_evidence_records`, workbench-provided `auto_select_latest_completed_cycle` for profile-feedback collection, `release_decision` payloads with `auto_select_latest_ready_collection_run`, release artifact-template query payloads, release evidence-ledger query payloads, release lifecycle record query/record payloads, and absence of `writefulSchedulingAllowed`, raw prompts, raw artifact paths, or transcripts. |
| UI target state | Visible targets are selectable; non-sample targets do not draft/publish until target provisioning passes |
| UI plan preview | renders the validated daily-loop plan draft id, selected item, target nodes, role, difficulty, evidence requirements, publish attempt state, and publishes only after explicit Owner action |
| UI provisioning | renders `targetProvisioning`, prevents silent no-op generation when blocked, applies selected graph scope through context refresh, and calls the provision route only after explicit Owner action |
| UI audit panel | renders `ownerAudit`, persisted profile-delta audit summaries, Owner correction history, next recommendation, and recommendation lifecycle from context DTOs without raw source payloads |
| UI recommendation lifecycle review | renders pending recommendation `跳过` / `过期` actions, constructs summary-only review payloads from service-provided selectors, calls `reviewGrowthRecommendationLifecycle`, refreshes context after success, and never marks `accepted`, publishes/generates cards, calls Gateway, evaluates, schedules, or delivers notifications |
| UI cycle drilldown | calls `fetchGrowthCycleAudit` and `fetchGrowthCycleCompleteness`, renders single-card timeline/findings/missing-required state, keeps no raw source payloads, and does not schedule or publish |
| UI proposal review | creates supervised proposals from a selected historical cycle, lists proposals, shows bounded rationale and required Owner publish action, records `accepted`/`skipped`/`expired`/`superseded` decisions, can call explicit accepted-proposal publish, and never auto-publishes, schedules, calls Gateway, evaluates, or delivers notifications after proposal creation or decision. Production visual/release evidence remains a separate release gate. |
| UI automation digest review | creates a persisted dry-run digest from the selected bounded scope through `POST /api/v1/growth/automation/digests`, lists persisted dry-run digests, shows would-publish/blocked/skipped/manual-action counts and bounded candidate state, keeps explicit publish manual, records digest `reviewed`/`archived`/`superseded` state, and never publishes, schedules, calls Gateway, evaluates, or notifies during digest create, refresh, or review. |
| UI action handoff | lists persisted handoffs, shows reviewed-digest create rows and delivery status, calls handoff create/deliver routes only on explicit Owner click, and never publishes cards, schedules work, calls Gateway, evaluates, activates stage assessments, or treats notification delivery as release permission. |
| UI scheduler execution | lists persisted scheduler execution attempts, shows delivered-handoff execute rows, builds summary-only `owner_explicit_once` payloads from handoff action metadata, calls `POST /api/v1/growth/automation/scheduler/execute-once` only on explicit Owner click, and displays blocked/default-disabled records without treating them as release permission. |
| UI correction action | calls `POST /api/v1/growth/profile-corrections`, refreshes context after success, and does not mutate Profile V2 optimistically in browser state |
| UI evidence audit | renders evidence history from context or `GET /api/v1/growth/evidence/audit`; never displays raw answers, transcripts, prompts, model output, source bodies, private paths, or provider config |
| UI profile-delta audit | render changed capability states from `GET /api/v1/growth/profile-delta-audits` persisted/public backend DTOs and never compute diffs from raw source payloads |
| UI readiness | generate button disabled until authoring readiness passes; evaluation Gateway status remains visible as AI-loop readiness |
| UI submit | calls Growth endpoint, not Gateway directly |
| UI success | published result shows card preview and open-card action |
| UI failures | timeout, invalid JSON, privacy failure, and DB publish failure display bounded messages |
| Gateway wire protocol | official `/v1/responses` request body and nested output text parsing |
| SQLite publish | FK-backed publish creates missing program/draft parent rows and rolls back them with the card on failure |
| Proxy write auth | Home AI same-origin proxy attaches server-side Growth bearer for writes |
| Boundary guard | frontend has no vendor model endpoint and no raw prompt field |

Recommended command group after implementation:

```bash
node --test tests/learning-card-generation-context-service.test.js \
  tests/learning-card-generation-recipe-policy-service.test.js \
  tests/learning-graph-repository.test.js \
  tests/learning-plan-publisher-service.test.js \
  tests/learning-target-provisioning-service.test.js \
  tests/growth-planner-readiness-smoke-script.test.js \
  tests/learning-profile-projection-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-frontend-adapter.test.js
npm run check
npm test
git diff --check
```

Current focused harness:

```bash
node --test tests/learning-card-generation-context-service.test.js \
  tests/learning-card-generation-recipe-policy-service.test.js \
  tests/learning-graph-repository.test.js \
  tests/learning-target-provisioning-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-frontend-adapter.test.js
```

## Mockup

The static mockup lives at:

- `docs/mockups/growth-card-generation-management.html`

The exported screenshot should live at:

- `docs/mockups/growth-card-generation-management.png`
