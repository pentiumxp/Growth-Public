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
10. let Owner review the audit, record a bounded review decision, and correct
    profile evidence when needed;
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
| Owner review closure | Summary-only audit-review decision rows linked to completed-cycle profile-feedback and optional correction ids. | None. |
| Owner review signal | Latest bounded Owner audit-review decision is projected into profile-feedback, loop-state, and planner-context DTOs. | Planner receives summary-only review status/strategy bias only. |
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
  and next action plus `growth.learningLoopState.recommendationEvidence.v1`
  trace from persisted evidence, plan, profile-delta, correction, Profile V2,
  reward settlement readback, and trajectory recommendation links without
  writes or model calls. The smoke CLI also mirrors top-level
  `learningLoopState*` operator readback for status, draft/publish/checkpoint
  readiness, active checkpoint state, checkpoint reason/cooldown, next action, target/scope, readiness gates,
  audit/profile/recommendation counts, reward counts/coins, and
  stage-assessment status while keeping the nested state DTO canonical;
- selectable historical-cycle readback through `learning-cycle-history-service`,
  visible-target scoped `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`, composing public plan/evidence/profile-delta/
  correction readbacks plus optional completeness into bounded summary-only
  cycle rows without writes or model calls. The smoke CLI now mirrors
  top-level `cycleHistory*` operator readback for target/filter selectors,
  cycle counts, latest activity, partial failures, cycle ids, first-cycle
  selectors/counts/completeness, and missing-required counts while keeping the
  nested history DTO canonical;
- Owner audit/correction smoke CLI for read-only cycle audit/completeness/
  evidence audit/profile-delta audit/correction readback and explicit
  `--allow-write` correction recording through the normal service graph. The
  smoke CLI mirrors top-level `ownerAudit*` operator readback for
  operation/status, write gate, scope selectors, downstream audit availability,
  counts, completeness, missing-required counts, partial failures, latest
  activity, and correction-record metadata while keeping nested audit DTOs
  canonical;
- summary-only Owner audit review closure through
  `learning-owner-audit-review-service`,
  `learning_growth_owner_audit_reviews`,
  visible-target scoped `GET /api/v1/growth/owner-audit/reviews`,
  Owner-only `POST /api/v1/growth/owner-audit/reviews`, and
  `npm run smoke:owner-audit-review`. This records `accepted`,
  `needs_follow_up`, `correction_recorded`, or `blocked` review decisions for
  one completed-cycle profile-feedback packet without writing learner evidence,
  calling Gateway, generating cards, evaluating submissions, scheduling, or
  activating stage assessments;
- read-only Owner review signal projection through
  `learning-owner-review-signal-service`, `growth.learningOwnerReviewSignal.v1`,
  planner context, profile-feedback evidence, and learning-loop state readback.
  This bridges persisted Owner decisions into the next plan as summary-only
  strategy bias while excluding Owner notes and raw learner/model content;
- Fanfan science vertical and non-sample provisioned vertical harnesses;
- supervised automation proposal, scheduler dry-run, digest, failure policy,
  action handoff, Owner-explicit execution, scheduler run, reviewed worker
  target, default-disabled worker lease, release-readiness evidence, persisted
  release approval records, persisted release evidence records, and a
  summary-only release evidence collection pass facade that can compose bundle,
  bundle audit, release-readiness, collection-run readback, and explicit
  pass-evidence record writes without creating packages or release decisions.
  The release evidence collection facade is now
  deployed to Mac production at Growth commit `2178bdc86b97` and has bounded
  no-write production smoke evidence for the non-model `learning_loop_state`
  subset: bundle and audit pass, release-readiness remains incomplete, no
  collection-run record is written, and scheduler permission remains false.
  The production Fanfan science `target_provisioning` subset also passes when
  the current native graph domain pack id
  `domain_pack_fanfan_cambridge_pathway_v1` is used; the stale
  `uk_hk_curriculum_foundation` value must not be used in current playbooks.
  The production Fanfan science `stage_assessment` plus
  `stage_checkpoint_controls` subset passes when the release evidence
  collection includes a real coverage node such as
  `kg_ls_science_scientific_enquiry_plan_investigative_work`. This is
  read-only release evidence: `learning-stage-assessment-service` may still
  return `activationState=dormant` and `insufficient_recent_practice`, and the
  Owner activation action remains disabled until enough recent ordinary
  practice exists.
  As of 2026-06-16, production Fanfan science also has 21 persisted
  summary-only release evidence keys plus one active failure policy
  (`lgafpol_4b530ed66506435f61`) created and activated through
  `npm run smoke:failure-policy` with explicit `--allow-write`. The active
  policy is summary-only, keeps manual Owner retry, sets automatic retries to
  zero, and keeps `writefulSchedulingAllowed=false`. Central Home AI iOS PWA
  visual evidence for `embedded-plugin-shell --plugin-id growth` is also
  persisted as `centralVisualEvidence` from screenshot artifact
  `ios-pwa-visual-embedded-plugin-shell-growth-20260616T090608Z.png`.
  The active-policy and central-visual checks now pass in
  `npm run smoke:release-readiness`; release-readiness remains incomplete with
  `pass=26` and `missing=17`.
  The release-readiness service itself now rejects bare boolean `true` for
  service-owned smoke/readback evidence and reports
  `validated_release_evidence_object_required`, so downstream release review,
  authorization, closure, activation, controls, inventory, dashboard, and
  workbench readbacks cannot satisfy readiness from legacy boolean flags.
  Explicit release approval booleans remain separate Owner approval inputs and
  do not count as smoke/readback evidence. Passing-looking service-owned
  evidence objects must still be summary-only; otherwise release-readiness
  blocks them with `release_evidence_summary_only_required`.

The product is not complete because production release evidence and later
automation surfaces are not closed:

- Owner planner/provision UI now supports visible target selection,
  `targetProvisioning` status, domain-pack/subject selection, explicit Owner
  provision creation/update, daily-loop draft/publish, audit correction, and
  current-cycle audit drilldown. It also renders stage-checkpoint controls from
  `growth.stageCheckpointControls.v1`, uses the `activate_stage_assessment`
  action to gate the Owner formal-checkpoint activation button, and keeps the
  actual activation write on `learning-stage-assessment-service`. Central
  `embedded-plugin-shell` visual evidence and production Owner-loop smoke exist
  for the Growth plugin shell. Browser older-cycle selection is now wired over
  `GET /api/v1/growth/learning-cycles/history`: Owner can refresh bounded
  history rows, select one row, and drill into audit/completeness through the
  returned selectors without browser-side history reconstruction. The same
  `生成` tab now renders a read-only Reference Chain panel over the Growth
  Reference Contract: it reads object types and summary references for current
  profile, program, graph plan, plan draft, generated card, selected-cycle
  evaluation, and selected-cycle `profile_feedback` ids when those ids already
  exist in summary DTOs. The `profile_feedback` reference delegates back to the
  backend profile-feedback service and carries only summary readiness/count/
  reward/recommendation/next-action fields. It does not fabricate references,
  inspect SQLite, call Gateway, publish, evaluate, or mutate learner state. Full
  automation release evidence UI/production collection remains incomplete;
- Owner audit/correction UI renders the implemented DTOs for current-cycle and
  selected historical-cycle audit. It still needs production visual/release
  evidence before product-complete release;
- stage-checkpoint browser UI is wired into the Owner generation panel as a
  controls-driven status/action surface. The backend Owner controls read model
  remains summary-only through `learning-stage-checkpoint-controls-service` and
  Owner-only `GET /api/v1/growth/stage-assessments/controls`; production visual
  evidence for the new controls surface is still required before UI release.
  Backend production release evidence for the read-only stage-checkpoint
  separation/controls subset is closed when a valid `targetNodeIds` coverage
  selector is supplied;
- proposal selected-cycle create/list/review/accepted-publish UI now has a
  minimal Owner panel over existing proposal routes, including terminal
  `expired` and `superseded` proposal decisions. Digest create/read/refresh/review UI
  now creates a persisted dry-run digest from the selected bounded scope, lists
  persisted dry-run packets, and can mark pending digests `reviewed`,
  `archived`, or `superseded` without executing them. Action handoff
  read/create/deliver UI now lists persisted handoffs, creates a handoff from a
  reviewed digest, and records delivery state through the Growth event
  boundary without publishing, scheduling, or calling Gateway. Scheduler
  execution read/execute UI now lists persisted execution attempts and lets
  Owner explicitly attempt `owner_explicit_once` from a delivered handoff; the
  default-disabled backend records blocked state and still does not schedule or
  call Gateway. Scheduler run read/run-once UI now lists persisted run rows and
  lets Owner explicitly request one `background_supervised_tick`; the
  default-disabled backend records blocked state and still does not inspect
  handoffs, execute actions, schedule workers, or call Gateway. Scheduler
  worker-target read/create/review UI now lists persisted target rows, creates
  proposed target configuration for the selected provisioned scope, and records
  Owner review states `enabled`, `disabled`, or `archived` while keeping
  `productionSchedulingAllowed=false` and not starting workers;
- platform Action Inbox/Web Push evidence is not complete;
- central embedded-plugin visual release evidence exists for the Growth plugin
  shell. Product-specific mobile/dark checks for Owner generation, audit,
  digest/action/execution/scheduler-run/worker-target local UI exists, but
  those surfaces still need production UI/release evidence before their gates
  can pass;
- production backend read-only/default-disabled evidence now covers planner
  readiness, daily-loop preview, learning-loop state, cycle history, Owner
  audit, learner-cycle audit, target provisioning, stage checkpoint evidence,
  stage checkpoint controls, scheduler dry-run, recommendation lifecycle,
  proposal/digest/action/execution/run/worker/worker-target readback, release
  workbench readback, Owner review readback, active failure-policy readiness,
  and central embedded-plugin visual evidence. Remaining release gates are
  product UI/visual evidence, reviewed digest/action/worker-target workflow
  state, profile feedback from a real completed cycle, controlled daily-loop
  write evidence, platform action receipt evidence, and explicit release
  approvals;
- background writeful scheduling remains blocked.

## Current Execution Decision

The next product direction is Path A unless an explicit backend-only evidence
task is selected. The reason is dependency order: Growth already has many
backend loop services, but the loop is not product-complete until Owner can
operate and audit it from the embedded plugin.

The next implementation slices should be:

1. **Owner daily loop closure**: the minimal `生成` tab operation path now
   runs over the existing daily-loop facade. Owner can load context, inspect
   compact learning-loop state, explicitly click `生成卡片` to draft and publish
   one daily card through `learning-daily-loop-service.advance()`, or use the
   separate draft/publish controls for inspection and recovery, then refresh
   board/context/loop state without Codex. Owner can also apply a domain-pack/subject selector and
   explicitly create/update target provision rows through the Growth service
   facade. The compact ordinary-card recipe policy now supports
   `daily_english_v1`, `daily_science_v1`, and
   `daily_subject_practice_v1`; subject-scoped recipe generation remains
   guarded by target provisioning, graph planning, graph-node evidence
   requirements, Gateway authoring validation, and transactional publishing.
   Generation context must apply recipe domain/subject defaults before calling
   target provisioning and graph suggestion, so the Fanfan science sample can
   be operated by selecting the science recipe rather than hand-entering graph
   selectors. The daily-loop service must also hydrate those context-derived
   scope values before delegating to plan publication, and the plan publisher
   must propagate the selected recipe into card generation so the service path
   does not depend on browser-side duplicated selectors.
   The controlled daily-loop smoke CLI now mirrors top-level `dailyLoop*`
   operator readback for operation/outcome, write gates, target/scope,
   readiness, actions, plan draft/item ids, generated/published card ids,
   generation summary, recommendation acceptance, cycle audit/completeness,
   and missing-required counts while preserving the nested service DTO as the
   canonical evidence object.
   The local service and embedded-UI path is implemented. Production release
   still remains behind the explicit release/visual/evidence gates. The
   remaining closure is formal checkpoint production evidence and
   proposal/digest/action/execution surfaces.
2. **Learner daily evidence closure**: keep generated daily cards on one
   active submission box, one evaluation, one optional reflection, audio
   record/playback, and score-proportional completion. No pass-line retry loop
   may be added for ordinary daily practice.
3. **Owner audit/correction closure**: the Owner `生成` tab now renders
   `ownerAudit` from context, including plan audit, persisted profile-delta
   summaries, correction history, and bounded correction writes through the
   Owner correction service. It also renders explicit
   `learning-cycles/audit` and `learning-cycles/completeness` drilldown for
   the current generated/completed card cycle and selected historical cycles,
   showing summary-only timeline, findings, and missing-required evidence.
   Browser cycle history uses `learning-cycle-history-service` selectors as the
   only drilldown source and does not reconstruct older cycles locally. Remaining
   closure is production release/visual evidence.
4. **Formal checkpoint separation**: expose readiness and activation for
   stage assessments as a separate Owner path. Daily plan publish must still
   block direct formal assessment publication.
5. **Generalized target closure**: extend the browser flow from the Fanfan
   sample to any visible and explicitly provisioned learner/domain pack while
   preserving actor/target workspace separation. The service-level path now
   proves a non-sample provisioned learner can use the same
   `daily_science_v1` recipe/context path, `learning-daily-loop-service.advance()`,
   board/detail projection, one submit/evaluate/reflect learner cycle,
   loop-state readback, and profile-feedback evidence without falling back to
   Fanfan rows. Remaining closure for this item is browser/production visual
   evidence, not a separate backend generation path.

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
| A4: Stage checkpoint controls | Owner can see and activate formal checkpoint readiness separately from the generation panel. | Use `learning-stage-checkpoint-controls-service` for summary-only controls, frontend controls-action gating, and `learning-stage-assessment-service` for readiness, activation, completion, and cooldown. | No direct formal assessment publication from the daily plan publisher; no activation/generation from the controls read model and no browser-side eligibility recomputation. |
| A5: Generalized target selector | The same workflow can target another visible and provisioned learner/domain. | Preserve actor/target separation and target-workspace-owned rows. | No fallback to Fanfan constants for non-sample targets. |

The preferred next package is A1 plus the minimum A2/A3 wiring needed to prove
one completed Fanfan daily cycle can be created, completed, and audited from
the embedded plugin without Codex.

Backend-only work remains valid only when it adds harness or release evidence
for an existing boundary. It must not be described as product closure unless
the matching browser flow and visual evidence exist.

Release-evidence closure must be scope-consistent. Persisted pass records are
accepted by release-readiness only when their stored `workspaceId`,
`learnerId`, `programId`, `domainPackId`, `domain`, `subject`, and `horizon`
match the readiness request. The release-evidence bag is the only persisted
record projection that readiness may consume, and it must preserve
`schemaVersion`, `privacyClass=summary_only`, `summaryOnly=true`,
`evidenceKey`, and `checkKey`; otherwise the record may appear in
`persistedEvidenceKeys` but still fail the summary-only evidence contract.
The release-decision, release-review, release-authorization, release-readiness, release-controls,
release-closure, release-activation, runtime-enablement, release-inventory,
release-dashboard, release-workbench, and release-preflight smoke CLIs should
keep top-level operator readback aligned
with their nested service DTOs.
`releaseReadinessStatus`, readiness booleans, check/evidence/approval/action
counts, `nextRequiredAction`, `releaseDecisionStatus`,
`releaseDecisionCollectionRunReadyForReleaseReview`,
`releaseDecisionNextAction`, `releaseReviewStatus`,
`releaseReviewPackageRecordStatus`, `releaseReviewNextAction`,
`releaseAuthorizationStatus`, `releaseAuthorizationMissingApprovalCount`,
`releaseAuthorizationPackageRecordStatus`, `releaseControlsStatus`,
`releaseControlsNextAction`, `releaseClosureStatus`,
`releaseClosureNextAction`, `releaseActivationStatus`,
`releaseActivationLatestPreflightStatus`, `runtimeEnablementStatus`,
`runtimeEnablementLatestPreflightStatus`, `releaseInventoryStatus`,
`releaseInventoryMissingRecordKindCount`, `releaseDashboardStatus`,
`releaseDashboardNextAction`, `releaseWorkbenchStatus`, `nextOwnerAction`,
`releasePreflightStatus`, `releasePreflightRequiredActionCount`,
`releasePreflightNextAction`, and `evidenceReadback...` counters are convenience
projections over the nested summary DTOs; they are not new release decisions,
runtime config switches, Gateway calls, writes, or permission grants.

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
  scope, `--evidence-json`, and `--release-approval-json` override them.
  Deprecated boolean evidence flags must not fabricate passing evidence when a
  versioned smoke/bundle artifact exists. This applies to service-owned
  smoke/readback evidence for stage checkpoint, proposal, scheduler, planner,
  target provisioning, daily-loop, learning-loop state, cycle history, Owner
  audit, profile feedback, recommendation lifecycle, learner cycle, scheduler
  dry-run, release-bundle audit, platform action, central visual, release
  workbench, and Owner review gates. Those legacy flags now surface blocked
  remediation metadata and cannot satisfy release-readiness; callers must
  provide the bounded smoke/readback result through `--evidence-json`, a release
  evidence bundle, or a validated persisted release-evidence record projection.
  `--release-workbench-evidence` preserves its historical remediation code but
  is still blocked and cannot satisfy `releaseWorkbenchSmokeEvidence`. When a
  bundle is provided, the CLI passes bounded
  `evidenceBundleReadback` metadata into readiness. Service output includes
  `evidenceReadback`
  (`growth.learningAutomationReleaseReadiness.evidenceReadback.v1`) with
  `summaryOnly=true`, source bundle summary, present/missing counts, missing
  check keys, bounded per-check evidence references, and bounded invalid
  reasons for provided non-passing release evidence. `--write-snapshot`
  persists that readback catalog in `evidence_readback_json`.
- release evidence bundle builder CLI:
  `npm run smoke:release-evidence-bundle -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --target-node-id <target-node-id> --output-file <bundle.json> --json`.
  This builder delegates to
  `learning-automation-release-evidence-bundle-service`, runs selected
  no-write/default-disabled smoke CLIs including cycle-history readback,
  Owner audit readback, learner-cycle audit, target-provisioning readback,
  read-only stage-assessment readiness, stage-checkpoint controls readback,
  proposal smoke, platform action
  evidence, central visual evidence from a Home AI visual harness artifact, and
  read-only release approval bag projection by default, emits only
  `growth.learningAutomationReleaseEvidenceBundle.v1` summary evidence,
  mirrors bounded top-level `releaseEvidenceBundle*` operator readback for
  status, scope, task counts/statuses, evidence keys, release-approval keys,
  and false runtime/scheduling flags, and can feed
  `npm run smoke:release-readiness -- --evidence-bundle-file
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
  bundle. The default `target_provisioning` task runs no-write
  `npm run smoke:target-provisioning`, maps to
  `productionTargetProvisioningSmokeEvidence`, and records only bounded
  mode/domain-pack/subject/node-count summary fields. Include
  `--target-node-id` when collecting the
  stage-assessment readiness and stage-checkpoint controls tasks; the controls
  task maps `npm run smoke:stage-checkpoint-controls` output to
  `stageCheckpointControlsEvidence`. Production controlled daily-loop
  draft/publish/advance evidence is collected only by explicitly adding
  `--task daily_loop_write --allow-write-evidence`; the task is not default,
  rejects operations other than `draft`, `publish`, or `advance`, requires
  `--plan-draft-id` for publish, and then delegates to
  `npm run smoke:daily-loop` with that CLI's own `--allow-write` gate and
  bounded top-level `dailyLoop*` operator readback. Final controls readback can
  be collected only by
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
  Final workbench action-template readback can be collected only by explicitly
  adding `--task release_workbench`; that task is non-default, no-write,
  delegates to `npm run smoke:release-workbench`, accepts the same release
  readback flags, and maps the bounded output to
  `releaseWorkbenchSmokeEvidence`. Passing this task means Owner action
  templates, read routes, record routes, and missing-key summaries were
  collected; it is not release approval, runtime config enablement, scheduling
  permission, package recording, or deployment.
  Backend Owner review evidence is now collected by the default
  `owner_review_evidence` task. It delegates to
  `npm run smoke:owner-review-evidence`, maps the bounded output to
  `ownerReviewEvidence`, and proves only that the summary-only automation
  evidence read model can be collected. The bundle summary includes proposal
  lifecycle counts plus digest/action-handoff/scheduler execution/scheduler
  run/worker-target/failure-policy stage counts, but no raw dependency rows or
  raw row ids. It does not replace product UI or central visual evidence.
- release evidence bundle audit CLI:
  `npm run smoke:release-evidence-bundle-audit -- --workspace-id <workspace> --release-evidence-bundle-file <bundle.json> --json`.
  This audit delegates to
  `learning-automation-release-evidence-bundle-audit-service`, validates the
  previously generated bundle schema, `summary_only` flag, default task
  coverage, pass counts, required evidence keys, privacy-risk keys, and
  private path/value leaks, and emits
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1` summary evidence.
  The smoke also mirrors bounded top-level `releaseEvidenceBundleAudit*`
  operator readback for status, scope, bundle schema/privacy/file/counts,
  required-task coverage, missing/blocked tasks, missing evidence keys, privacy
  finding counts, and false runtime/scheduling flags while preserving the
  service DTO as canonical.
  Pass that output into release-readiness as `releaseEvidenceBundleAudit`
  through `--evidence-json` or the boolean
  `--release-evidence-bundle-audit` flag. The audit is intentionally not
  embedded inside the bundle being audited, so the bundle artifact is not
  circular.
- release evidence collection CLI/API:
  `npm run smoke:release-evidence-collection -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
  This delegates through the normal service graph to
  `learning-automation-release-evidence-collection-service`, builds the release
  evidence bundle, audits it, evaluates release-readiness, and evaluates a
  collection-run readback into
  `growth.learningAutomationReleaseEvidenceCollection.v1`. It defaults to
  no-write; add `--write-collection-run --allow-write` only when Owner/release
  tooling intentionally wants the existing collection-run service to persist a
  sanitized audit row. Add `--write-release-evidence-records --allow-write`
  only when Owner/release tooling intentionally wants canonical pass evidence
  from the bundle plus `releaseEvidenceBundleAudit` persisted through the
  existing release-evidence service, so later release-readiness can consume it
  through the persisted evidence bag. UI pass evidence records collected from
  the bundle must keep only summary validator fields during compaction and must
  be revalidated by `learning-automation-release-evidence-service` before a
  pass record is saved. The explicit non-default `release_package_review_ui`
  bundle task can be supplied with
  `--release-package-review-ui-evidence-file <summary-artifact>`; the bundle
  delegates to `npm run smoke:ui-evidence` for
  `releasePackageReviewUiEvidence`, preserves only the bounded validator
  projection, strips the raw artifact path from the bundle scope, and lets the
  collection facade persist it only through the same revalidated
  release-evidence service path. The collection service owns no evidence
  repository and must surface duplicate/blocked/error counts in
  `artifacts.releaseEvidenceRecords`. The Owner-only
  `POST /api/v1/growth/automation/release-evidence-collections/run` route
  exposes the same service boundary for plugin UI/workbench orchestration. It
  is not a release package, release decision, runtime config enablement,
  scheduler permission, deployment, publication, generation, evaluation, or
  learner-state mutation. In production, run the CLI through the production
  service user when it needs production key-file access; the development shell
  user is expected to receive key-file permission errors. A no-write subset
  such as `--task learning_loop_state --required-task learning_loop_state`
  remains valid collection-path smoke evidence when the goal is to prove the
  facade and readback chain without model variance or missing UI/release
  evidence. The release workbench advertises missing `release_collection_run`
  records as `release_evidence_collection` actions so Owner can trigger the
  same collection service from the embedded plugin UI through
  `POST /api/v1/growth/automation/release-workbench/actions`. The advertised
  route body is derived from supported missing release evidence keys, for
  example profile feedback, platform action, central visual, release package
  review UI, proposal, scheduler, and Owner-review evidence. The workbench
  also exposes `releaseEvidenceCollectionSupportedTaskIds` and, after a
  collection-run record already exists, can surface a
  `collect_missing_release_evidence` Owner action when supported missing
  evidence still remains. Collection-owned evidence is not exposed as a
  concrete direct pass `release_evidence` Owner action; specific service-smoke,
  central visual, and UI validator evidence gaps still delegate through the
  collection path. That action still delegates through the existing
  workbench action facade and release-evidence collection service; it is not a
  write boundary expansion, release approval, or scheduler/runtime/deploy
  permission. The
  `release_package_review_ui_evidence` key maps to the explicit non-default
  `release_package_review_ui` bundle task; the route template exposes an empty
  `release_package_review_ui_evidence_file` placeholder so Owner tooling can
  supply a Home AI visual-toolchain summary artifact without Growth running
  visual tooling or persisting the raw path. Unsupported UI/manual evidence
  keys are reported as unsupported collection keys, and write-gated tasks such
  as `daily_loop_write` are reported separately rather than sent through the
  default Owner button. When the derived task set includes `profile_feedback`,
  the workbench route body includes
  `auto_select_latest_completed_cycle=true` so Owner-triggered release
  evidence collection can use the latest real completed cycle from read-only
  cycle-history discovery instead of requiring Codex to hand-splice selectors.
  If no supported task can be derived, the workbench falls back to the bounded
  `learning_loop_state` task. The action facade treats a returned collection
  artifact as a completed action even when the collection DTO reports
  `status=incomplete`.
- release artifact manifest input:
  `npm run smoke:release-evidence-bundle`,
  `npm run smoke:release-package`,
  `npm run smoke:release-evidence-collection`, and
  `npm run smoke:release-workbench-action` accept
  `--release-evidence-artifact-manifest-file <manifest.json>`. The manifest is
  a summary-only operator input that maps Home AI central visual/UI summary
  artifact files into existing transient `central_visual_evidence_file` and
  registered `*_ui_evidence_file` inputs by `taskId`, `evidenceKey`,
  `checkKey`, or `uiGate`. Growth strips the manifest path after parsing,
  fails closed on unknown artifact keys, adds the mapped task ids as
  `artifactTaskIds`, and never emits raw manifest or artifact paths in public
  output. The Owner workbench action HTTP route accepts the same manifest only
  as inline summary JSON through `artifactManifest` /
  `releaseEvidenceArtifactManifest`; HTTP file-path manifest reads remain
  unavailable. This is not visual execution, release approval, or evidence
  persistence; the existing central visual/UI validators and release-evidence
  service remain the only acceptance path.
- release collection-run CLI:
  `npm run smoke:release-collection-run -- --release-evidence-bundle-file <bundle.json> --release-evidence-bundle-audit-file <audit.json> --release-readiness-file <readiness.json> --json`.
  This delegates through the normal service graph to
  `learning-automation-release-collection-run-service`, validates the three
  summary artifacts, strips artifact paths to file names, derives
  `ready_for_release_review`, `incomplete`, or `blocked`, and emits
  `growth.learningAutomationReleaseCollectionRun.v1` no-write by default.
  The CLI mirrors bounded top-level `releaseCollectionRun*` operator readback
  for status, write/record state, target scope, bundle/audit/readiness counts
  and statuses, evidence keys, artifact file names, and false
  runtime/scheduling flags.
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
  `POST /api/v1/growth/automation/release-packages/build` explicitly builds a
  summary-only package candidate through the same service graph, defaults to
  no-write, can return a blocked candidate for audit, and may persist only the
  collection-run row and/or package audit record when explicit write flags are
  supplied; Owner-only
  `POST /api/v1/growth/automation/release-packages` records an existing
  summary-only package artifact and must not run package smoke tasks. Persisted
  package rows include bounded `releaseDashboardSummary`, including
  readiness-evidence present/missing counts, source bundle id, latest readiness
  snapshot id, latest snapshot evidence counts, persisted evidence keys, and
  latest preflight report id/status/advisory readiness flags from
  release-dashboard readback. Package top-level summary, package step summary,
  and persisted `releaseControlsSummary` / `releaseDashboardSummary` also carry
  those bounded preflight fields for Owner release-audit readback only; they do
  not grant scheduler permission, runtime config enablement, or deployment
  permission.
  Review, authorization, closure, controls, inventory, and dashboard readbacks
  expose only latest-package dashboard summary fields, including the
  package-dashboard preflight fields, for Owner status surfaces; they must not
  expose full release evidence items. The
  package is not release
  approval, runtime config enablement, scheduler permission, deployment, or
  card publication.
- scheduler dry-run smoke CLI:
  `npm run smoke:scheduler-dry-run -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- digest smoke CLI:
  `npm run smoke:digest -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- failure policy smoke CLI:
  `npm run smoke:failure-policy -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
  The CLI now mirrors bounded top-level `automationFailurePolicy*` operator
  readback for readiness/list/create/review, policy ids/status counts, Owner
  review state, retry/rollback/failure flags, missing prerequisites, and
  `writefulSchedulingAllowed=false` while preserving nested service DTOs.
- Owner review evidence smoke CLI:
  `npm run smoke:owner-review-evidence -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
  The CLI is no-write and aggregates existing automation/readiness service
  readbacks. It is backend evidence only and does not replace proposal/digest/
  action/execution UI or visual evidence. Its compact summary reports proposal
  lifecycle counts, digest review/pending/required-action counts,
  action-handoff delivery/action/blocked counts, scheduler execution
  published/blocked/failed counts, scheduler run completed/blocked/skipped
  counts, worker-target reviewed/pending/disabled counts, and failure-policy
  status. The smoke now mirrors the same data as top-level
  `automationOwnerReviewEvidence*` operator readback. The same output can be
  collected by the default release evidence bundle task `owner_review_evidence`
  as `ownerReviewEvidence`, passed to
  release-readiness with `--owner-review-evidence`, or persisted as the
  canonical release evidence record key `owner_review_evidence`.
- release approval smoke CLI:
  `npm run smoke:release-approval -- --workspace-id <workspace> --learner-id <learner> --approval-key writeful_execution --json`.
  The CLI mirrors bounded top-level `automationReleaseApproval*` operator
  readback for list/bag/record, approval ids/keys/status counts, approved bag
  keys, explicit write gate, approval/evidence schema versions, and
  `writefulSchedulingAllowed=false` while preserving nested DTOs.
  The default operation is read-only list. `bag` is a read-only projection for
  release-readiness. `record` requires explicit `--allow-write` and writes
  one summary-only approval record for one config gate.
- release artifact-template smoke CLI:
  `npm run smoke:release-artifact-template -- --workspace-id <workspace> --learner-id <learner> --json`.
  The matching visible-target scoped read API is
  `GET /api/v1/growth/automation/release-artifact-template`. Both entrypoints
  are no-write and read only through the release workbench service. They emit a
  bounded `growth.learningAutomationReleaseEvidenceArtifactTemplate.v1` DTO with
  missing central-visual/UI artifact slots and a blank
  `growth.learningAutomationReleaseEvidenceArtifactManifest.v1` template for
  Home AI central visual/UI summary artifact files. The same DTO also includes
  `growth.learningAutomationReleaseEvidenceChecklist.v1`, which separates
  visual/UI artifact items, supported collection tasks, write-gated tasks,
  state prerequisite actions, missing approvals, missing record actions, and
  unsupported/manual evidence keys so Owner/release tooling can execute the
  remaining real-evidence and automation-state steps without fabricating
  passing evidence. It also includes
  `growth.learningAutomationReleaseEvidenceActionPlan.v1`, which projects
  summary-only Owner workbench-action route/body templates for collection,
  approvals, package records, activation/runtime audit records, plus
  non-submittable external artifact, internal state-prerequisite, and manual steps. Collection body
  templates include only non-artifact task selectors until the blank manifest
  is filled. The smoke CLI also mirrors the operator-critical readback at the
  top level: `artifactSlotCount`, `artifactTaskIds`, checklist item counts,
  action-plan counts, `phaseBlockedActionCount`, `readyPhase`, and
  `nextSubmittableAction`, so release tooling does not need to inspect nested
  DTOs just to decide the next preparation step. They do not run visual
  tooling, call Gateway, persist release evidence, write collection runs, apply
  runtime config, or widen to default UI tasks when no visual/UI evidence is
  missing.
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
  Its top-level operator fields mirror the nested closure DTO for status,
  required-action count, next action, missing check/evidence/approval counts,
  package-record presence/status, latest package dashboard status, and
  runtime/write flags only.
- release activation preflight smoke CLI:
  `npm run smoke:release-activation -- --workspace-id <workspace> --learner-id <learner> --collection-run-id <collection-run> --activation-gates writeful_execution --json`.
  The default CLI operation is no-write `preflight` and reads through the
  normal service graph. It combines release-closure readback with selected
  runtime config gate state, supports `writeful_execution`,
  `background_scheduler`, and `background_worker`, and returns
  `growth.learningAutomationReleaseActivation.v1` with
  `preflightPassed`, `readyForOwnerRuntimeConfigDecision`,
  latest preflight report id/status/advisory readiness flags,
  `configChangeApplied=false`, `writefulSchedulingAllowed=false`, and
  `runtimeConfigChange=false`. It is evidence for an Owner config decision,
  not the config switch itself. It reads preflight report state only through
  the injected preflight report repository and does not write preflight reports.
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
  enabled. It projects latest preflight report id/status/advisory readiness
  flags only from activation records, never directly from preflight reports. It
  is not a config writer and keeps scheduler permission false.
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
  steps. Its readiness step may also carry the compact
  `ownerReviewStageSummary` from release-readiness evidence readback. It owns
  no repository/table, does not run smoke tasks internally, and
  does not write, publish, schedule, notify, call Gateway, flip runtime config,
  or grant scheduler permission.
  The smoke CLI also mirrors top-level operator fields for status,
  required-action count, next action, missing check/evidence/approval counts,
  activation/runtime-enablement record status, and runtime/write flags only.
  For final
  release evidence packaging, the same readback can be collected with
  `npm run smoke:release-evidence-bundle -- --task release_controls ...`; keep
  that task non-default and read the nested controls status for the actual
  release state.
- release inventory readback smoke CLI:
  `npm run smoke:release-inventory -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This returns one no-write `growth.learningAutomationReleaseInventory.v1`
  Owner/visible-target readback over release-readiness snapshots, collection
  runs, decisions, package audit records, release approvals, activation
  records, runtime enablement records, persisted preflight reports, and release
  controls. It reports bounded
  artifact counts, latest artifact ids, latest package dashboard
  status/next-action key/required-action count/step count, latest readiness
  `ownerReviewStageSummary` counters when present, latest preflight report
  id/status/advisory readiness flags, missing/blocked record kinds, and the
  nested controls state. It owns no repository/table, does not run smoke tasks
  internally, and does not write, publish, schedule, notify, call Gateway, flip
  runtime config, grant scheduler permission, write preflight reports, or mutate
  learner state.
  The smoke CLI also mirrors top-level operator fields for status, artifact
  count, readback-kind count, missing/blocked record-kind counts, latest
  artifact ids, latest evidence/preflight/package status, controls status, and
  runtime/write flags only. For
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
  inventory plus bounded Owner review stage-summary counters from current and
  latest readiness readbacks when present, plus latest persisted preflight
  report id/status/advisory readiness flags from inventory. It owns no
  repository/table, does not run smoke tasks internally, and does not write,
  publish, schedule, notify, call Gateway, flip runtime config, grant scheduler
  permission, write preflight reports, or mutate learner state. The smoke CLI
  also mirrors top-level operator fields for status, readiness/controls/
  inventory status, required-action count, next action, missing check/evidence/
  approval/record counts, readiness evidence counts, latest artifact/preflight
  status, and runtime/write flags only.
- release workbench readback smoke CLI:
  `npm run smoke:release-workbench -- --workspace-id <workspace> --learner-id <learner> --activation-gates writeful_execution --json`.
  This returns one no-write `growth.learningAutomationReleaseWorkbench.v1`
  Owner/visible-target action-template read model over release-readiness,
  release-controls, release-inventory, and release-dashboard service outputs.
  It exists so Owner UI can show bounded read routes, Owner-only record-route
  templates, missing evidence/check/approval/record summaries, and manual
  runtime-config follow-up hints without Codex joining DTOs or applying config.
  Concrete collection-owned evidence gaps are not projected as direct pass
  `release_evidence` Owner actions. Service-smoke evidence, central visual
  evidence, and UI validator evidence must route through
  `release_evidence_collection`; central visual/UI artifact tasks are marked
  with `requiresPreparation` and the release artifact-template read route. The
  generic record-route catalog may still expose blank `release_evidence`
  placeholders for explicit operator-filled records, but those placeholders are
  not concrete pass actions for a specific missing evidence key.
  Non-evidence readiness state prerequisites (`reviewed_automation_digest`,
  `active_failure_policy`, `delivered_action_handoff`, and
  `reviewed_enabled_worker_target`) are projected separately as
  `releaseStatePrerequisiteKeys` and `releaseStatePrerequisiteActions`; they
  point to existing automation read surfaces and are not counted as unsupported
  release evidence.
  The smoke CLI mirrors the operator-critical readback at the top level:
  `releaseWorkbenchStatus`, `ownerActionCount`, `nextOwnerAction`,
  collection task ids, write-gated task ids, state-prerequisite keys, missing
  check/evidence/approval counts, and missing/blocked record-kind counts. The
  nested `releaseWorkbench` DTO remains the canonical service output.
  Its bounded output can be passed to release-readiness through explicit
  `--evidence-json`, collected by the non-default `release_workbench` release
  evidence bundle task as `releaseWorkbenchSmokeEvidence`, or persisted through
  the release-evidence record path. The legacy
  `--release-workbench-evidence` flag is a blocked remediation marker, not a
  passing evidence source.
  It owns no repository/table, does not run smoke tasks internally, and does
  not write, publish, schedule, notify, call Gateway, flip runtime config,
  grant scheduler permission, or mutate learner state.
- release workbench action smoke CLI:
  `npm run smoke:release-workbench-action -- --allow-write --workspace-id <workspace> --learner-id <learner> --endpoint-key release_readiness_snapshot|release_evidence|release_approval|release_evidence_collection|release_collection_run|release_decision|release_package|release_activation|runtime_enablement --json`.
  Use `npm run smoke:release-workbench-action -- --operation list-audits --workspace-id <workspace> --learner-id <learner> --json`
  for no-write service-level wrapper action-audit readback after an Owner
  workbench action.
  This is the write-gated Owner action facade for the release workbench. It
  first reads `growth.learningAutomationReleaseWorkbench.v1`, requires the
  requested endpoint key to be advertised by the workbench, and then delegates
  only to the existing release-readiness snapshot, release evidence, release
  approval, release evidence collection, collection-run, release-decision,
  package-record or explicit package build-and-record, release activation, or
  runtime enablement record service. It returns
  `growth.learningAutomationReleaseWorkbenchAction.v1` and writes only through
  those existing record boundaries. The CLI mirrors bounded top-level
  `releaseWorkbenchAction*` operator readback for operation/status, target
  scope, endpoint/action keys, wrapper action-record and action-audit
  status/id, delegated collection counters, requested task/write flags, and
  false runtime/scheduling flags while preserving the service DTO as canonical.
  For `release_evidence_collection`, the CLI
  accepts only bounded collection selectors (`--target-node-id`, `--task`,
  `--required-task`, `--required-approval-key`) plus explicit
  `--write-collection-run`, `--write-release-evidence-records`, and transient
  evidence-file inputs such as
  `--release-package-review-ui-evidence-file <summary-artifact>`. The action
  facade redacts those transient artifact-file values before its privacy scan,
  forwards them only to the owning collection service, and still blocks private
  paths when they appear outside the whitelisted artifact-file fields. The
  service normalizes the resulting action record id from the collection summary
  or `releaseCollectionRun` artifact. A `release_evidence_collection` action
  may complete when the delegated
  collection wrote or deduped release-evidence records, even if the wider
  release-readiness state remains blocked or incomplete. If the delegated
  collection is blocked before any release-evidence record is written, the
  facade must return a visible blocked action and persist only bounded
  action-audit metadata.
  For `release_package`, default actions
  still record only an existing summary-only package artifact; explicit
  `--build-and-record-package` / `buildReleasePackage` requests delegate package
  build plus package-record persistence to
  `learning-automation-release-package-service.buildPackage`. The facade does
  not build packages itself, run smoke tasks internally, publish, schedule,
  notify, call Gateway, flip runtime config, grant scheduler permission, or
  mutate learner state.
- embedded release workbench UI:
  the Owner `生成` tab now consumes `GET /api/v1/growth/automation/release-workbench`
  through `growth-api-client.js`, renders status/missing evidence/approval/
  record counts plus advertised Owner actions, and calls
  `POST /api/v1/growth/automation/release-workbench/actions` only for
  supported `release_evidence`, `release_approval`,
  `release_evidence_collection`, `release_decision`, `release_package`,
  `release_activation`, and `runtime_enablement` endpoints. It is UI glue over
  existing services. For `release_evidence`, the UI may submit only a generic
  operator-filled record template and must not reinterpret collection-owned
  evidence as a direct pass action. For `release_evidence_collection`, the UI
  sends bounded
  collection tasks, `write_collection_run=true`, and
  `write_release_evidence_records=true` from the backend action template. Those
  task ids come from the workbench's missing-evidence-derived no-write plan,
  with `releaseEvidenceCollectionSupportedTaskIds` separating supported task
  ids from unsupported/manual evidence, state prerequisites, and write-gated
  tasks. After a collection-run exists, the backend may make
  `collect_missing_release_evidence` the next action for the supported subset;
  the UI still submits only the advertised template through the workbench action
  facade. When the action has `requiresPreparation=true`, the UI must first show
  the artifact-template preparation step and wait for Home AI central visual/UI
  summary artifacts before enabling the collection submit. Manual evidence and
  write-gated evidence are surfaced for Owner review but are not auto-collected
  by the default collection button. State prerequisites are shown as external
  Owner actions to the existing automation modules and are not submitted through
  `POST /api/v1/growth/automation/release-workbench/actions`.
  by the normal button. For
  `release_decision`, the UI
  sends only the advertised status, summary-only decision metadata, and the
  explicit latest-ready collection-run auto-selection flag; collection-run
  lookup, validation, and persistence remain in
  `learning-automation-release-decision-service`. The UI sends no raw
  prompt/transcript payloads and does not grant scheduling permission. For
  `release_package`, the default browser path first builds a summary-only
  candidate through `POST /api/v1/growth/automation/release-packages/build`;
  the record action remains blocked until that real
  `growth.learningAutomationReleasePackage.v1` artifact exists. Owner tooling
  may instead send an explicit `buildReleasePackage` /
  `build_and_record_package` action so the workbench facade delegates build plus
  package-record persistence to the package service. A placeholder workbench
  template is not a package artifact.
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
- stage-checkpoint controls readback evidence from
  `npm run smoke:stage-checkpoint-controls`;
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
  Profile V2, next-card recommendation, and next loop state without writing,
  with top-level `profileFeedback*` operator readback for release review;
  when no selector is supplied, the same no-write service path queries
  cycle-history for bounded selector discovery and fails closed with
  `selectorDiscovery.status`, `selectorCandidateCount`, `completeCycleCount`,
  `cycleCount`, and a remediation `nextAction` such as
  `produce_completed_daily_cycle` instead of fabricating learner evidence.
  Explicit release-evidence collection may pass
  `autoSelectCompletedCycle` or `autoSelectLatestCompletedCycle` to select a
  real completed candidate from the same read-only discovery path; the selected
  cycle id/task-card id is preserved as bounded summary readback, and all
  persisted evidence/Profile V2/profile-delta/recommendation/loop-state checks
  still have to pass;
- production controlled daily-loop draft/publish/advance smoke evidence from
  `npm run smoke:daily-loop -- --operation draft|publish|advance --allow-write ...`,
  or from the explicit release-bundle task
  `npm run smoke:release-evidence-bundle -- --task daily_loop_write --allow-write-evidence --daily-loop-write-operation draft|publish|advance ...`;
- production learner-cycle audit smoke evidence from
  `npm run smoke:learner-cycle -- --operation audit ...`, or from the
  default release-bundle `learner_cycle` task;
- production scheduler dry-run smoke evidence from
  `npm run smoke:scheduler-dry-run`;
- release-readiness internal no-write scheduler dry-run safety evidence from
  `learning-automation-scheduler-service.dryRun`;
- Home AI platform Action Inbox + Web Push dual receipt evidence;
- central embedded-plugin visual evidence;
- release workbench action-template readback evidence from
  `npm run smoke:release-workbench` supplied through explicit evidence JSON,
  from the non-default release-bundle `release_workbench` task, or from a
  validated persisted release-evidence record projection;
- backend Owner automation review evidence from
  `npm run smoke:owner-review-evidence`, the default release-bundle
  `owner_review_evidence` task, explicit summary evidence JSON, or a persisted
  `owner_review_evidence` release evidence record. The release-readiness
  `--owner-review-evidence` flag is deprecated remediation metadata only and
  cannot satisfy this gate;
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
  emits summary-only `growth.learningAutomationPlatformActionEvidence.v1`.
  Passing evidence requires both an Action Inbox item id and bounded Web Push
  `sent > 0` summary from the same delivered Home AI notification receipt;
  the CLI mirrors bounded top-level `platformActionEvidence*` operator
  readback for status, write gate, scope, receipt counts, latest receipt
  metadata, missing requirements, platform ownership, and false
  runtime/writeful flags while Home AI continues to own Action Inbox and Web
  Push internals;
- UI-gate release evidence can be validated through
  `npm run smoke:ui-evidence -- --evidence-key <canonical-key>
  --ui-evidence-file <summary-artifact>`. This validates an explicit
  summary-only UI/visual artifact for the named release-readiness UI gate,
  including matching gate metadata, required coverage markers, passing
  assertions, screenshot or DOM evidence, and private-value-safe public
  projection. It does not run Appium, Playwright, the Home AI visual harness,
  Gateway, scheduling, generation, evaluation, notification delivery, or
  learner-state writes, and it does not persist release evidence. A passing
  output can be persisted only through the existing explicit
  `npm run smoke:release-evidence -- --operation record --allow-write ...`
  path. That persistence path now re-runs the UI evidence validator for pass
  UI evidence keys before saving, so an unvalidated direct `{ok:true}` UI
  evidence packet is rejected. Release-readiness also validates one-off UI
  evidence input for those keys: it accepts only a
  `growth.learningAutomationUiEvidence.v1` validator summary or a validated
  `growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1` persisted
  record projection with matching gate metadata, no missing coverage, no failed
  assertions, and screenshot or DOM evidence. Deprecated readiness UI flags
  such as `--owner-daily-ui-evidence` and `--automation-digest-ui-evidence`
  now produce blocked remediation metadata and cannot satisfy
  release-readiness;
- idempotency is based on scope, status, timestamp, and check keys;
- privacy-risk keys and non-`summary_only` privacy class are rejected;
- routes enforce Owner-only writes, workspace bearer authorization, and
  visible-target scoping;
- list/read responses return public DTOs, not raw SQLite rows.

Required closure:

- repository tests for migration, idempotent snapshot persistence, privacy
  class, privacy-risk key rejection, and private path/token-looking value
  rejection;
- release approval repository and service tests for idempotent approval
  persistence, canonical gate aliases, readiness approval bag projection,
  privacy class, privacy-risk key rejection, and private path/token-looking
  value rejection;
- service tests for each prerequisite, dependency failure, disabled config,
  missing evidence, persisted approval fallback, and all-pass snapshot status;
- release approval smoke-script tests for read-only default behavior, explicit
  write gating, invalid JSON, private path/token-looking value rejection, and
  temporary-SQLite record/readback;
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
For `ownerReviewEvidence`, the catalog item may also include bounded
`ownerReviewStageSummary` counters copied from the release evidence bundle
summary: proposal lifecycle, digest, action-handoff, scheduler execution,
scheduler run, worker-target, and failure-policy status counts. These counters
are release audit readback only. They do not replace proposal/digest/action UI
evidence, central visual evidence, explicit release approval, or scheduler
permission.
Release controls, inventory, dashboard, and package dashboard summaries may
carry only that compact `ownerReviewStageSummary` object, never full
`evidenceReadback.items[]` entries or raw dependency ids.

## Fanfan Science Daily Playbook

The first complete browser path should prove this sample:

- actor: Owner;
- target learner workspace: Fanfan target returned by Growth view targets;
- learner id: `fanfan`;
- domain pack: UK/HK curriculum foundation
  (`domain_pack_fanfan_cambridge_pathway_v1`);
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
4. Owner either clicks `生成卡片` for one explicit draft-then-publish action, or
   drafts a plan first.
5. Owner reviews one validated daily item when using the two-step path.
6. Owner explicitly publishes when using the two-step path.
7. Learner completes one submission, one evaluation, and one optional
   reflection.
8. Owner refreshes audit and sees what changed, what stayed uncertain, and
   what the next recommendation is.

This playbook is successful even when the learner score is low. A low score
becomes future planning evidence, not a required retry loop.

## Harness Matrix

| Boundary | Required harness |
| --- | --- |
| Planner/author/evaluator Gateway clients | Fake valid stream, valid JSON, empty output, invalid JSON, timeout, repair failure, privacy-risk output, `tests/growth-planner-readiness-smoke-script.test.js`, `npm run smoke:planner-readiness`, and top-level `plannerReadiness*` smoke operator readback that mirrors the nested planner readiness DTO without adding writes, publication, generation, evaluation, scheduler, notification, stage activation, direct repository access, or release-bundle mapping changes. |
| Daily loop service | Preview, draft, advance, publish, failed publish, audit refresh, service-side context-scope hydration before plan publication, recipe propagation from plan publication into card generation, ordinary daily duration validation/persistence at 10-15 minutes, `tests/growth-daily-loop-preview-smoke-script.test.js`, `tests/growth-daily-loop-smoke-script.test.js`, `tests/learning-card-ai-loop-harness.test.js` Fanfan science advance-to-board/detail-to-learner-cycle coverage plus non-sample explicit-provision advance/completion/profile-feedback coverage, `npm run smoke:daily-loop-preview`, controlled `npm run smoke:daily-loop` with explicit `--allow-write` for draft/publish/advance, top-level `dailyLoop*` smoke operator readback from both preview and controlled CLIs that mirrors nested preview/draft/advance/publish DTOs, and no direct Gateway/card-generation calls from routes or the CLI. |
| Learning loop state | `tests/learning-loop-state-service.test.js`, `tests/learning-owner-review-signal-service.test.js`, `tests/learning-reward-audit-service.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, route visible-target/Owner tests, `npm run smoke:learning-loop-state`, summary-only `growth.learningLoopState.v1`, nested summary-only `growth.learningLoopState.recommendationEvidence.v1`, top-level `learningLoopState*` smoke operator readback, and `tests/learning-card-ai-loop-harness.test.js` post-cycle coverage proving a completed Fanfan science daily card can refresh cycle completeness, consume persisted Profile V2/profile-delta/trajectory/reward/Owner-review evidence, and return `ready_to_draft` with `draft_daily_plan`. The service harness proves the next recommendation can be explained from bounded evidence ids, source card/evaluation ids, plan drafts, profile-delta audits, Owner corrections, Owner audit-review ids, Profile V2 node summaries, reward settlement ids/coin totals, and trajectory lifecycle rows without exposing raw learner/model content, Owner notes, idempotency keys, ledger-entry JSON, or raw settlement payloads. Scalar selectors such as `taskCardId` and `evaluationId` are normalized before reward-audit and Owner-review signal readback so HTTP/CLI callers do not silently drop a completed-cycle selector. Active formal checkpoints must take precedence over daily drafting and return `stage_checkpoint_active` / `complete_active_stage_assessment` with bounded cycle/task-card ids; Owner UI/client harness coverage must prove the current subject/capability/coverage selectors are forwarded and the panel opens the existing formal card instead of recomputing eligibility or generating a replacement. Cooldown states must keep bounded reason/cooldown readback visible at smoke top level. `tests/growth-learner-cycle-smoke-script.test.js` also chains a write-gated learner-cycle full smoke into a no-write learning-loop state smoke against the same temporary DB. Architecture guard still requires no Gateway, publication, generation, evaluation, scheduler, notification, stage activation, learner-state mutation, or direct repository access from the state boundary. |
| Learning operating loop | `tests/learning-operating-loop-service.test.js`, `tests/growth-operating-loop-smoke-script.test.js`, route Owner-write tests, and `tests/growth-architecture-boundary.test.js`. `learning-operating-loop-service.recommend()` is no-write readback over the current loop state. `runNext()` may execute only the current `nextAction`: `draft_daily_plan` through `learning-daily-loop-service.advance()`, `publish_selected_plan_item` through `learning-daily-loop-service.publish()`, and `review_stage_assessment` through `learning-stage-assessment-service.activateStageAssessment()` only after explicit Owner checkpoint confirmation. `npm run smoke:operating-loop` defaults to no-write recommendation; `run-next` / `advance` require `--allow-write`; formal checkpoint activation also requires `--allow-stage-activation` or `--confirm-stage-assessment`. Unsupported learner, audit/correction, target-provisioning, graph-import, context-refresh, and Gateway-configuration next actions must return visible blocked/separate-flow states, not automatic side effects. |
| Recommendation lifecycle decisions | `tests/learning-recommendation-lifecycle-service.test.js`, `tests/growth-routes.test.js`, `tests/growth-recommendation-lifecycle-smoke-script.test.js`, `tests/growth-frontend-adapter.test.js`, and architecture guards prove the lifecycle boundary can list pending/accepted/skipped/expired/superseded recommendation rows, lets an Owner explicitly mark a pending recommendation `skipped` or `expired` through `POST /api/v1/growth/recommendations/lifecycle/review`, exposes only pending-row `跳过` / `过期` controls in the embedded Owner generation panel, constructs summary-only review payloads from service-provided selectors, rejects invalid/private/accepted/superseded overrides, keeps `npm run smoke:recommendation-lifecycle` no-write for release evidence, and mirrors top-level `recommendationLifecycle*` operator readback for operation/status, write gate, scope, filters, lifecycle counts, status counts, latest trajectory, pending trajectory ids, accepted generated-card ids, and write-performed flags while preserving the nested DTO as canonical. This boundary must not mark accepted recommendations, call Gateway, publish/generate cards, evaluate submissions, schedule work, deliver handoffs, activate stage assessments, or mutate learner state beyond the bounded lifecycle status update. |
| Cycle history release evidence | `tests/learning-cycle-history-service.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, top-level `cycleHistory*` smoke operator readback, the default release-bundle `cycle_history` task, `productionCycleHistorySmokeEvidence`, release-readiness key `production_cycle_history_smoke_evidence`, and architecture guards prove selectable historical-cycle readback can be collected as summary-only release evidence without Gateway, direct repository access, writes, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Owner audit release evidence | `tests/growth-owner-audit-smoke-script.test.js`, top-level `ownerAudit*` smoke operator readback, `tests/growth-release-evidence-bundle-script.test.js`, the default release-bundle `owner_audit` task, `productionOwnerAuditSmokeEvidence`, release-readiness key `production_owner_audit_smoke_evidence`, and architecture guards prove Owner audit/completeness/correction readback can be collected as summary-only release evidence without Gateway, direct repository access, writes, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Owner audit-review release evidence | `tests/growth-owner-audit-review-smoke-script.test.js`, top-level `ownerAuditReview*` smoke operator readback, `tests/learning-automation-release-evidence-task-registry.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, `tests/learning-automation-release-readiness-service.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/learning-automation-release-evidence-service.test.js`, and architecture guards prove the completed-cycle Owner review closure can be collected as summary-only release evidence. The default release-bundle `owner_audit_review` task maps `npm run smoke:owner-audit-review` into `productionOwnerAuditReviewSmokeEvidence`; release-readiness checks it as `production_owner_audit_review_smoke_evidence` and requires bounded review-summary fields such as review count/id, decision/status, profile-feedback status, and next action before pass. This is distinct from backend automation `ownerReviewEvidence`: it proves learning-cycle Owner review closure, not proposal/digest/scheduler review state. It must not call Gateway, write learner evidence, mutate profile state, generate/evaluate cards, schedule work, notify, activate stages, or inspect repositories directly from release-readiness/bundle boundaries. |
| Profile feedback evidence | `tests/learning-profile-feedback-evidence-service.test.js`, `tests/learning-owner-review-signal-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, the post-cycle profile-feedback assertion in `tests/learning-card-ai-loop-harness.test.js`, `npm run smoke:profile-feedback`, summary-only `growth.learningProfileFeedbackEvidence.v1`, top-level `profileFeedback*` smoke operator readback, default release-bundle task `profile_feedback`, release-readiness key `production_profile_feedback_smoke_evidence`, and the `profile_feedback` object type in `tests/learning-reference-contract-service.test.js` / `tests/growth-reference-contract-smoke-script.test.js`. The service must require a completed-cycle selector by default, read audit completeness/evidence/profile-delta/Profile V2/recommendation/loop-state evidence through service DTOs, project bounded reward settlement counts and total learning-coin amounts from the next loop-state readback, include non-required Owner review signal summaries when available, fail closed for privacy-risk keys or missing required readback, and avoid Gateway, generation, evaluation, publication, scheduler, stage activation, learner-state mutation, and direct repository access. Missing Owner review does not block ordinary low-pressure next planning; it remains an advisory review status. If a selector is absent, it may call the read-only `learning-cycle-history-service` for bounded selector discovery only; release evidence must expose the resulting `selectorDiscovery` counts and remediation action, and must stay blocked until a real completed cycle exists. Explicit `autoSelectCompletedCycle` and `autoSelectLatestCompletedCycle` inputs may select one real completed history candidate for release-evidence collection; harness coverage must prove the latest completed candidate is chosen when requested and that downstream audit/profile/recommendation/loop-state services receive that selector. The smoke CLI must preserve top-level status/readiness, scope selectors, check pass/missing/blocked counts, evidence/profile/profile-delta counts, recommendation, loop-state next action, reward settlement counts/coins, selector discovery/auto-selection, selected-cycle ids, and missing-required counts while keeping the nested DTO canonical. The Reference Contract projection must preserve only summary readiness/count/reward/recommendation/next-action fields and related object references. The default release-bundle `profile_feedback` task must preserve the summary `rewardSettlementCount`, `totalRewardCoins`, `autoSelectionStatus`, `selectedCycleId`, and `selectedTaskCardId` fields so release review can audit score-to-reward closure without reading reward tables. |
| Completed-cycle automation review packet | `tests/learning-card-ai-loop-harness.test.js` continues the Fanfan science completed daily cycle into `learning-automation-proposal-service.createProposal`, Owner acceptance, read-only `learning-automation-scheduler-service.dryRun`, and `learning-automation-digest-service.createDigest`. It requires a summary-only accepted proposal, one `would_publish` candidate, one pending digest required Owner action, no automatic publish, no writeful scheduler execution, and no extra card-authoring or evaluation Gateway calls after the completed source card. |
| Learner daily interaction | One submission box, one evaluation, one optional reflection, audio record/playback, visible failed-evaluation retry path, no pass-line loop, and `tests/growth-learner-cycle-smoke-script.test.js` plus `npm run smoke:learner-cycle` for service-level audit/submit/evaluate/reflect/full-loop evidence. `tests/learning-card-ai-loop-harness.test.js` now also proves a Fanfan science card generated through `learning-daily-loop-service.advance()` is visible in board/detail, completes through `learning-learner-cycle-service.full()`, rejects a second daily submission, processes no second evaluation, rejects a second reflection, persists one submission/evaluation/reflection row, and writes daily evidence/reward/profile data without raw learner/model leakage. Formal stage assessments use the same learner-cycle service path for one formal submission, one formal evaluation, and one formal reflection after evaluation; duplicate formal submissions/reflections are rejected by the SQLite evidence writer. The smoke defaults to no-write audit, gates write operations with `--allow-write`, returns only summary ids/status/counts/findings without learner text or raw model content, mirrors top-level `learnerCycle*` operator readback for operation/status, write gate, target/scope, card/evaluation-job state, submission/evaluation/reflection ids and counts, formal stage-assessment cycle completion/cooldown readback, cycle-audit counts, completeness readiness, missing-required counts, and finding counts, and the harness verifies the completed smoke cycle can be read by the no-write learning-loop state smoke as the next planning action. |
| Evidence/profile/audit | Evidence ledger, evidence audit, Profile V2, profile-delta audit, correction, cycle audit, completeness, stale evidence, privacy tests, `tests/growth-owner-audit-smoke-script.test.js`, and `npm run smoke:owner-audit`; the smoke now returns cycle audit, completeness, evidence audit, profile-delta audit, correction DTOs, and top-level `ownerAudit*` operator readback by default, while correction writes remain explicitly gated. Audit-completeness privacy projection must block raw/private DTO keys but must not fail solely because safe public text values contain words such as token, transcript, secret, prompt, or cookie. |
| Stage assessment | Readiness, activation, coverage, completion, cooldown, direct daily-publish blocking, `tests/growth-stage-assessment-smoke-script.test.js`, `npm run smoke:stage-assessment`, and top-level `stageAssessment*` operator readback mirroring nested readiness/activation/completion DTOs; the CLI defaults to read-only readiness and requires explicit `--allow-write` for eligibility, activation, or completion evidence. `tests/learning-card-ai-loop-harness.test.js` now proves the real service graph: Owner activation, board/detail visibility, active loop-state readback with `capabilityClusterId` and `assessmentCoverageNodeIds`, learner-cycle `full` submit/evaluate/reflect, one-shot formal duplicate rejection, high-weight mastery evidence, and cooldown after completion. `tests/growth-learning-sqlite-store.test.js` proves formal cards project `reflection_required` after evaluation until the single formal reflection is stored. |
| Stage checkpoint controls | Summary-only Owner controls DTO, Owner generation-panel controls rendering and action gating, `tests/learning-stage-checkpoint-controls-service.test.js`, `tests/growth-stage-checkpoint-controls-smoke-script.test.js`, `tests/growth-frontend-adapter.test.js`, `npm run smoke:stage-checkpoint-controls`, top-level `stageCheckpointControls*` operator readback mirroring the nested `growth.stageCheckpointControls.v1` DTO, default release-bundle task `stage_checkpoint_controls`, release-readiness key `stage_checkpoint_controls_evidence`, and architecture coverage for no Gateway, direct repository, generation, publication, evaluation, scheduler, notification, stage activation, learner-state mutation, or browser-side eligibility recomputation from the controls boundary. Release collection must pass a real `targetNodeIds` coverage selector for stage evidence; a dormant/not-ready result caused by insufficient recent practice is valid backend evidence and must not be converted into a forced formal assessment. |
| Multi-workspace target | Visible-target allow/deny, explicit provision enablement, cross-subject domain-pack plus subject-domain selection, wrong-subject blocking, target-workspace row ownership, `tests/growth-target-provisioning-smoke-script.test.js`, `npm run smoke:target-provisioning`, top-level `targetProvisioning*` smoke operator readback, the default release-bundle `target_provisioning` task, `productionTargetProvisioningSmokeEvidence`, release-readiness key `production_target_provisioning_smoke_evidence`, and no actor/target mixing. Production Fanfan science evidence must use `domain_pack_fanfan_cambridge_pathway_v1`; `tests/growth-docs-locality.test.js` and `node scripts/check-growth-docs-locality.js` fail current playbook docs that reintroduce stale production domain-pack markers. The smoke CLI must preserve operation/status, write gate, target-enabled status, learner/program scope, selected domain-pack/domain/subject, selected graph-node counts, provision status, graph option counts, subjects, and node mismatch/missing ids while keeping the service DTO canonical and without adding writes or Gateway/scheduler/release-state behavior. |
| UI-gate release evidence | `tests/learning-automation-ui-evidence-service.test.js`, `tests/growth-ui-evidence-smoke-script.test.js`, `tests/learning-automation-release-evidence-service.test.js`, `tests/growth-automation-release-evidence-smoke-script.test.js`, `tests/learning-automation-release-readiness-service.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/growth-release-evidence-collection-smoke-script.test.js`, `tests/growth-architecture-boundary.test.js`, and `npm run smoke:ui-evidence`, with top-level `uiEvidence*` operator readback; validates summary-only artifacts for `ownerDailyUiEvidence`, `ownerAuditUiEvidence`, `proposalReviewUiEvidence`, `releasePackageReviewUiEvidence`, `automationDigestUiEvidence`, `automationActionHandoffUiEvidence`, `schedulerExecutionUiEvidence`, `schedulerRunUiEvidence`, and `schedulerWorkerTargetUiEvidence`. The UI evidence service requires matching gate metadata, gate-specific coverage ids, passing assertions, screenshot or DOM evidence, and private-value-safe public projection. The release-evidence service must re-run that validator before persisting any pass UI evidence record; direct `{ok:true}` UI evidence is rejected and no pass row is saved. Its evidence bag keeps validator schema/projection readback plus top-level evidence/check keys so release-readiness can prove persisted UI records were validated. The release-evidence smoke Harness now explicitly records a validated `releasePackageReviewUiEvidence` summary into a temporary Growth SQLite database, reads it back from the release-evidence bag, and verifies `npm run smoke:release-readiness` consumes the persisted record as a passing `release_package_review_ui_evidence` check; this proves local persistence/readiness consumption only and does not replace a real Home AI visual/UI artifact. `tests/learning-automation-release-evidence-collection-service.test.js` and `tests/growth-release-evidence-collection-smoke-script.test.js` also prove release evidence collection can preserve the UI validator projection from the explicit `release_package_review_ui` bundle task, compact it without raw artifact paths, and persist it through the same validator-gated release-evidence service path. Release-readiness one-off UI gate inputs must be validator summaries or validated release-evidence record projections; deprecated UI flags and naked `{ok:true}` objects are blocked with `provide_validated_ui_evidence_summary` remediation. Blocked/missing UI records may be persisted as explicit non-pass audit state. The UI validator itself remains read-only and must not run Home AI visual tooling, call Gateway, persist release evidence, publish, generate, evaluate, execute scheduler actions, deliver notifications, activate stage assessments, inspect SQLite directly, or mutate learner state. |
| Proposal | Repository/service/route tests, `tests/growth-automation-proposal-smoke-script.test.js`, `npm run smoke:proposal`, top-level `automationProposal*` operator readback, the completed-cycle proposal evidence in `tests/learning-card-ai-loop-harness.test.js`, repository-level privacy-risk key and private path/token-looking value rejection, read-only list by default, explicit `--allow-write` for create/review/publish, and architecture guard for no Gateway, direct plan publisher, direct card generation, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Automation digest | Repository/service/route tests, `tests/growth-automation-digest-smoke-script.test.js`, `npm run smoke:digest`, top-level `automationDigest*` operator readback, dry-run safety flags, required Owner action counts, read-only list/get by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, scheduler execution, notifications, action handoff, learner-state mutation, or direct repository access from the CLI. |
| Scheduler dry-run | Service tests, `tests/growth-scheduler-dry-run-smoke-script.test.js`, `npm run smoke:scheduler-dry-run`, top-level `schedulerDryRun*` operator readback, the Fanfan science completed-cycle candidate in `tests/learning-card-ai-loop-harness.test.js`, and architecture guard for no Gateway, publication, evaluation, execution, scheduler tick, stage activation, notification, learner-state mutation, or direct repository access from the CLI. |
| Digest | Repository/service/route tests, `tests/growth-automation-digest-smoke-script.test.js`, `npm run smoke:digest`, the Fanfan science completed-cycle digest in `tests/learning-card-ai-loop-harness.test.js`, repository-level privacy-risk key and private path/token-looking value rejection, read-only list/get by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Failure policy | Repository/service/route tests, `tests/growth-automation-failure-policy-smoke-script.test.js`, `npm run smoke:failure-policy`, top-level `automationFailurePolicy*` operator readback, repository-level privacy-risk key and private path/token-looking value rejection, read-only readiness/list by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Owner review evidence | `tests/learning-automation-owner-review-evidence-service.test.js`, `tests/growth-automation-owner-review-evidence-smoke-script.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, `tests/learning-automation-release-readiness-service.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/learning-automation-release-evidence-service.test.js`, route tests, architecture guards, `npm run smoke:owner-review-evidence`, top-level `automationOwnerReviewEvidence*` operator readback, release-bundle task `owner_review_evidence`, release-readiness key `owner_review_evidence`, and canonical persisted release evidence key `owner_review_evidence`. The service owns no repository/table and aggregates proposal, digest, failure-policy, action-handoff, scheduler execution/run, worker-target, and release-readiness DTOs into one summary-only backend evidence read model. Proposal lifecycle readback reports `proposed`, `accepted`, `skipped`, `expired`, `superseded`, owner-decision, and execution-status counts; `proposed` is pending-review evidence, while only `accepted` satisfies the accepted-proposal gate. Release-bundle summary projection also preserves digest pending/required-action/blocked-candidate counts, action-handoff delivered/pending/blocked counts, scheduler execution published/blocked/failed counts, scheduler run completed/blocked/skipped counts, worker-target reviewed/pending/disabled counts, and failure-policy status without raw dependency ids. It is no-write, not UI evidence, and must not call Gateway, publish, generate, evaluate, execute scheduler actions, run scheduler ticks, deliver handoffs, emit events, activate stage assessments, mutate learner state, or inspect repositories directly. |
| Action handoff | Repository/service/route tests, `tests/growth-automation-action-handoff-smoke-script.test.js`, `npm run smoke:action-handoff`, top-level `automationActionHandoff*` operator readback, frontend adapter/UI harness for list/create/deliver controls, repository-level privacy-risk key and private path/token-looking value rejection, explicit write gate for create/deliver, event delivery failure visibility, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler execution | Repository/service/route tests, `tests/growth-automation-scheduler-execution-smoke-script.test.js`, frontend adapter/UI harness for list/execute controls, `npm run smoke:scheduler-execution`, top-level `automationSchedulerExecution*` operator readback, repository-level privacy-risk key and private path/token-looking value rejection, read-only list by default, explicit `--allow-write` for CLI execute, Owner UI explicit `owner_explicit_once` execute attempts through the route, default-disabled blocked execution evidence, release authorization plus release activation audit readback plus persisted `verified_enabled` runtime enablement readback before publish, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler tick, action handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler run | Repository/service/route tests, `tests/growth-automation-scheduler-run-smoke-script.test.js`, frontend adapter/UI harness for list/run-once controls, `npm run smoke:scheduler-run`, top-level `automationSchedulerRun*` operator readback, repository-level privacy-risk key and private path/token-looking value rejection, read-only list by default, explicit `--allow-write` for CLI run, Owner UI explicit `background_supervised_tick` run-once attempts through the route, default-disabled blocked run evidence, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker target | Repository/service/route tests, `tests/growth-automation-scheduler-worker-target-smoke-script.test.js`, frontend adapter/UI harness for list/create/review controls, `npm run smoke:scheduler-worker-target`, top-level `automationSchedulerWorkerTarget*` operator readback, repository-level privacy-risk key and private path/token-looking value rejection, read-only list/runnable operations by default, explicit `--allow-write` for CLI create/review, Owner UI explicit proposed-target create plus `enabled`/`disabled`/`archived` review through the route, target provisioning plus Owner review evidence, `productionSchedulingAllowed=false`, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker | Worker service/lease repository/run service tests, `tests/growth-automation-scheduler-worker-smoke-script.test.js`, `npm run smoke:scheduler-worker`, top-level `automationSchedulerWorker*` operator readback, lease repository privacy-risk key and private path/token-looking value rejection for claim/release payloads, disabled no-write status by default, explicit `--allow-write` for enabled tick/tick-targets, blocked lease/run evidence while scheduler run remains disabled, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker-target service bypass, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Release readiness | Snapshot, release-approval, platform-action evidence, central-visual evidence, release-evidence-bundle, release-evidence-bundle-audit, and persisted `evidenceReadback` repository/service/route/script tests, `tests/growth-platform-action-evidence-smoke-script.test.js`, `tests/learning-automation-platform-action-evidence-service.test.js`, `tests/growth-central-visual-evidence-smoke-script.test.js`, `tests/learning-automation-central-visual-evidence-service.test.js`, `tests/growth-release-evidence-bundle-audit-smoke-script.test.js`, `tests/learning-automation-release-evidence-bundle-audit-service.test.js`, `tests/learning-automation-release-readiness-repository.test.js`, `tests/growth-release-readiness-smoke-script.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-automation-release-approval-smoke-script.test.js`, `npm run smoke:release-readiness`, `npm run smoke:release-evidence-bundle`, `npm run smoke:release-evidence-bundle-audit`, `npm run smoke:platform-action-evidence`, `npm run smoke:central-visual-evidence`, `npm run smoke:release-approval`, top-level `automationReleaseApproval*` and `automationReleaseEvidence*` operator readback, release evidence bag/list/record evidence from `npm run smoke:release-evidence`, stage-checkpoint evidence from `npm run smoke:stage-assessment`, stage-checkpoint controls evidence from `npm run smoke:stage-checkpoint-controls` or the default `stage_checkpoint_controls` release-bundle task, release approval bag evidence from `npm run smoke:release-approval -- --operation bag`, automation digest/action handoff/execution/run/worker-target UI evidence, production proposal smoke evidence from `npm run smoke:proposal`, production action handoff smoke evidence, platform Action Inbox/Web Push receipt evidence from `npm run smoke:platform-action-evidence` or the default `platform_action` release-bundle task, top-level `platformActionEvidence*` operator readback, central embedded-plugin visual evidence from `npm run smoke:central-visual-evidence` over a Home AI visual harness artifact or the default `central_visual` release-bundle task, top-level `centralVisualEvidence*` operator readback, production scheduler execution smoke evidence, production scheduler run smoke evidence, production scheduler worker target smoke evidence, production scheduler worker smoke evidence, production planner readiness smoke evidence from `npm run smoke:planner-readiness`, production target-provisioning smoke evidence from `npm run smoke:target-provisioning` or the default `target_provisioning` release-bundle task, production daily-loop preview smoke evidence, production learning-loop state smoke evidence from `npm run smoke:learning-loop-state`, production cycle-history smoke evidence from `npm run smoke:cycle-history` or the default `cycle_history` release-bundle task, production Owner audit smoke evidence from `npm run smoke:owner-audit` or the default `owner_audit` release-bundle task, production profile-feedback smoke evidence from `npm run smoke:profile-feedback` or the default `profile_feedback` release-bundle task, optional final release-controls readback evidence from the explicit non-default `release_controls` release-bundle task, optional final release-inventory readback evidence from the explicit non-default `release_inventory` release-bundle task, optional final release-dashboard readback evidence from the explicit non-default `release_dashboard` release-bundle task, production controlled daily-loop write-smoke evidence from either `npm run smoke:daily-loop` or the explicit write-gated `daily_loop_write` release-bundle task, production learner-cycle audit smoke evidence from `npm run smoke:learner-cycle` or the default `learner_cycle` release-bundle task, production scheduler dry-run smoke evidence from `npm run smoke:scheduler-dry-run`, release evidence bundle self-audit evidence from `npm run smoke:release-evidence-bundle-audit`, release-readiness internal no-write scheduler dry-run safety evidence, releaseReview remediation plan coverage for missing/blocked/evidence keys and next action, `evidenceReadback` coverage for source bundle, present/missing counts, per-check evidence ids/status/source, bundled evidence precedence over default false CLI flag fields, `ownerReviewEvidence` stage-summary counters without raw ids, downstream controls/dashboard/inventory/package projection of only the compact `ownerReviewStageSummary`, SQLite migration, central visual evidence public-scope/projection private-value rejection, and privacy-risk value rejection, and architecture guard for no Gateway, direct daily-loop, cycle-history, Owner audit, learner-cycle, target-provisioning, Action Inbox/Web Push internals, visual tooling, or learner-state access, publication, evaluation, scheduler, notification delivery, stage, learner-state mutation, or direct repository access from release-readiness, bundle-builder, or bundle-audit boundaries. |
| Release evidence collection | Service, smoke script, workbench action, action-audit repository, UI, route, and architecture tests: `tests/learning-automation-release-evidence-collection-service.test.js`, `tests/growth-release-evidence-collection-smoke-script.test.js`, `tests/learning-automation-release-workbench-service.test.js`, `tests/learning-automation-release-workbench-action-service.test.js`, `tests/learning-automation-release-workbench-action-repository.test.js`, `tests/learning-automation-release-evidence-artifact-manifest-service.test.js`, `tests/growth-frontend-adapter.test.js`, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js`, plus `npm run smoke:release-evidence-collection`. The service composes bundle, bundle audit, release-readiness, collection-run readback, and optional release-evidence record writes into `growth.learningAutomationReleaseEvidenceCollection.v1`, defaults to no-write, forwards explicit profile-feedback auto-selection flags only to the `profile_feedback` task, can persist only the existing collection-run row with `--write-collection-run --allow-write` or Owner route/workbench authorization, can persist canonical pass bundle evidence plus `releaseEvidenceBundleAudit` only through the existing release-evidence service with `--write-release-evidence-records --allow-write` or Owner route/workbench authorization, and now has CLI smoke coverage for `--task release_package_review_ui --release-package-review-ui-evidence-file <summary-artifact> --write-release-evidence-records --allow-write`, plus service/CLI/action Harness coverage for a non-special-case `scheduler_run_ui` transient file and manifest-driven central visual/UI artifact mapping, proving validated UI summaries can be written to `learning_growth_automation_release_evidence` without exposing raw artifact paths. The smoke CLI mirrors top-level `releaseEvidenceCollection*` operator readback for collection status, step counts/statuses, collection-run id/write state, release-evidence record counters, evidence keys, and runtime/write flags while preserving the nested collection DTO as canonical. After bundle collection, transient central visual/UI evidence-file fields are stripped from downstream audit/readiness/collection-run/release-record inputs, including nested `evidence` payloads; the Harness asserts bundle input can still see explicit summary-artifact files while downstream inputs cannot leak `.homeai-qa` paths. Workbench service/action/route/frontend harness coverage also proves the registry maps every registered missing UI evidence check key to its matching UI collection task, action payloads preserve task selectors, transient artifact-file fields can pass through Owner action routing only as whitelisted inputs, and recorded/post-privacy blocked Owner actions can write/read bounded `learning_growth_automation_release_workbench_actions` wrapper audits without raw request bodies, artifact paths, or delegated write results. Manifest input is read-only operator glue: CLIs may parse an explicit manifest file, while the Owner HTTP workbench action route accepts only inline manifest JSON, strips manifest fields before action recording, fails closed on unknown artifact keys, and cannot bypass central visual/UI validation. The release-evidence CLI `bag`/`list` default limit remains `20` when omitted so release-readiness operators can read back multiple persisted records without passing `--limit`. It must not record package rows, record release decisions, call Gateway, publish, generate, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, flip runtime config, grant scheduler permission, inspect SQLite directly, or mutate learner state. |
| Release collection run | `tests/learning-automation-release-collection-run-repository.test.js`, `tests/learning-automation-release-collection-run-service.test.js`, `tests/growth-release-collection-run-smoke-script.test.js`, route tests in `tests/growth-routes.test.js`, architecture guards, and `npm run smoke:release-collection-run`. The CLI defaults to no-write evaluation, writes a summary-only collection-run record only with `--write-record`, strips file paths to basenames, and must not run other smoke CLIs, call Gateway, publish, generate, evaluate, schedule, notify, activate stage assessments, mutate learner state, or import repositories directly. |
| Release package | `tests/learning-automation-release-package-repository.test.js`, `tests/learning-automation-release-package-service.test.js`, `tests/growth-release-package-script.test.js`, route tests, related bundle/audit/readiness/collection-run/controls/dashboard service tests, architecture guards, and `npm run smoke:release-package`. The service composes one summary-only `growth.learningAutomationReleasePackage.v1` artifact from the release evidence bundle builder, bundle audit, release-readiness, collection-run evaluation or explicit collection-run record, release-controls readback, and release-dashboard readback. The smoke CLI mirrors bounded top-level `releasePackage*` operator readback for package status, step counts/statuses, collection-run/write state, package-record request/write/id, preflight, dashboard/controls, readiness evidence/missing counts, and runtime/write flags while preserving the nested package DTO as canonical. It defaults to no-write, allows collection-run persistence only with `--write-collection-run --allow-write`, allows package audit persistence only with `--write-package-record --allow-write` or explicit Owner build/record route authorization, persists bounded `releaseDashboardSummary` in package records, including readiness-evidence present/missing counts, source bundle id, latest readiness snapshot id, latest snapshot evidence counts, and persisted evidence keys, and fails closed if a requested record boundary is unavailable. `POST /api/v1/growth/automation/release-packages/build` is an explicit Owner build boundary that can run selected no-write/default-disabled release-evidence tasks through an injected runner, defaults to no-write, and persists collection-run/package audit records only when explicit write flags are present; `POST /api/v1/growth/automation/release-packages` records only an existing artifact and must not run package smoke tasks. The boundary must not call Gateway, publish, generate, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, flip runtime config, grant scheduler permission, inspect SQLite directly outside repositories, or mutate learner state. |
| Release decision/review/authorization/closure/activation/runtime enablement/controls/dashboard/workbench/preflight/inventory | Decision, review, authorization, closure, activation, runtime enablement, release-controls, release-dashboard, release-workbench, release-preflight, and release-inventory service/script/route tests, `tests/learning-automation-release-decision-service.test.js`, `tests/learning-automation-release-review-service.test.js`, `tests/learning-automation-release-authorization-service.test.js`, `tests/learning-automation-release-closure-service.test.js`, `tests/learning-automation-release-activation-repository.test.js`, `tests/learning-automation-release-activation-service.test.js`, `tests/learning-automation-runtime-enablement-repository.test.js`, `tests/learning-automation-runtime-enablement-service.test.js`, `tests/learning-automation-release-controls-service.test.js`, `tests/learning-automation-release-dashboard-service.test.js`, `tests/learning-automation-release-workbench-service.test.js`, `tests/learning-automation-release-preflight-service.test.js`, `tests/learning-automation-release-preflight-repository.test.js`, `tests/learning-automation-release-inventory-service.test.js`, `tests/growth-release-decision-smoke-script.test.js`, `tests/growth-release-review-smoke-script.test.js`, `tests/growth-release-authorization-smoke-script.test.js`, `tests/growth-release-closure-smoke-script.test.js`, `tests/growth-release-activation-smoke-script.test.js`, `tests/growth-runtime-enablement-smoke-script.test.js`, `tests/growth-release-controls-smoke-script.test.js`, `tests/growth-release-dashboard-smoke-script.test.js`, `tests/growth-release-workbench-smoke-script.test.js`, `tests/growth-release-preflight-smoke-script.test.js`, `tests/growth-release-inventory-smoke-script.test.js`, `tests/learning-automation-release-evidence-bundle-service.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, route tests, architecture guards, `npm run smoke:release-decision`, `npm run smoke:release-review`, `npm run smoke:release-authorization`, `npm run smoke:release-closure`, `npm run smoke:release-activation`, `npm run smoke:runtime-enablement`, `npm run smoke:release-controls`, `npm run smoke:release-dashboard`, `npm run smoke:release-workbench`, `npm run smoke:release-preflight`, and `npm run smoke:release-inventory`. Release decision can explicitly auto-select the latest persisted `ready_for_release_review` collection run through the collection-run service with `--auto-select-latest-ready-collection-run` / `auto_select_latest_ready_collection_run`, then applies the same approved-decision validation and writes only through the decision repository. Release review must include a real SQLite smoke scenario that seeds a release collection run plus matching release package audit record, then verifies `packageRecordReadbackAvailable`, `packageRecordRequired`, `packageRecordPresent`, `latestPackageId`, `packageRecordStatus`, and package dashboard summary projection through `scripts/smoke-growth-release-review.js`. Closure combines review and authorization into one no-write `growth.learningAutomationReleaseClosure.v1` readback with backend evidence completion, missing approval/check/evidence keys, package audit readback, required actions, and next action; activation preflight then maps selected runtime config gates to approval/config state without applying config. Activation record writes require `--operation record --allow-write` or Owner-only `POST /api/v1/growth/automation/release-activations`, store only summary-only audit state, and still keep `writefulSchedulingAllowed=false`, `runtimeConfigChange=false`, and `configChangeApplied=false`. Runtime enablement readback validates activation records against current config booleans and can persist only `learning_growth_automation_runtime_enablements` audit state. Release controls is a no-write aggregate over the same ladder and now includes bounded persisted package dashboard summary, release-readiness evidenceReadback summary, activation, and runtime enablement audit-record readback through the owning services; it can also be collected as a non-default `release_controls` release-bundle task for final readback packaging, owns no repository/table, reports the first blocking status and next action, and still keeps all runtime mutation and scheduling permission flags false. Release inventory is a no-write Owner/visible-target aggregate over release-readiness snapshots, collection runs, decisions, package audit records, approvals, activation records, runtime enablement records, and release controls through existing service reads; it can also be collected as a non-default `release_inventory` release-bundle task for final readback packaging, owns no repository/table, reports latest artifact ids plus latest package dashboard summary, latest readiness evidenceReadback summary, and missing/blocked record kinds, and keeps all runtime mutation and scheduling permission flags false. Release dashboard is a no-write Owner/visible-target read model over release-readiness, release-controls, and release-inventory service DTOs; it can also be collected as a non-default `release_dashboard` release-bundle task for final readback packaging, owns no repository/table, gives UI/release audit one bounded next-action/status/artifact/package-dashboard/readiness-evidence summary, and keeps all runtime mutation and scheduling permission flags false. Release workbench is a no-write Owner/visible-target action-template read model over release-readiness, release-controls, release-inventory, and release-dashboard DTOs; it owns no repository/table, gives Owner UI bounded read routes, record-route templates, missing evidence/approval/record summaries, release-decision route bodies with explicit latest-ready collection-run auto-selection, release-preflight read/report routes plus a `release_preflight` record route, and manual runtime-config follow-up hints without applying config; it offers `record_release_preflight` before activation/runtime actions once evidence, approval, collection-run, decision, and package blockers are clear. Release preflight is a summary-only backend audit boundary over release-dashboard, release-workbench, and release-closure; it can persist only Owner-authorized preflight report rows through its direct route, CLI, or `release_preflight` workbench action, keeps `readyForProductionDeploy=false`, and does not replace central visual, runtime-config, deployment, or scheduler gates. |
| Release workbench action | `tests/learning-automation-release-workbench-action-service.test.js`, `tests/learning-automation-release-workbench-action-repository.test.js`, `tests/growth-release-workbench-action-smoke-script.test.js`, route tests in `tests/growth-routes.test.js`, frontend payload tests in `tests/growth-frontend-adapter.test.js`, architecture guards in `tests/growth-architecture-boundary.test.js`, and `npm run smoke:release-workbench-action`. The write route is Owner-only and visible-target scoped; the Owner-only audit readback route is `GET /api/v1/growth/automation/release-workbench/action-audits`. The CLI rejects writes without `--allow-write` for `--operation record`, supports no-write `--operation list-audits` / `--list-action-audits` readback through `learningAutomationReleaseWorkbenchActionService.listActionAudits`, and mirrors bounded top-level `releaseWorkbenchAction*` operator readback for operation/status, scope, endpoint/action keys, wrapper action-record and action-audit status/id, delegated collection counters, requested task/write flags, and false runtime/scheduling flags while preserving the nested service DTOs as canonical. The service must first read release workbench record routes, fail closed when the requested endpoint is not advertised, privacy-scan summary inputs including private path/token-looking values, require only the selected endpoint write service, and delegate only to existing release-readiness snapshot, release evidence, release evidence collection, release approval, collection-run, release-decision, package-record or explicit package build-and-record, release-preflight, release activation, or runtime enablement services. For `release_decision`, the facade forwards only the explicit latest-ready collection-run auto-selection flag and leaves lookup/validation/write to the decision service. For `release_evidence_collection`, a collection artifact can complete the workbench action when release-evidence records were written or deduped, even if release-readiness remains incomplete; a delegated collection blocked before any release-evidence record must return a visible blocked action/audit; the CLI harness must cover bounded collection selectors, `--write-collection-run`, `--write-release-evidence-records`, registry-driven transient UI evidence file fields such as `--release-package-review-ui-evidence-file` and `--scheduler-run-ui-evidence-file`, manifest-driven artifact mapping, nested collection-run id normalization, persisted collection-run audit row, summary release-evidence record write counters, blocked collection visibility, the wrapper action-audit row, and write-then-list audit readback without direct SQLite inspection. For `release_package`, Harness must cover the default existing-artifact record path, explicit `buildReleasePackage` / `--build-and-record-package` delegation to the package service, and bounded fail-closed behavior when the package build service is unavailable. For `release_preflight`, Harness must cover direct facade delegation to `learning-automation-release-preflight-service.recordReport`, `preflightReportId` action-record normalization, route normalization, CLI facade acceptance, and bounded fail-closed behavior when the selected preflight service is unavailable. Route harness must also cover inline `artifactManifest` / `releaseEvidenceArtifactManifest` application through the manifest service and bounded unknown-key failure without enabling HTTP file-path manifest reads. The action-audit repository may store only summary-only scope, endpoint/action, status, action-record id/status, duplicate/workbench status, bounded error, and requestedBy metadata; it must reject raw/private payloads and non-summary writes. Transient evidence-file values are redacted before the action/workbench privacy scan and must not appear in public output; private paths outside those whitelisted fields remain blocked. It must not own downstream release record repositories, build packages itself, compute preflight itself, run smoke tasks internally, call Gateway, publish, generate, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, flip runtime config, grant scheduler permission, inspect SQLite directly, or mutate learner state. |
| UI | Progress state, visible errors, mobile scroll, dark-mode contrast, embedded sizing, and no hidden final action controls. |
| Docs | `node scripts/check-growth-docs-locality.js` and `node --test tests/growth-docs-locality.test.js`. |

Release controls and release workbench Harness must also prove latest preflight
report id/status/advisory readiness flags survive the final Owner readback
projection without adding a preflight repository dependency, writing release
records, mutating runtime config, or granting scheduler/deployment permission.
| Broad local gate | `npm run check`, `npm test`, and `git diff --check` before commit/deploy. `scripts/check-growth-syntax-coverage.js` and `tests/growth-architecture-boundary.test.js` must keep `npm run check` covering every runtime JavaScript file under `scripts/`, `src/`, and `public/`. |
| Production UI release | Central Home AI embedded-plugin visual harness and AI Ops evidence ledger. |

Release-readiness harness coverage also includes the service-owned evidence
object contract: passing-looking non-UI smoke/readback evidence without
`summaryOnly=true`, `summary_only=true`, or `privacyClass=summary_only` is
blocked with `release_evidence_summary_only_required`, while explicit release
approval booleans remain confined to the separate approval path.

Release workbench state-prerequisite sub-contract: readiness checks that are
proved by existing Growth automation state, such as reviewed digest, active
failure policy, delivered action handoff, and reviewed enabled worker target,
must be projected as `releaseStatePrerequisiteActions` with internal Owner workbench action templates, required selectors, and GET follow-up
routes to those automation modules. They must not be counted as unsupported
release evidence, must not be submitted through the release-evidence collection
button, and must not create direct pass `release_evidence` actions. Harness
coverage must assert both the workbench read model and artifact-template
checklist/action-plan projection.

Central visual evidence sub-contract: Growth may read Home AI visual harness
artifacts only to derive summary fields such as plugin id, scenario,
assertion counts, screenshot presence, and screenshot basename. The public
scope and projected public visual summary must reject private path or
token-looking values, and failed DTOs must be redacted before release-bundle or
release-readiness consumers see them.

Release ladder privacy sub-contract: release review, authorization, closure,
and activation readbacks are public release-control DTOs, so they must scan
public inputs, dependency outputs, and final public DTOs for private path or
token-looking values. Activation must apply the same rule to saved activation
output and list readback. Harness coverage must include service-level failures
and smoke-script failures that return only finding paths, not private values;
release review and release authorization smoke coverage must include parsed
public-scope private values before any production release evidence package can
claim the ladder is privacy-complete.

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
shifted from basic draft/publish/provision/history operation to product-grade
closure: central embedded visual evidence, production release evidence, and
validated release evidence for the now-local proposal/digest/action/execution/
run/worker-target Owner UI over the existing supervised automation facades.
That keeps the AI loop observable and avoids adding unattended automation before
Owner can inspect why a card was selected and what changed after completion.

If the next slice must be backend-only, choose Path B and keep it strictly as
release-readiness evidence. That boundary should make missing release evidence
explicit, but it must not enable execution or scheduling.
