# Growth AI Learning Next-Stage Plan

Last updated: 2026-06-16.

## Purpose

This document is the durable next-stage plan for Growth's supervised
AI-learning system. It records the current product direction and the immediate
implementation choices so later work does not depend on chat history.

Use this file after reading:

- `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` for the system thesis;
- `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` for the closed-loop contract;
- `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` for package-level
  execution rules;
- `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service, DTO,
  persistence, and harness details;
- `docs/GROWTH_AI_LEARNING_ROADMAP.md` for capability levels and stage gates;
- `docs/GROWTH_PLUGIN_ARCHITECTURE.md` for Service First boundaries.

The plan starts with Fanfan and the UK/HK curriculum foundation graph. The
architecture target remains any authorized learner workspace, domain pack,
subject, and knowledge graph after Home AI view-target visibility and Growth
target provisioning both pass.

## Target Outcome

Growth should not be measured by whether it can generate a card once. The
target outcome is an auditable learning operating loop:

1. observe summary-only learner evidence;
2. project the learner profile from persisted records;
3. choose the next learning action through Gateway-assisted planning;
4. validate and store the plan as a draft;
5. let Owner explicitly publish a low-pressure daily card or activate a formal
   checkpoint;
6. author the card through Gateway;
7. let the learner complete one bounded flow;
8. evaluate current evidence once through Gateway;
9. write evaluation, reward, evidence ledger, profile, recommendation, and
   profile-delta audit records;
10. let Owner review and correct the audit;
11. use the updated durable state for the next plan.

The operating principle is scientific accumulation: daily work stays small and
low-pressure, while weeks and months of evidence produce stronger profile
claims.

## End-To-End Mechanism Contract

The learning mechanism is a closed loop over durable records, not a one-off
card generator.

| Loop step | Durable source or sink | Model access |
| --- | --- | --- |
| Scope selection | Home AI view target plus Growth target provisioning. | None. |
| Knowledge selection | Imported graph nodes, prerequisites, domain-pack/subject metadata, and target provision. | Planner receives bounded node summaries only. |
| Profile projection | Evidence ledger, formal assessment evidence, learner signals, stale evidence, and Owner corrections. | Planner receives Profile V2 summaries only. |
| Plan | Gateway planner drafts a next action with horizon, minutes, role, support level, and evidence basis. | Gateway through `growth-gateway-planner-client`. |
| Validate plan | Schema, graph binding, horizon policy, pressure policy, and privacy validation. | None after draft output. |
| Publish daily card | Owner explicitly publishes one validated daily item through the plan publisher and card generation service. | Authoring Gateway only inside Growth card authoring. |
| Learner completes | One submission, one evaluation, one optional reflection for daily practice. Audio metadata and BLOB storage stay plugin-owned. | Evaluation Gateway receives only current-card evidence. |
| Persist evidence | Evaluation, reward, evidence ledger, Profile V2 effects, trajectory, recommendation lifecycle, and profile-delta audit. | None. |
| Owner audit | Cycle audit, profile delta, evidence audit, completeness, and correction readback. | None. |
| Next plan | The next planner run consumes the updated summary-only state. | Planner Gateway only. |

Daily practice is the high-frequency evidence loop. Stage assessments are
separate checkpoint loops with explicit activation, coverage, higher evidence
weight, completion, and cooldown owned by `learning-stage-assessment-service`.
The planner may recommend a stage checkpoint, but daily publication must not
silently become a formal assessment.

The system is considered closed only when a learner cycle can answer these
questions from persisted state:

- what graph nodes and prerequisites were selected;
- what Profile V2 evidence, stale evidence, and Owner corrections influenced
  the decision;
- which model boundaries ran and what validated draft ids were accepted;
- which card, submission, evaluation, reward, ledger, profile-delta, and
  recommendation records were written;
- what remains uncertain, stale, weak, or ready for formal checkpoint review;
- what the next recommendation is and why.

## Current Capability Summary

Growth already has substantial backend foundation:

- native graph import, graph plan, graph binding, graph options, and
  domain-pack/subject provenance;
- target/domain-pack provisioning;
- Gateway-only planner, authoring, and evaluation boundaries;
- `daily_score_once` learner flow for generated daily cards;
- formal stage-assessment backend with higher-weight evidence and cooldown;
- evidence ledger, evidence audit, Profile V2, profile-delta audit, Owner
  correction, cycle audit, and audit-completeness readback;
- plan draft, validation, audit, and publish bridge;
- Owner daily-loop backend facade for preview, draft, and publish;
- Owner learning-loop state readback through `learning-loop-state-service`,
  Owner-only `GET /api/v1/growth/learning-loop/state`, and
  `npm run smoke:learning-loop-state`, projecting compact summary-only status
  and next action without writes or model calls;
- selectable historical-cycle readback through `learning-cycle-history-service`,
  visible-target scoped `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`, composing public plan/evidence/profile-delta/
  correction readbacks plus optional completeness into bounded summary-only
  cycle rows without writes or model calls;
- Owner audit/correction smoke CLI for read-only cycle audit/completeness/
  evidence audit/profile-delta audit/correction readback and explicit
  `--allow-write` correction recording through the normal service graph;
- Fanfan science vertical and non-sample provisioned vertical harnesses;
- supervised automation proposal, scheduler dry-run, digest, failure policy,
  action handoff, Owner-explicit execution, scheduler run, reviewed worker
  target, default-disabled worker lease, release-readiness evidence, persisted
  release approval records, and persisted release evidence records.

The product is not complete because the browser history controls and release
evidence are not closed:

- Owner planner/provision UI now supports visible target selection,
  `targetProvisioning` status, domain-pack/subject selection, explicit Owner
  provision creation/update, daily-loop draft/publish, audit correction, and
  current-cycle audit drilldown. Central `embedded-plugin-shell` visual
  evidence and production Owner-loop smoke exist for the Growth plugin shell;
  backend historical-cycle readback exists, while browser richer older-cycle
  selection controls, formal checkpoint UI, and full automation release
  evidence UI/production collection remain incomplete;
- Owner audit/correction UI is not fully rendered from the implemented DTOs,
  even though the backend services and `npm run smoke:owner-audit` are
  available;
- stage-checkpoint UI remains separate future work;
- proposal/digest/action/execution/run/worker-target UI remains future work;
- platform Action Inbox/Web Push evidence is not complete;
- central embedded-plugin visual evidence exists for the Growth plugin shell;
  product-specific mobile/dark checks remain covered locally until the
  production release smoke is run;
- production planner readiness smoke and production dry-run evidence are still
  required before release;
- background writeful scheduling remains blocked.

## Current Execution Decision

The next product direction is Path A unless an explicit backend-only evidence
task is selected. The reason is dependency order: Growth already has many
backend loop services, but the loop is not product-complete until Owner can
operate and audit it from the embedded plugin.

The next implementation slices should be:

1. **Owner daily loop closure**: the minimal `生成` tab operation path now
   runs over the existing daily-loop facade. Owner can load context, inspect
   compact learning-loop state, draft one plan, preview the selected plan
   item, explicitly publish one card, and refresh board/context/loop state
   without Codex. Owner can also apply a domain-pack/subject selector and
   explicitly create/update target provision rows through the Growth service
   facade. This Owner-loop path is deployed and production smoke validated, but
   Fanfan science still requires explicit Owner provisioning before draft/
   publish. The remaining closure is older-cycle selection and formal
   checkpoint/proposal/digest/action/execution surfaces.
2. **Learner daily evidence closure**: keep generated daily cards on one
   active submission box, one evaluation, one optional reflection, audio
   record/playback, and score-proportional completion. No pass-line retry loop
   may be added for ordinary daily practice.
3. **Owner audit/correction closure**: the Owner `生成` tab now renders
   `ownerAudit` from context, including plan audit, persisted profile-delta
   summaries, correction history, and bounded correction writes through the
   Owner correction service. It also renders explicit
   `learning-cycles/audit` and `learning-cycles/completeness` drilldown for
   the current generated/completed card cycle, showing summary-only timeline,
   findings, and missing-required evidence. Backend selectable cycle history is
   available through `learning-cycle-history-service`; remaining closure is
   browser older-cycle selection plus production release evidence.
4. **Formal checkpoint separation**: expose readiness and activation for
   stage assessments as a separate Owner path. Daily plan publish must still
   block direct formal assessment publication.
5. **Generalized target closure**: extend the browser flow from the Fanfan
   sample to any visible and explicitly provisioned learner/domain pack while
   preserving actor/target workspace separation.

Release-readiness, scheduler run, worker target, and worker lease backends can
continue to collect evidence, but they remain secondary to the product-visible
loop. They must not change runtime config, call Gateway, publish cards,
evaluate submissions, activate stage assessments, or mutate learner state.

## Next Architecture Optimization Target

The next architecture optimization is to close the product loop over the
existing service facades, not to add another autonomous backend lane.

Current backend slices already cover most deterministic service boundaries:
graph import, provisioning, planner draft, card authoring, one-shot evaluation,
evidence ledger, Profile V2, profile delta, cycle audit, completeness,
proposal, dry-run, digest, failure policy, action handoff, default-disabled
execution, default-disabled scheduler run, worker target, worker lease, and
release-readiness evidence.

The missing product capability is the browser-operable learning loop:

| Slice | Objective | Required boundary | Non-goal |
| --- | --- | --- | --- |
| A1: Owner daily planning UI | Owner can create one daily card from persisted context through the plugin UI, apply target domain-pack/subject scope, and explicitly provision a visible target before planning. Older-cycle selection and release evidence remain. | Use `GET /api/v1/growth/learning-loop/state` for compact state/next action, `POST /api/v1/growth/domain-pack-provisions` for explicit target provision, then `learning-daily-loop-service` draft/publish for execution; render readiness, plan item, progress, errors, and card link. | No direct Gateway calls, no browser-side state recomputation, no new scheduler, no automatic publish. |
| A2: Learner daily evidence UI | Learner can finish the generated card with one submit, one evaluation, and one optional reflection. | Reuse generated-card detail flow, audio evidence, one-box-per-stage state, and visible failed-evaluation recovery. | No pass-line retry gate and no extra competing submission boxes. |
| A3: Owner audit/correction UI | Owner can see why the card happened, what changed, and how to correct future profile evidence. | Render plan/evidence/profile-delta/cycle/completeness/correction DTOs and write corrections through `learning-owner-correction-service`. | No browser-side Profile V2 computation and no raw transcript/prompt viewer. |
| A4: Stage checkpoint controls | Owner can see and activate formal checkpoint readiness separately. | Use `learning-stage-assessment-service` for readiness, activation, completion, and cooldown. | No direct formal assessment publication from the daily plan publisher. |
| A5: Generalized target selector | The same workflow can target another visible and provisioned learner/domain. | Preserve actor/target separation and target-workspace-owned rows. | No fallback to Fanfan constants for non-sample targets. |

The preferred next package is A1 plus the minimum A2/A3 wiring needed to prove
one completed Fanfan daily cycle can be created, completed, and audited from
the embedded plugin without Codex.

Backend-only work remains valid only when it adds harness or release evidence
for an existing boundary. It must not be described as product closure unless
the matching browser flow and visual evidence exist.

## Non-Negotiable Boundaries

Every next-stage slice must preserve these boundaries:

- Service First: routes remain request/auth/visible-target glue. Learning
  policy, state transitions, validation, and persistence live in services and
  repositories.
- Gateway-only models: Growth may plan, author, and evaluate only through
  Gateway clients. No direct model vendor SDK or old Home AI Growth server
  internals may be called.
- Draft before write: model responses become validated drafts before plan,
  card, evaluation, profile, or automation records are written.
- Summary-only persistence: durable loop records, public DTOs, docs, logs, and
  screenshots must not include raw historical answers, full transcripts, raw
  prompts, raw model output, hidden answer keys, source-document bodies,
  private paths, credentials, cookies, tokens, or provider configuration.
- Low-pressure daily learning: daily cards use one submission, one evaluation,
  one optional reflection, completion after the first evaluation, and
  score-proportional reward without a pass-line retry gate.
- Formal checkpoint separation: stage assessments are higher-weight profile
  checkpoints and must activate only through `learning-stage-assessment-service`.
- Owner supervision: publication, formal activation, correction, proposal
  decisions, execution enablement, and scheduler release gates remain
  auditable Owner or release decisions.

## Next-Stage Implementation Choices

There are two valid next implementation paths. Choose one explicitly before
writing code.

### Path A: Product-Visible Loop Closure

This is the preferred product path because it makes the AI learning loop usable
without Codex.

Scope:

1. Keep the Owner `生成` tab on `learning-daily-loop-service`; the minimal
   browser draft/publish path is implemented.
2. Complete selected visible target, learner id, domain pack, domain, subject,
   horizon, available minutes, target provisioning, graph options, Profile V2,
   evidence audit, planner readiness, authoring readiness, evaluation
   readiness, and recent audit summaries.
3. Draft through `POST /api/v1/growth/daily-loop/draft` from the UI.
4. Preview one validated daily plan item with target nodes, role, difficulty,
   support level, evidence requirements, estimated minutes, rationale, and
   basis evidence ids.
5. Publish through `POST /api/v1/growth/daily-loop/publish` from the UI.
6. Show visible pending, success, blocked, and failure states. No generate,
   draft, publish, or audit refresh action may fail silently.
7. Preserve mobile scroll, dark-mode contrast, and embedded sizing.
8. After learner completion, refresh cycle audit, evidence audit,
   profile-delta audit, corrections, completeness, and next recommendation
   from service DTOs.
9. For older cycles, use `GET /api/v1/growth/learning-cycles/history` to
   choose a bounded historical cycle, then drill into audit/completeness by the
   returned selectors. The browser must not reconstruct history by joining
   audit DTOs locally.

Required closure:

- focused service/route tests for touched backend boundaries;
- frontend adapter and embedded layout tests for progress, visible errors,
  mobile scroll, and dark-mode contrast;
- UI privacy tests for raw/private payload exclusion;
- central Home AI embedded-plugin visual harness before production release;
- docs update in this file and the relevant UI/interaction docs.

### Path B: Backend Release-Readiness Gate

This path is valid when the immediate goal is to make automation release
evidence explicit before adding more UI. It must remain read-only or
summary-snapshot-only and must not enable scheduling.

Use the Growth-owned release-readiness boundary:

- service: `learning-automation-release-readiness-service`;
- repository: `automation-release-readiness.js`;
- table: `learning_growth_automation_release_readiness`;
- persisted readback column:
  `learning_growth_automation_release_readiness.evidence_readback_json`;
- persisted approval service: `learning-automation-release-approval-service`;
- persisted approval repository: `automation-release-approvals.js`;
- persisted approval table: `learning_growth_automation_release_approvals`;
- read route: `GET /api/v1/growth/automation/release-readiness`;
- Owner snapshot routes:
  `GET /api/v1/growth/automation/release-readiness/snapshots` and
  `POST /api/v1/growth/automation/release-readiness/snapshots`;
- release approval routes:
  visible-target scoped `GET /api/v1/growth/automation/release-approvals`
  and Owner-only `POST /api/v1/growth/automation/release-approvals`;
- smoke/snapshot CLI:
  `npm run smoke:release-readiness -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
  For production evidence collection, the same CLI accepts a versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` bundle through
  `--evidence-bundle-file <path>` or `--evidence-bundle-json <json>`. Bundle
  scope/evidence/approval fields are summary-only defaults; explicit CLI
  scope, `--evidence-json`, `--release-approval-json`, and evidence flags
  override them. When a bundle is provided, the CLI passes bounded
  `evidenceBundleReadback` metadata into readiness. Service output includes
  `evidenceReadback`
  (`growth.learningAutomationReleaseReadiness.evidenceReadback.v1`) with
  `summaryOnly=true`, source bundle summary, present/missing counts, missing
  check keys, and bounded per-check evidence references. `--write-snapshot`
  persists that readback catalog in `evidence_readback_json`.
- release evidence bundle builder CLI:
  `npm run smoke:release-evidence-bundle -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --target-node-id <target-node-id> --output-file <bundle.json> --json`.
  This builder delegates to
  `learning-automation-release-evidence-bundle-service`, runs selected
  no-write/default-disabled smoke CLIs including cycle-history readback,
  Owner audit readback, learner-cycle audit, read-only stage-assessment
  readiness, proposal smoke, platform action evidence, central visual evidence
  from a Home AI visual harness artifact, and read-only release approval bag
  projection by default, emits only
  `growth.learningAutomationReleaseEvidenceBundle.v1` summary evidence, and
  can feed `npm run smoke:release-readiness -- --evidence-bundle-file
  <bundle.json>`. It maps release approvals from
  `npm run smoke:release-approval -- --operation bag` into the bundle
  `releaseApproval` field, so existing approval records do not require
  hand-spliced JSON. The default `owner_audit` task runs read-only
  `npm run smoke:owner-audit` and maps to
  `productionOwnerAuditSmokeEvidence`. The default `learner_cycle` task runs only
  no-write `audit` and maps to `productionLearnerCycleSmokeEvidence`;
  non-audit learner-cycle operations must use the direct
  `npm run smoke:learner-cycle` path because writes require explicit
  Owner-requested learner evidence and raw text must not pass through the
  bundle. Include `--target-node-id` when collecting the
  stage-assessment readiness task. Production controlled daily-loop
  draft/publish evidence is collected only by explicitly adding
  `--task daily_loop_write --allow-write-evidence`; the task is not default,
  rejects non-`draft`/`publish` operations, requires `--plan-draft-id` for
  publish, and then delegates to `npm run smoke:daily-loop` with that CLI's
  own `--allow-write` gate. Final controls readback can be collected only by
  explicitly adding `--task release_controls`; that task is not default, runs
  `npm run smoke:release-controls`, accepts activation gates, approval keys,
  UI evidence flags, and audit-record limits, and maps the bounded result into
  `releaseControlsSmokeEvidence`. A passing `release_controls` bundle task
  means readback collection passed, not that automation is approved. It must
  not write business state of its own or act as a release switch. Final
  inventory and dashboard readbacks can likewise be collected only by
  explicitly adding `--task release_inventory` or `--task release_dashboard`;
  both tasks are non-default, no-write, accept the same release readback flags,
  and map bounded outputs to `releaseInventorySmokeEvidence` and
  `releaseDashboardSmokeEvidence` respectively. Passing these tasks means the
  read models were collected, not that release state changed. The final readback
  smoke harnesses must also prove persisted release-readiness snapshots can be
  read from SQLite by `readinessId` and projected as `latestReadinessSnapshotId`
  with bounded evidenceReadback counts in inventory and dashboard outputs. They
  must also prove persisted release evidence records can be read through
  `learning-automation-release-evidence-service.listEvidence` and projected as
  `releaseEvidenceRecordCount`, `latestReleaseEvidenceRecordId`,
  `latestReleaseEvidenceKey`, `latestReleaseEvidenceCheckKey`, and
  `latestReleaseEvidenceStatus` in release inventory/dashboard outputs.
- release evidence bundle audit CLI:
  `npm run smoke:release-evidence-bundle-audit -- --workspace-id <workspace> --release-evidence-bundle-file <bundle.json> --json`.
  This audit delegates to
  `learning-automation-release-evidence-bundle-audit-service`, validates the
  previously generated bundle schema, `summary_only` flag, default task
  coverage, pass counts, required evidence keys, privacy-risk keys, and
  private path/value leaks, and emits
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1` summary evidence.
  Pass that output into release-readiness as `releaseEvidenceBundleAudit`
  through `--evidence-json` or the boolean
  `--release-evidence-bundle-audit` flag. The audit is intentionally not
  embedded inside the bundle being audited, so the bundle artifact is not
  circular.
- release collection-run CLI:
  `npm run smoke:release-collection-run -- --release-evidence-bundle-file <bundle.json> --release-evidence-bundle-audit-file <audit.json> --release-readiness-file <readiness.json> --json`.
  This delegates through the normal service graph to
  `learning-automation-release-collection-run-service`, validates the three
  summary artifacts, strips artifact paths to file names, derives
  `ready_for_release_review`, `incomplete`, or `blocked`, and emits
  `growth.learningAutomationReleaseCollectionRun.v1` no-write by default.
  Add `--write-record` only when Owner/release tooling intentionally wants a
  persistent `learning_growth_automation_release_collection_runs` audit row.
  The CLI does not run the bundle builder, run smoke tasks, call Gateway, or
  change scheduler permission.
- release package CLI:
  `npm run smoke:release-package -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --output-file <release-package.json> --json`.
  This delegates to `learning-automation-release-package-service`, runs the
  selected release evidence bundle tasks through the injected bundle runner,
  then composes bundle audit, release-readiness, collection-run evaluation,
  release-controls readback, and release-dashboard readback into one summary-only
  `growth.learningAutomationReleasePackage.v1` artifact. It defaults to
  no-write; use `--write-collection-run --allow-write` only when Owner/release
  tooling intentionally wants the existing collection-run service to persist a
  sanitized audit row, and use `--write-package-record --allow-write` only when
  it wants a summarized `learning_growth_automation_release_packages` package
  audit row. `GET /api/v1/growth/automation/release-packages` lists package
  records after visible-target resolution; Owner-only
  `POST /api/v1/growth/automation/release-packages` records an existing
  summary-only package artifact and must not run smoke tasks. Persisted
  package rows include bounded `releaseDashboardSummary`; review,
  authorization, closure, controls, inventory, and dashboard readbacks expose
  only latest-package dashboard summary fields for Owner status surfaces. The
  package is not release
  approval, runtime config enablement, scheduler permission, deployment, or
  card publication.
- scheduler dry-run smoke CLI:
  `npm run smoke:scheduler-dry-run -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- digest smoke CLI:
  `npm run smoke:digest -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- failure policy smoke CLI:
  `npm run smoke:failure-policy -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- release approval smoke CLI:
  `npm run smoke:release-approval -- --workspace-id <workspace> --learner-id <learner> --approval-key writeful_execution --json`.
  The default operation is read-only list. `bag` is a read-only projection for
  release-readiness. `record` requires explicit `--allow-write` and writes
  one summary-only approval record for one config gate.
- release authorization smoke CLI:
  `npm run smoke:release-authorization -- --workspace-id <workspace> --learner-id <learner> --collection-run-id <collection-run> --json`.
  The CLI is no-write and reads through the normal service graph. It authorizes
  only after approved release review, the requested ready collection run when
  `--collection-run-id` is supplied or otherwise the latest ready collection
  run, approved latest decision, and active `writefulExecutionApproval`. The
  release review also reads back the matching persisted release-package audit
  record for the collection run and exposes
  `packageRecordStatus`/`latestPackage` plus bounded
  `packageReadback.latestPackageDashboard*` fields when the package contains
  `releaseDashboardSummary`; after an approved decision, authorization requires
  that matching package record to be readable and
  `ready_for_release_review`. Package dashboard fields remain readback only.
- release closure smoke CLI:
  `npm run smoke:release-closure -- --workspace-id <workspace> --learner-id <learner> --collection-run-id <collection-run> --json`.
  The CLI is no-write and reads through the normal service graph. It combines
  release-review plus release-authorization summaries into one closure readback
  with package-record readback status, `latestPackage`, `packageReadback`,
  package dashboard summary fields,
  `backendEvidenceComplete`, `readyForOwnerReleaseActivation`, missing
  check/evidence/approval keys, required actions, and next action. It is not a
  runtime config switch and keeps `writefulSchedulingAllowed=false`.
- release activation preflight smoke CLI:
  `npm run smoke:release-activation -- --workspace-id <workspace> --learner-id <learner> --collection-run-id <collection-run> --activation-gates writeful_execution --json`.
  The default CLI operation is no-write `preflight` and reads through the
  normal service graph. It combines release-closure readback with selected
  runtime config gate state, supports `writeful_execution`,
  `background_scheduler`, and `background_worker`, and returns
  `growth.learningAutomationReleaseActivation.v1` with
  `preflightPassed`, `readyForOwnerRuntimeConfigDecision`,
  `configChangeApplied=false`, `writefulSchedulingAllowed=false`, and
  `runtimeConfigChange=false`. It is evidence for an Owner config decision,
  not the config switch itself.
- release activation record smoke CLI:
  `npm run smoke:release-activation -- --operation record --allow-write --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This persists a summary-only audit row in
  `learning_growth_automation_release_activations` after the same preflight
  path runs. It records Owner intent, ready/already-enabled/blocked state, and
  bounded evidence summaries only; it does not flip runtime config or grant
  scheduler permission.
- runtime enablement readback smoke CLI:
  `npm run smoke:runtime-enablement -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  The default operation is no-write evaluation. It reads release activation
  audit records through the normal Growth service graph, compares them with
  current injected runtime config booleans, and reports whether the selected
  gates still require manual runtime config enablement or have been verified
  enabled. It is not a config writer and keeps scheduler permission false.
- runtime enablement record smoke CLI:
  `npm run smoke:runtime-enablement -- --operation record --allow-write --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This persists only summary-only audit/readback state in
  `learning_growth_automation_runtime_enablements`; it does not flip runtime
  config, start scheduler execution, or grant background scheduling.
- release controls readback smoke CLI:
  `npm run smoke:release-controls -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This returns one no-write `growth.learningAutomationReleaseControls.v1`
  Owner status surface over readiness, review, closure, activation, and
  runtime enablement, plus bounded persisted activation/runtime enablement
  audit-record summaries through the owning services. It reports the first
  blocking ladder status, required actions, missing evidence/check/approval
  keys, one next action, release-review package dashboard readback fields,
  `auditReadback`, and `activation_records` / `runtime_enablement_records`
  steps. It owns no repository/table, does not run smoke tasks internally, and
  does not write, publish, schedule, notify, call Gateway, flip runtime config,
  or grant scheduler permission. For final
  release evidence packaging, the same readback can be collected with
  `npm run smoke:release-evidence-bundle -- --task release_controls ...`; keep
  that task non-default and read the nested controls status for the actual
  release state.
- release inventory readback smoke CLI:
  `npm run smoke:release-inventory -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This returns one no-write `growth.learningAutomationReleaseInventory.v1`
  Owner/visible-target readback over release-readiness snapshots, collection
  runs, decisions, package audit records, release approvals, activation
  records, runtime enablement records, and release controls. It reports bounded
  artifact counts, latest artifact ids, latest package dashboard
  status/next-action key/required-action count/step count, missing/blocked
  record kinds, and the nested controls state. It owns no repository/table,
  does not run smoke tasks internally, and does not write, publish, schedule,
  notify, call Gateway, flip runtime config, grant scheduler permission, or
  mutate learner state. For
  final release evidence packaging, the same readback can be collected with
  `npm run smoke:release-evidence-bundle -- --task release_inventory ...`;
  keep that task non-default and read the nested inventory/controls status for
  the actual release state.
- release dashboard readback smoke CLI:
  `npm run smoke:release-dashboard -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This returns one no-write `growth.learningAutomationReleaseDashboard.v1`
  Owner/visible-target read model over release-readiness, release-controls, and
  release-inventory service outputs. It exists so Owner UI and release audit
  tooling can read one bounded status/next-action/artifact summary without
  joining release services in the browser. It also projects the latest package
  dashboard status/next-action key/required-action count/step count from
  inventory. It owns no repository/table, does not run smoke tasks internally,
  and does not write, publish, schedule, notify, call Gateway, flip runtime
  config, grant scheduler permission, or mutate
  learner state.
- action handoff smoke CLI:
  `npm run smoke:action-handoff -- --workspace-id <workspace> --learner-id <learner> --json`.
- scheduler execution smoke CLI:
  `npm run smoke:scheduler-execution -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `execute` requires explicit
  `--allow-write` and remains blocked unless
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true` and release
  authorization is granted. When writeful execution is enabled, execution also
  requires a valid summary-only `writeful_execution` activation audit record
  from `learning_growth_automation_release_activations`; missing, invalid, or
  runtime-mutating activation records are blocked before publication.
- scheduler run smoke CLI:
  `npm run smoke:scheduler-run -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `run` requires explicit
  `--allow-write` and remains blocked unless
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true`.
- scheduler worker target smoke CLI:
  `npm run smoke:scheduler-worker-target -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `runnable` is read-only.
  `create` and `review` require explicit `--allow-write` and still keep
  `productionSchedulingAllowed=false`.
- scheduler worker smoke CLI:
  `npm run smoke:scheduler-worker -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is disabled no-write status. Enabled `tick` /
  `tick-targets` require explicit `--allow-write`; with the scheduler gate
  still disabled, write-gated evidence records a blocked lease/run rather than
  publishing.

The service aggregates summary-only readiness evidence:

- Owner daily UI product/visual evidence;
- Owner audit/correction UI evidence;
- stage-checkpoint separation evidence from `npm run smoke:stage-assessment`;
- proposal review UI evidence;
- production proposal smoke evidence from `npm run smoke:proposal`;
- automation digest UI evidence;
- automation action handoff UI evidence;
- scheduler execution UI evidence;
- scheduler run UI evidence;
- scheduler worker-target UI evidence;
- reviewed automation digest evidence;
- active failure-policy readiness;
- delivered action-handoff evidence;
- production action handoff smoke evidence from
  `npm run smoke:action-handoff` for scoped list/create/deliver checks;
- Growth-side scheduler execution smoke evidence from
  `npm run smoke:scheduler-execution` for scoped read-only list checks and
  default-disabled blocked execution checks when explicitly write-gated;
- Growth-side scheduler run smoke evidence from `npm run smoke:scheduler-run`
  for scoped read-only run list checks and default-disabled blocked run checks
  when explicitly write-gated;
- Owner-explicit execution gate status;
- scheduler run default-disabled status;
- Growth-side reviewed worker target smoke evidence from
  `npm run smoke:scheduler-worker-target` for scoped read-only list/runnable
  checks and explicit write-gated create/review checks;
- reviewed enabled worker targets for the exact learner/domain/horizon scope;
- worker lease/timer default-disabled status;
- production scheduler worker smoke evidence from
  `npm run smoke:scheduler-worker`;
- production planner readiness smoke result;
- production daily-loop preview smoke evidence from
  `npm run smoke:daily-loop-preview`;
- production learning-loop state smoke evidence from
  `npm run smoke:learning-loop-state`;
- production cycle-history readback smoke evidence from
  `npm run smoke:cycle-history`, or from the default release-bundle
  `cycle_history` task;
- production Owner audit smoke evidence from `npm run smoke:owner-audit`, or
  from the default release-bundle `owner_audit` task;
- production profile-feedback smoke evidence from
  `npm run smoke:profile-feedback`, proving a completed-cycle selector can read
  back audit completeness, persisted evidence, persisted profile delta,
  Profile V2, next-card recommendation, and next loop state without writing;
- production controlled daily-loop draft/publish smoke evidence from
  `npm run smoke:daily-loop -- --operation draft|publish --allow-write ...`,
  or from the explicit release-bundle task
  `npm run smoke:release-evidence-bundle -- --task daily_loop_write --allow-write-evidence --daily-loop-write-operation draft|publish ...`;
- production learner-cycle audit smoke evidence from
  `npm run smoke:learner-cycle -- --operation audit ...`, or from the
  default release-bundle `learner_cycle` task;
- production scheduler dry-run smoke evidence from
  `npm run smoke:scheduler-dry-run`;
- release-readiness internal no-write scheduler dry-run safety evidence from
  `learning-automation-scheduler-service.dryRun`;
- Home AI platform Action Inbox/Web Push evidence;
- central embedded-plugin visual evidence;
- explicit release approval for each config gate, either as bounded one-off
  readiness input or as a persisted summary-only approval record read through
  `learning-automation-release-approval-service`:
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`,
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, and
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`.

The route and service must return bounded statuses such as `pass`, `missing`,
`blocked`, or `not_applicable`, plus stable evidence ids or timestamps. They
must not expose raw learner answers, raw model payloads, private paths,
credentials, provider configuration, or long logs.

Forbidden behavior:

- no Gateway calls;
- no plan drafting or publication;
- no card generation;
- no evaluation;
- no proposal execution recording;
- no scheduler execution;
- no scheduler run/tick;
- no Action Inbox/Web Push delivery;
- no stage-assessment activation;
- no learner-state mutation.

The snapshot table is an audit artifact, not a release switch. Even a
`ready_for_release_review` snapshot must not flip runtime config.

Readiness response contract:

| Field | Required meaning |
| --- | --- |
| `status` | `ready_for_release_review`, `blocked`, or `incomplete`. |
| `checks[]` | Stable check keys with `pass`, `missing`, `blocked`, or `not_applicable`, bounded summary, and optional required action. |
| `evidence` | Summary-only list of external evidence keys supplied by Owner or platform evidence collection. |
| `config` | Current automation config booleans plus `writefulSchedulingAllowed=false`. |
| `summary.readyForOwnerLoop` | True only when Owner daily UI, Owner audit UI, and central visual evidence are present. |
| `summary.readyForReleaseReview` | True only when all required checks pass or are not applicable. |
| `releaseReview.advisoryOnly` | Always true in this boundary. |
| `releaseReview.requiredActions[]` | Summary-only remediation plan derived from non-passing checks, with bounded `key`, `status`, `label`, `action`, optional `endpoint`, and `requiredActor`. |
| `releaseReview.nextAction` | First required action in check order, or `null` when no action remains. |
| `releaseReview.missingCheckKeys` / `blockedCheckKeys` / `missingEvidenceKeys` | Bounded key lists for release tooling and Owner review. They are advisory and must not enable scheduling. |

Snapshot persistence contract:

- snapshots are summary-only release review artifacts;
- the CLI defaults to no-write readiness evaluation; it writes only when
  `--write-snapshot` is explicitly supplied;
- CLI-supplied evidence must be structured summary evidence through
  `--evidence-json`, `--release-approval-json`, versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` bundles, or bounded
  evidence flags, and it is rejected before evaluation if privacy-risk bundle
  keys are present or by the service if privacy-risk input keys are present;
- release approval inputs may be supplied through `releaseApproval`,
  `approvals`, top-level approval fields, or CLI flags such as
  `--writeful-execution-approval`, `--background-scheduler-approval`, and
  `--background-worker-approval`; the readiness service still keeps
  `writefulSchedulingAllowed=false` and treats approval as review evidence,
  not as a runtime switch;
- release approval records may be created through Owner-only
  `POST /api/v1/growth/automation/release-approvals` or
  `npm run smoke:release-approval -- --operation record --allow-write ...`;
  records are summary-only, keyed by one canonical gate
  (`writefulExecutionApproval`, `backgroundSchedulerApproval`, or
  `backgroundWorkerApproval`), and are projected back into readiness as
  `releaseReview.persistedApprovalKeys`;
- `releaseReview` persists the bounded remediation plan with
  `missingCheckKeys`, `blockedCheckKeys`, `missingEvidenceKeys`,
  `requiredActionCount`, `requiredActions`, and `nextAction`; these fields are
  derived from check status only and are not runtime permissions;
- platform action release evidence can be generated through
  `npm run smoke:platform-action-evidence`, which reads only delivered
  `growth.automation.action_required` receipts from Growth's event outbox and
  emits summary-only `growth.learningAutomationPlatformActionEvidence.v1`;
  Home AI continues to own Action Inbox and Web Push internals;
- idempotency is based on scope, status, timestamp, and check keys;
- privacy-risk keys and non-`summary_only` privacy class are rejected;
- routes enforce Owner-only writes, workspace bearer authorization, and
  visible-target scoping;
- list/read responses return public DTOs, not raw SQLite rows.

Required closure:

- repository tests for migration, idempotent snapshot persistence, privacy
  class, and privacy-risk key rejection;
- release approval repository and service tests for idempotent approval
  persistence, canonical gate aliases, readiness approval bag projection,
  privacy class, and privacy-risk key rejection;
- service tests for each prerequisite, dependency failure, disabled config,
  missing evidence, persisted approval fallback, and all-pass snapshot status;
- release approval smoke-script tests for read-only default behavior, explicit
  write gating, invalid JSON, and temporary-SQLite record/readback;
- route tests for Owner/workspace authorization and visible-target scoping;
- architecture guard proving no forbidden Gateway/publication/evaluation/
  scheduler/stage-assessment calls;
- docs-locality checks and broad local gate.

## Release Readiness Semantics

Release readiness has three different meanings and must not be collapsed into
one boolean.

| Term | Meaning | Can it publish cards? |
| --- | --- | --- |
| `readyForOwnerLoop` | Owner can manually draft and publish one daily card from the UI with visible progress and audit refresh. | Only through explicit Owner publish. |
| `readyForReleaseReview` | Product, platform, visual, production dry-run, and harness evidence are present for review. | No. It is evidence for a human release decision. |
| `writefulSchedulingAllowed` | Runtime config and explicit release approval allow controlled execution through the documented gates. | Only through the execution service, never directly from readiness. |

A release-readiness service may compute the first two. It must always keep
`writefulSchedulingAllowed=false` unless a later dedicated release-management
boundary is designed and approved. Today, readiness evidence is advisory.
`evidenceReadback` is an audit catalog over evidence inputs and missing checks;
it does not change readiness status, runtime config, scheduler permission, or
Owner approval state. Downstream release controls, inventory, and dashboard
DTOs may project only bounded evidence-readback summaries such as
present/missing counts, source bundle id/status/counts, and missing check keys;
they must not expose full evidence items or use readback counts as release
approval.

## Fanfan Science Daily Playbook

The first complete browser path should prove this sample:

- actor: Owner;
- target learner workspace: Fanfan target returned by Growth view targets;
- learner id: `fanfan`;
- domain pack: UK/HK curriculum foundation;
- domain: `science`;
- subject: `science`;
- horizon: `daily_plan`;
- available minutes: `15`;
- card family: daily practice;
- completion policy: `daily_score_once`.

Expected steps:

1. Owner opens Growth and selects `生成`.
2. UI loads preview/context for the selected target and scope.
3. UI shows provisioning, graph options, Profile V2, evidence/audit summaries,
   and model boundary readiness.
4. Owner drafts a plan.
5. Owner reviews one validated daily item.
6. Owner explicitly publishes.
7. Learner completes one submission, one evaluation, and one optional
   reflection.
8. Owner refreshes audit and sees what changed, what stayed uncertain, and
   what the next recommendation is.

This playbook is successful even when the learner score is low. A low score
becomes future planning evidence, not a required retry loop.

## Harness Matrix

| Boundary | Required harness |
| --- | --- |
| Planner/author/evaluator Gateway clients | Fake valid stream, valid JSON, empty output, invalid JSON, timeout, repair failure, and privacy-risk output. |
| Daily loop service | Preview, draft, publish, failed publish, audit refresh, ordinary daily duration validation/persistence at 10-15 minutes, `tests/growth-daily-loop-preview-smoke-script.test.js`, `tests/growth-daily-loop-smoke-script.test.js`, `npm run smoke:daily-loop-preview`, controlled `npm run smoke:daily-loop` with explicit `--allow-write` for draft/publish, and no direct Gateway/card-generation calls from routes or the CLI. |
| Learning loop state | `tests/learning-loop-state-service.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, route visible-target/Owner tests, `npm run smoke:learning-loop-state`, summary-only `growth.learningLoopState.v1`, and `tests/learning-card-ai-loop-harness.test.js` post-cycle coverage proving a completed Fanfan science daily card can refresh cycle completeness, consume persisted Profile V2/profile-delta/trajectory evidence, and return `ready_to_draft` with `draft_daily_plan`. `tests/growth-learner-cycle-smoke-script.test.js` also chains a write-gated learner-cycle full smoke into a no-write learning-loop state smoke against the same temporary DB. Architecture guard still requires no Gateway, publication, generation, evaluation, scheduler, notification, stage activation, learner-state mutation, or direct repository access from the state boundary. |
| Cycle history release evidence | `tests/learning-cycle-history-service.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, the default release-bundle `cycle_history` task, `productionCycleHistorySmokeEvidence`, release-readiness key `production_cycle_history_smoke_evidence`, and architecture guards prove selectable historical-cycle readback can be collected as summary-only release evidence without Gateway, direct repository access, writes, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Owner audit release evidence | `tests/growth-owner-audit-smoke-script.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, the default release-bundle `owner_audit` task, `productionOwnerAuditSmokeEvidence`, release-readiness key `production_owner_audit_smoke_evidence`, and architecture guards prove Owner audit/completeness/correction readback can be collected as summary-only release evidence without Gateway, direct repository access, writes, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Profile feedback evidence | `tests/learning-profile-feedback-evidence-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, the post-cycle profile-feedback assertion in `tests/learning-card-ai-loop-harness.test.js`, `npm run smoke:profile-feedback`, summary-only `growth.learningProfileFeedbackEvidence.v1`, default release-bundle task `profile_feedback`, and release-readiness key `production_profile_feedback_smoke_evidence`. The service must require a completed-cycle selector, read audit completeness/evidence/profile-delta/Profile V2/recommendation/loop-state evidence through service DTOs, fail closed for privacy-risk keys or missing readback, and avoid Gateway, generation, evaluation, publication, scheduler, stage activation, learner-state mutation, and direct repository access. |
| Completed-cycle automation review packet | `tests/learning-card-ai-loop-harness.test.js` continues the Fanfan science completed daily cycle into `learning-automation-proposal-service.createProposal`, Owner acceptance, read-only `learning-automation-scheduler-service.dryRun`, and `learning-automation-digest-service.createDigest`. It requires a summary-only accepted proposal, one `would_publish` candidate, one pending digest required Owner action, no automatic publish, no writeful scheduler execution, and no extra card-authoring or evaluation Gateway calls after the completed source card. |
| Learner daily interaction | One submission box, one evaluation, one optional reflection, audio record/playback, visible failed-evaluation retry path, no pass-line loop, and `tests/growth-learner-cycle-smoke-script.test.js` plus `npm run smoke:learner-cycle` for service-level audit/submit/evaluate/reflect/full-loop evidence. The smoke defaults to no-write audit, gates write operations with `--allow-write`, returns only summary ids/status/counts/findings without learner text or raw model content, and the harness verifies the completed smoke cycle can be read by the no-write learning-loop state smoke as the next planning action. |
| Evidence/profile/audit | Evidence ledger, evidence audit, Profile V2, profile-delta audit, correction, cycle audit, completeness, stale evidence, privacy tests, `tests/growth-owner-audit-smoke-script.test.js`, and `npm run smoke:owner-audit`; the smoke now returns cycle audit, completeness, evidence audit, profile-delta audit, and correction DTOs by default, while correction writes remain explicitly gated. Audit-completeness privacy projection must block raw/private DTO keys but must not fail solely because safe public text values contain words such as token, transcript, secret, prompt, or cookie. |
| Stage assessment | Readiness, activation, coverage, completion, cooldown, direct daily-publish blocking, `tests/growth-stage-assessment-smoke-script.test.js`, and `npm run smoke:stage-assessment`; the CLI defaults to read-only readiness and requires explicit `--allow-write` for eligibility, activation, or completion evidence. |
| Multi-workspace target | Visible-target allow/deny, explicit provision enablement, cross-subject domain-pack plus subject-domain selection, wrong-subject blocking, target-workspace row ownership, `tests/growth-target-provisioning-smoke-script.test.js`, `npm run smoke:target-provisioning`, and no actor/target mixing. |
| Proposal | Repository/service/route tests, `tests/growth-automation-proposal-smoke-script.test.js`, `npm run smoke:proposal`, the completed-cycle proposal evidence in `tests/learning-card-ai-loop-harness.test.js`, read-only list by default, explicit `--allow-write` for create/review/publish, and architecture guard for no Gateway, direct plan publisher, direct card generation, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler dry-run | Service tests, `tests/growth-scheduler-dry-run-smoke-script.test.js`, `npm run smoke:scheduler-dry-run`, the Fanfan science completed-cycle candidate in `tests/learning-card-ai-loop-harness.test.js`, and architecture guard for no Gateway, publication, evaluation, execution, scheduler tick, stage activation, notification, learner-state mutation, or direct repository access from the CLI. |
| Digest | Repository/service/route tests, `tests/growth-automation-digest-smoke-script.test.js`, `npm run smoke:digest`, the Fanfan science completed-cycle digest in `tests/learning-card-ai-loop-harness.test.js`, read-only list/get by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Failure policy | Repository/service/route tests, `tests/growth-automation-failure-policy-smoke-script.test.js`, `npm run smoke:failure-policy`, read-only readiness/list by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Action handoff | Repository/service/route tests, `tests/growth-automation-action-handoff-smoke-script.test.js`, `npm run smoke:action-handoff`, explicit write gate for create/deliver, event delivery failure visibility, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler execution | Repository/service/route tests, `tests/growth-automation-scheduler-execution-smoke-script.test.js`, `npm run smoke:scheduler-execution`, read-only list by default, explicit `--allow-write` for execute, default-disabled blocked execution evidence, release authorization plus release activation audit readback before publish, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler tick, action handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler run | Repository/service/route tests, `tests/growth-automation-scheduler-run-smoke-script.test.js`, `npm run smoke:scheduler-run`, read-only list by default, explicit `--allow-write` for run, default-disabled blocked run evidence, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker target | Repository/service/route tests, `tests/growth-automation-scheduler-worker-target-smoke-script.test.js`, `npm run smoke:scheduler-worker-target`, read-only list/runnable operations by default, explicit `--allow-write` for create/review, target provisioning plus Owner review evidence, `productionSchedulingAllowed=false`, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker | Worker service/lease repository/run service tests, `tests/growth-automation-scheduler-worker-smoke-script.test.js`, `npm run smoke:scheduler-worker`, disabled no-write status by default, explicit `--allow-write` for enabled tick/tick-targets, blocked lease/run evidence while scheduler run remains disabled, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker-target service bypass, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Release readiness | Snapshot, release-approval, platform-action evidence, central-visual evidence, release-evidence-bundle, release-evidence-bundle-audit, and persisted `evidenceReadback` repository/service/route/script tests, `tests/growth-platform-action-evidence-smoke-script.test.js`, `tests/learning-automation-platform-action-evidence-service.test.js`, `tests/growth-central-visual-evidence-smoke-script.test.js`, `tests/learning-automation-central-visual-evidence-service.test.js`, `tests/growth-release-evidence-bundle-audit-smoke-script.test.js`, `tests/learning-automation-release-evidence-bundle-audit-service.test.js`, `tests/learning-automation-release-readiness-repository.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-automation-release-approval-smoke-script.test.js`, `npm run smoke:release-readiness`, `npm run smoke:release-evidence-bundle`, `npm run smoke:release-evidence-bundle-audit`, `npm run smoke:platform-action-evidence`, `npm run smoke:central-visual-evidence`, `npm run smoke:release-approval`, stage-checkpoint evidence from `npm run smoke:stage-assessment`, release approval bag evidence from `npm run smoke:release-approval -- --operation bag`, automation digest/action handoff/execution/run/worker-target UI evidence, production proposal smoke evidence from `npm run smoke:proposal`, production action handoff smoke evidence, platform Action Inbox/Web Push receipt evidence from `npm run smoke:platform-action-evidence` or the default `platform_action` release-bundle task, central embedded-plugin visual evidence from `npm run smoke:central-visual-evidence` over a Home AI visual harness artifact or the default `central_visual` release-bundle task, production scheduler execution smoke evidence, production scheduler run smoke evidence, production scheduler worker target smoke evidence, production scheduler worker smoke evidence, production planner readiness smoke evidence from `npm run smoke:planner-readiness`, production daily-loop preview smoke evidence, production learning-loop state smoke evidence from `npm run smoke:learning-loop-state`, production cycle-history smoke evidence from `npm run smoke:cycle-history` or the default `cycle_history` release-bundle task, production Owner audit smoke evidence from `npm run smoke:owner-audit` or the default `owner_audit` release-bundle task, production profile-feedback smoke evidence from `npm run smoke:profile-feedback` or the default `profile_feedback` release-bundle task, optional final release-controls readback evidence from the explicit non-default `release_controls` release-bundle task, optional final release-inventory readback evidence from the explicit non-default `release_inventory` release-bundle task, optional final release-dashboard readback evidence from the explicit non-default `release_dashboard` release-bundle task, production controlled daily-loop write-smoke evidence from either `npm run smoke:daily-loop` or the explicit write-gated `daily_loop_write` release-bundle task, production learner-cycle audit smoke evidence from `npm run smoke:learner-cycle` or the default `learner_cycle` release-bundle task, production scheduler dry-run smoke evidence from `npm run smoke:scheduler-dry-run`, release evidence bundle self-audit evidence from `npm run smoke:release-evidence-bundle-audit`, release-readiness internal no-write scheduler dry-run safety evidence, releaseReview remediation plan coverage for missing/blocked/evidence keys and next action, `evidenceReadback` coverage for source bundle, present/missing counts, per-check evidence ids/status/source, SQLite migration, and privacy-risk value rejection, and architecture guard for no Gateway, direct daily-loop, cycle-history, Owner audit, learner-cycle, Action Inbox/Web Push internals, visual tooling, or learner-state access, publication, evaluation, scheduler, notification delivery, stage, learner-state mutation, or direct repository access from release-readiness, bundle-builder, or bundle-audit boundaries. |
| Release collection run | `tests/learning-automation-release-collection-run-repository.test.js`, `tests/learning-automation-release-collection-run-service.test.js`, `tests/growth-release-collection-run-smoke-script.test.js`, route tests in `tests/growth-routes.test.js`, architecture guards, and `npm run smoke:release-collection-run`. The CLI defaults to no-write evaluation, writes a summary-only collection-run record only with `--write-record`, strips file paths to basenames, and must not run other smoke CLIs, call Gateway, publish, generate, evaluate, schedule, notify, activate stage assessments, mutate learner state, or import repositories directly. |
| Release package | `tests/learning-automation-release-package-repository.test.js`, `tests/learning-automation-release-package-service.test.js`, `tests/growth-release-package-script.test.js`, route tests, related bundle/audit/readiness/collection-run/controls/dashboard service tests, architecture guards, and `npm run smoke:release-package`. The service composes one summary-only `growth.learningAutomationReleasePackage.v1` artifact from the release evidence bundle builder, bundle audit, release-readiness, collection-run evaluation or explicit collection-run record, release-controls readback, and release-dashboard readback. It defaults to no-write, allows collection-run persistence only with `--write-collection-run --allow-write`, allows package audit persistence only with `--write-package-record --allow-write` or Owner-only route authorization, persists bounded `releaseDashboardSummary` in package records, fails closed if a requested record boundary is unavailable, and must not run smoke tasks inside HTTP, call Gateway, publish, generate, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, flip runtime config, grant scheduler permission, inspect SQLite directly outside repositories, or mutate learner state. |
| Release decision/review/authorization/closure/activation/runtime enablement/controls/dashboard/inventory | Decision, review, authorization, closure, activation, runtime enablement, release-controls, release-dashboard, and release-inventory service/script/route tests, `tests/learning-automation-release-decision-service.test.js`, `tests/learning-automation-release-review-service.test.js`, `tests/learning-automation-release-authorization-service.test.js`, `tests/learning-automation-release-closure-service.test.js`, `tests/learning-automation-release-activation-repository.test.js`, `tests/learning-automation-release-activation-service.test.js`, `tests/learning-automation-runtime-enablement-repository.test.js`, `tests/learning-automation-runtime-enablement-service.test.js`, `tests/learning-automation-release-controls-service.test.js`, `tests/learning-automation-release-dashboard-service.test.js`, `tests/learning-automation-release-inventory-service.test.js`, `tests/growth-release-decision-smoke-script.test.js`, `tests/growth-release-review-smoke-script.test.js`, `tests/growth-release-authorization-smoke-script.test.js`, `tests/growth-release-closure-smoke-script.test.js`, `tests/growth-release-activation-smoke-script.test.js`, `tests/growth-runtime-enablement-smoke-script.test.js`, `tests/growth-release-controls-smoke-script.test.js`, `tests/growth-release-dashboard-smoke-script.test.js`, `tests/growth-release-inventory-smoke-script.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, route tests, architecture guards, `npm run smoke:release-decision`, `npm run smoke:release-review`, `npm run smoke:release-authorization`, `npm run smoke:release-closure`, `npm run smoke:release-activation`, `npm run smoke:runtime-enablement`, `npm run smoke:release-controls`, `npm run smoke:release-dashboard`, and `npm run smoke:release-inventory`. Release review must include a real SQLite smoke scenario that seeds a release collection run plus matching release package audit record, then verifies `packageRecordReadbackAvailable`, `packageRecordRequired`, `packageRecordPresent`, `latestPackageId`, `packageRecordStatus`, and package dashboard summary projection through `scripts/smoke-growth-release-review.js`. Closure combines review and authorization into one no-write `growth.learningAutomationReleaseClosure.v1` readback with backend evidence completion, missing approval/check/evidence keys, package audit readback, required actions, and next action; activation preflight then maps selected runtime config gates to approval/config state without applying config. Activation record writes require `--operation record --allow-write` or Owner-only `POST /api/v1/growth/automation/release-activations`, store only summary-only audit state, and still keep `writefulSchedulingAllowed=false`, `runtimeConfigChange=false`, and `configChangeApplied=false`. Runtime enablement readback validates activation records against current config booleans and can persist only `learning_growth_automation_runtime_enablements` audit state. Release controls is a no-write aggregate over the same ladder and now includes bounded persisted package dashboard summary, release-readiness evidenceReadback summary, activation, and runtime enablement audit-record readback through the owning services; it can also be collected as a non-default `release_controls` release-bundle task for final readback packaging, owns no repository/table, reports the first blocking status and next action, and still keeps all runtime mutation and scheduling permission flags false. Release inventory is a no-write Owner/visible-target aggregate over release-readiness snapshots, collection runs, decisions, package audit records, approvals, activation records, runtime enablement records, and release controls through existing service reads; it can also be collected as a non-default `release_inventory` release-bundle task for final readback packaging, owns no repository/table, reports latest artifact ids plus latest package dashboard summary, latest readiness evidenceReadback summary, and missing/blocked record kinds, and keeps all runtime mutation and scheduling permission flags false. Release dashboard is a no-write Owner/visible-target read model over release-readiness, release-controls, and release-inventory service DTOs; it can also be collected as a non-default `release_dashboard` release-bundle task for final readback packaging, owns no repository/table, gives UI/release audit one bounded next-action/status/artifact/package-dashboard/readiness-evidence summary, and keeps all runtime mutation and scheduling permission flags false. |
| UI | Progress state, visible errors, mobile scroll, dark-mode contrast, embedded sizing, and no hidden final action controls. |
| Docs | `node scripts/check-growth-docs-locality.js` and `node --test tests/growth-docs-locality.test.js`. |
| Broad local gate | `npm run check`, `npm test`, and `git diff --check` before commit/deploy. `scripts/check-growth-syntax-coverage.js` and `tests/growth-architecture-boundary.test.js` must keep `npm run check` covering every runtime JavaScript file under `scripts/`, `src/`, and `public/`. |
| Production UI release | Central Home AI embedded-plugin visual harness and AI Ops evidence ledger. |

## Definition Of Done

A next-stage package is complete only when:

- the owning Growth-local document is updated;
- service, repository, route, UI, architecture, privacy, and visual harnesses
  match the touched boundary;
- public DTOs remain summary-only;
- raw learner content, raw prompts, raw model output, private paths, and
  credentials are absent from docs, logs, screenshots, persistent rows, and
  public API responses;
- focused tests pass;
- docs-locality checks pass;
- broad local validation passes before commit/deploy;
- central visual evidence is attached through `npm run smoke:central-visual-evidence`
  or the default `central_visual` release-bundle task after the Home AI central
  visual harness has produced a bounded artifact;
- `.agent-context/HANDOFF.md` records current state and remaining gates.

## Immediate Recommendation

The preferred next product slice remains Path A, but the immediate focus has
shifted from basic draft/publish/provision operation to product-grade closure:
older-cycle selection over the implemented current-cycle audit/completeness
panel, central embedded visual evidence, and production release evidence over
the existing daily-loop facade. That keeps the AI loop observable and avoids
adding automation before Owner can inspect why a card was selected and what
changed after completion.

If the next slice must be backend-only, choose Path B and keep it strictly as
release-readiness evidence. That boundary should make missing release evidence
explicit, but it must not enable execution or scheduling.
