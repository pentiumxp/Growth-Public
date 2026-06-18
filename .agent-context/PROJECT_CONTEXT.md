# Growth Plugin Project Context

## Purpose

This workspace is the clean Home AI Growth embedded plugin workspace.

The older Mac `growth` directories were Home AI full-repository clones, not
standard plugins. They remain useful only as references to the built-in Growth
module and have been archived outside this workspace.

## Canonical Platform Contract

Read `docs/HOME_AI_PLATFORM_CONTRACT.md` first for local facts and canonical
Home AI contract links.

Growth-specific documents are owned by this plugin workspace. Use
`docs/GROWTH_DOCS_INDEX.md` as the local index for Growth product,
architecture, card-generation, implementation, and runbook documents. Broad
Home AI platform contracts remain in the Home AI app workspace by pointer.
Growth-local Harness selection is now recorded in `docs/TEST_MATRIX.md` and
`docs/IMPLEMENTATION_NOTES/harness-required-matrix.md`; docs-locality requires
both files, and `npm run test:release-union` is the local shortcut for the
release package/review/authorization/closure/preflight/activation/runtime
readback gate set.

## Current State

- Plugin id: `growth`.
- Default local port: `4881`.
- Registration credential env: `GROWTH_REGISTRATION_KEY` or
  `GROWTH_REGISTRATION_KEY_PATH`.
- Workspace binding: `.hermes-growth/config.json` and
  `.hermes-growth/access-key.txt`.
- Plugin-owned SQLite connections set a bounded `PRAGMA busy_timeout`.
  Configure it with `GROWTH_SQLITE_BUSY_TIMEOUT_MS`; default is `5000`.
  The applied value is exposed as `sqlite_busy_timeout_ms` in SQLite
  integrity readback.
- 2026-06-18 local closed-loop harness status: `npm run
  smoke:local-daily-cycle` now runs a Growth-owned fake-Gateway full daily
  cycle through planner draft, card authoring, learner submit/evaluate/reflect,
  profile-feedback, and loop-state readback. The fresh Fanfan science run over
  `kg_ls_science_scientific_enquiry_consider_evidence_and_approach` passed
  with `ok=true`, card `ltask_483dada0919ab7f613`, evaluation
  `lgeval_6979f9eb55f2095728`, profile-feedback `pass`, and next action
  `draft_daily_plan`. This is local fake-Gateway implementation evidence only,
  not production Gateway, release, visual, platform-action, scheduler, or
  deployment evidence.
- 2026-06-18 Owner primary generation UI boundary: the embedded Owner
  `生成卡片` button now uses `POST /api/v1/growth/learning-loop/advance` with
  `action=run_next` through `advanceOperatingLoopFromUi()`. Direct
  `daily-loop/advance` remains a compatibility and Harness route, but the
  browser must not use it as the primary policy selector.
- 2026-06-18 local central visual status: the current dev package was rechecked
  through the Home AI central iOS PWA visual toolchain using a local Growth
  dev server on `127.0.0.1:14881` and Home AI dev on `18797` with the Growth
  manifest pointed at that local plugin. Owner provisioning was performed
  through the host grant route, after which `embedded-plugin-shell
  --plugin-id growth` and `dark-growth-surfaces` both passed. Artifacts:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260617T223324Z.png`
  and
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260617T223337Z.png`.
  This is local visual evidence only, not production release approval,
  production deployment, release-evidence persistence, or production Gateway
  evidence.
- 2026-06-18 production deployment-health evidence status: Growth now has a
  read-only summary collector,
  `npm run collect:production-deployment-evidence`, backed by
  `scripts/collect-growth-production-deployment-evidence.js`. The collector
  parses Home AI macOS launchd state, the public Growth plugin manifest, and
  the public Growth status endpoint into a
  `growth.homeAiProductionDeploymentHealthArtifact.v1` summary artifact. It
  never echoes raw launchd output, raw environment, credentials, private paths,
  deployment logs, or service stdout/stderr, and it does not deploy, restart,
  mutate runtime config, grant scheduler permission, call Gateway, or touch
  learner state. The artifact feeds the existing
  `learning-automation-production-deployment-evidence-service` validator and
  the release evidence collection path as
  `productionDeploymentHealthEvidence`.
- 2026-06-18 real production deployment-health evidence was collected and
  persisted under the `weixin_stephen/science/daily_plan` scope. The summary
  artifact passed with launchd running, manifest OK, Growth status OK,
  SQLite integrity OK, `checkCount=4`, `failedCheckCount=0`, and no private
  path or bearer/token-looking values. `smoke:production-deployment-evidence`
  returned `ok=true`, `readyForReleaseEvidence=true`; release evidence
  collection wrote run `lgacrn_e8307dddd7c9db67e4` plus pass records
  `productionDeploymentHealthEvidence` (`lgarev_dc8adeef1ae47200ff`) and
  `releaseEvidenceBundleAudit` (`lgarev_b3a3eac7fa90996802`). Independent
  release-readiness readback moved to `passCheckCount=30`,
  `missingRequiredCount=17`, `missingEvidenceCount=13`,
  `persistedEvidenceKeyCount=23`, and confirmed
  `productionDeploymentHealthEvidence` is persisted. This still does not mark
  the release ready, deploy code, approve release state, mutate runtime config,
  grant scheduler permission, call Gateway, publish cards, or mutate learner
  state.
- 2026-06-18 profile-feedback release evidence was persisted for the same
  `weixin_stephen/science/daily_plan` scope using the real completed-cycle
  selector (`--auto-select-latest-completed-cycle`). Collection run
  `lgacrn_af3f722646b2a28bea` wrote
  `productionProfileFeedbackSmokeEvidence` plus
  `releaseEvidenceBundleAudit`, moving readiness to `passCheckCount=31`,
  `missingRequiredCount=16`, `missingEvidenceCount=12`, and
  `persistedEvidenceKeyCount=24`. This was summary-only readback evidence; it
  did not call Gateway, generate cards, publish, evaluate, notify, deploy,
  mutate runtime config, or grant scheduler permission.
- 2026-06-18 supervised automation proposal service now supports an explicit
  existing-draft path: `existingPlanDraftId` / `--existing-plan-draft-id`
  loads a draft only through `learning-plan-publisher-service.getPlanDraft`,
  requires `status=draft`, selects a draft item, rechecks target provisioning
  from that item, and creates the same summary-only Owner proposal without a
  new planner call. This closes a service-first architecture gap for
  action-handoff construction when a validated draft already exists. It is not
  planner-readiness evidence and does not bypass release evidence,
  publication, Gateway, scheduler, or platform delivery gates.
- Current dev shell cannot satisfy production planner or platform delivery
  gates because production Gateway/Home AI notification credentials are owned
  by the running production service identity and are not readable from this
  workspace user. Do not record credential locations. Run those gates through
  the production service/proxy or an authorized production collector, not by
  fabricating local fake-Gateway or local delivery evidence.
- 2026-06-18 production release-readiness persisted-evidence fix is deployed
  as Growth commit `f436e9671e77`. The fix preserves persisted pass
  release-evidence records when HTTP/CLI input only carries absent or false
  inline evidence flags for the same key. Production readback now marks both
  `production_planner_readiness_evidence` and
  `production_daily_loop_write_smoke_evidence` as `pass`, backed by persisted
  records `lgarev_3f1ec573d9821215a3` and
  `lgarev_c13074fb18c2eb8f9e`. Release-readiness remains advisory and
  incomplete (`pass=8`, `missing=39`), with no scheduler/runtime permission
  granted.
- 2026-06-18 production learner-loop state: the generated science card
  `ltask_a1a8c375b0931c102b` and published plan
  `lgplan_67884d9a97bdda5c45` exist in production, but there is no completed
  learner cycle yet. Cycle history shows that the generated card is still
  missing `evaluation_evidence` and `profile_delta_audit`. Automation proposal,
  digest, action handoff, and platform Action Inbox/Web Push evidence must
  wait for a real Owner/learner cycle (`submit` once, `evaluate` once,
  `reflect` once); do not fabricate learner submissions to unlock those gates.
- 2026-06-18 release readiness local audit scope is now `43/47` passing for
  `weixin_stephen/science/daily_plan` after persisting the nine release UI
  evidence records and the three explicit summary-only release approval
  records (`writefulExecutionApproval`, `backgroundSchedulerApproval`, and
  `backgroundWorkerApproval`). `writefulSchedulingAllowed` remains false.
  Remaining gates are `delivered_action_handoff`,
  `production_planner_readiness_evidence`,
  `production_daily_loop_write_smoke_evidence`, and
  `platform_action_evidence`. The local Gateway endpoint is reachable, but
  this shell receives bounded `gateway_http_error`, HTTP `401`,
  `invalid_api_key` from planner/daily-loop smoke because it does not have the
  production Gateway credential. The available completed-cycle plan drafts are
  already `published`, so the existing-draft proposal path correctly rejects
  them with `learning_automation_existing_plan_draft_not_draft`. Platform
  action evidence currently has zero delivered receipts and reports missing
  Action Inbox plus Web Push receipt evidence. Do not convert these failures
  into pass records.
- 2026-06-18 Home AI proxy evidence harness status: Growth now exposes
  Owner-only `GET /api/v1/growth/automation/planner-readiness`, delegating only
  to `learningPlanOrchestratorService.smokePlannerReadiness()` with
  visible-target normalization, so production planner-readiness evidence can be
  collected through the Home AI same-origin plugin proxy. `npm run
  smoke:home-ai-proxy` calls Growth only through
  `/api/hermes-plugins/growth/proxy/...` with a Home AI web access boundary and
  supports release-readiness, planner-readiness, platform-action evidence,
  controlled daily-loop writes, action-handoff operations, and workbench
  action/audit routes. The harness rejects writes unless `--allow-write` is
  present and prints only bounded route/status/projection fields; it must not
  print raw access keys, access-key file paths, bearer headers, provider
  output, private payloads, or plugin workspace bearer values. This adds the
  authorized production evidence path for the remaining gates, but does not
  satisfy them by itself and does not change runtime config, grant scheduler
  permission, deliver notifications, or deploy.
- 2026-06-18 production proxy execution readback: the Home AI production
  status smoke and Growth same-origin proxy smoke were run through the central
  sudo validation boundary without exposing raw credentials. Production
  planner-readiness passed for the real release scope
  `weixin_stephen / learner=weixin_stephen / science / daily_plan`, and a
  bounded `productionPlannerReadinessEvidence` record was written in
  production (`lgarev_3f1ec573d9821215a3`). Controlled production
  daily-loop advance then failed closed before card publication: one attempt
  rejected a stale English target under science scope, and the explicit science
  node attempt created a draft but publish failed with
  `learning_target_not_provisioned`. The identified fix is in
  `learning-plan-publisher-service`: publish-stage target provisioning must
  inherit the stored draft target `displayName`/`label`, and generation input
  must carry that label plus provisioning-selected graph scope as fallback. The
  fix has since been deployed; the production daily-loop write gate now passes
  through persisted release evidence.
- Gateway planner, authoring, and evaluation clients now preserve bounded HTTP
  failure summaries (`gateway_http_error`, status, gateway error code/type)
  from fetch-like Responses objects and prevent blank `error` fields from
  overriding the canonical error. Planner readiness smoke projects the same
  bounded fields as `plannerReadinessHttpStatus`,
  `plannerReadinessGatewayErrorCode`, and
  `plannerReadinessGatewayErrorType`. The summary omits raw response bodies,
  provider messages, credentials, prompts, and private payloads.
- Release UI evidence collection is registry-driven for the nine Growth
  release UI gates: owner daily, owner audit, proposal review, release package
  review, automation digest, automation action handoff, scheduler execution,
  scheduler run, and scheduler worker target. Owner workbench collection
  actions may forward only transient `*_ui_evidence_file` summary-artifact
  inputs to the bundle/collection services; public artifacts expose only
  bounded validator summaries and `...FilePresent` booleans, never raw local
  artifact paths. Release evidence bundle, package, collection, and workbench
  action CLIs can now read
  `--release-evidence-artifact-manifest-file <manifest.json>` to map Home
  AI-produced central visual/UI summary artifact files into those existing
  transient inputs by `taskId`, `evidenceKey`, `checkKey`, or `uiGate`. The
  manifest path is stripped immediately after parsing, unknown artifact keys
  fail closed, mapped task ids are carried as `artifactTaskIds`, and the
  existing central visual/UI validators and release-evidence service remain
  the only acceptance/persistence path. Growth now also has a no-write
  `GET /api/v1/growth/automation/release-artifact-template` API plus
  `npm run smoke:release-artifact-template` helper backed by
  `learning-automation-release-evidence-artifact-template-service`; both read
  release-workbench summary through the normal service graph and emit only
  missing central-visual/UI artifact slots plus a blank
  `growth.learningAutomationReleaseEvidenceArtifactManifest.v1` template for
  Home AI central visual-toolchain summary artifacts. The same readback now
  includes a summary-only `growth.learningAutomationReleaseEvidenceChecklist.v1`
  checklist plus a summary-only
  `growth.learningAutomationReleaseEvidenceActionPlan.v1` action plan. The
  checklist separates artifact slots, supported collection tasks, write-gated
  tasks, missing approvals, missing record actions, and unsupported/manual
  evidence keys. The action plan projects only Owner-safe route/body templates
  for the existing workbench action route plus external artifact/manual steps;
  blank manifest templates remain unfilled, and collection body templates keep
  artifact tasks outside `tasks` until the filled manifest is supplied. The
  release workbench must preserve the full bounded release missing-key set
  before deriving collection tasks and artifact slots; it cannot use a compact
  UI preview limit that drops later release gates. A real
  `weixin_stephen/science` readback with more than 24 missing checks now keeps
  `central_visual_evidence` visible, maps it to the `central_visual` artifact
  slot, and emits `centralVisualEvidenceFile` in the blank manifest template.
  Release evidence records remain scope-strict, so central visual evidence
  written for an Owner/testing scope does not satisfy a domain-scoped release;
  the same Home AI summary artifact must be replayed or collected under the
  matching workspace/learner/domain/subject/horizon scope.
- 2026-06-18 release UI artifact-builder status:
  `npm run build:release-ui-evidence-artifacts` now reads one Home AI central
  `embedded-plugin-shell` visual summary artifact and Growth-rendered Owner UI
  marker coverage, then writes nine summary-only
  `growth.learningAutomationReleaseUiEvidenceArtifact.v1` files plus a
  `growth.learningAutomationReleaseEvidenceArtifactManifest.v1` manifest. The
  generated artifact JSON stores only screenshot presence, artifact basename,
  byte count, coverage, assertions, and boundary flags; it strips raw Home AI
  screenshot paths such as `/Users/...` and `.homeai-qa`. A no-write
  release-evidence collection run over the generated manifest proved all nine
  UI tasks can pass bundle and bundle-audit validation, moving the temporary
  readback to `passedCheckCount=40` while leaving seven non-UI gates. This is
  local adapter evidence only; it does not run visual tooling, call Gateway,
  persist release evidence, approve release state, deploy, mutate runtime
  config, grant scheduler permission, publish/evaluate cards, or mutate
  learner state.
  embedded Owner `生成` tab now consumes this readback inside the release
  workbench panel as a summary-only `证据清单` subpanel with artifact slots,
  checklist rows, action-plan rows, manifest schema status, and refresh
  wiring. It does not accept local artifact paths, run visual tooling, validate
  UI evidence, persist release evidence, apply approvals, or enable scheduling.
  The embedded Owner `生成` tab now also consumes the existing Owner-only
  `GET /api/v1/growth/automation/release-workbench/action-audits` read route as
  a summary-only `操作审计` subpanel over recent wrapper action ids, statuses,
  endpoints, and action summaries. It does not expose raw request bodies,
  delegated `writeResult` payloads, local artifact paths, release storage
  internals, runtime config, release permission, or scheduler permission.
  The same embedded Owner panel now also consumes existing release controls,
  dashboard, inventory, review, authorization, closure, preflight, activation,
  and runtime-enablement readbacks as a summary-only `发布总览` subpanel. That
  browser batch read shows only bounded status/next-action summaries and cannot
  write release decisions, package records, preflight reports, activation or
  runtime enablement rows, mutate runtime config, approve release state, or
  grant scheduler permission.
  The embedded Owner panel now also renders a read-only `证据账本` subpanel
  that batches existing visible-target scoped
  `GET /api/v1/growth/automation/release-evidence` and
  `GET /api/v1/growth/automation/release-approvals` readbacks. It lists only
  public summary DTO fields such as evidence/approval ids, keys, status, and
  timestamps. It does not create evidence, approve release state, run
  collection, inspect release storage directly, mutate runtime config, or grant
  scheduler permission.
  Growth has now consumed a Home AI central `embedded-plugin-shell` visual
  harness artifact for `plugin-id=growth`, validated it through
  `learning-automation-central-visual-evidence-service`, and persisted bounded
  pass release-evidence records through the existing release evidence
  collection path. The central visual validator accepts the current Home AI
  harness artifact shape (`screenshot.path`, `metrics.clientVersion`,
  `finishedAt` / `startedAt`, and lane port summaries) while storing only
  summary fields such as screenshot file name, client version, assertion
  counts, and boundary flags. The bundle and collection services preserve that
  bounded `visualEvidence` / `centralBoundary` summary into
  `centralVisualEvidence` release evidence records. This does not mark release
  readiness complete, approve release state, mutate runtime config, grant
  scheduler permission, run Gateway, publish cards, evaluate learner evidence,
  or deploy.
  A 2026-06-18 local advisory backend release-evidence batch was then replayed
  under the real `weixin_stephen/science/daily_plan` scope through the existing
  `smoke:release-evidence-collection` harness. It persisted collection run
  `lgacrn_136dd590d876f208a9` and 18 summary-only release-evidence records
  (17 passing backend task records plus `releaseEvidenceBundleAudit`), moving
  release-readiness readback from `passCheckCount=6`,
  `missingRequiredCount=41`, `missingEvidenceCount=34` to
  `passCheckCount=23`, `missingRequiredCount=24`,
  `missingEvidenceCount=17`, with persisted evidence key count `19`.
  This batch did not deploy, approve release state, change runtime config,
  grant scheduler permission, call Gateway, publish or evaluate cards, notify,
  activate stage assessments, or mutate learner state. The remaining real
  gaps are Home AI visual/UI artifacts, platform Action Inbox/Web Push receipt
  evidence, production deployment health, write-gated daily-loop evidence,
  explicit approvals and release lifecycle records, automation state
  prerequisites, and real target/provision/completed-cycle selectors for the
  tasks that blocked on data rather than harness execution.
  The same local release scope now also has the recovered UK/HK curriculum
  foundation KG imported into the current Growth SQLite runtime:
  `kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1`, one domain pack,
  294 nodes, 329 edges, and 34 prerequisite edges. Owner provision
  `lgprov_c0ce9e40906966ad51` enables
  `domain_pack_fanfan_cambridge_pathway_v1` / science / science for
  `weixin_stephen`, and collection run `lgacrn_9285159d4f01bd3ca2` persisted
  pass release evidence for target provisioning, stage checkpoint readiness,
  and stage checkpoint controls using target node
  `kg_ls_science_scientific_enquiry_plan_investigative_work`. Active failure
  policy `lgafpol_4d4615a8aa2a8ffeda`, reviewed worker target
  `lgastgt_024972de96897d65cb`, and reviewed digest
  `lgadig_47d07d9abe34f1fcc4` were also written through Owner smoke gates,
  but action-handoff creation correctly remains blocked because that digest has
  no required action. Current release-readiness readback is
  `passCheckCount=29`, `missingRequiredCount=18`,
  `missingEvidenceCount=14`, still incomplete and still non-writeful.
  The embedded Owner panel now also renders a separate `发布记录` subpanel over
  existing preflight-report, activation-record, and runtime-enablement list
  routes plus their Owner-only record routes. That panel writes only
  summary-only audit records with visible target scope and Owner intent; it
  does not mutate runtime config, approve release state, grant scheduler
  permission, run release evidence collection, deploy, call Gateway, or mutate
  learner state.
  The
  route performs only visible-target scope normalization. It does not run visual
  tooling, persist release evidence, call Gateway, inspect SQLite directly, or
  widen to default UI tasks when no visual/UI evidence is missing. The normal
  service graph also wires
  `learning-automation-release-evidence-artifact-manifest-service` for the
  Owner workbench action route: HTTP callers may provide an inline
  `artifactManifest` / `releaseEvidenceArtifactManifest` summary body, which is
  stripped after parsing and expands only whitelisted central visual/UI
  artifact slots into transient file fields plus collection task selectors. The
  HTTP route does not read server-local manifest file paths, run visual
  tooling, persist evidence by itself, or call Gateway. The
  central visual evidence boundary also has a visible-target scoped no-write
  `POST /api/v1/growth/automation/central-visual-evidence` API that delegates
  only to `learningAutomationCentralVisualEvidenceService.evaluate()`, accepts
  inline Home AI visual-harness summary JSON only, and does not read or forward
  server-local artifact file paths. It validates and returns bounded
  summary-only central visual readback but does not create the required Home AI
  central visual artifact, run visual tooling, persist release evidence, call
  Gateway, mutate learner state, apply runtime config, or grant scheduler /
  release permission. The UI evidence boundary now also has a visible-target
  scoped no-write `POST /api/v1/growth/automation/ui-evidence` API that
  delegates only to `learningAutomationUiEvidenceService.evaluate()`, accepts
  inline Home AI UI/visual summary JSON only, and does not read or forward
  `uiEvidenceFile`, `evidenceFile`, or other server-local artifact paths over
  HTTP. It validates and returns bounded summary-only UI gate evidence readback
  for the registered release UI gates but does not create the required Home AI
  visual artifact, run visual tooling, persist release evidence, call Gateway,
  mutate learner state, apply runtime config, or grant scheduler / release
  permission. The
  `smoke:release-evidence-collection` CLI now also mirrors bounded top-level
  `releaseEvidenceCollection*` operator readback for collection status, step
  counts/statuses, collection-run id/write state, release-evidence record
  counters, evidence keys, and runtime/write flags while preserving the nested
  collection DTO as canonical.
- Current implementation owns plugin SQLite read projections, migrated audio
  playback, historical audio BLOB backfill tooling, workspace-bound read-only
  MCP tools, workspace-bearer submission/reflection evidence write endpoints,
  async evaluation processing, per-card Growth learning coin settlement, and
  bounded completion/mastery/review event emission. It also owns native
  knowledge-graph import/planning/binding and Gateway-backed card generation
  from graph plans plus historical SQLite summaries. Compact ordinary-card
  Growth now exposes a v1-minimal plugin-side Reference Contract through
  `learning-reference-contract-service`, read-only reference APIs,
  `growth.reference_object_types` / `growth.reference_get` /
  `growth.reference_summarize` MCP tools, and `npm run smoke:references`.
  The contract is summary-only for Growth-owned `program`, `task_card`,
  `submission`, `evaluation`, `reflection`, `mastery_profile`,
  `learning_graph_plan`, `plan_draft`, and completed-cycle
  `profile_feedback` objects. The `profile_feedback` object type delegates
  through `learning-profile-feedback-evidence-service.evaluate()` and exposes
  only readiness/count/reward/recommendation/next-action summaries plus related
  Growth object references. It deliberately does not implement central
  Reference/Memory Graph edges, global search/resolve, note links, or central
  graph tables. The embedded Owner `生成` tab consumes the
  same contract through a read-only `闭环引用` panel: it requests object types
  and reference summaries for current profile, program, graph plan, plan draft,
  generated card, selected-cycle evaluation, and selected-cycle profile-feedback
  ids when those ids already exist in summary DTOs. The browser does not
  fabricate references, inspect SQLite, call Gateway, publish, evaluate, compute
  profile-feedback readiness, or mutate learner state from that panel.
  Growth now also persists summary-only Owner audit review closure records
  through `learning-owner-audit-review-service`,
  `learning_growth_owner_audit_reviews`,
  `GET /api/v1/growth/owner-audit/reviews`, Owner-only
  `POST /api/v1/growth/owner-audit/reviews`, and
  `npm run smoke:owner-audit-review`. The service delegates to completed-cycle
  `learning-profile-feedback-evidence-service.evaluate()` before writing a
  review row and records only review decisions, selector ids, readiness/count
  summaries, recommendation/next-action summaries, reviewer metadata, and
  bounded notes. It does not write learner evidence, mutate Profile V2, call
  Gateway, generate cards, evaluate submissions, schedule, notify, activate
  stage assessments, or act as release/deploy permission. The embedded Owner
  `生成` tab now consumes the same boundary through a `完成周期审核` panel:
  it lists persisted review rows, builds review payloads only from the selected
  history-cycle selectors plus an optional bounded Owner note, and posts
  decisions `accepted`, `needs_follow_up`, `correction_recorded`, or `blocked`
  to the Owner-only route. The browser must not compute profile feedback,
  fabricate completed cycles, create correction evidence from that panel,
  inspect review storage, call Gateway, generate/evaluate cards, or mutate
  learner state directly; `correction_recorded` remains disabled unless the
  selected cycle already carries a correction id.
  Growth also projects those persisted review rows back into the next planning
  loop through `learning-owner-review-signal-service`. The signal is read-only
  and summary-only (`growth.learningOwnerReviewSignal.v1`), excludes Owner
  notes/raw learner/model content, and is consumed by planner context,
  profile-feedback evidence, and learning-loop state as advisory strategy bias
  such as accepted, corrected, follow-up, or blocked. It does not write
  reviews, evidence, Profile V2, cards, scheduler state, notifications, or
  stage assessments.
  Compact ordinary-card
  recipe generation now supports `daily_english_v1`, `daily_science_v1`, and
  `daily_subject_practice_v1` while preserving target provisioning, graph
  planning, graph-node evidence requirements, Gateway authoring validation, and
  transactional publishing as separate service boundaries. New generated daily
  cards use `daily_score_once`: one submission stage, one evaluation stage, one
  reflection stage, completion after the first evaluation, and
  score-proportional rewards without a pass-line gate. Ordinary generated daily
  cards validate `expectedTimeMinutes` within 10-15 minutes and persist
  `expected_duration_minutes_min=10` /
  `expected_duration_minutes_max=15`; stage assessment cards validate and
  persist the 25-30 minute formal-assessment range. The generated-card learner
  UI may expose at most one active text submission box per stage. For
  recipe-driven daily-loop generation, `learning-daily-loop-service` hydrates
  context-derived domain-pack/domain/subject/target-node scope before plan
  publication, and `learning-plan-publisher-service` propagates the selected
  recipe into card generation; the Owner browser should not recompute graph
  scope locally. `learning-card-rubric-policy-service` now owns V1
  summary-only rubric policies for daily English, daily science, mathematics,
  history, geography, computer science, generic subject fallback practice, and
  formal `stage_assessment_v1` checkpoints. Formal checkpoint rubric policies
  resolve before daily subject fallback and use independent understanding,
  transfer/application, evidence/reasoning, and one reflection-calibration
  dimension. Generation passes the resolved policy into Gateway authoring and
  persists it in bounded card `raw_json`; Gateway evaluation validates
  `rubricResults` and `skillResults[*].rubricDimensionId` against that policy
  plus graph targets; SQLite evaluation records and the evidence ledger store
  only bounded rubric readback / per-node rubric summaries.
  Stage assessment cards are separate formal cards: activation is owned by
  `learning-stage-assessment-service`, activation preserves domain-pack/domain
  / subject scope into card generation, the persisted `formal_assessment`
  policy allows one formal submission, one formal evaluation, and one formal
  reflection after evaluation, formal evaluation writes higher-weight
  rubric-bearing mastery evidence across declared assessment coverage nodes,
  public card projection stays `reflection_required` until the formal
  reflection is stored, and completed assessment cycles move into cooldown.
  Active checkpoint loop-state readback is capability-scoped; callers that
  need the same active cycle must pass the activation `capabilityClusterId`
  plus `assessmentCoverageNodeIds`.
  The Owner generation panel forwards those selectors from the selected plan
  and, when the loop-state service returns `stage_checkpoint_active`, renders
  an open-card action for the existing formal task card rather than drafting or
  publishing a replacement card.
  Owner checkpoint controls are now
  exposed as a separate summary-only read model through
  `learning-stage-checkpoint-controls-service` and Owner-only
  `GET /api/v1/growth/stage-assessments/controls`; that read model delegates
  only to `learning-stage-assessment-service.stageReadiness()` and cannot
  activate assessments, publish plans, generate cards, call Gateway, inspect
  SQLite tables, or mutate learner state. The same boundary now has a no-write
  operational smoke through `npm run smoke:stage-checkpoint-controls`, which
  delegates only to `learningStageCheckpointControlsService.controls()` through
  the normal service graph, mirrors bounded top-level
  `stageCheckpointControls*` operator readback for status, write gate,
  target/scope, readiness/cooldown counts, policy flags, and action
  availability, and feeds `stageCheckpointControlsEvidence` into release
  evidence bundles/readiness. The embedded Owner generation panel now
  fetches that controls DTO through `GET /api/v1/growth/stage-assessments/controls`,
  displays bounded readiness evidence plus the bounded formal
  `rubric:stage_assessment_v1:<subject>` policy summary, and enables
  formal-checkpoint generation only when the `activate_stage_assessment`
  action is enabled; the actual write still goes through
  `POST /api/v1/growth/stage-assessments/activate`. The next
  target architecture is the
  Growth-owned AI learning operating loop documented in
  `docs/GROWTH_LEARNING_OPERATING_LOOP.md`: evidence ledger, Profile V2,
  Gateway-backed planner, post-evaluation profile-delta audit,
  target/domain-pack provisioning, Owner audit, low-pressure cross-subject
  cards, and future multi-workspace/domain-pack generalization. The first backend
  foundation now includes summary-only `learning_growth_evidence_ledger`
  writes, Profile V2 projection, planner context assembly, Gateway planner
  client, plan validation, draft orchestration, summary-only plan draft
  persistence, and a backend plan publisher route that can publish a selected
  validated plan item through the existing card-generation service. The
  execution blueprint for the broader AI-driven loop is
  `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`; it now includes the
  staged execution roadmap from current backend state to Owner-supervised
  daily loop, audit/correction UI, stage-checkpoint loop, multi-workspace
  rollout, and later supervised scheduling. Owner
  generation context now exposes planner readiness, planner context preview,
  Owner-safe Profile V2, bounded evidence audit, and `domain`/`subject` /
  `domainPackId` query selection through the existing visible-target route.
  It also projects provisioned native graph `graphOptions` and
  `targetProvisioning` for domain-pack and subject selection. The embedded
  Owner `生成` tab now renders those selectors, applies selected
  domain-pack/subject context refresh, and can explicitly create/update
  target provisions through the Owner-only
  `POST /api/v1/growth/domain-pack-provisions` facade. The planner
  orchestrator exposes a bounded no-write readiness smoke through
  `npm run smoke:planner-readiness`; the smoke CLI now mirrors top-level
  `plannerReadiness*` operator readback for status, write gate, target/scope,
  Gateway mode, horizon/minutes, graph/profile evidence counts, draft
  schema/item count, draft target nodes, and write-performed flags while
  preserving the service DTO as canonical. Planner horizon policy now validates
  low-pressure `daily_plan`, short no-backlog `weekly_plan`, low-pressure
  `repair_plan`, and `stage_checkpoint_plan` suggestions that must activate
  through `learning-stage-assessment-service`; planner context now includes
  read-only stage-assessment readiness through
  `learning-stage-assessment-service.stageReadiness()`, and the plan publisher
  refuses direct formal stage-assessment publication. Growth now also wires a
  service-owned learning operating-loop execution facade through
  `learning-operating-loop-service`, Owner-only
  `POST /api/v1/growth/learning-loop/advance`, Owner-only
  `GET /api/v1/growth/learning-loop/runs`, and `npm run smoke:operating-loop`.
  The facade recommends the current `learning-loop-state` next action without
  writing by default. Writeful `runNext` can execute only the current next
  action: daily draft/publish via `learning-daily-loop-service` and formal
  checkpoint activation via `learning-stage-assessment-service` only after
  explicit Owner stage confirmation. Every non-privacy attempt is persisted as
  summary-only `learning_growth_operating_loop_runs` audit readback through the
  injected run repository; `runs` / `list-runs` / `history` smoke operations
  are no-write history reads. The embedded Owner `生成` tab now consumes this
  same facade through a `闭环执行` panel: it reads
  `GET /api/v1/growth/learning-loop/runs`, displays the latest summary-only
  run history, sends only `action=run_next` to Owner-only
  `POST /api/v1/growth/learning-loop/advance`, and maps generated task-card
  ids back into the existing preview/open-card flow. Browser code does not
  choose next actions, inspect the run repository, call Gateway, or bypass
  daily-loop / stage-assessment owning services. Release evidence bundles now
  include default
  no-write `operating_loop_history` evidence mapped to
  `productionOperatingLoopHistorySmokeEvidence`, proving the Owner operating
  loop has auditable run history without executing `runNext`. Release-readiness
  consumes the same artifact as
  `production_operating_loop_history_smoke_evidence`, and the release evidence
  service canonicalizes the key for persisted pass evidence records. The release
  workbench and artifact-template action plan map that missing readiness key
  back to the `operating_loop_history` collection task through
  `learning-automation-release-evidence-task-registry`, so Owner collection
  actions do not treat it as unsupported/manual evidence or a direct pass
  evidence shortcut. The same release workbench boundary treats
  `release_evidence_bundle_audit` as a collection-pass output instead of
  unsupported/manual evidence, and the artifact-template action plan uses
  workbench-advertised fallback collection tasks only when a real
  evidence/check/collection-run gap exists. Release evidence task definitions,
  default task ids, approval keys, safe collection task mapping, write-gated
  mapping, collection-owned outputs, and collection fallback task ids are owned
  by `learning-automation-release-evidence-task-registry`; bundle,
  bundle-audit, artifact-template, and workbench services consume that
  registry instead of duplicating maps. Bundle and bundle-audit schema strings
  live in `learning-automation-release-evidence-schemas` so collection-run and
  audit validation do not load smoke-runner service implementations only for
  constants.
  `tests/growth-architecture-boundary.test.js` now also derives release
  readiness evidence/check keys from the readiness service and fails if any key
  is not classified by the registry as collection-mapped, write-gated, or
  collection-owned. Learner work, audit/correction, target
  provisioning, graph import/selection, context refresh, and Gateway
  configuration remain separate flows and return blocked/separate-flow DTOs
  instead of automatic side effects. A service-level
  Fanfan science vertical harness now proves planner draft, publish, daily-loop
  advance, generated-card board/detail visibility, science card generation,
  learner evidence, one-submit/one-evaluate/one-reflect completion through
  `learning-learner-cycle-service`, Gateway evaluation, evidence ledger, and
  Profile V2 feedback; it also projects the completed cycle through
  `learning-loop-state-service` as `ready_to_draft` with a `draft_daily_plan`
  next action from persisted reward/profile-delta/trajectory evidence. That
  same harness now continues the completed Fanfan science cycle into a
  summary-only automation proposal, Owner acceptance, read-only scheduler
  `would_publish`, and a pending digest required action without automatic
  publish, writeful scheduler execution, or extra authoring/evaluation Gateway
  calls after the completed source card. The staged
  delivery roadmap for the supervised AI learning system is now summarized first in
  `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`; the closed-loop contract is in
  `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`, with staged delivery captured
  in `docs/GROWTH_AI_LEARNING_ROADMAP.md`. The next-stage execution selector is
  `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`; it records the current
  execution decision, the preferred product-visible Owner daily loop path, the
  backend-only release-readiness evidence path, Fanfan science daily playbook,
  readiness semantics, harness matrix, and definition of done. The
  release-readiness backend boundary is
  now represented by `learning-automation-release-readiness-service`,
  `automation-release-readiness.js`,
  `learning_growth_automation_release_readiness`, visible-target readiness
  read/list routes, and Owner-only snapshot creation; it is advisory evidence
  only and always keeps `writefulSchedulingAllowed=false`. Explicit approval
  records for writeful config gates are now Growth-owned as
  `learning-automation-release-approval-service`,
  `automation-release-approvals.js`, and
  `learning_growth_automation_release_approvals`, with visible-target scoped
  `GET /api/v1/growth/automation/release-approvals`, Owner-only
  `POST /api/v1/growth/automation/release-approvals`, and
  `npm run smoke:release-approval`; release-readiness can read active approval
  records as `releaseReview.persistedApprovalKeys`; `releaseReview` now also
  includes summary-only remediation fields `missingCheckKeys`,
  `blockedCheckKeys`, `missingEvidenceKeys`, `requiredActionCount`,
  `requiredActions`, and `nextAction` so Owner/release tooling can see what
  evidence remains without walking raw checks. Release approval service and
  SQLite repository privacy scanning reject privacy-risk keys plus private
  path/token-looking string values before approval records persist. Approval
  records and remediation remain advisory evidence and never flip runtime
  config. `npm run smoke:release-approval` now mirrors bounded top-level
  `automationReleaseApproval*` operator readback for list/bag/record,
  operation/write gate, scope, approval ids/keys/status counts, approved bag
  keys, approval/evidence schema versions, and `writefulSchedulingAllowed=false`
  while preserving nested DTOs as canonical. Release-readiness also projects
  summary-only `evidenceReadback`
  (`growth.learningAutomationReleaseReadiness.evidenceReadback.v1`) with source
  bundle readback, present/missing counts, missing check keys, and bounded
  per-check evidence references. `npm run smoke:release-readiness` mirrors
  top-level operator fields for readiness status, Owner/release booleans,
  check/evidence/approval/action counts, next required action, and bounded
  evidence-readback counts while preserving the nested service DTO as
  canonical. For `ownerReviewEvidence`, the readback item
  now also carries bounded `ownerReviewStageSummary` counters from the release
  evidence bundle summary, plus bounded passed/missing gate keys, gate counts,
  required action count, and next Owner action without raw dependency ids; this
  is audit visibility only and does not change readiness pass semantics or
  scheduler permission.
  Owner snapshots persist that readback in
  `learning_growth_automation_release_readiness.evidence_readback_json`, and
  repository privacy scanning rejects private path/token-like values even when a
  caller bypasses the service. Release controls, inventory, dashboard, and
  workbench readbacks now project bounded evidenceReadback summaries only,
  including present/missing counts, source bundle ids/status/counts, and the
  compact `ownerReviewStageSummary` when present, without exposing full
  evidence items or changing release/runtime state. Release controls and
  workbench also carry latest preflight report id/status/advisory readiness
  flags only from activation/runtime records and downstream summary DTOs; they
  do not read the preflight repository directly and do not grant deployment,
  runtime config, or scheduler permission. Release package artifacts and
  package audit records now project bounded latest preflight fields from
  release-controls and release-dashboard readbacks into package top-level
  summary, step summary, and persisted package-record summaries without adding
  a preflight repository read or changing deployment/runtime/scheduler
  permission. It now treats
  production controlled daily-loop draft/publish/advance smoke evidence as a separate
  required readiness check, treats production cycle-history smoke evidence as a
  separate required readiness check, and treats production learner daily-cycle
  smoke evidence as a separate required readiness check while still never
  calling daily-loop, cycle-history, or learner-cycle services from the
  release-readiness boundary. It now also treats bounded release-workbench
  smoke/readback evidence as a separate required readiness check after
  `npm run smoke:release-workbench` or the explicit `release_workbench`
  release evidence bundle task. It now also treats backend Owner automation
  review evidence as `owner_review_evidence` after
  `npm run smoke:owner-review-evidence`, the default `owner_review_evidence`
  release evidence bundle task, explicit summary evidence JSON, or a persisted
  `owner_review_evidence` release evidence record. The legacy
  `--owner-review-evidence` readiness flag is a deprecated remediation marker
  and cannot satisfy the gate. This evidence
  proves backend readback only and does not replace product UI or visual
  evidence. Owner review evidence now also projects bounded proposal lifecycle
  counts for `proposed`, `accepted`, `skipped`, `expired`, `superseded`,
  owner-decision, and proposal execution statuses; only `accepted` proposals
  satisfy the accepted-proposal gate. Its release evidence bundle summary also
  projects downstream digest, action-handoff, scheduler execution, scheduler
  run, worker-target, and failure-policy stage counts, gate keys, gate counts,
  required action count, and next action without raw dependency rows or ids.
  The supervised automation P5-P9 SQLite
  repository chain now
  applies repository-level privacy scanning for privacy-risk keys, private
  path/token-looking string values, and non-summary privacy classes before any
  automation evidence persists. The covered repositories are proposal, digest,
  failure policy, action handoff, scheduler execution, scheduler run, worker
  target, and worker lease. This is a database-boundary hardening slice only:
  it does not enable scheduler execution, publish accepted proposals, call
  Gateway, generate/evaluate cards, activate stage assessments, flip runtime
  config, or deliver platform actions. The P10 release/runtime persistence
  chain now has the same private value guard at repository boundaries:
  release-readiness snapshot, release approval, release evidence,
  collection-run, release decision, release package, release activation, and
  runtime enablement records reject privacy-risk keys, private path values,
  token-looking string values, and non-summary privacy classes before
  persistence.
  Activation and runtime enablement repositories additionally keep runtime
  mutation flags blocked. It now also has
  `npm run smoke:release-readiness`, a service-owned CLI that defaults to
  no-write readiness evaluation, accepts versioned explicit release evidence
  through `--evidence-json`, release evidence bundles, or persisted
  release-evidence record projections, and treats legacy boolean evidence flags
  for service-owned smoke/readback gates as deprecated remediation markers that
  return `blocked` instead of fabricating `{ok:true}` evidence. Valid stage
  checkpoint evidence must come from `npm run smoke:stage-assessment`, a
  release evidence bundle, explicit summary evidence JSON, or a persisted
  release-evidence record projection. It accepts
  `--automation-digest-ui-evidence`,
  `--release-package-review-ui-evidence`,
  `--automation-action-handoff-ui-evidence`,
  `--scheduler-execution-ui-evidence`, `--scheduler-run-ui-evidence`, and
  `--scheduler-worker-target-ui-evidence` only as deprecated UI evidence flag
  aliases that surface blocked remediation metadata, and now has
  `npm run smoke:ui-evidence`, which validates an explicit
  summary-only UI/visual artifact for a canonical UI evidence key before that
  output is optionally persisted through the existing release-evidence record
  path. The CLI now mirrors bounded top-level `uiEvidence*` operator readback
  for status, write gate, scope, gate/check keys, route/screen, coverage,
  screenshot/DOM evidence, assertion counts, private value findings, validator
  boundary flags, and false runtime/writeful flags while preserving the nested
  service DTO as canonical. The release-evidence record service now re-runs that validator before
  saving any pass UI evidence key, and its evidence bag preserves the
  validator schema/projection summary plus top-level evidence/check keys for
  readiness readback. `npm run smoke:release-evidence` now mirrors bounded
  top-level `automationReleaseEvidence*` operator readback for list, bag, and
  record operations, including write gate, evidence ids/keys, status counts,
  bag keys, UI validation metadata, and false runtime/writeful flags while
  preserving nested service DTOs as canonical. Release-readiness
  one-off UI inputs must be `growth.learningAutomationUiEvidence.v1` validator
  summaries or validated release-evidence record projections, so deprecated UI
  flags and unvalidated direct `{ok:true}` UI evidence cannot satisfy
  readiness; blocked/missing UI records can still be persisted as explicit
  non-pass audit state. The UI evidence validator
  requires matching gate metadata, required coverage markers, passing
  assertions, screenshot or DOM evidence, and a private-value-safe public
  projection; it does not run Appium, the Home AI visual harness, Gateway,
  scheduler actions, generation, evaluation, notification delivery, stage
  activation, learner-state writes, or release evidence persistence. It now
  includes the `releasePackageReviewUiEvidence` /
  `release_package_review_ui_evidence` gate for the release package review row;
  that gate requires package candidate build, candidate status, and record
  package action coverage before pass release evidence can be persisted and
  consumed by release-readiness from persisted release-evidence records. The
  release evidence bundle now also has an explicit non-default
  `release_package_review_ui` task that delegates to `npm run
  smoke:ui-evidence` for this key, accepts
  `--release-package-review-ui-evidence-file`, keeps only bounded validator
  summary fields, and omits the raw artifact path from bundle output. Release
  evidence collection can persist that bundle evidence with
  `--write-release-evidence-records --allow-write` only through the existing
  release-evidence service revalidation path. The deprecated
  `--release-workbench-evidence` flag now returns blocked
  remediation metadata instead of passing evidence; valid final Owner
  action-template readback evidence must come from `npm run
  smoke:release-workbench` through explicit evidence JSON, the non-default
  `release_workbench` release-bundle task, or a persisted release-evidence
  record projection. Provided but non-passing release evidence is reported as
  blocked with bounded invalid-reason readback. The release-readiness CLI now
  treats legacy boolean service-owned evidence flags for Owner review,
  production proposal/action-handoff/scheduler/planner/target-provisioning,
  daily-loop preview/write, learning-loop state, cycle-history, Owner audit,
  profile-feedback, learner-cycle, scheduler dry-run, release-bundle audit,
  platform action, central visual, stage checkpoint, stage-checkpoint controls,
  and release workbench as deprecated remediation markers only. Those flags
  return blocked metadata and cannot satisfy readiness. The underlying
  `learning-automation-release-readiness-service` now also rejects bare
  boolean `true` evidence from downstream release review, authorization,
  closure, activation, controls, inventory, dashboard, or workbench readbacks
  with `validated_release_evidence_object_required`, while explicit approval
  booleans remain confined to the release-approval path. Valid evidence for
  those gates must come from the corresponding smoke output supplied through
  `--evidence-json`, a versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` artifact through
  `--evidence-bundle-file` / `--evidence-bundle-json`, or a persisted pass
  release-evidence record projection. Passing-looking service-owned evidence
  objects must also carry `summaryOnly=true`, `summary_only=true`, or
  `privacyClass=summary_only`; otherwise release-readiness blocks them with
  `release_evidence_summary_only_required`. Release-readiness still performs its
  internal no-write scheduler dry-run safety check from the release-readiness
  service. Growth now also has
  `npm run smoke:release-evidence-bundle`, a service-owned bundle builder
  that runs selected no-write/default-disabled smoke CLIs, emits a
  summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` artifact,
  mirrors bounded top-level `releaseEvidenceBundle*` operator readback for
  status, scope, task counts/statuses, evidence keys, release-approval keys,
  and false runtime/scheduling flags,
  includes learning-loop state smoke, cycle-history smoke, Owner audit smoke,
  profile-feedback smoke, learner-cycle audit smoke, stage-assessment readiness
  smoke, stage-checkpoint controls readback smoke, platform action evidence,
  central visual evidence, proposal smoke, and backend Owner automation review
  evidence with proposal lifecycle plus downstream automation-stage counts in
  the default task set, and now also collects the
  read-only release approval bag through
  `npm run smoke:release-approval -- --operation bag`,
  and can feed `npm run smoke:release-readiness -- --evidence-bundle-file`
  without hand-splicing JSON in Codex. Every task evidence object in that
  bundle is itself a formal summary-only evidence wrapper with a schema
  version, `privacyClass=summary_only`, `summaryOnly=true`, bounded task/source
  metadata, and `readyForReleaseEvidence`, so release-readiness can consume
  pass evidence directly while blocked task evidence remains visibly blocked.
  It also exposes an opt-in
  `learner_cycle` task that is part of the default set but allows only
  no-write `audit`; non-audit learner-cycle operations are blocked with a
  pointer to run `npm run smoke:learner-cycle` directly because write
  operations require Owner-requested real learner evidence and raw text must
  not pass through the bundle. It also exposes an opt-in
  `daily_loop_write` task for controlled daily-loop draft/publish/advance smoke
  evidence; the task is outside the default set, fails closed without
  `--allow-write-evidence`, accepts `--daily-loop-write-operation draft`,
  `publish`, or `advance`, requires `--plan-draft-id` for publish, and then
  delegates to the existing `scripts/smoke-growth-daily-loop.js` write gate
  instead of calling daily-loop services directly. The builder maps persisted approvals into the
  versioned bundle `releaseApproval` field only and maps profile-feedback smoke
  into `productionProfileFeedbackSmokeEvidence`, cycle-history smoke into
  `productionCycleHistorySmokeEvidence`, Owner audit smoke into
  `productionOwnerAuditSmokeEvidence`, platform action evidence from delivered
  Growth event-outbox receipts into `platformActionEvidence`, and
  `npm run smoke:platform-action-evidence` now mirrors bounded top-level
  `platformActionEvidence*` operator readback for status, write gate, scope,
  receipt counts, latest Action Inbox/Web Push receipt metadata, missing
  requirements, platform boundary ownership, and false runtime/writeful flags
  while preserving the nested service DTO as canonical. The builder maps central Home AI
  visual harness artifact validation into `centralVisualEvidence`, and
  `npm run smoke:central-visual-evidence` now mirrors bounded top-level
  `centralVisualEvidence*` operator readback for status, write gate, scope,
  plugin/scenario, screenshot/artifact metadata, assertion counts, private
  value findings, Home AI visual-toolchain ownership, and false
  runtime/writeful flags while preserving the nested service DTO as canonical.
  The builder maps controlled daily-loop write smoke into
  `productionDailyLoopWriteSmokeEvidence`, learner-cycle audit smoke into
  `productionLearnerCycleSmokeEvidence`, and explicit non-default release
  workbench smoke into `releaseWorkbenchSmokeEvidence`, and backend Owner
  automation review evidence into `ownerReviewEvidence`; it does not write
  business state of its own, does not call Gateway, and does not change
  release-readiness or scheduler permission. The same builder now also exposes
  an explicit non-default `release_controls` task that runs
  `npm run smoke:release-controls`, accepts activation gates, approval keys,
  UI evidence flags, and audit-record limits, and stores bounded
  `releaseControlsSmokeEvidence` for final no-write readback packaging; task
  pass means readback collection succeeded, while the nested controls status
  remains the release-control source of truth. Growth now also has
  `npm run smoke:release-dashboard`, a no-write Owner/visible-target read model
  implemented by `learning-automation-release-dashboard-service`,
  `scripts/smoke-growth-release-dashboard.js`, and
  `GET /api/v1/growth/automation/release-dashboard`. It composes only
  release-readiness, release-controls, and release-inventory DTOs into one
  summary-only `growth.learningAutomationReleaseDashboard.v1` status,
  next-action, and artifact readback surface for Owner UI/release audit use. It
  owns no repository/table, calls no Gateway/model provider, writes no business
  state, and keeps all runtime mutation and scheduling permission flags false.
  Release inventory and dashboard smoke CLIs now mirror selected nested DTO
  fields into top-level operator readbacks for status, missing/blocked record
  counts, latest artifact/record ids, one next action, evidence counts, and
  runtime/write flags only.
  The release evidence bundle can also collect it explicitly through the
  non-default `release_dashboard` task, which stores bounded
  `releaseDashboardSmokeEvidence` as final readback packaging only.
  The release evidence bundle can also collect the final workbench action
  template readback explicitly through the non-default `release_workbench`
  task, which stores bounded `releaseWorkbenchSmokeEvidence`; task pass means
  the read model was collected, not that release, runtime config, or scheduling
  state changed.
  Growth now also has `npm run smoke:release-workbench`, a no-write
  Owner/visible-target action-template read model implemented by
  `learning-automation-release-workbench-service`,
  `scripts/smoke-growth-release-workbench.js`, and
  `GET /api/v1/growth/automation/release-workbench`. It composes only
  release-readiness, release-controls, release-inventory, and
  release-dashboard DTOs into one summary-only
  `growth.learningAutomationReleaseWorkbench.v1` surface for Owner release UI.
  It reports bounded read routes, Owner-only record-route templates, missing
  evidence/check/approval/record summaries, one next action, internal
  automation-state prerequisite action templates for digest/policy/handoff/worker-target selectors, and external manual-runtime-config follow-up hints without applying config. It owns no
  repository/table, calls no Gateway/model provider, writes no business state,
  and keeps all runtime mutation and scheduling permission flags false.
  Growth now also has `npm run smoke:release-workbench-action`,
  `learning-automation-release-workbench-action-service`, and Owner-only
  `POST /api/v1/growth/automation/release-workbench/actions` as the write-gated
  action facade over that workbench. The facade reads the workbench first,
  requires the requested endpoint to be advertised, then delegates only to
  existing release-readiness snapshot, release evidence, release approval,
  collection-run, release-decision, release package-record or explicit package
  build-and-record, release activation, runtime enablement, automation digest,
  failure-policy, action-handoff, or scheduler worker-target services.
  It requires only the
  selected endpoint's write service instead of requiring every possible
  release-workbench action dependency at construction time. It stores/passes only
  summary-only bounded action/evidence/approval/decision/package and automation-state id/status data. The
  smoke CLI keeps `--operation record` write-gated behind `--allow-write` and
  also exposes no-write `--operation list-audits` / `--list-action-audits`
  readback through the same service. The CLI mirrors bounded top-level
  `releaseWorkbenchAction*` operator readback for operation/status, target
  scope, endpoint/action keys, wrapper action-record and action-audit
  status/id, delegated collection counters, requested task/write flags, and
  false runtime/scheduling flags while preserving the service DTO as canonical.
  It writes and reads bounded wrapper audits
  through
  `learningAutomationReleaseWorkbenchActionAuditRepository` /
  `learning_growth_automation_release_workbench_actions` and Owner-only
  `GET /api/v1/growth/automation/release-workbench/action-audits`; those audit
  rows store only scope, endpoint/action, status, action-record id/status,
  duplicate/workbench status, bounded error, requestedBy, and summary flags, and
  must not store raw request bodies, artifact paths, raw evidence, delegated
  write results, prompts, transcripts, model output, provider config, or
  secrets. Default
  `release_package` actions still record only an existing package artifact; only
  an explicit `buildReleasePackage` / `build_and_record_package` request
  delegates package build-and-record to
  `learning-automation-release-package-service.buildPackage` with package-record
  write authorization. The facade does not build packages itself, run smoke tasks
  internally, call Gateway/model providers, publish, schedule, mutate runtime
  config, grant scheduler permission, own downstream release record tables, or
  mutate learner state.
  Growth now also has `learning-automation-release-preflight-service`,
  `automation-release-preflight-reports.js`,
  `learning_growth_automation_release_preflight_reports`,
  `GET /api/v1/growth/automation/release-preflight`,
  `GET /api/v1/growth/automation/release-preflight-reports`, Owner-only
  `POST /api/v1/growth/automation/release-preflight-reports`, and
  `npm run smoke:release-preflight`. This is a summary-only final backend
  release preflight audit boundary over release-dashboard, release-workbench,
  and release-closure DTOs. It can persist only Owner-authorized preflight
  report rows, keeps `readyForProductionDeploy=false`, and now projects
  summary-only `productionClosureGateSummary` /
  `productionClosureGates` readback. Those gates separate Growth backend
  readiness, Home AI central visual/UI artifact evidence, Home AI Action Inbox
  / Web Push receipt evidence, Owner release activation, runtime enablement
  readback, and production deployment/health evidence. The production
  deployment/health gate remains external and cannot be marked passing by
  Growth local preflight. The service never applies runtime
  config, grants scheduler permission, runs smoke tasks internally, calls
  Gateway/model providers, publishes, evaluates, schedules, deploys, or mutates
  learner state. The release workbench now advertises `release_preflight` and
  `release_preflight_reports` readback plus a `release_preflight` record route;
  when evidence, approval, collection-run, decision, and package blockers are
  clear, the workbench offers `record_release_preflight` before activation and
  runtime-enablements. The Owner-only `release-workbench/actions` facade can
  execute that advertised endpoint by delegating only to
  `learning-automation-release-preflight-service.recordReport` with write
  authorization. Persisted preflight reports now also flow into release
  inventory readback through the injected
  `learningAutomationReleasePreflightReportRepository.listReports` boundary;
  release dashboard then projects only inventory's bounded latest preflight
  report id/status and advisory readiness flags. This downstream readback is
  audit visibility only and never becomes deployment permission.
  The embedded Owner `生成` UI now consumes the release workbench read model and
  action facade through `public/growth-api-client.js`, renders
  `data-release-workbench-panel`, and can record advertised
  `release_evidence`, `release_approval`, `release_evidence_collection`,
  `release_decision`, `release_package`, `release_activation`, and
  `runtime_enablement` actions from the plugin UI. For a missing
  `release_collection_run`, the workbench advertises
  `release_evidence_collection`; the action facade delegates to
  `learning-automation-release-evidence-collection-service.collect`, and the
  advertised route body is now derived from supported missing release evidence
  keys such as profile feedback, platform action, central visual, proposal,
  scheduler, and Owner-review evidence. UI/manual evidence keys remain visible as
  unsupported collection keys, while write-gated tasks such as `daily_loop_write`
  are reported separately instead of being sent through the default Owner button.
  When a collection-run record already exists but supported missing evidence
  remains, the workbench exposes `releaseEvidenceCollectionSupportedTaskIds` and
  can make `collect_missing_release_evidence` the next Owner action over the
  same `release_evidence_collection` route. That is still an action-template
  projection over the existing workbench action facade and collection service,
  not a new write boundary or release/deploy permission.
  If no supported task can be derived, the workbench falls back to the bounded
  `learning_loop_state` task. A returned collection artifact completes the UI
  action even when release-readiness remains `incomplete`.
  The UI `release_decision` action sends only advertised status, summary-only
  decision metadata, and `auto_select_latest_ready_collection_run=true` when
  provided by the backend template; latest ready-run lookup and approved
  decision validation remain in `learning-automation-release-decision-service`.
  `release_package` remains two-step UI glue by default: Owner first builds a
  summary-only `growth.learningAutomationReleasePackage.v1` candidate through
  `POST /api/v1/growth/automation/release-packages/build`, then records that
  exact candidate through the workbench action facade. A workbench placeholder
  body cannot create a package record. Owner tooling may also send an explicit
  `buildReleasePackage` / `build_and_record_package` workbench action, which
  delegates build plus package-record persistence to the package service instead
  of requiring a prebuilt artifact in the action body. The build service/API/CLI
  can also persist a package audit record only when explicit
  `write_package_record` / `--write-package-record` plus write authorization is
  supplied. The frontend
  harness explicitly covers
  `release_approval`, `release_evidence_collection`, `release_decision`, and
  `release_package` action templates: approval payloads must contain only
  advertised approval/config gate fields, collection payloads must contain only
  bounded tasks / required task ids / `write_collection_run` /
  `write_release_evidence_records`, decision payloads must contain only the
  explicit latest-ready collection-run auto-selection flag plus summary-only
  decision metadata, package build payloads must not include package artifacts,
  package record payloads must include a real summary-only package candidate,
  and none of these payloads may include `writefulSchedulingAllowed`, raw
  prompts, transcripts, private evidence, or runtime config values.
  Release-readiness writes a summary-only advisory
  snapshot only when `--write-snapshot` is explicitly supplied. Growth now also
  has `npm run smoke:release-evidence-bundle-audit`, a service-owned read-only
  audit over a previously generated bundle. It validates bundle schema,
  `summary_only`, default task coverage, pass counts, required evidence keys,
  privacy-risk keys, and private path/value leaks, emits
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1`, and intentionally
  stays outside the bundle being audited to avoid circular release artifacts.
  The audit smoke mirrors bounded top-level `releaseEvidenceBundleAudit*`
  operator readback for status, scope, bundle schema/privacy/file/counts,
  required-task coverage, missing/blocked tasks, missing evidence keys, privacy
  finding counts, and false runtime/scheduling flags while preserving the
  service DTO as canonical.
  Growth now also has `npm run smoke:release-package`, a service-owned release
  evidence package builder plus package audit-record boundary implemented by
  `learning-automation-release-package-service` and
  `scripts/build-growth-release-package.js`. It composes the release evidence
  bundle builder, bundle self-audit, release-readiness evaluation,
  collection-run evaluation or explicit `--write-collection-run --allow-write`
  persistence, release-controls readback, and release-dashboard readback into
  one summary-only `growth.learningAutomationReleasePackage.v1` artifact. The
  package may also write a summarized package audit record through
  `automation-release-packages.js` into
  `learning_growth_automation_release_packages` only with
  `--write-package-record --allow-write`; package records include bounded
  `releaseDashboardSummary` in `release_dashboard_summary_json`, including
  readiness-evidence present/missing counts, source bundle id, latest readiness
  snapshot id, latest snapshot evidence counts, compact Owner review
  stage-summary counters when present, persisted evidence keys, and latest
  preflight report id/status/advisory readiness flags from the package's
  release-dashboard summary.
  The `smoke:release-package` CLI / `build-growth-release-package.js` also
  mirrors bounded top-level `releasePackage*` operator readback fields for
  package status, step counts/statuses, collection-run id/write state,
  package-record request/write/id, latest preflight fields, dashboard/controls
  status, readiness evidence counts, missing check/evidence/approval counts,
  and runtime/write flags while preserving the nested package DTO as canonical.
  The
  release review, authorization, closure, controls, inventory, and dashboard
  readbacks project that dashboard summary as latest-package dashboard status,
  next-action key, required-action count, step count, bounded readiness
  evidence count/source readbacks, and package-dashboard preflight readback
  fields without exposing raw package artifacts; after an approved release
  decision, release review and authorization require a matching readable package
  audit record with
  `packageRecordStatus=ready_for_release_review`, while package dashboard
  fields remain readback only. The
  visible-target scoped
  `GET /api/v1/growth/automation/release-packages` and Owner-only
  `POST /api/v1/growth/automation/release-packages/build` expose explicit
  package candidate build from the plugin HTTP boundary. The build route uses a
  build-capable package service instance wired to the release evidence bundle
  service's injected runner plus bundle-audit/readiness/collection-run/
  controls/dashboard services; it defaults to no-write and can return blocked
  summary-only candidates for Owner audit, while explicit write flags may
  persist only the collection-run row and/or package audit record through their
  owning services. Owner-only
  `POST /api/v1/growth/automation/release-packages` records existing package
  artifacts only and does not run package smoke tasks. The package boundary
  never flips runtime config, grants scheduler permission, calls Gateway,
  publishes, evaluates, schedules, delivers notifications, activates stage
  assessments, mutates learner state, or deploys.
  Growth now also has `npm run smoke:release-evidence-collection`,
  `learning-automation-release-evidence-collection-service`, and Owner-only
  `POST /api/v1/growth/automation/release-evidence-collections/run` for an
  explicit summary-only release evidence collection pass. The service composes
  release evidence bundle build, bundle self-audit, release-readiness
  evaluation, and collection-run readback through the normal service graph. It
  can optionally write only the existing collection-run audit row when
  `--write-collection-run --allow-write` or Owner route authorization is
  present. It can also explicitly persist pass summary evidence from the
  bundle, plus the bundle self-audit, into the existing
  `learning_growth_automation_release_evidence` table only through
  `learning-automation-release-evidence-service.recordEvidence` when
  `--write-release-evidence-records --allow-write` or Owner route/workbench
  authorization is present. For UI pass evidence from the bundle, the
  collection service preserves only the bounded UI validator projection fields
  during compaction so the release-evidence service can re-run the UI evidence
  validator before saving a pass record. The explicit
  `release_package_review_ui` bundle task can flow through this facade from a
  supplied summary UI artifact file; the raw artifact path is treated as
  transient input, stripped from public artifacts, and never persisted. The
  collection service now strips transient central visual/UI evidence-file
  fields, including nested `evidence` fields, after bundle collection and
  before bundle-audit, release-readiness, collection-run, and release-evidence
  record paths. That keeps local Home AI artifact paths out of downstream
  privacy scans and persisted records while still letting the bundle builder
  read explicit summary-artifact inputs. The release-evidence CLI `bag`/`list`
  default limit remains `20` when `--limit` is omitted, so multi-record
  readback such as `centralVisualEvidence` plus `releaseEvidenceBundleAudit`
  is visible without an explicit limit. Persisted release-evidence bag
  projection now preserves the readiness contract fields
  `schemaVersion`, `privacyClass=summary_only`, `summaryOnly=true`,
  `evidenceKey`, and `checkKey`, so persisted pass records can be consumed by
  `learning-automation-release-readiness-service` instead of appearing only in
  `persistedEvidenceKeys`. Release evidence records are strict to their stored
  `workspaceId` / `learnerId` / `programId` / `domainPackId` / `domain` /
  `subject` / `horizon` scope; a domain-scoped release such as Fanfan science
  must collect or replay evidence with matching `--domain` and `--subject`
  values. A local replay for `weixin_stephen/science` wrote
  `centralVisualEvidence` record `lgarev_520d91fed2dd889df3` and
  `releaseEvidenceBundleAudit` record `lgarev_c6c62b2f0d032ce7e7`,
  after which readiness reported `central_visual_evidence=pass` while overall
  release readiness remained incomplete. The release workbench now maps missing
  `release_package_review_ui_evidence` to
  that collection task, Owner action routing accepts the matching transient
  artifact-file field only as a whitelisted collection input, and the embedded
  Owner UI preserves the derived task selector in its action payload. The
  service owns no evidence
  repository and keeps release-evidence record failures visible in the
  collection artifact instead of fabricating readiness. It does not create
  release package records, release decisions,
  approvals, activation/runtime enablement rows, scheduler permission,
  deployment, publication, generation, evaluation, or learner-state mutation.
  The facade is deployed in Mac production at commit `2178bdc86b97`. A
  production no-write smoke run as `hermes-host` with the launchd Growth env
  proved the `learning_loop_state` collection subset can build a summary-only
  bundle, pass bundle audit, evaluate release-readiness as incomplete, evaluate
  collection-run readback, keep `collectionRunWritten=false`, and keep
  `writefulSchedulingAllowed=false`. Full release readiness remains incomplete
  until product UI/visual, platform action, and completed-cycle/profile-feedback
  evidence are present. Production Fanfan science target-provisioning evidence
  now uses the current native graph domain pack id
  `domain_pack_fanfan_cambridge_pathway_v1`; the older
  `uk_hk_curriculum_foundation` value is treated as a stale playbook marker in
  current Growth docs. The production no-write target-provisioning release
  evidence subset passes through `sample_default`, writes no collection-run
  record, and keeps scheduler permission false. The production no-write
  stage-checkpoint backend subset passes when `stage_assessment` and
  `stage_checkpoint_controls` are collected with a real science coverage node
  such as `kg_ls_science_scientific_enquiry_plan_investigative_work`; the
  controls may still report `insufficient_recent_practice`, which is expected
  low-pressure behavior and keeps formal activation disabled. The bundled
  evidence precedence fix for default false CLI fields is deployed in Growth
  commit `0daee3afded5`.
  Growth now also has `npm run smoke:release-collection-run`, a service-owned
  release collection-run boundary over bundle, bundle-audit, and
  release-readiness artifacts. It delegates to
  `learning-automation-release-collection-run-service`, evaluates
  `growth.learningAutomationReleaseCollectionRun.v1` no-write by default,
  mirrors bounded top-level `releaseCollectionRun*` operator readback for
  status, write/record state, target scope, bundle/audit/readiness counts and
  statuses, evidence keys, artifact file names, and false runtime/scheduling
  flags,
  strips artifact paths to file names, writes
  `learning_growth_automation_release_collection_runs` only with
  `--write-record`, and exposes visible-target scoped
  `GET /api/v1/growth/automation/release-collection-runs` plus Owner-only
  `POST /api/v1/growth/automation/release-collection-runs`. It is release
  evidence, not a scheduler permission or Home AI platform release switch.
  Growth now also has `npm run smoke:release-decision`, a service-owned Owner
  release-decision boundary after a collection run exists. It delegates to
  `learning-automation-release-decision-service`, evaluates
  `growth.learningAutomationReleaseDecision.v1` no-write by default, persists
  `learning_growth_automation_release_decisions` only with explicit
  `--allow-write`/`--write-record`, and exposes visible-target scoped
  `GET /api/v1/growth/automation/release-decisions` plus Owner-only
  `POST /api/v1/growth/automation/release-decisions`. Approved decisions
  require a ready summary-only collection run. With explicit
  `--auto-select-latest-ready-collection-run` /
  `auto_select_latest_ready_collection_run`, the decision service reads the
  latest persisted `ready_for_release_review` collection run through
  `learning-automation-release-collection-run-service.listRuns`, then applies
  the same validation and persistence boundary so Owner workbench actions do
  not require Codex-spliced collection-run JSON. Decisions remain advisory:
  `writefulSchedulingAllowed=false`, no runtime config flip, and no scheduler
  permission. Growth now also has `npm run smoke:release-review` and
  visible-target scoped `GET /api/v1/growth/automation/release-review`, a
  no-write summary-only readback that composes current release-readiness,
  latest release collection run, latest Owner decision, latest persisted
  release-package audit record, and release approval bag through service
  boundaries for future Owner UI/release controls. Package record readback is
  explicit advisory evidence (`packageRecordStatus`, `latestPackage`, and
  bounded `packageReadback` dashboard summary fields) and is not a hard
  authorization gate in this stage. It does not write tables, call Gateway,
  run smoke tasks, flip runtime config, or schedule work. Growth now
  also has
  `learning-automation-release-authorization-service`,
  `npm run smoke:release-authorization`, and visible-target scoped
  `GET /api/v1/growth/automation/release-authorization`. This is the final
  summary-only authorization readback consumed by scheduler execution: it
  requires an approved `growth.learningAutomationReleaseReview.v1`, a ready
  latest collection run, an approved latest decision, and an active
  `writefulExecutionApproval` key. It keeps
  `writefulSchedulingAllowed=false` and `runtimeConfigChange=false`, writes no
  tables, and flips no runtime config. When
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, scheduler execution
  now rechecks this authorization after delivered handoff, reviewed digest,
  failure-policy, and scheduler dry-run gates. Authorization alone is still
  insufficient for publication: execution also requires a later activation
  audit record readback. Growth now also has
  `learning-automation-release-closure-service`,
  `npm run smoke:release-closure`, and visible-target scoped
  `GET /api/v1/growth/automation/release-closure`. This no-write summary
  readback composes release-review plus release-authorization summaries into
  `growth.learningAutomationReleaseClosure.v1`, including package-record
  readback status, `latestPackage`, `backendEvidenceComplete`,
  `readyForOwnerReleaseActivation`, missing check/evidence/approval keys,
  required actions, and one next action while still keeping
  `writefulSchedulingAllowed=false` and `runtimeConfigChange=false`.
  Release-decision, release-review, release-authorization, release-controls,
  release-closure, release-activation, runtime-enablement, release-inventory,
  release-dashboard, release-workbench, and release-preflight smoke CLIs now mirror selected nested
  DTO
  fields into top-level operator readbacks for status, missing counts, required
  action count, one next action, approval counts, package/record/report status,
  activation/runtime-config readback fields, package-review readiness,
  advisory readiness booleans, and runtime/write
  flags only; those projections are not new release decisions, scheduler
  permissions, runtime config authority, or write permissions.
  Growth now also has
  `learning-automation-release-activation-service`,
  `npm run smoke:release-activation`, and visible-target scoped
  `GET /api/v1/growth/automation/release-activation`. This no-write activation
  preflight composes release-closure readback with selected runtime config
  gates (`writeful_execution`, `background_scheduler`, `background_worker`),
  approval keys, current config booleans, required actions, and one next action
  into `growth.learningAutomationReleaseActivation.v1`. It can report
  `readyForOwnerRuntimeConfigDecision=true`, but it applies no config and keeps
  `configChangeApplied=false`, `writefulSchedulingAllowed=false`, and
  `runtimeConfigChange=false`. It now also reads the latest persisted preflight
  report through the injected
  `learningAutomationReleasePreflightReportRepository.listReports` boundary
  and projects only bounded latest preflight report id/status/advisory readiness
  flags into activation preflight readback. Its smoke CLI also mirrors bounded
  top-level `releaseActivation*` operator readback for status/count/latest audit
  id, preflight readiness/report, gate/approval/action counts, next action, and
  runtime/write flags while preserving the nested activation/evaluated/record
  DTOs as canonical. Growth also has visible-target scoped
  `GET /api/v1/growth/automation/release-activations`, Owner-only
  `POST /api/v1/growth/automation/release-activations`, and
  `npm run smoke:release-activation -- --operation record --allow-write` for
  summary-only activation audit records in
  `learning_growth_automation_release_activations`. These records capture
  Owner intent, activation preflight evidence, and bounded preflight report
  readback only; they do not flip runtime config, grant scheduler permission,
  write preflight reports, or run scheduling. When
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, scheduler execution now
  reads these records through `learning-automation-release-activation-service`
  and requires a valid summary-only `writeful_execution` record before it can
  publish. Missing, blocked, privacy-invalid, non-record-only, or
  runtime-mutating activation records produce blocked execution metadata.
  Growth now also has
  `learning-automation-runtime-enablement-service`,
  `automation-runtime-enablements.js`,
  `learning_growth_automation_runtime_enablements`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablement`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablements`,
  Owner-only `POST /api/v1/growth/automation/runtime-enablements`, and
  `npm run smoke:runtime-enablement`. This is the final Growth-local
  record-only runtime enablement audit/readback boundary after release
  activation: it validates activation audit records for selected gates, reads
  injected current runtime config booleans, and can report
  `activation_record_required`, `activation_record_invalid`,
  `ready_for_manual_runtime_config_enablement`, `partial_config`, or
  `verified_enabled`, while projecting latest preflight report id/status and
  advisory readiness flags only from activation records, never by reading
  preflight reports directly. Its smoke CLI also mirrors bounded top-level
  `runtimeEnablement*` operator readback for status/count/latest audit id,
  runtime verification/manual config readiness, gate/config/action counts,
  preflight readback, next action, config mutation flags, and
  scheduler/background flags while preserving the nested runtime/evaluated/record
  DTOs as canonical. It still applies no config and keeps all runtime
  mutation/scheduling permission flags false.
  Growth now also has the no-write Owner release-controls aggregate:
  `learning-automation-release-controls-service`, visible-target scoped
  `GET /api/v1/growth/automation/release-controls`, and
  `npm run smoke:release-controls`. It composes release readiness, release
  review, release closure, release activation, runtime enablement, and bounded
  persisted activation/runtime enablement audit-record summaries through
  existing services into `growth.learningAutomationReleaseControls.v1`, reports
  the first blocking ladder status plus bounded required actions and one next
  action, exposes `auditReadback` plus `activation_records` /
  `runtime_enablement_records` steps, owns no repository/table, writes no
  records, runs no smoke tasks, and still applies no runtime config, grants no
  scheduler permission, publishes no cards, calls no Gateway, and keeps all
  runtime mutation/scheduling flags false.
  Scheduler dry-run now
  also has `npm run smoke:scheduler-dry-run`, a service-owned no-write CLI
  that delegates to `learning-automation-scheduler-service.dryRun` through the
  normal service graph and provides local or production dry-run evidence
  without Gateway calls, publication, scheduler execution, scheduler ticks,
  notification delivery, stage activation, direct repository access, or
  learner-state mutation. The CLI now mirrors bounded top-level
  `schedulerDryRun*` operator readback for status, scope, selectors, candidate
  counts, candidate ids/decisions, privacy finding count, no-write/no-publish
  state, and false runtime/scheduling flags while preserving the nested service
  DTO as canonical. Daily-loop preview now also has
  `npm run smoke:daily-loop-preview`, a service-owned no-write CLI that
  delegates to `learning-daily-loop-service.preview` through the normal service
  graph and provides local or production daily-loop context/readiness evidence
  without Gateway calls, plan draft/publish, card generation, scheduling,
  notifications, stage activation, direct repository access, SQLite writes, or
  learner-state mutation. The preview CLI now reuses the same top-level
  `dailyLoop*` operator readback as the controlled `npm run smoke:daily-loop`
  CLI for operation/outcome, write-operation flag, target/scope, readiness
  gates, action availability, plan draft/item ids/status/counts,
  generated/published card ids, generation/gateway summary, recommendation
  acceptance, duplicate/error/stage, cycle audit/completeness counts, and
  missing-required counts while preserving the nested daily-loop DTO as
  canonical. Learning-loop state now also has
  `npm run smoke:learning-loop-state`, a service-owned no-write CLI that
  delegates to `learning-loop-state-service` through the normal service graph.
  It projects compact `growth.learningLoopState.v1` summary-only state and the
  next Owner action from daily-loop preview plus stage-assessment readiness,
  and now includes nested `growth.learningLoopState.recommendationEvidence.v1`
  trace linking bounded evidence ids, source card/evaluation ids, reward
  settlement ids/coin totals, plan drafts, profile-delta audits, Owner
  corrections, Profile V2 summaries, and trajectory recommendation lifecycle
  rows that explain the next
  recommendation. The smoke CLI also mirrors top-level `learningLoopState*`
  operator readback for status, draft/publish/checkpoint readiness, active
  checkpoint state, checkpoint reason/cooldown, next action, target/scope, readiness gates,
  audit/profile/recommendation counts,
  reward counts/coins, and stage-assessment status while preserving the nested
  state DTO as canonical,
  without Gateway calls, plan publication, card generation, evaluation,
  reward settlement, scheduling, stage activation, direct repository access,
  SQLite writes, or learner-state mutation. It strips idempotency keys,
  ledger-entry JSON, raw settlement payloads, learner answers, transcripts,
  prompts, credentials, and provider configuration. Profile-feedback evidence now also has
  `npm run smoke:profile-feedback`, a service-owned no-write CLI that delegates
  to `learning-profile-feedback-evidence-service` through the normal service
  graph. It requires a bounded completed-cycle selector and returns
  `growth.learningProfileFeedbackEvidence.v1` summary-only evidence from audit
  completeness, persisted evidence, persisted profile delta, Profile V2,
  recommendation, and next loop-state readback without Gateway calls, plan
  publication, card generation, evaluation, scheduling, stage activation,
  direct repository access, SQLite writes, or learner-state mutation. The smoke
  CLI also mirrors top-level `profileFeedback*` operator readback for
  status/readiness, target/scope selectors, check pass/missing/blocked counts,
  evidence/profile/profile-delta counts, recommendation, loop-state next
  action, reward settlement counts/coins, selector discovery/auto-selection,
  selected-cycle ids, and missing-required counts while preserving the nested
  `growth.learningProfileFeedbackEvidence.v1` DTO as canonical. When no
  selector is supplied, the same service may call the read-only
  `learning-cycle-history-service` for bounded selector discovery only. The
  default path then fails closed with `selectorDiscovery.status`, selector/cycle
  counts, and a remediation `nextAction` such as
  `produce_completed_daily_cycle`; release bundles preserve that summary in
  `productionProfileFeedbackSmokeEvidence.summary` without passing release
  evidence or fabricating learner history. Explicit
  `autoSelectCompletedCycle` / `autoSelectLatestCompletedCycle` input, used by
  release evidence collection and the release workbench `profile_feedback`
  action body, may select a real completed history candidate and continue the
  normal persisted evidence/Profile V2/profile-delta/recommendation/loop-state
  checks. The Owner
  Recommendation lifecycle readback now also has
  `learning-recommendation-lifecycle-service`,
  `GET /api/v1/growth/recommendations/lifecycle`, and
  `npm run smoke:recommendation-lifecycle`. This is a summary-only no-write
  readback over persisted card trajectory recommendation lifecycle rows:
  pending, accepted, superseded, source card/evaluation, generated card/plan,
  bounded target nodes, and aggregate counts. It feeds release evidence as
  `productionRecommendationLifecycleSmokeEvidence` /
  `production_recommendation_lifecycle_smoke_evidence`, rejects write flags in
  the smoke CLI, mirrors top-level `recommendationLifecycle*` operator
  readback for operation/status, write gate, scope, filters, lifecycle counts,
  status counts, latest trajectory, pending trajectory ids, accepted
  generated-card ids, and write-performed flags while preserving the nested DTO
  as canonical, and does not call Gateway, publish, generate, evaluate,
  schedule, notify, activate stage assessments, inspect SQLite tables directly
  outside the repository, or mutate learner state. The Owner
  `生成` tab now reads the same
  `GET /api/v1/growth/learning-loop/state` route after generation context load
  and exposes a minimal supervised daily-loop operation path: `规划下一张`
  calls `POST /api/v1/growth/daily-loop/draft`, renders a bounded plan draft
  preview, and `发布为卡片` calls
  `POST /api/v1/growth/daily-loop/publish` before refreshing board,
  card-generation context, and learning-loop state. It now also renders
  `ownerAudit` from the card-generation context, including plan audit,
  persisted profile-delta summaries, correction history, and a bounded Owner
  correction form that calls
  `POST /api/v1/growth/profile-corrections` before refreshing context and
  learning-loop state. The same tab now also reads
  `GET /api/v1/growth/learning-loop/runs` and executes the current
  service-projected next action through
  `POST /api/v1/growth/learning-loop/advance` from the `闭环执行` panel, with
  visible progress/error state and summary-only run-history readback. The
  browser still does not call Gateway directly, compute learning policy, mutate
  Profile V2 locally, inspect operating-loop run storage, or publish
  automatically.
  Controlled daily-loop
  draft/publish smoke evidence is
  now available through `npm run smoke:daily-loop`; it defaults to preview, and
  `draft` or `publish` operations require the explicit `--allow-write` flag.
  That CLI still delegates only through `learning-daily-loop-service` and the
  normal service graph; it does not import repositories, call Gateway directly,
  call the plan publisher or card generator directly, run schedulers, deliver
  notifications, or activate stage assessments. Learner daily-card cycle smoke
  evidence is now available through `npm run smoke:learner-cycle`, backed by
  `learning-learner-cycle-service`. It defaults to no-write `audit` and returns
  summary-only cycle audit/completeness; `submit`, `evaluate`, `reflect`, and
  `full` require explicit `--allow-write` and delegate through the normal
  Growth service graph for submission, evaluation queue processing, reflection,
  profile/evidence/profile-delta effects, and audit readback. The smoke output
  must not echo learner text, reflections, transcripts, prompts, answer keys,
  raw model output, credentials, or provider config. The smoke CLI also mirrors
  top-level `learnerCycle*` operator readback for operation/status, write gate,
  target/scope selectors, card/evaluation-job state, submission/evaluation/
  reflection ids and counts, formal stage-assessment cycle completion/cooldown
  ids from evaluation results, cycle-audit counts, completeness readiness,
  missing-required counts, and finding counts while preserving the nested
  `growth.learningLearnerCycleSmoke.v1` DTO as canonical. Its harness now also
  chains a write-gated `full` learner-cycle smoke into a no-write
  `smoke-growth-learning-loop-state` read against the same temporary DB,
  proving the operational smoke artifacts can feed the next planning action
  without exposing raw learner/model content. Audit-completeness privacy
  projection now scans public DTO keys for raw/private field names instead of
  scanning arbitrary text values, so safe public vocabulary does not block a
  summary-only cycle while raw prompt, transcript, answer-key, private-path,
  provider-config, credential, cookie, token, or password keys still block
  readiness. Target provisioning smoke
  evidence is available through `npm run smoke:target-provisioning`; it
  delegates only to `learning-target-provisioning-service`, defaults to
  read-only resolve, requires explicit `--allow-write` for provision writes,
  and covers cross-subject domain-pack plus subject-domain selection such as
  `domain_pack_fanfan_cambridge_pathway_v1` with `subject=science`. The smoke
  CLI also mirrors top-level `targetProvisioning*` operator readback for
  operation/status, write gate, target-enabled status, learner/program scope,
  selected domain-pack/domain/subject, selected graph-node counts,
  provision status, graph option counts, subjects, and node mismatch/missing
  ids while preserving the service DTO as canonical. It is now also part of the
  default release evidence bundle as `target_provisioning`,
  maps to `productionTargetProvisioningSmokeEvidence`, and feeds
  release-readiness as `production_target_provisioning_smoke_evidence` so
  multi-workspace/domain-pack rollout cannot pass release review without
  bounded target-resolution evidence. Formal checkpoint operational
  evidence is now available through `npm run smoke:stage-assessment`; it
  defaults to read-only `learning-stage-assessment-service.stageReadiness`,
  while `eligibility`, `activate`, and `complete` require explicit
  `--allow-write` and delegate only to `learning-stage-assessment-service`
  through the normal service graph. The smoke CLI mirrors bounded top-level
  `stageAssessment*` operator readback for operation/status, write gate,
  target/scope, readiness evidence, cycle state, generation/publication ids,
  and no-write status while keeping the nested service DTO canonical. It does
  not import repositories, call
  Gateway directly, publish through plan services, evaluate submissions, run
  automation, or mutate learner state outside the stage-assessment service.
  The broad local `npm run check`
  gate now syntax-checks every Growth runtime JavaScript file under `scripts/`,
  `src/`, and `public/`, with `scripts/check-growth-syntax-coverage.js` and
  `tests/growth-architecture-boundary.test.js` enforcing no missing, stale, or
  duplicate check entries. The system scheme,
  plan, roadmap, and
  next-stage plan are the implementation-planning entry points for product
  thesis,
  non-negotiable principles, the supervised learning-program model,
  daily/checkpoint/program time scales, delivery stages, release gates, data
  ownership, model boundaries, capability model, scientific learning policy,
  Owner operating modes, automation maturity, the Fanfan science daily-card
  playbook, capability readiness levels, documentation/harness contract, and
  the immediate learning-cycle audit aggregate plus Owner-supervised daily
  planning UI slices. The scheme docs now also define the end-state capability
  definition, current-capability versus product-complete distinction, closure
  ladder, stage-gate map, implementation package contract, architecture
  optimization backlog, scheduler dry-run-first boundary, and automation
  digest gate so future work can proceed from Growth-local documents rather
  than thread-local planning notes. The scheme docs also now separate the
  Growth learning system into scope/graph, learner-state, model-draft,
  learning-action, and audit/next step planes, and distinguish backend-capable,
  browser-operable,
  release-reviewable, and writeful-automation-allowed states so release
  readiness cannot be mistaken for scheduler permission.
  `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` is the durable execution
  plan for target outcome, current backend baseline, non-negotiable
  boundaries, W1-W7 program-level workstreams, model-entered steps, durable
  state ownership, delivery packages, immediate implementation choice, and
  definition of done.
  `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` is the
  durable plan for the digest service/repository/routes/UI/harness that must
  precede writeful scheduling, notification handoff, or automatic publication.
  The multi-workspace/domain-pack backend slice now includes graph import
  domain-pack inference for multi-pack seeds that omit per-node
  `domainPackId`, graph plan/card audit propagation of `domainPackId`,
  `domain`, and `subject`, and a non-sample provisioned science vertical
  harness that proves unprovisioned blocking, explicit provision enablement,
  wrong-subject blocking, `learning-daily-loop-service.advance()` over the
  same recipe/context path, board/detail visibility, one submission, one
  evaluation, one reflection, duplicate daily submission/reflection rejection,
  target-workspace scoped plan/card/evidence/Profile V2/profile-delta rows,
  next loop-state readback, and profile-feedback evidence without leaking or
  mixing Fanfan rows. The same target-resolution evidence is now
  collected by the default release evidence bundle and represented in
  release-readiness before any production scheduling decision.
  Evidence-ledger audit readback is now implemented through
  `learning-evidence-audit-service` and visible-target scoped
  `GET /api/v1/growth/evidence/audit`, with filters for learner, program,
  evidence id, source type/id, task-card id, card role, status, target nodes,
  and limit. The route returns bounded summary-only evidence history DTOs
  without exposing raw ledger table rows or private summary fields.
  Learning-cycle audit aggregation is now implemented through
  `learning-cycle-audit-service` and visible-target scoped
  `GET /api/v1/growth/learning-cycles/audit`; it composes public plan,
  evidence, profile-delta, and Owner-correction readbacks into bounded counts
  and a timeline for one card/evaluation/plan without route-level table access
  or raw private payload projection.
  Selectable learning-cycle history is now implemented through
  `learning-cycle-history-service`, visible-target scoped
  `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`; it composes public plan-audit,
  evidence-audit, profile-delta-audit, correction, and optional completeness
  DTOs into bounded `growth.learningCycleHistory.v1` rows for Owner history
  selection without writes, Gateway calls, direct repository access,
  publication, generation, evaluation, scheduling, notification delivery,
  stage activation, or learner-state mutation. The smoke CLI also mirrors
  top-level `cycleHistory*` operator readback for target/filter selectors,
  cycle counts, latest activity, partial failures, cycle ids, first-cycle
  selectors/counts/completeness, and missing-required counts while preserving
  the nested history DTO as canonical. The embedded Owner `生成` tab now
  consumes those rows through `growth-api-client.js`, renders selectable
  historical cycles, and uses only the selected row's service-provided selectors
  to refresh `learning-cycles/audit` plus `learning-cycles/completeness`; browser
  code must not reconstruct history from raw rows.
  Audit-completeness readback is now implemented through
  `learning-audit-completeness-service` and visible-target scoped
  `GET /api/v1/growth/learning-cycles/completeness`; it evaluates the public
  cycle-audit DTO for required plan publication or publish-attempt visibility,
  evaluation evidence, profile-delta audit, downstream partial failures, and
  privacy projection before UI closure or future supervised automation dry
  runs. It is read-only and does not call Gateway, write durable state, or start
  scheduling.
  The supervised automation proposal scheme is now locally implemented as the
  first non-scheduling automation layer: proposal creation requires a previous
  source-cycle id, audit-completeness readiness, target/domain-pack
  provisioning, and summary-only persistence in
  `learning_growth_automation_proposals`; it may draft a plan only through
  `learning-plan-publisher-service.draftPlan`. Owner review is recorded
  through `POST /api/v1/growth/automation/proposals/:proposalId/decision`
  with terminal statuses `accepted`, `skipped`, `expired`, and `superseded`.
  Accepted proposals return the explicit Owner publish action but do not
  publish cards during decision. Explicit accepted-proposal publication is now
  implemented through
  `POST /api/v1/growth/automation/proposals/:proposalId/publish`, which
  requires Owner role, target visibility, `status=accepted`, delegates only to
  `learning-plan-publisher-service.publishPlanItem`, and records bounded
  execution metadata in `learning_growth_automation_proposals`. Successful
  execution is idempotent; failed/blocked execution stays visible for explicit
  Owner retry. The proposal layer must not call Gateway directly, call card
  generation directly, activate stage assessments, or start a scheduler. The
  repository rejects privacy-risk keys and non-summary privacy classes,
  migrates missing bounded decision/execution columns, treats duplicate
  same-status decisions as idempotent, and rejects conflicting terminal
  decisions. `npm run smoke:proposal` is implemented as a service-owned
  operational smoke; it defaults to read-only proposal list, gates
  create/review/publish with explicit `--allow-write`, and delegates only to
  `learning-automation-proposal-service`. The smoke CLI mirrors bounded
  top-level `automationProposal*` operator readback for operation/status, write
  gate, proposal counts/statuses, source-cycle selectors, plan/item ids,
  publish-action availability, execution status, and no-write list state while
  preserving nested proposal DTOs as canonical. Focused proposal
  repository/service/route/script/architecture harnesses pass. The embedded
  Owner `生成` tab now has the first proposal review panel over the existing
  proposal routes: it can create a bounded proposal from the selected
  historical cycle, lists bounded proposals for the selected visible target and
  scoped learner/domain-pack/subject, records `accepted`, `skipped`, `expired`,
  or `superseded` decisions, shows visible blocked-action feedback for
  non-proposed/non-publishable rows, and can explicitly publish an already
  accepted proposal through
  `POST /api/v1/growth/automation/proposals/:proposalId/publish`. This panel
  uses the selected cycle's service-provided selectors, does not call Gateway
  directly, does not call card generation directly, does not run schedulers,
  does not activate stage assessments, and does not mutate learner state
  outside the existing proposal create/decision/publish service boundaries.
  Proposal create/review/publish actions refresh proposal, digest,
  action-handoff, scheduler execution/run, worker-target, and release-workbench
  readbacks after the service write. Production visual/UI and release evidence
  remain later slices.
  The supervised scheduler dry-run boundary is now locally implemented through
  `learning-automation-scheduler-service` and Owner-only
  `POST /api/v1/growth/automation/scheduler/dry-run`. It lists accepted
  proposals through the proposal service, skips already-published executions,
  rechecks source-cycle audit completeness and target provisioning, and returns
  bounded `would_publish`, blocked, or skipped candidates with `dryRun=true`,
  `writePlanned=false`, `writesPerformed=false`, and `publishPlanned=false`.
  It must not call Gateway, publish plans, generate cards, record proposal
  execution, send notifications, activate stage assessments, or inspect SQLite
  tables directly. Background writeful scheduling remains blocked until
  production visual/release evidence, platform Action Inbox/Web Push receipt
  evidence, explicit release approvals, and runtime enablement evidence are
  implemented and covered by harness.
  The automation digest backend is now implemented through
  `learning-automation-digest-service`, `automation-digests.js`,
  `learning_growth_automation_digests`, and visible-target/Owner scoped
  `/api/v1/growth/automation/digests` routes. It persists summary-only
  scheduler dry-run packets and bounded review metadata while preserving
  `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and
  `publishPlanned=false`; it must not publish, record proposal execution,
  notify, enqueue, call Gateway, or activate stage assessments.
  The embedded Owner UI can explicitly create one persisted dry-run digest from
  the selected bounded scope, refresh/list persisted digest packets, and record
  `reviewed`, `archived`, or `superseded` review state. This UI path delegates
  only through the Growth API client/route/service boundary and must not
  publish, schedule, call Gateway, evaluate, notify, mutate runtime config, or
  grant release permission.
  `npm run smoke:digest` is the service-owned operational smoke for this
  boundary: `list` is the default read-only operation, `get` is read-only, and
  `create`/`review` require explicit `--allow-write` while delegating only to
  `learning-automation-digest-service`. The smoke CLI mirrors bounded
  top-level `automationDigest*` operator readback for operation/status, write
  gate, digest counts/statuses, dry-run flags, candidate/blocked/required-action
  counts, required action endpoints, and review state while preserving nested
  digest DTOs as canonical.
  The automation failure-policy backend is now implemented through
  `learning-automation-failure-policy-service`,
  `automation-failure-policies.js`,
  `learning_growth_automation_failure_policies`, and visible-target/Owner
  scoped `/api/v1/growth/automation/failure-policies` routes. It stores
  summary-only policy/rollback/failure metadata, activates draft policies only
  through Owner review, reports active policy readiness as one future
  scheduling prerequisite, and keeps `writefulSchedulingAllowed=false`; it
  must not publish, call Gateway, call scheduler dry-run, record proposal
  execution, notify, enqueue, or activate stage assessments.
  `npm run smoke:failure-policy` is the service-owned operational smoke for
  this boundary: `readiness` is the default read-only operation, `list` is
  read-only, and `create`/`review` require explicit `--allow-write` while
  delegating only to `learning-automation-failure-policy-service`. The smoke
  also mirrors bounded top-level `automationFailurePolicy*` operator readback
  for operation/status, write gate, scope, policy ids/status counts, Owner
  review state, retry/rollback/failure flags, missing prerequisites, and
  `writefulSchedulingAllowed=false` while keeping nested DTOs canonical.
  The embedded Owner `生成` tab now consumes the same boundary through a
  `失败策略` panel between automation digest and action handoff. The panel
  reads failure-policy list/readiness through direct/proxy Growth API helpers,
  creates the default summary-only visible-failure / Owner-retry /
  transactional-rollback draft policy, reviews draft policies to active,
  archived, or superseded, shows ready/draft/active readback, and refreshes
  action-handoff, scheduler execution/run, and release-workbench state after
  policy writes. It does not infer scheduler permission locally, call Gateway,
  call Home AI old Growth logic, or mutate learner evidence/profile/card state;
  `writefulSchedulingAllowed` remains false.
  The automation action handoff backend is now implemented through
  `learning-automation-action-handoff-service`,
  `automation-action-handoffs.js`,
  `learning_growth_automation_action_handoffs`, and visible-target/Owner
  scoped `/api/v1/growth/automation/action-handoffs` routes. It creates
  summary-only handoff records only after reviewed digest and active
  failure-policy gates, emits bounded `growth.automation.action_required`
  metadata through `growth-event-service`, and records delivered or
  `delivery_failed` status without publishing cards, recording proposal
  execution, scheduling work, calling Gateway, or mutating learner state.
  `npm run smoke:action-handoff` now provides the service-owned operational
  smoke for this boundary: `list` is the default read-only operation, while
  `create` and `deliver` require explicit `--allow-write` and still delegate
  only to `learning-automation-action-handoff-service`. The smoke also mirrors
  bounded top-level `automationActionHandoff*` operator readback for operation,
  write gate, scope, handoff/digest/policy ids, delivery state, Owner action
  counts, blocked counts, notification event type, and
  `writefulSchedulingAllowed=false` while keeping the nested DTOs canonical.
  Backend-only Owner automation evidence is now implemented through
  `learning-automation-owner-review-evidence-service`,
  visible-target scoped
  `GET /api/v1/growth/automation/owner-review-evidence`, and
  `npm run smoke:owner-review-evidence`. It owns no repository/table, reads
  only existing proposal, digest, failure-policy, action-handoff, scheduler
  execution/run, worker-target, and release-readiness service DTOs, returns
  `growth.learningAutomationOwnerReviewEvidence.v1` summary-only evidence, and
  keeps all writeful scheduling/runtime flags false. The smoke also mirrors
  bounded top-level `automationOwnerReviewEvidence*` operator readback for
  scope, gate counts/keys, next Owner action, proposal/digest/action/scheduler/
  worker/failure-policy counters, release-readiness status, and scheduling/
  runtime false flags while keeping nested DTOs canonical. This is backend
  evidence only and does not replace production visual/UI release evidence.
  The automation scheduler execution backend is now implemented through
  `learning-automation-scheduler-execution-service`,
  `automation-scheduler-executions.js`,
  `learning_growth_automation_scheduler_executions`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/executions`, and Owner-only
  `POST /api/v1/growth/automation/scheduler/execute-once`. It supports only
  `owner_explicit_once`, defaults disabled through
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=false`, records bounded blocked
  execution when disabled, rechecks delivered handoff, reviewed digest, active
  failure-policy readiness, scheduler dry-run, final release authorization, and
  valid `writeful_execution` activation audit readback plus a matching
  persisted `verified_enabled` runtime enablement readback before publication
  when enabled, and delegates only to accepted-proposal publish. It is not a
  background scheduler or production auto-scheduling enablement.
  `npm run smoke:scheduler-execution` now provides the service-owned
  operational smoke for this boundary: `list` is the default read-only
  operation, while `execute` requires explicit `--allow-write` and still
  delegates only to `learning-automation-scheduler-execution-service`. With
  writeful execution disabled, explicit execution records a bounded blocked
  row rather than publishing. The smoke mirrors bounded top-level
  `automationSchedulerExecution*` operator readback for operation, write gate,
  audit-row write state, publish state, scope, execution ids/status counts,
  gate flags, action selectors, and retry/error visibility while preserving the
  nested DTOs as canonical. The embedded Owner `生成` tab now lists
  scheduler execution rows and can explicitly call `execute-once` from a
  delivered handoff through the Growth API client; the UI is glue only and does
  not call Gateway, scheduler run, worker targets, release internals, or card
  generation directly.
  The background scheduler contract is documented in
  `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`. Its local
  backend boundary is implemented as default-disabled
  `learning-automation-scheduler-run-service`,
  `automation-scheduler-runs.js`,
  `learning_growth_automation_scheduler_runs`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/runs`, and Owner-only
  `POST /api/v1/growth/automation/scheduler/run-once`. Its smoke mirrors
  bounded top-level `automationSchedulerRun*` operator readback for operation,
  write gate, blocked run-audit state, background scheduler state,
  candidate/execution counts, no-direct flags, and scope while preserving the
  nested DTOs as canonical. It also includes a
  reviewed worker target configuration backend through
  `learning-automation-scheduler-worker-target-service`,
  `automation-scheduler-worker-targets.js`,
  `learning_growth_automation_scheduler_worker_targets`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/worker-targets`, and Owner-only
  create/review routes. Worker target creation requires target/domain-pack/
  subject provisioning, review can move targets to `enabled`, `disabled`, or
  `archived`, and production worker targets must come from reviewed enabled
  rows rather than environment JSON alone. The embedded Owner `生成` tab now
  lists worker target rows, can create a proposed target for the selected
  visible/provisioned learner scope, and can review it as `enabled`,
  `disabled`, or `archived`; the UI keeps `productionSchedulingAllowed=false`
  and does not start workers, claim leases, call scheduler run/execution,
  deliver handoffs, call Gateway, publish, evaluate, mutate runtime config, or
  grant release permission. It also includes a
  default-disabled worker/lease backend through
  `learning-automation-scheduler-worker-service`,
  `automation-scheduler-worker-leases.js`, and
  `learning_growth_automation_scheduler_worker_leases`, with optional HTTP
  timer glue controlled by
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`. The run/tick boundary
  must record blocked state while
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false`, may inspect
  delivered handoffs only when explicitly enabled, delegates individual
  candidates only to the execution service, and must not become production
  unattended scheduling without platform action evidence, central visual
  evidence, production dry-run evidence, reviewed enabled worker targets,
  focused harnesses, and persisted explicit release approval. Focused repository/service/
  route/HTTP-glue/architecture harnesses cover disabled config, invalid mode,
  no delivered actions, execution delegation, partial downstream execution,
  domain/horizon filters, worker target create/review/list, active/stale
  worker leases, migration, privacy rejection, and Service First/
  no-direct-Gateway guards.
  `npm run smoke:scheduler-run` now provides the service-owned operational
  smoke for the scheduler run/tick boundary: `list` is the default read-only
  operation and delegates only to
  `learning-automation-scheduler-run-service.listRuns`; `run` requires
  explicit `--allow-write` and delegates only to
  `learning-automation-scheduler-run-service.runOnce`. With background
  scheduling disabled, explicit run records a bounded blocked row and must not
  list handoffs, execute actions, publish, call Gateway, run worker timers,
  activate stage assessments, or mutate learner state.
  The embedded Owner `生成` tab now lists scheduler run rows and can call
  `run-once` for one explicit summary-only `background_supervised_tick` through
  the Growth API client. This UI is glue only: it does not enable background
  scheduler config, start worker timers, claim leases, create/review worker
  targets, call Gateway, publish, evaluate, deliver handoffs, or grant release
  permission.
  `npm run smoke:scheduler-worker-target` now provides the service-owned
  operational smoke for reviewed worker target configuration: `list` is the
  default read-only operation and delegates only to
  `learning-automation-scheduler-worker-target-service.listTargets`;
  `runnable` / `list-runnable` is read-only and delegates only to
  `listRunnableTargets`; `create` and `review` require explicit
  `--allow-write` and delegate only to
  `learning-automation-scheduler-worker-target-service.createTarget` /
  `reviewTarget`. The smoke mirrors bounded top-level
  `automationSchedulerWorkerTarget*` operator readback for operation, write
  gate, scope, target ids/status counts, provisioning/readiness, Owner review,
  runnable ids, policy flags, and `productionSchedulingAllowed=false` while
  preserving nested DTOs as canonical. The CLI keeps
  `productionSchedulingAllowed=false` and must
  not start workers, claim leases, call scheduler run/execution, inspect
  handoffs, publish, call Gateway, generate cards, activate stage assessments,
  or mutate learner evidence/profile state. Environment JSON targets remain a
  local fallback, not production approval.
  `npm run smoke:scheduler-worker` now provides the service-owned operational
  smoke for the worker/lease boundary: the default `status` operation delegates
  to `learning-automation-scheduler-worker-service.tickTargets` and wraps
  `learning_automation_scheduler_worker_disabled` as expected no-write evidence
  while `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`; enabled
  `tick` / `tick-targets` operations require explicit `--allow-write` and
  still delegate only to the worker service. With the scheduler run gate still
  disabled, write-gated worker evidence records blocked lease/run state rather
  than publishing. The smoke mirrors bounded top-level
  `automationSchedulerWorker*` operator readback for disabled status, worker
  enablement, write gate, target counts, lease/run state, scheduler-run
  delegation, and no-direct safety flags without exposing lease tokens. The CLI
  must not import repositories, call Gateway, call scheduler run/execution
  services directly, inspect handoffs, publish, generate cards, activate stage
  assessments, or mutate learner evidence/profile state.
  The Owner daily-loop backend facade is now implemented through
  `learning-daily-loop-service` and Owner-only
  `GET /api/v1/growth/daily-loop/preview`,
  `POST /api/v1/growth/daily-loop/draft`, and
  `POST /api/v1/growth/daily-loop/publish`. It composes card-generation
  context, plan publisher, cycle audit, and audit-completeness services into
  bounded preview/draft/publish DTOs; publish responses strip generated
  authoring draft internals and refresh bounded audit/completeness state. It
  does not call Gateway directly, card generation directly, SQLite tables,
  notifications, Action Inbox, stage-assessment activation, or scheduling.
  The Owner learning-loop state read is now implemented through
  `learning-loop-state-service` and Owner-only
  `GET /api/v1/growth/learning-loop/state`. It composes the existing
  daily-loop preview DTO and read-only `learning-stage-assessment-service`
  readiness into compact `growth.learningLoopState.v1` state/next-action
  output for UI/harness use. It also composes read-only
  `learning-reward-audit-service` settlement readback and exposes nested
  summary-only `growth.learningLoopState.recommendationEvidence.v1` so
  Owner/release tooling can explain the next recommendation from persisted
  summary links, including reward settlement ids/coin totals, without rejoining
  raw tables or model output. Reward-audit selectors such as `taskCardId` and
  `evaluationId` are normalized from scalar or array inputs before readback.
  Active formal checkpoints take precedence over daily drafting and return
  `stage_checkpoint_active` with a bounded learner evidence next action.
  `learning-profile-feedback-evidence-service` now projects bounded reward
  settlement count and total learning-coin amount from the next loop-state
  readback, and the release evidence bundle keeps those summary fields in
  `productionProfileFeedbackSmokeEvidence`. The reward repository accepts both
  snake_case and camelCase service-context fields when settling daily-card
  rewards. The AI-loop harness now covers
  post-cycle readback from a completed Fanfan science daily card into the next
  planning action. It is no-write, summary-only, and does not call
  Gateway, publish plans, generate cards, evaluate submissions, run schedulers,
  deliver notifications, activate stage assessments, or inspect SQLite tables.
  The Owner stage-checkpoint controls read is now implemented through
  `learning-stage-checkpoint-controls-service` and Owner-only
  `GET /api/v1/growth/stage-assessments/controls`. It projects
  `growth.stageCheckpointControls.v1`, bounded readiness evidence, cooldown
  status, policy flags, bounded formal rubric policy summary, and route
  templates for refresh, Owner activation, and learner challenge without
  performing any write or activation itself. The embedded Owner UI may render
  the supplied rubric summary but must not recompute formal rubric policy in
  the browser.
  `npm run smoke:daily-loop` now provides a controlled local/production smoke
  entry for the same service boundary: preview is the default no-write
  operation, while `--operation draft` and `--operation publish` are rejected
  unless `--allow-write` is present; publish also requires a selected
  `--plan-draft-id`. Its top-level `dailyLoop*` readback is a bounded operator
  projection only; it does not add write permission, Gateway access,
  publication rights, scheduling, reward settlement, stage activation, or
  learner mutation. This complements the no-write
  `npm run smoke:daily-loop-preview` command.
  Embedded UI consumption remains a future slice. Central visual evidence now
  has a Growth-owned read-only ingestion boundary through
  `npm run smoke:central-visual-evidence`; the real production artifact still
  must be produced by the Home AI central visual toolchain before release.
  The ingestion service accepts raw Home AI visual artifact paths only as input
  for deriving basenames/booleans; public scope and projected public visual
  summaries are scanned for private path/token-looking values, and failed DTOs
  are redacted before release-bundle or readiness consumers see them.
  Release ladder public readbacks are now consistently privacy guarded:
  `learning-automation-release-review-service`,
  `learning-automation-release-authorization-service`,
  `learning-automation-release-closure-service`, and
  `learning-automation-release-activation-service` scan public inputs,
  dependency outputs, and final public DTOs for private path/token-looking
  values in addition to privacy-risk keys. Activation also scans saved
  activation output and list readback before returning repository rows.
  Failures return bounded finding paths only and do not echo private values.
  Plan publication failure visibility is now durable: `learning_growth_plan_drafts`
  stores bounded latest publish-attempt status/error/stage, the publisher writes
  failed or policy-blocked attempts without marking drafts published, and plan
  audit plus cycle audit expose the attempt as summary-only DTO metadata.
  The profile-delta backend slice now adds
  `learning-profile-delta-service`, injects it into evaluation processing, and
  returns bounded `profile_delta` audit data after ledger/profile writes.
  Durable profile-delta audit persistence/readback is now implemented through
  `learning_growth_profile_delta_audits`, `profile-delta-audits.js`,
  `learning-profile-delta-audit-service`, and
  `GET /api/v1/growth/profile-delta-audits`.
  Plan audit readback is now implemented through
  `learning-plan-audit-service`, program-aware
  `learning_growth_plan_drafts` listing, and Owner context projection as
  `ownerAudit.planAudit` / `planAudit` with recent validated drafts, selected
  published items, generated task-card ids, generated graph-plan ids, basis
  evidence ids, and summary-only item reasons. The same service is now exposed
  through visible-target scoped `GET /api/v1/growth/learning-plans/audit`.
  Owner-reviewed profile correction is now implemented through
  `learning-owner-correction-service`, Owner-only
  `POST /api/v1/growth/profile-corrections`, and
  `GET /api/v1/growth/profile-corrections`. Corrections are stored as
  summary-only `owner_reviewed_correction` rows in
  `learning_growth_evidence_ledger`, require visible-target and
  target-provisioning checks, and are absorbed by Profile V2 as auditable state
  adjustments without deleting historical evidence.
  `npm run smoke:owner-audit` is the service-owned operational smoke for this
  boundary: it defaults to read-only cycle audit/completeness/evidence audit/
  profile-delta audit/correction readback through the normal service graph,
  and records a correction only with explicit
  `--operation correction --allow-write` through
  `learning-owner-correction-service.recordCorrection`. The smoke CLI also
  mirrors top-level `ownerAudit*` operator readback for operation/status, write
  gate, target/scope selectors, downstream audit availability, plan/evidence/
  profile-delta/correction counts, completeness, missing-required counts,
  partial failures, latest activity, and correction-record metadata while
  preserving the nested audit/readback DTOs as canonical. The embedded Owner
  `生成` tab now consumes the same context-level audit/correction DTOs and can
  write bounded correction evidence. It also renders current-card
  single-cycle `learning-cycles/audit` and `learning-cycles/completeness`
  drilldown through the browser API client, using only bounded ids, summary
  counts, timeline rows, findings, and missing-required state.
  Profile V2 now includes expanded stale-evidence freshness: daily evidence and
  formal stage-assessment evidence use separate freshness windows,
  Owner-reviewed corrections do not refresh learner-evidence recency, stale
  strengths become low-pressure review hints instead of stretch claims, and
  planner context carries bounded `staleEvidence` summaries into
  `growth.learningPlanner.input.v1`.
  Owner target/domain-pack provision controls were deployed to Mac production
  on 2026-06-15 at Growth commit `ffabbbf4ef55`. Production smoke passed for
  manifest/status/static-version, central `embedded-plugin-shell` visual
  evidence, production Gateway planner readiness, daily-loop preview,
  learning-loop state, and release-readiness Owner-loop aggregation. A later
  2026-06-15 production operation provisioned Fanfan science for
  `domain_pack_fanfan_cambridge_pathway_v1` / `science` and published one
  Owner-supervised daily card; production learner-cycle writes remain gated
  behind explicit Owner-provided learner evidence.
  Production visual/UI evidence over the older-cycle drilldown, formal
  stage-checkpoint controls, proposal/digest/action/scheduler panels, real
  production platform Action Inbox + Web Push dual receipt evidence, and full
  automation release review remain future slices. The platform action evidence gate now
  requires a delivered Growth event-outbox notification receipt containing both
  an Action Inbox item id and a bounded Web Push `sent > 0` summary. Growth
  stores only summary counts/reason from the Home AI notification response and
  still must not read Home AI Action Inbox/Web Push storage, push
  subscriptions, endpoints, or raw payloads. The same summary-only evidence is
  now available through visible-target scoped
  `GET /api/v1/growth/automation/platform-action-evidence`, which delegates
  only to `learning-automation-platform-action-evidence-service.evaluate()`;
  the route is read-only and does not send notifications, grant release
  permission, grant scheduler permission, or mutate learner/runtime state.
  Owner audit-review release evidence is now part of the default release
  evidence bundle/readiness contract. The default `owner_audit_review` bundle
  task runs `npm run smoke:owner-audit-review` and maps bounded readback into
  `productionOwnerAuditReviewSmokeEvidence`; release-readiness checks
  `production_owner_audit_review_smoke_evidence` with a dedicated summary
  validator that requires a real bounded review summary instead of accepting an
  empty pass marker. Persisted release evidence records also project this
  summary through `ownerAuditReviewSummary` for readiness readback. This
  release evidence is distinct from `ownerReviewEvidence`, which remains the
  automation proposal/digest/action/scheduler review evidence model.
  Production deployment-health release evidence now has a Growth-owned
  summary-only validation boundary:
  `learning-automation-production-deployment-evidence-service`,
  visible-target scoped
  `POST /api/v1/growth/automation/production-deployment-evidence`, and
  `npm run smoke:production-deployment-evidence`. It validates only a bounded
  Home AI macOS deployment-health summary, requires `serviceRunning`,
  `manifestOk`, `healthOk`, Home AI deployment ownership, and Growth no-deploy
  boundary flags, and can feed release-readiness as
  `productionDeploymentHealthEvidence` / `production_deployment_health` through
  the release-evidence service or one-off validated summary input. It does not
  run deploy, restart, launchctl, scheduler, Gateway, runtime-config mutation,
  notification, publication, generation, evaluation, or learner-state actions.
- Platform `通宝` exchange, monthly Growth coin clearing, Action Inbox/Web Push
  handoff, and Owner manual decision flows remain in Home AI until their own
  migration stages are implemented and validated.

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
