# Growth AI Learning Implementation Plan

Last updated: 2026-06-18.

## Purpose

This document is the execution plan for building Growth into a supervised,
AI-guided learning system. It turns the product direction in
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` and the closed-loop contract in
`docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` into ordered implementation
packages.

The plan starts with Fanfan and the imported UK/HK curriculum foundation graph,
but the architecture must support any authorized learner workspace, domain
pack, subject, and knowledge graph after view-target visibility and target
provisioning both pass.

This document is not a replacement for the existing detailed contracts:

- use `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` as the system scheme and
  product thesis;
- use `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` as the closed-loop
  contract;
- use `docs/GROWTH_AI_LEARNING_ROADMAP.md` for capability levels and release
  gates;
- use `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` to choose the immediate
  next-stage path: product-visible Owner daily loop first, or a backend-only
  release-readiness evidence gate that cannot enable scheduling;
- use `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service,
  state, DTO, and harness-level contracts;
- use `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` and
  `docs/GROWTH_CARD_INTERACTION_FLOW.md` for embedded UI behavior;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before any
  scheduling-adjacent, notification, Action Inbox, rollback, or writeful
  automation work;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` before changing
  automation notification/action handoff records or delivery behavior;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` before
  changing Owner-explicit scheduler execution routes, services, repositories,
  or config gates.
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before
  changing supervised scheduler run/tick behavior, background scheduler config,
  run persistence, or any future worker.

## Target Outcome

Growth should become a low-pressure learning operating loop:

1. observe summary-only learner evidence;
2. project the current learner profile from durable records;
3. plan the next learning action through Gateway;
4. validate and store the plan as an Owner-auditable draft;
5. explicitly publish one selected daily item or activate a formal checkpoint;
6. author the card through Gateway;
7. let the learner complete the card;
8. evaluate the current evidence once through Gateway;
9. write evaluation, reward, evidence, profile, trajectory, and profile-delta
   audit records;
10. let Owner inspect and correct the audit;
11. use the updated profile, evidence, profile-delta audit, and trajectory
    recommendation for the next plan.

The product goal is not simply more generated cards. The product goal is a
closed loop where each next card can be explained from durable, bounded,
summary-only state.

## Non-Negotiable Boundaries

Growth must keep these boundaries during every implementation slice:

- Service First: routes parse requests, enforce authorization, resolve visible
  targets, call services, and format bounded responses. Business policy lives
  in Growth services.
- Gateway only: Growth does not call OpenAI, Claude, DeepSeek, or other model
  vendors directly. Planning, authoring, and evaluation use Growth Gateway
  clients.
- Draft before write: model responses become drafts first. Validation must pass
  before a plan, card, evaluation, or profile effect becomes durable state.
- Summary-only state: persistent loop records and public DTOs must not include
  raw historical answers, full transcripts, raw prompts, raw model output,
  hidden answer keys, source-document bodies, private paths, credentials,
  cookies, tokens, or provider configuration.
- Owner supervision: daily publication, formal assessment activation,
  correction, proposal decisions, and later automation policy remain
  auditable Owner actions until the required safety gates exist.
- Low pressure: daily cards use one submission, one evaluation, one optional
  reflection, completion after first evaluation, score-proportional rewards,
  and no retry-until-pass gate.
- Formal separation: stage assessment cards are formal checkpoints with
  explicit coverage, high evidence weight, activation, completion, and
  cooldown owned by `learning-stage-assessment-service`.
- Actor/target separation: Owner actor workspace and learner target workspace
  stay separate in service inputs, repository writes, route tests, and UI
  state.
- Central platform compliance: broad platform contracts remain in the Home AI
  app workspace. Growth-local docs store Growth product, architecture, service,
  and harness facts only.

## Current Capability Baseline

As of this document version, the backend has the main foundations for the
AI-driven loop:

- native knowledge-graph import, graph plans, graph bindings, graph option
  projection, and domain-pack/subject provenance;
- target/domain-pack provisioning service and repository;
- Gateway-backed authoring and evaluation boundaries, with deterministic local
  fallback for evaluation harness/local isolation;
- `daily_score_once` generated-card learner flow;
- formal stage-assessment activation, generated formal cards, higher-weight
  evidence, completion, and cooldown;
- summary-only evidence ledger and bounded evidence audit readback;
- Profile V2 projection with daily versus formal evidence freshness;
- planner context, Gateway planner client, validation, draft persistence,
  publish bridge, and no-write planner readiness smoke;
- plan audit, cycle audit, selectable cycle history, audit completeness,
  profile-delta audit, and Owner correction readback services and routes;
- Owner daily-loop backend facade for preview, draft, and publish;
- service-level Fanfan science vertical harness from planner draft through
  card publication, learner evidence, evaluation, ledger, Profile V2, and
  profile delta, plus no-write profile-feedback evidence proving the completed
  cycle can feed the next recommendation and loop state;
- non-sample provisioned science vertical harness proving target provisioning
  and target-workspace scoped writes;
- supervised automation proposal backend, accepted-proposal explicit publish,
  read-only scheduler dry-run, automation digest backend, rollback/failure
  policy backend, automation action handoff backend, and default-disabled
  Owner-explicit scheduler execution backend;
- default-disabled scheduler run/tick backend, default-disabled worker lease
  backend, and Owner-reviewed worker target configuration backend. The worker
  target service stores summary-only proposed/enabled/disabled/archived target
  rows and treats environment JSON targets as local fallback rather than
  production approval;
- release-readiness evidence backend for summary-only readiness evaluation,
  bounded `evidenceReadback` catalog projection, release workbench smoke
  evidence, and Owner-created snapshots.
  Snapshots persist the readback catalog in
  `learning_growth_automation_release_readiness.evidence_readback_json`. This
  boundary is advisory, keeps `writefulSchedulingAllowed=false`, and is not a
  runtime release switch;
- release evidence collection backend/CLI/API for composing the release
  evidence bundle, bundle audit, release-readiness, and collection-run
  evaluation into one summary-only collection pass without package records,
  release decisions, runtime config, scheduler permission, deployment, or card
  publication. Optional writes can delegate only to the existing collection-run
  audit row and canonical pass release-evidence records through the existing
  release-evidence service with explicit Owner/write authorization. For UI gate
  evidence, the collection summarizer must preserve the validator projection
  fields so `learning-automation-release-evidence-service` can re-run
  `learning-automation-ui-evidence-service` before any pass record is saved.
  The facade has been
  deployed to Mac production at Growth commit `2178bdc86b97`; production
  no-write smoke must be interpreted as collection-path evidence, not release
  approval. A subset run can pass bundle and audit while release-readiness
  remains incomplete because product UI/visual, platform action,
  and completed-cycle evidence are still missing.
  Production Fanfan science target-provisioning evidence uses
  `domain_pack_fanfan_cambridge_pathway_v1`; that subset now passes through the
  Fanfan `sample_default` target path without writing a provision or
  collection-run record. Production Fanfan science stage-checkpoint backend
  evidence uses a real topic node such as
  `kg_ls_science_scientific_enquiry_plan_investigative_work`; the
  `stage_assessment` and `stage_checkpoint_controls` subset passes bundle and
  bundle-audit without writing or activating an assessment. The resulting
  controls can still report `insufficient_recent_practice`, which is expected
  low-pressure behavior and not a release-evidence failure;
- release evidence bundle privacy normalization allows only explicit negative
  privacy assertions such as `noFullTranscripts=true` and `noRawPrompts=true`
  from bounded smoke DTOs, while real transcript, raw prompt, answer-key,
  token, provider-config, or private-path fields still fail closed before
  release-readiness sees the bundle;
- release evidence bundle task evidence is formal summary-only evidence, not a
  loose script transcript. Each task evidence object carries a schema version,
  `privacyClass=summary_only`, `summaryOnly=true`, bounded status/source/task
  metadata, and `readyForReleaseEvidence` for pass/blocked distinction. When a
  bundle is passed into `npm run smoke:release-readiness` through
  `--evidence-bundle-file`, pass task evidence must be consumable directly by
  readiness without triggering `release_evidence_summary_only_required`;
- release package backend/CLI/API for composing bundle, bundle audit,
  release-readiness, collection-run, release-controls, and release-dashboard
  readback into one
  summary-only artifact, then optionally recording a bounded package audit row
  in Growth SQLite for Owner/release review without enabling scheduling,
  runtime config, deployment, or card publication.

The product is not complete because several browser and automation-safety
surfaces are still missing:

- Owner planner/provision UI is not fully product-closed;
- Owner audit/correction UI is not fully rendered from the implemented DTOs;
- proposal selected-cycle create/review/publish UI now covers
  `accepted`/`skipped`/`expired`/`superseded` decisions and explicit accepted
  proposal publication; automation digest create/read/refresh/review UI now
  creates persisted dry-run packets and records review state without executing
  them. These surfaces still need production visual/release evidence before
  their release gates can pass;
- rollback/failure policy backend is implemented as a scheduling-readiness
  prerequisite; Growth-owned automation action handoff backend is implemented,
  and the default-disabled Owner-explicit scheduler execution backend is
  implemented with a final release-authorization gate, but platform Action
  Inbox/Web Push product UI and central visual evidence are not complete;
- background writeful scheduling remains blocked;
- production planner readiness smoke and central embedded-plugin visual
  evidence are required before UI release.

## Program-Level Workstreams

Implementation should proceed through workstreams that can be verified
independently. The workstreams are ordered by evidence dependency, not by the
amount of code that already exists.

| Workstream | Goal | Must be true before it is considered closed |
| --- | --- | --- |
| W1: Scope, graph, and provisioning | Owner selects an authorized learner, domain pack, domain, subject, horizon, and time budget. | View-target authorization, explicit provision checks, graph option projection, wrong-subject blocking, and target-workspace row ownership are covered by service, route, and vertical harnesses. |
| W2: Daily learning action | Owner publishes one low-pressure daily card and learner completes it. | `daily_score_once`, one submission, one evaluation, one optional reflection, audio record/playback, score-proportional reward, visible progress, and visible failure state are covered by backend and UI harnesses. |
| W3: Audit, profile, and correction | Owner can explain what happened and adjust future learning evidence. | Evidence ledger, Profile V2, profile delta, cycle audit, selectable cycle history, audit completeness, correction read/write, privacy projection, next recommendation, post-cycle `growth.learningLoopState.v1`, `npm run smoke:cycle-history`, and `npm run smoke:owner-audit` are rendered or exercised from service DTOs. |
| W4: Formal checkpoint | Stage assessment updates profile confidence without becoming ordinary daily pressure. | Stage readiness, coverage, activation, completion, cooldown, high-weight evidence, and direct daily-publish blocking are proven through `learning-stage-assessment-service`. |
| W5: Generalized targets | The same loop runs outside the Fanfan sample. | Visible but unprovisioned targets fail closed; explicit provisioning enables; actor and target workspaces remain separate; graph provenance matches selected domain pack and subject. |
| W6: Supervised automation | Growth can propose and review repeated next actions without hiding Owner decisions. | Proposal, digest, failure policy, action handoff, Owner-explicit execution, scheduler run, worker target, and worker lease boundaries remain summary-only, reject privacy-risk keys plus private path/token-looking values before persistence, default-disabled where required, and forbidden from direct Gateway/card/stage mutation. |
| W7: Release evidence and operations | A human can inspect whether production automation prerequisites are present. | Release-readiness checks plus persisted `evidenceReadback` and downstream controls/inventory/dashboard/workbench summary projection, platform Action Inbox/Web Push evidence, central visual evidence, production planner readiness smoke, production Owner audit smoke, production controlled daily-loop write smoke, production learner-cycle audit smoke, production scheduler dry-run evidence, reviewed worker targets, config approvals, docs, and broad harnesses are complete. |

Sequencing rule:

- W1 through W3 are the minimum product loop. Do not treat automation as ready
  while Owner cannot create a daily card, watch it complete, and audit the
  resulting profile delta from the browser.
- W4 can run in parallel with UI polish only when it remains a separate formal
  checkpoint path.
- W6 and W7 can add evidence and disabled backends, but they must not enable
  writeful scheduling before W1, W2, W3, product UI, central visual evidence,
  and release approvals are complete.

## Closure Ladder

Implementation status should be reported by closure level. This avoids
confusing a backend-capable slice with a product-complete learning system.

| Level | Closed capability | Required proof |
| --- | --- | --- |
| L0: Data foundation | Growth can import or read graph/profile/evidence foundations for a target. | Native graph import/readback, target provisioning, summary-only privacy checks, and target-workspace ownership tests. |
| L1: Backend daily loop | Services can draft, publish, evaluate, record evidence, update profile projections, audit one daily card, and expose the next planning action from the completed cycle. | Service/route/repository/vertical harnesses prove the loop without browser reconstruction or direct model calls outside Gateway clients. |
| L2: Browser daily loop | Owner and learner can complete the same daily loop from the embedded plugin. | UI progress/errors, mobile scroll, dark-mode contrast, audio playback, one-box-per-stage flow, and central visual evidence. |
| L3: Audit/correction loop | Owner can inspect why the card happened and add correction evidence. | Cycle audit, evidence audit, profile-delta audit, correction read/write, completeness, `tests/growth-owner-audit-smoke-script.test.js`, and privacy UI tests. |
| L4: Checkpoint loop | Formal stage checkpoints update profile confidence without becoming daily pressure. | Stage readiness, activation, coverage, completion, cooldown, direct daily-publish blocking, and formal evidence weight tests. |
| L5: Generalized program | The loop works for another visible and explicitly provisioned learner/domain. | Non-sample vertical harness, actor/target separation, wrong-subject blocking, and graph provenance checks. |
| L6: Supervised automation | Growth can propose, review, digest, hand off, and Owner-explicitly execute one action behind disabled gates. | Proposal/digest/failure-policy/action/execution/run/worker-target harnesses and UI evidence, with no hidden publication. |
| L7: Release-reviewable automation | A human can inspect platform, visual, production dry-run, target, config, and approval evidence. | Release-readiness snapshots, central visual evidence, Action Inbox/Web Push evidence, production smokes, reviewed targets, and explicit approvals. |

The next engineering package should always name the closure level it advances.
A slice that adds L6 or L7 evidence does not advance the product loop unless L2
and L3 are also browser-operable.

## Model-Entered Steps

Only these Growth steps may enter a model, and every step goes through
Gateway:

| Step | Service boundary | Model input | Draft output | Durable write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` and `growth-gateway-planner-client` | Profile V2 summary, stale-evidence summaries, recent evidence summaries, graph candidates, target provisioning, horizon, time budget, and low-pressure policy. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service`; then `learning-plan-publisher-service` stores a draft. |
| Author | `learning-card-authoring-service` and `growth-gateway-authoring-client` | Validated planner item or `learningGraphPlan`, bounded graph/history/profile summaries, role, difficulty, support level, and evidence requirements. | Versioned card authoring draft with `teachingFlow`. | `learning-card-authoring-validation-service`; then `card-authoring-publisher` writes the card and graph binding transactionally. |
| Evaluate | `learning-card-evaluation-service` and `growth-gateway-evaluation-client` | Current authenticated learner evidence for the current card, bounded audio metadata, card policy, graph metadata, and current stage policy. | `growth.card.evaluation.v1`. | Evaluation validation; then `growth-evaluation-service` writes evaluation and downstream records. |

All other steps are deterministic service behavior: provisioning, graph
filtering, validation, publication, reward settlement, evidence-ledger writes,
Profile V2 projection, profile-delta audit, stage cooldown, proposal decisions,
digest review, and action handoff delivery metadata.

## Product Flow

### Daily Practice

Daily practice is the routine learning loop.

Rules:

- expected duration: 10-15 minutes;
- one active submission box;
- one evaluation;
- one optional reflection;
- completion after the first evaluation regardless of score;
- low or medium evidence weight;
- score-proportional reward;
- low score becomes planning evidence, not a child-facing failure gate.

Implementation implication:

- direct generation and planner-backed publication both must set
  `daily_score_once`;
- the learner UI must not create multiple active text boxes for one stage;
- evaluation retry exhaustion is a visible Owner-reviewable failure, not a
  hidden waiting state;
- future plans can repair weak evidence without forcing immediate resubmission.

### Stage Assessment

Stage assessments are formal checkpoints.

Rules:

- expected duration: 25-30 minutes;
- activation only through `learning-stage-assessment-service`;
- explicit graph coverage nodes;
- high evidence weight;
- completion and cooldown owned by the stage-assessment service;
- planner may suggest a checkpoint, but direct formal card publication through
  daily plan publish remains blocked.

Implementation implication:

- stage-checkpoint plan items are suggestions until Owner activates an
  assessment cycle;
- daily cards must not silently become formal checkpoints;
- formal results can shift Profile V2 more strongly, but remain auditable and
  correctable.

## Durable State Map

| State | Owner question | Owning boundary |
| --- | --- | --- |
| Target provision | Is this learner/domain/subject allowed for generation? | `learning-target-provisioning-service`, `domain-pack-provisions.js`. |
| Knowledge graph | What capability nodes and prerequisites exist? | `learning-graph-import-service`, `graph-repository.js`. |
| Planner context | What bounded state should enter the planner? | `learning-planner-context-service`. |
| Plan draft | What did Gateway suggest and what passed validation? | `learning-plan-publisher-service`, `learning-plan-drafts.js`. |
| Publish attempt | Did explicit publication succeed, fail, or get policy-blocked? | `learning-plan-publisher-service`, plan-draft latest publish attempt metadata. |
| Task card and binding | Which learner-facing card was published for which graph target? | `learning-card-generation-service`, `card-authoring-publisher.js`. |
| Submission/reflection/audio | What current evidence did the learner provide? | Growth evidence write routes and SQLite evidence/audio repositories. |
| Evaluation | How was the current card graded once? | `growth-evaluation-service`, evaluation jobs/repositories. |
| Evidence ledger | What summary evidence should profile use? | `learning-evidence-ledger-service`, `evidence-ledger.js`. |
| Profile V2 | What does Growth currently believe about the learner? | `learning-profile-v2-service`. |
| Profile delta | What changed after this cycle and why? | `learning-profile-delta-service`, `profile-delta-audits.js`. |
| Profile feedback evidence | Did the completed cycle produce enough persisted, summary-only readback to drive the next plan? If no completed-cycle selector is supplied, can the system prove whether a bounded selector candidate exists without writing learner state, and can an explicit release-evidence collection path auto-select a real completed candidate without fabricating evidence? | `learning-profile-feedback-evidence-service`, `learning-cycle-history-service` for no-write selector discovery only, `scripts/smoke-growth-profile-feedback.js`. Default callers still fail closed without a selector; `autoSelectCompletedCycle` can select a single completed candidate, while `autoSelectLatestCompletedCycle` can select the most recent completed candidate when several exist. |
| Recommendation lifecycle | Which persisted next-card recommendation is pending, accepted, or superseded, and which generated card/plan accepted it? | `learning-recommendation-lifecycle-service`, `scripts/smoke-growth-recommendation-lifecycle.js`, `GET /api/v1/growth/recommendations/lifecycle`. |
| Owner correction | What did Owner confirm or correct? | `learning-owner-correction-service`, evidence ledger correction rows. |
| Cycle audit | Can this card/evaluation/plan cycle explain itself? | `learning-cycle-audit-service`. |
| Cycle history | Which previous cycle should Owner inspect next? | `learning-cycle-history-service`, `scripts/smoke-growth-cycle-history.js`. |
| Audit completeness | Is the previous cycle safe to use as automation input? | `learning-audit-completeness-service`. |
| Automation proposal | What next action is proposed from an auditable source cycle? | `learning-automation-proposal-service`, `automation-proposals.js`. |
| Scheduler dry-run | What would publish if scheduling were allowed? | `learning-automation-scheduler-service`. |
| Automation digest | What dry-run packet did Owner review? | `learning-automation-digest-service`, `automation-digests.js`. |
| Automation failure policy | What visible failure, rollback, and manual retry policy is active for future scheduling design? | `learning-automation-failure-policy-service`, `automation-failure-policies.js`. |
| Automation action handoff | Which reviewed digest actions or blocked candidates were handed off for Owner attention? | `learning-automation-action-handoff-service`, `automation-action-handoffs.js`. |
| Automation scheduler execution | Which Owner-explicit execution attempts were blocked, failed, skipped, or published after all gates were rechecked? | `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js`. |
| Automation scheduler run | Which supervised scheduler tick inspected delivered handoffs and delegated actions to execution? | `learning-automation-scheduler-run-service`, `automation-scheduler-runs.js`. |
| Automation scheduler worker target | Which learner/domain/horizon target is reviewed and enabled for any future worker? | `learning-automation-scheduler-worker-target-service`, `automation-scheduler-worker-targets.js`. |
| Automation scheduler worker lease | Which local worker claimed or skipped a reviewed target without overlapping another worker? | `learning-automation-scheduler-worker-service`, `automation-scheduler-worker-leases.js`. |
| Automation release readiness | Which product, platform, visual, dry-run, config, worker-target, and release evidence is present before any production scheduling decision? | `learning-automation-release-readiness-service`, `automation-release-readiness.js`. |

## Delivery Packages

Each package must include service/DTO ownership, harness coverage, documentation
updates, and release evidence. A code-only slice is not complete.

### P1: Owner-Supervised Daily Browser Loop

Goal: Owner can create one Fanfan science or English daily card from the Growth
`生成` tab without Codex.

Required behavior:

- select visible target, learner id, domain pack, domain, subject, horizon,
  and time budget;
- render target provisioning, graph options, Profile V2, evidence audit,
  planner readiness, authoring readiness, evaluation readiness, and recent
  Owner audit summaries;
- render compact `growth.learningLoopState.v1` status and next action from
  `GET /api/v1/growth/learning-loop/state` instead of recomputing loop state
  in browser code;
- verify the same backend context through
  `npm run smoke:daily-loop-preview` as a no-write service-graph check before
  product or production review;
- verify compact state through
  `npm run smoke:learning-loop-state` as a no-write service-graph check before
  product or production review;
- verify the service-owned next-action execution facade through
  `npm run smoke:operating-loop` as a no-write recommendation check before
  product or production review;
- verify controlled backend draft/publish through
  `npm run smoke:daily-loop -- --operation draft --allow-write ...` and
  `npm run smoke:daily-loop -- --operation publish --allow-write --plan-draft-id <id> ...`
  only in an explicitly writable local or approved production smoke context;
- verify controlled one-step next-action execution through
  `npm run smoke:operating-loop -- --operation run-next --allow-write ...`
  only in an explicitly writable local or approved production smoke context.
  If the current next action is a formal checkpoint, this command must also
  carry `--allow-stage-activation` or `--confirm-stage-assessment`; otherwise
  `stage_assessment_owner_confirmation_required` is the correct blocked
  result.
- create a plan draft through `POST /api/v1/growth/daily-loop/draft`;
- preview one validated plan item with target nodes, role, difficulty,
  support level, evidence requirements, minutes, rationale, and basis evidence
  ids;
- explicitly publish one selected daily item through
  `POST /api/v1/growth/daily-loop/publish`;
- show progress and bounded failures for context load, draft, publish, card
  open, and audit refresh;
- keep mobile scroll, dark-mode contrast, and embedded sizing valid.

Required harness:

- `tests/learning-daily-loop-service.test.js`;
- `tests/learning-loop-state-service.test.js`;
- `tests/learning-operating-loop-service.test.js`;
- `tests/growth-daily-loop-preview-smoke-script.test.js`;
- `tests/growth-learning-loop-state-smoke-script.test.js`;
- `tests/growth-operating-loop-smoke-script.test.js`;
- `tests/learning-profile-feedback-evidence-service.test.js`;
- `tests/growth-profile-feedback-smoke-script.test.js`;
- `tests/growth-daily-loop-smoke-script.test.js`;
- `tests/learning-card-generation-context-service.test.js`;
- `tests/learning-plan-publisher-service.test.js`;
- `tests/learning-target-provisioning-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-frontend-adapter.test.js`;
- `tests/growth-embedded-layout.test.js`;
- `npm run smoke:daily-loop-preview -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:learning-loop-state -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:operating-loop -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:profile-feedback -- --workspace-id <workspace> --task-card-id <taskCardId> --evaluation-id <evaluationId> --json`;
- `npm run smoke:profile-feedback -- --workspace-id <workspace> --learner-id <learner> --target-node-id <nodeId> --json` for the fail-closed selector-discovery path when no completed-cycle selector exists;
- `npm run smoke:profile-feedback -- --workspace-id <workspace> --learner-id <learner> --target-node-id <nodeId> --auto-select-latest-completed-cycle --json` only for an explicit release-evidence collection path that should use the most recent real completed cycle from read-only history discovery;
- `npm run smoke:daily-loop -- --operation draft --allow-write --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:daily-loop -- --operation publish --allow-write --plan-draft-id <planDraftId> --item-id <itemId> --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:operating-loop -- --operation run-next --allow-write --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- central Home AI embedded-plugin visual harness before production release.

### P2: Owner Audit And Correction UI

Goal: Owner can explain and correct the completed card cycle.

Required behavior:

- render plan reason, evidence basis, publish attempt state, generated card
  link, evaluation summary, evidence ledger ids, Profile V2, profile delta,
  stale-evidence changes, correction history, and next recommendation;
- render older-cycle history by selecting from
  `learning-cycle-history-service` rows, then drilling into audit and
  completeness through returned selectors;
- add bounded Owner corrections through
  `learning-owner-correction-service`;
- show audit completeness status for later proposal/scheduling input;
- never expose raw learner answers, transcripts, prompts, raw model output,
  source bodies, private paths, credentials, or provider configuration.

Required harness:

- `tests/learning-cycle-audit-service.test.js`;
- `tests/learning-cycle-history-service.test.js`;
- `tests/learning-audit-completeness-service.test.js`;
- `tests/learning-profile-delta-audit-service.test.js`;
- `tests/learning-evidence-audit-service.test.js`;
- `tests/learning-plan-audit-service.test.js`;
- `tests/learning-owner-correction-service.test.js`;
- `tests/learning-profile-feedback-evidence-service.test.js`;
- `tests/growth-cycle-history-smoke-script.test.js`;
- `tests/growth-owner-audit-smoke-script.test.js`;
- `npm run smoke:cycle-history` for selectable historical-cycle readback;
- `npm run smoke:owner-audit` for local or production service-graph evidence;
- `npm run smoke:profile-feedback` for completed-cycle profile/evidence
  feedback readback;
- `tests/growth-routes.test.js`;
- `tests/growth-frontend-adapter.test.js` for browser history selection,
  selected-cycle audit payloads, Home AI proxy routing, visible progress/errors,
  and UI privacy projection;
- central visual evidence before production UI release.

### P3: Stage Checkpoint Loop

Goal: formal assessments update profile confidence without becoming daily
pressure.

Required behavior:

- planner may suggest stage checkpoints;
- Owner sees readiness, coverage nodes, cooldown, and activation controls;
- activation happens only through `learning-stage-assessment-service`;
- direct formal publication from daily plan publish remains blocked.

Required harness:

- `tests/learning-stage-assessment-service.test.js`;
- planner validation/publisher blocking tests;
- `tests/growth-routes.test.js`;
- central visual harness for assessment controls.

### P4: Multi-Workspace And Domain-Pack Generalization

Goal: the same loop works for any visible and provisioned learner/domain.

Required behavior:

- Owner can select authorized targets;
- non-sample learners are blocked until explicit provisions exist;
- target learner workspace owns plan, card, evidence, profile, and audit rows;
- actor workspace remains only the actor context;
- graph nodes must belong to the selected provisioned graph context.

Required harness:

- cross-workspace allow/deny route tests;
- target-switch UI tests;
- no-data-mixing architecture guard;
- non-sample provisioned vertical in
  `tests/learning-card-ai-loop-harness.test.js`.

### P5: Supervised Automation Proposal Review

Goal: Growth can reduce repetition by proposing a next action while keeping
Owner publication explicit.

Required behavior:

- proposal requires a completed source cycle id;
- audit completeness and target provisioning pass before any new plan draft;
- proposal stores summary-only source ids, plan draft id, selected item,
  target nodes, rationale, and policy;
- Owner can accept, skip, expire, or supersede;
- accepted proposal publication delegates only to
  `learning-plan-publisher-service.publishPlanItem`;
- execution metadata remains visible and idempotent after success.

Required harness:

- `tests/learning-automation-proposal-repository.test.js`;
- `tests/learning-automation-proposal-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`;
- UI proposal review tests for selected-cycle create/list/decision/
  accepted-publish, terminal `expired`/`superseded` decisions, blocked-action
  feedback, and downstream automation readback refresh before product rollout.

### P6: Automation Digest, Rollback, And Failure Policy

Goal: scheduling candidates are proven and reviewable before any writeful
automation exists.

Required behavior:

- scheduler dry-run remains read-only and non-writeful;
- `npm run smoke:scheduler-dry-run` delegates to
  `learning-automation-scheduler-service.dryRun` through the normal service
  graph and provides no-write local or production dry-run evidence;
- automation digest persists summary-only dry-run packets and Owner review
  metadata;
- rollback/failure policy defines what happens for partial publish attempts,
  proposal execution failures, notification handoff failures, and retry
  eligibility;
- digest review does not publish, enqueue, notify, or authorize automatic
  execution by itself;
- failures are visible and bounded for Owner retry or review.

Required harness:

- `tests/learning-automation-scheduler-service.test.js`;
- `tests/growth-scheduler-dry-run-smoke-script.test.js`;
- `tests/learning-automation-digest-repository.test.js`;
- `tests/learning-automation-digest-service.test.js`;
- `tests/learning-automation-failure-policy-repository.test.js`;
- `tests/learning-automation-failure-policy-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard for no Gateway, publication, card generation, proposal
  execution writes, notification, Action Inbox, stage activation, or direct
  table access from scheduler/digest/failure-policy services.

### P7: Notification And Action Inbox Handoff

Goal: Owner can be notified of proposed or blocked actions through Home AI
platform surfaces without moving learning policy into Home AI.

Required behavior:

- Growth emits bounded action metadata only after digest/failure policy gates;
- Home AI owns Action Inbox/Web Push delivery, permissions, and platform
  channel state;
- Growth does not expose raw learner content or model payloads in action
  notifications;
- failed notification delivery does not publish cards or mutate learner state.

Required harness:

- `tests/learning-automation-action-handoff-repository.test.js`;
- `tests/learning-automation-action-handoff-service.test.js`;
- `tests/growth-event-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`;
- Home AI Action Inbox/Web Push contract tests in the platform workspace;
- failure tests for dropped or rejected notifications.

### P8: Owner-Explicit Scheduler Execution

Goal: controlled execution can perform one allowed action only after all
previous review, rollback, handoff, and dry-run gates are rechecked. This is
not a background scheduler and not production auto-scheduling enablement.

Implemented backend behavior:

- `learning-automation-scheduler-execution-service` supports only
  `owner_explicit_once`;
- `learning_growth_automation_scheduler_executions` stores summary-only
  `started`, `published`, `failed`, `blocked`, or `skipped` execution audit
  rows;
- `GET /api/v1/growth/automation/scheduler/executions` lists bounded
  execution DTOs after visible-target scope;
- Owner-only `POST /api/v1/growth/automation/scheduler/execute-once` delegates
  to the execution service;
- `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` defaults to false, and the
  disabled path records a blocked execution without publishing.

Required behavior before production enablement:

- execution consumes reviewed policy/digest/action records;
- every write path rechecks target visibility, target provisioning, source
  cycle completeness through dry-run, proposal status, delivered handoff,
  reviewed digest, and active failure policy at execution time;
- writeful publish delegates only to the existing accepted-proposal publish
  service boundary;
- no direct Gateway, direct card-generation repository writes, or direct
  stage-assessment activation from execution code;
- every execution writes bounded success/failure metadata and remains
  Owner-auditable.
- no background worker or automatic publication is enabled until UI, platform
  action evidence, visual evidence, production dry-run evidence, and explicit
  release config exist.

Required harness:

- `tests/learning-automation-scheduler-execution-repository.test.js`;
- `tests/learning-automation-scheduler-execution-service.test.js`;
- scheduler dry-run service tests;
- route tests in `tests/growth-routes.test.js`;
- disabled-config, failed-publish, idempotency, and privacy tests;
- action handoff/digest/failure-policy gate tests;
- architecture guard;
- production dry-run evidence before enabling writeful mode.

### P9: Background Scheduler Contract

Goal: define the supervised scheduler tick, local worker/lease mechanics, and
any later unattended production worker without letting automation bypass Owner
audit or existing execution gates.

Implemented backend behavior:

- `learning-automation-scheduler-run-service` supports only
  `background_supervised_tick` for the initial controlled tick;
- `learning_growth_automation_scheduler_runs` stores summary-only
  `started`, `completed`, `partial`, `failed`, `blocked`, or `skipped` run
  audit rows;
- `GET /api/v1/growth/automation/scheduler/runs` lists bounded run DTOs after
  visible-target scope;
- Owner-only `POST /api/v1/growth/automation/scheduler/run-once` delegates to
  the scheduler run service;
- `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` defaults to false, and the
  disabled path records a blocked run without listing handoffs or executing
  actions;
- focused repository, service, route, and architecture harnesses cover
  disabled config, invalid mode, stable run id/final-state updates, no
  delivered actions, delegation to execution, partial downstream execution,
  domain/horizon list filters, privacy rejection, and migration.
- `learning-automation-scheduler-worker-service` is implemented as a
  default-disabled local timer/lease boundary;
- `learning_growth_automation_scheduler_worker_leases` stores summary-only
  lease claim/release state for configured worker targets;
- `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED` defaults to false, so the HTTP
  server does not start the worker timer unless explicitly configured;
- the worker calls only
  `learning-automation-scheduler-run-service.runOnce`; if
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` remains false, the run
  service records a blocked run and no delivered handoffs are listed.
- `learning-automation-scheduler-worker-target-service` and
  `learning_growth_automation_scheduler_worker_targets` provide the reviewed
  target configuration layer for future workers;
- worker target routes support visible-target listing, Owner-only creation of
  `proposed` summary-only targets after provisioning passes, and Owner-only
  review to `enabled`, `disabled`, or `archived`;
- the worker prefers reviewed enabled persistent targets before the local
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` fallback.
- the P5-P9 automation repository chain rejects private path/token-looking
  values as well as privacy-risk field names before writing summary-only
  automation evidence into SQLite: proposal, digest, failure policy, action
  handoff, scheduler execution, scheduler run, worker target, and worker
  lease records.

Required behavior before production enablement:

- scheduler ticks inspect only delivered action handoffs that already passed
  digest review and active failure-policy gates;
- each candidate delegates only to
  `learning-automation-scheduler-execution-service.executeOnce`;
- the execution service still rechecks delivered handoff, reviewed digest,
  active policy, matching dry-run candidate, accepted proposal, Owner/writeful
  config, and visible target before publishing;
- no direct Gateway, direct plan publication, direct card generation, direct
  stage-assessment activation, Action Inbox calls, queues, or raw SQLite table
  access from scheduler run code;
- unattended production background scheduling remains a separate release stage
  after UI, platform action evidence, visual evidence, production dry-run
  evidence, reviewed enabled worker targets, and explicit config are complete.

Required harness:

- `tests/learning-automation-scheduler-run-repository.test.js`;
- `tests/learning-automation-scheduler-run-service.test.js`;
- `tests/learning-automation-scheduler-worker-lease-repository.test.js`;
- `tests/learning-automation-scheduler-worker-target-repository.test.js`;
- `tests/learning-automation-scheduler-worker-service.test.js`;
- `tests/learning-automation-scheduler-worker-target-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- disabled-config, invalid-mode, no-delivered-actions, partial-execution,
  idempotency, reviewed-target create/review/list, lease/race, and privacy
  tests, including repository-level private path/token-looking value rejection
  for the full P5-P9 automation repository chain: proposal, digest, failure
  policy, action handoff, scheduler execution, scheduler run, worker target,
  and worker lease records;
- architecture guard;
- docs-locality checks;
- production dry-run and central visual evidence before any production worker.

### P10: Release-Readiness Evidence Snapshot

Goal: make production-readiness evidence explicit without enabling execution,
scheduler ticks, or unattended workers.

Implemented backend shape:

- `learning-automation-release-readiness-service` evaluates the release review
  checklist from summary-only service DTOs, config flags, scheduler dry-run
  evidence, external evidence keys, and persisted release approval records; it
  also derives a summary-only remediation plan in `releaseReview` with
  `missingCheckKeys`, `blockedCheckKeys`, `missingEvidenceKeys`,
  `requiredActionCount`, `requiredActions`, and `nextAction`;
- `learning-automation-release-approval-service` records and lists
  summary-only approvals for individual writeful config gates and projects
  active approvals back into release-readiness input; both the service and
  SQLite repository reject privacy-risk keys plus private path/token-looking
  values before approval records can become persisted release evidence;
- `learning-automation-release-evidence-service` records and lists
  summary-only release evidence records for canonical release-readiness evidence
  keys and projects active pass records back into release-readiness input before
  one-off CLI/query evidence is evaluated. Pass UI evidence records must be
  revalidated through `learning-automation-ui-evidence-service` before
  persistence, including records proposed by release evidence collection;
- `learning-automation-platform-action-evidence-service` reads only Growth
  event-outbox delivered `growth.automation.action_required` receipts and
  emits summary-only `growth.learningAutomationPlatformActionEvidence.v1`
  release evidence; Home AI still owns Action Inbox and Web Push internals;
- `automation-release-approvals.js` persists summary-only approval records in
  `learning_growth_automation_release_approvals`;
- `automation-release-evidence.js` persists summary-only release evidence
  records in `learning_growth_automation_release_evidence`;
- `automation-release-readiness.js` persists summary-only snapshots in
  `learning_growth_automation_release_readiness`;
- visible-target scoped `GET /api/v1/growth/automation/release-readiness`
  returns an advisory readiness DTO;
- visible-target scoped
  `GET /api/v1/growth/automation/release-readiness/snapshots` lists public
  snapshot DTOs;
- Owner-only
  `POST /api/v1/growth/automation/release-readiness/snapshots` creates
  summary-only review snapshots;
- visible-target scoped
  `GET /api/v1/growth/automation/release-approvals` lists public approval
  DTOs;
- Owner-only
  `POST /api/v1/growth/automation/release-approvals` records one summary-only
  approval for a canonical writeful config gate;
- visible-target scoped `GET /api/v1/growth/automation/release-evidence`
  lists public release evidence DTOs;
- Owner-only `POST /api/v1/growth/automation/release-evidence` records one
  summary-only evidence record for a canonical readiness evidence/check key;
- `npm run smoke:release-readiness` evaluates the same service from the CLI.
  It is no-write by default and creates a snapshot only when
  `--write-snapshot` is supplied.
- `npm run smoke:release-evidence` defaults to read-only list/bag, requires
  explicit `--allow-write` for record, and delegates only to
  `learning-automation-release-evidence-service`.
- `npm run smoke:release-evidence-bundle` delegates to
  `learning-automation-release-evidence-bundle-service` and builds a
  summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` artifact
  from selected no-write/default-disabled smoke CLIs, including read-only
  cycle-history readback, read-only Owner audit readback, read-only
  profile-feedback evidence, read-only recommendation-lifecycle readback,
  learner-cycle audit, target-provisioning readback, stage-assessment
  readiness, proposal smoke, platform action evidence, read-only release
  approval bag projection, and
  backend Owner automation review evidence from
  `npm run smoke:owner-review-evidence` in the default task set. It maps
  `npm run smoke:release-approval -- --operation bag` into the bundle
  `releaseApproval` field so persisted approvals can flow into
  release-readiness without hand-spliced JSON. Use `--target-node-id` when
  collecting stage-checkpoint evidence. The default `owner_audit` task maps
  no-write `npm run smoke:owner-audit` output to
  `productionOwnerAuditSmokeEvidence`. The default `profile_feedback` task
  maps no-write completed-cycle feedback readback to
  `productionProfileFeedbackSmokeEvidence`. When release collection explicitly
  enables completed-cycle auto-selection, the bundle forwards
  `--auto-select-completed-cycle` or `--auto-select-latest-completed-cycle`
  only to the `profile_feedback` task and records the selected cycle id/task
  card id in bounded summary fields. The default
  `recommendation_lifecycle` task delegates to
  `npm run smoke:recommendation-lifecycle`, maps to
  `productionRecommendationLifecycleSmokeEvidence`, and proves pending,
  accepted, and superseded next-card recommendations can be read from
  persisted trajectories without Gateway calls or writes. The default
  `learner_cycle` task
  allows only no-write `audit` and maps to
  `productionLearnerCycleSmokeEvidence`; use direct
  `npm run smoke:learner-cycle` for any Owner-requested write operation
  because learner submissions/reflections must not pass through the bundle.
  The default `target_provisioning` task delegates to
  `npm run smoke:target-provisioning`, maps to
  `productionTargetProvisioningSmokeEvidence`, and proves the selected visible
  learner/domain-pack/subject/node can resolve without writing a provision.
  The default `platform_action` task maps
  `npm run smoke:platform-action-evidence` output to `platformActionEvidence`
  from delivered Growth outbox receipts. A passing summary must prove both an
  Action Inbox item id and a bounded Web Push `sent > 0` receipt from the Home
  AI notification response, without reading Home AI internal Action Inbox/Web
  Push storage or storing push endpoints.
  The default `central_visual` task maps
  `npm run smoke:central-visual-evidence` output to `centralVisualEvidence`
  from a supplied Home AI central visual harness artifact without starting
  Appium or running `npm run ios:pwa:visual` inside Growth. The release bundle
  records only bounded visual summary fields and file-presence metadata, not
  raw local artifact paths. The `centralVisualEvidence` task evidence keeps the
  central visual smoke schema when provided, and otherwise still keeps the
  bundle task-evidence summary-only wrapper so readiness can distinguish a
  passing visual artifact from a blocked one without reading raw screenshots.
  The validator and bundle projection accept the current Home AI artifact shape,
  including object-shaped `screenshot.path`, `metrics.clientVersion`,
  `finishedAt` / `startedAt`, and lane port summary fields. The persisted
  release evidence record keeps only bounded `visualEvidence` fields such as
  screenshot artifact file name, client version, assertion counts, and
  `centralBoundary` flags; it never stores raw local paths or Home AI visual
  internals.
  Release workbench and artifact-template readback must preserve the full
  bounded missing evidence/check key set before deriving collection tasks and
  Home AI artifact slots. They must not apply a compact UI preview limit that
  can drop later gates such as `central_visual_evidence` on real release scopes.
  The `weixin_stephen/science` readback now proves this with
  `artifactSlotCount=10`, including `central_visual`,
  `centralVisualEvidenceFile`, and the UI artifact slots. Central visual pass
  evidence is scope-strict: an Owner/testing-scope record does not satisfy a
  workspace/domain-scoped release. Replaying the validated central visual
  summary artifact under `workspaceId=weixin_stephen`, `domain=science`, and
  `subject=science` wrote `centralVisualEvidence` record
  `lgarev_520d91fed2dd889df3`; readiness for that scope now reports
  `central_visual_evidence=pass` while remaining incomplete for the other
  release gates.
  The explicit non-default `release_package_review_ui` task maps
  `npm run smoke:ui-evidence` output to `releasePackageReviewUiEvidence`.
  It is selected only when the caller supplies that task and a summary
  UI/visual artifact such as
  `--release-package-review-ui-evidence-file <artifact>`. The bundle preserves
  only bounded validator fields, records file presence without the raw path,
  and does not run the Home AI visual harness or persist release evidence by
  itself.
  The bundle, release package, release evidence collection, and release
  workbench action CLIs also accept
  `--release-evidence-artifact-manifest-file <manifest.json>`. That manifest
  is read only by Growth and may map `centralVisualEvidenceFile` plus UI
  artifacts keyed by registered `taskId`, `evidenceKey`, `checkKey`, or
  `uiGate` into the existing transient file inputs. The manifest path is
  stripped immediately after parsing, mapped UI tasks are added as
  `artifactTaskIds`, unknown artifact keys fail closed, and no manifest path or
  raw artifact path is exposed in public bundle/collection/action output. This
  is an operator convenience over Home AI-produced summary artifacts; it does
  not start visual tooling, bypass UI validation, or persist release evidence.
  Growth also exposes a visible-target scoped no-write artifact-template API,
  `GET /api/v1/growth/automation/release-artifact-template`, plus
  `npm run smoke:release-artifact-template`, both backed by
  `learning-automation-release-evidence-artifact-template-service`. It reads the
  release workbench summary through the normal service graph and emits only the
  missing central-visual/UI artifact slots plus a blank
  `growth.learningAutomationReleaseEvidenceArtifactManifest.v1` template that
  Owner/release tooling can fill with Home AI central visual-toolchain summary
  artifacts. It now also returns
  `growth.learningAutomationReleaseEvidenceChecklist.v1`, a summary-only
  checklist that separates Home AI visual/UI artifact slots, supported
  release-evidence collection tasks, write-gated evidence tasks, missing
  approvals, missing record actions, and unsupported/manual evidence keys so
  Owner/release tooling can plan the remaining real evidence without Codex
  hand-splicing DTOs. The same readback includes
  `growth.learningAutomationReleaseEvidenceActionPlan.v1`, a summary-only
  action-plan projection with Owner-safe `POST
  /api/v1/growth/automation/release-workbench/actions` body templates for
  collection, approval, package, activation, or runtime-audit steps plus
  external artifact, internal state-prerequisite, and manual steps. Collection
  body templates list only
  non-artifact tasks; blank `artifactManifest` templates are included only for
  later filling by Home AI central visual/UI tooling and are not executable
  evidence. The action plan is phase-gated: while artifact, collection,
  write-gated evidence, state prerequisite, or unsupported/manual checklist
  items remain, downstream approval and release-record actions stay visible but
  return `readyToSubmit=false`, `blockingReason`, and
  `blockedByChecklistItemKeys`; after evidence prerequisites clear, missing
  approval actions can become the next submittable action while record actions
  remain approval-blocked. The route performs only target-scope normalization and delegates to
  the service; the template service does not run visual tooling, widen to
  default collection tasks when no visual/UI evidence is missing, persist
  release evidence, call Gateway, inspect SQLite directly, or expose local
  artifact paths. The Owner workbench action HTTP route accepts an inline
  `artifactManifest` / `releaseEvidenceArtifactManifest` summary body for the
  same artifact slots, strips it after parsing, expands only whitelisted central
  visual/UI task selectors into transient collection inputs, and deliberately
  keeps server-local manifest file reads as CLI/operator glue only.
  The embedded Owner generation tab now consumes this same no-write readback
  through the release workbench panel: it fetches
  `GET /api/v1/growth/automation/release-artifact-template`, shows artifact
  slots, checklist items, action-plan rows, manifest schema status, and a
  refresh control, and refreshes it whenever release workbench state refreshes.
  The same embedded panel now also reads
  `GET /api/v1/growth/automation/release-workbench/action-audits` and renders a
  summary-only `操作审计` list for recent workbench wrapper action audit rows.
  It exposes only bounded ids/statuses/endpoint/action summaries from the
  service DTO and does not expose raw request bodies, delegated `writeResult`
  payloads, local artifact paths, release storage internals, or release
  permission.
  It also consumes the existing no-write release controls, dashboard,
  inventory, review, authorization, closure, preflight, activation, and runtime
  enablement read routes as a summary-only `发布总览` panel. The browser batches
  those reads only to display bounded status and next-action summaries. It does
  not record release decisions, package rows, preflight reports, activation or
  runtime enablement rows, mutate runtime config, grant release permission, or
  grant scheduler permission.
  The same embedded panel now also reads existing persisted release evidence
  and release approval list routes as a read-only `证据账本` panel:
  `GET /api/v1/growth/automation/release-evidence` and
  `GET /api/v1/growth/automation/release-approvals`. It displays only public
  summary DTO rows, counts, keys, statuses, and timestamps. It does not record
  release evidence, create approvals, run evidence collection, inspect SQLite
  or release storage directly, call Gateway, mutate runtime config, grant
  release permission, or grant scheduler permission.
  As of the 2026-06-18 central visual closure, a real Home AI
  `embedded-plugin-shell --plugin-id growth` harness artifact has been validated
  and persisted locally as `centralVisualEvidence=pass` plus
  `releaseEvidenceBundleAudit=pass` through the existing release-evidence
  collection path. That improves release evidence readback but does not make the
  overall release ready: remaining UI evidence, platform Action Inbox/Web Push
  evidence, production smokes, explicit approvals, package/review/authorization
  closure, preflight, activation/runtime enablement, deployment, and final broad
  gates are still required.
  A separate embedded `发布记录` subpanel now consumes the existing
  preflight-report, activation-record, and runtime-enablement list routes and
  can call their existing Owner-only record routes with summary-only
  service-owned payloads. That panel is an explicit audit writer only: it
  records bounded Owner intent/readback for preflight, activation, and runtime
  enablement, but it does not run evidence collection, approve releases, apply
  runtime config, grant scheduler permission, deploy, call Gateway, or mutate
  learner state.
  The browser still does not read server-local artifact files, run Home AI
  visual tooling, validate UI artifacts, persist release evidence, grant
  approval, or enable scheduling.
  The explicit non-default `release_workbench` task maps
  `npm run smoke:release-workbench` output into
  `releaseWorkbenchSmokeEvidence` so release-readiness can verify the final
  Owner action-template read model without Codex hand-spliced DTOs. A passing
  workbench task means bounded read routes, Owner record-route templates,
  missing-key summaries, supported release-evidence collection task ids, and
  next action were collected; it is not release approval, runtime config
  enablement, scheduler permission, package recording, or deployment. The
  workbench may make `collect_missing_release_evidence` the next action after a
  collection-run already exists only when supported missing evidence still
  remains, and that action must still go through the existing Owner workbench
  action facade plus release-evidence collection service. The legacy
  `--release-workbench-evidence` readiness flag is a
  blocked remediation marker only; valid workbench evidence must come from the
  workbench smoke output through explicit evidence JSON, the release bundle, or
  a persisted release-evidence record projection. The same rule now applies to
  the other service-owned smoke/readback evidence flags: stage checkpoint,
  proposal, scheduler, planner, target-provisioning, daily-loop,
  learning-loop-state, cycle-history, Owner audit, profile-feedback,
  recommendation lifecycle, learner-cycle, scheduler dry-run, release-bundle
  audit, platform action, central visual, and Owner review boolean flags are
  deprecated remediation inputs only and cannot fabricate passing evidence.
  The default `owner_review_evidence` task maps
  `npm run smoke:owner-review-evidence` output to `ownerReviewEvidence`.
  A passing owner-review task means the backend summary-only Owner automation
  evidence read model was collected, including proposal lifecycle counts for
  `proposed`, `accepted`, `skipped`, `expired`, `superseded`, owner-decision,
  and proposal execution statuses, plus downstream digest, action-handoff,
  scheduler execution, scheduler run, worker-target, and failure-policy stage
  counts. It is not proposal/digest/action UI evidence and is not mobile visual
  evidence.
  Release-readiness now preserves those bounded counters in
  `evidenceReadback.items[].ownerReviewStageSummary` for the
  `ownerReviewEvidence` item. That readback improves release audit visibility
  only; it also preserves bounded `passedGateKeys`, `missingGateKeys`,
  `passedGateCount`, `missingGateCount`, `requiredActionCount`, and
  `nextAction` so Owner tooling can see the next remediation step without
  inspecting raw dependency rows. It does not add a new pass gate, approve
  release, enable scheduling, or publish cards. Release controls, inventory,
  dashboard, and package dashboard summaries may carry only that compact
  stage-summary object so release tooling can inspect stage counts, gate keys,
  and next action without expanding the full evidence item catalog or raw
  dependency ids.
  Use `--task daily_loop_write
  --allow-write-evidence --daily-loop-write-operation draft|publish|advance` only when
  intentionally collecting controlled production daily-loop write evidence;
  the task is outside the default bundle, fails closed without that explicit
  flag, requires `--plan-draft-id` for publish, and delegates through
  `scripts/smoke-growth-daily-loop.js` rather than importing daily-loop
  services. Use `--output-file` and then pass that file to
  `npm run smoke:release-readiness -- --evidence-bundle-file <path>` when
  release review needs structured smoke evidence without Codex hand-spliced
  JSON.
- `npm run smoke:release-evidence-bundle-audit` delegates to
  `learning-automation-release-evidence-bundle-audit-service` and validates a
  previously generated `growth.learningAutomationReleaseEvidenceBundle.v1`
  artifact before release-readiness treats the bundle as complete release
  evidence. The audit checks schema, `summary_only`, default task coverage,
  pass counts, required evidence keys, privacy-risk keys, and private
  path/value leaks, then emits
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1` as external
  `releaseEvidenceBundleAudit` input. It does not run smoke tasks or embed
  itself into the bundle being audited.
- `npm run smoke:release-evidence-collection` delegates to
  `learning-automation-release-evidence-collection-service` and runs one
  explicit release evidence collection pass through the normal service graph.
  It builds the release evidence bundle, audits that bundle, evaluates
  release-readiness, and evaluates a collection-run readback into
  `growth.learningAutomationReleaseEvidenceCollection.v1`. It defaults to
  no-write; `--write-collection-run --allow-write` may persist only the
  existing collection-run audit row, while
  `--write-release-evidence-records --allow-write` may persist only canonical
  pass bundle evidence plus `releaseEvidenceBundleAudit` through
  `learning-automation-release-evidence-service`. UI evidence from the bundle
  remains validator-gated after collection compaction; the collection service
  must preserve only summary validator fields, not raw screenshots or private
  artifact paths. The explicit `release_package_review_ui` bundle task can be
  supplied with `--release-package-review-ui-evidence-file`; collection treats
  that file path as transient input, strips it from public artifacts, and
  persists a pass record only after the release-evidence service revalidates
  the compact UI summary. For multi-artifact release collection, the same
  transient mapping can come from
  `--release-evidence-artifact-manifest-file <manifest.json>`; manifest-derived
  UI tasks are added to the bundle task set and required collection tasks
  without replacing the normal backend evidence tasks. The Owner-only
  `POST /api/v1/growth/automation/release-evidence-collections/run` route
  exposes the same boundary from the plugin API. This facade is useful when
  Owner/release tooling needs a structured collection pass without building or
  recording a release package, and it must not record package rows, record
  release decisions, flip runtime config, grant scheduler permission, deploy,
  publish, generate, evaluate submissions, or mutate learner state.
- `learning-automation-release-workbench-service` derives
  `releaseEvidenceCollectionSupportedTaskIds` from missing evidence/check keys.
  When inventory still lacks `release_collection_run`, the advertised action is
  the existing collection-run remediation path. When a collection-run record is
  already present but supported release evidence remains missing, the workbench
  can surface `collect_missing_release_evidence` as the next Owner action over
  the same `release_evidence_collection` endpoint. Unsupported manual/UI gaps
  and write-gated tasks remain visible as separate readback fields and are not
  silently included in the normal Owner action.
- `npm run smoke:release-collection-run` delegates to
  `learning-automation-release-collection-run-service` and records a
  summary-only audit of one completed release evidence collection pass after a
  bundle, bundle audit, and readiness result exist. The CLI defaults to
  no-write evaluation, accepts explicit bundle/audit/readiness JSON or file
  artifacts, strips artifact paths to file names, and writes
  `learning_growth_automation_release_collection_runs` only with
  `--write-record`. The service/repository expose
  `growth.learningAutomationReleaseCollectionRun.v1` DTOs through
  visible-target scoped list and Owner-only create routes. This record is
  evidence for review, not a release switch or scheduler permission.
- `npm run smoke:release-package` delegates to
  `learning-automation-release-package-service` and creates one summary-only
  `growth.learningAutomationReleasePackage.v1` release review artifact. It
  composes the release evidence bundle builder, bundle audit, release-readiness
  evaluation, collection-run evaluation, release-controls readback, and
  release-dashboard readback through injected services. It defaults to
  no-write. The only write it can request is
  the existing collection-run audit record with both `--write-collection-run`
  and `--allow-write`, or a summarized package audit record with both
  `--write-package-record` and `--allow-write`; if a requested record boundary
  is not available, the package fails closed. Package records are stored in
  `learning_growth_automation_release_packages` through
  `automation-release-packages.js` and contain only bounded package, step,
  bundle/audit/readiness/collection-run/controls/dashboard summaries. The
  repository migrates `release_dashboard_summary_json` for persisted dashboard
  readback. Package artifacts and persisted package rows also project latest
  preflight report id/status/advisory readiness flags from release-controls and
  release-dashboard readbacks into package top-level summary, step summary, and
  controls/dashboard package-record summaries. Release review, controls,
  inventory, and dashboard readbacks expose only bounded latest-package
  dashboard summary fields (`status`,
  `nextAction.key`, `requiredActionCount`, `stepCount`,
  readiness-evidence present/missing counts, source bundle id, latest readiness
  snapshot id, latest snapshot evidence counts, compact Owner review
  stage-summary counters when present, persisted evidence keys, and
  package-dashboard preflight report id/status/advisory readiness flags)
  instead of raw package artifacts. Visible-target scoped
  `GET /api/v1/growth/automation/release-packages` lists those records;
  Owner-only `POST /api/v1/growth/automation/release-packages/build` defaults
  to no-write but can persist the collection-run row and/or package audit row
  only when explicit write flags are supplied. The Owner workbench
  `release_package` action still records an existing package artifact by default;
  when Owner tooling explicitly sends `buildReleasePackage` /
  `build_and_record_package`, the action facade delegates to this same package
  service with package-record write authorization instead of building packages
  inside the facade;
  Owner-only `POST /api/v1/growth/automation/release-packages` records an
  existing summary-only package artifact only and does not run smoke tasks. The
  package is not release approval, runtime config enablement, scheduler
  permission, production deployment, or card publication.
- `npm run smoke:release-decision` delegates to
  `learning-automation-release-decision-service` and records a summary-only
  Owner release decision after a collection run exists. The CLI defaults to
  no-write evaluation, accepts a collection run id or summary-only
  collection-run JSON/file artifact, and writes
  `learning_growth_automation_release_decisions` only with explicit
  `--allow-write` / `--write-record`. `approved` requires a ready
  collection run. `blocked` and `needs_evidence` can persist bounded review
  state. The decision remains advisory evidence only:
  `advisoryOnly=true`, `runtimeConfigChange=false`, and
  `writefulSchedulingAllowed=false`.
- `npm run smoke:release-review` delegates to
  `learning-automation-release-review-service.review` and returns a no-write
  `growth.learningAutomationReleaseReview.v1` readback for Owner release
  controls. It composes current release-readiness, latest collection run,
  latest release decision, latest persisted release-package audit record, and
  release approval bag through existing services. After an approved release
  decision, package record readback is a backend release gate:
  `packageRecordStatus=ready_for_release_review` is required before review can
  become `approved`; `missing`, `readback_unavailable`, `blocked`, or other
  non-ready package statuses surface package-specific remediation actions and
  block authorization. When the package record contains
  `releaseDashboardSummary`, review also returns `packageReadback` and
  `releaseReview.latestPackageDashboard*` summary fields, including bounded
  readiness-evidence readback counts/source ids, for controls and UI readback.
  It does not write repositories or tables, run smoke tasks, call
  Gateway, publish, generate, evaluate, schedule, notify, activate stage
  assessments, mutate learner state, or flip runtime config.
- `npm run smoke:release-authorization` delegates to
  `learning-automation-release-authorization-service.authorize` and returns a
  no-write `growth.learningAutomationReleaseAuthorization.v1` readback for the
  final writeful-execution gate. It reads release-review through the owning
  service, requires approved review, ready collection run, approved decision,
  and active `writefulExecutionApproval`, and now preserves bounded
  `packageReadback`, `latestPackage.stepSummary.stepCount`, and
  `latestPackage.releaseDashboardSummary`, including readiness-evidence
  readback counts/source ids, for Owner/audit readback. A matching
  readable package audit record must be `ready_for_release_review`; package
  dashboard status remains readback only and is not an additional
  authorization condition. It does not write repositories or tables, run smoke
  tasks, call Gateway, publish, generate, evaluate, schedule, notify, activate
  stage assessments, mutate learner state, or flip runtime config.
- `npm run smoke:release-closure` delegates to
  `learning-automation-release-closure-service.summarize` and returns a
  no-write `growth.learningAutomationReleaseClosure.v1` readback for Owner
  release closure. It composes release-review plus release-authorization
  summaries, exposes package-record readback status, `latestPackage`,
  `packageReadback`, package dashboard summary fields including
  readiness-evidence readback counts/source ids, `backendEvidenceComplete`,
  `readyForOwnerReleaseActivation`, missing check/evidence/approval keys,
  required actions, and one next action. It does not write repositories or
  tables, run smoke tasks, call Gateway, publish, generate, evaluate, schedule,
  notify, activate stage assessments, mutate learner state, or flip runtime
  config.
- `npm run smoke:release-preflight` delegates to
  `learning-automation-release-preflight-service.evaluate` by default and
  returns a no-write `growth.learningAutomationReleasePreflight.v1` readback
  for final backend release review. It composes release-dashboard,
  release-workbench, and release-closure summaries, can list persisted preflight
  reports, and can write a summary-only
  `learning_growth_automation_release_preflight_reports` row only with
  `--operation record --allow-write`, the Owner-only HTTP route, or the
  Owner-only `release_preflight` workbench action facade. The release workbench
  advertises the preflight read/report routes plus a `release_preflight`
  record-route template, and offers `record_release_preflight` before
  activation/runtime actions once evidence, approval, collection-run, decision,
  and package blockers are clear. It keeps
  `readyForProductionDeploy=false`; `readyForProductionDeployReview` and
  `readyForOwnerReleaseActivation` remain advisory evidence and do not replace
  Home AI central visual, deployment, or runtime-config gates. Persisted
  preflight reports are read by release inventory through the injected
  preflight report repository and projected by release dashboard through
  inventory as bounded latest report id/status/advisory readiness flags.
  Release activation can persist bounded preflight report readback in activation
  records; runtime enablement projects it only from those activation records;
  release controls and release workbench then carry only the resulting bounded
  summary fields from activation/runtime, inventory, dashboard, and controls
  DTOs. That downstream readback is not a new preflight writer and not a deploy
  switch. It does not run smoke tasks internally, call Gateway, publish,
  generate, evaluate, schedule, notify, activate stage assessments, mutate
  learner state, flip runtime config, grant scheduler permission, or deploy.
- `npm run smoke:release-activation` delegates to
  `learning-automation-release-activation-service.preflight` by default and
  returns a no-write `growth.learningAutomationReleaseActivation.v1` preflight
  for Owner runtime-config enablement decisions after release closure. It maps
  selected activation gates (`writeful_execution`, `background_scheduler`,
  `background_worker`) to approval keys/config keys/env names, reports current
  config state, missing approvals, `preflightPassed`,
  `readyForOwnerRuntimeConfigDecision`, required actions, latest persisted
  preflight report id/status/advisory readiness flags, and one next action.
  `--operation list` reads existing activation audit rows, and
  `--operation record --allow-write` records summary-only Owner activation
  intent through `learning-automation-release-activation-service.recordActivation`
  and `automation-release-activations.js`. Activation reads preflight report
  state only from the injected preflight report repository, stores only bounded
  readback in `activationPreflight`, and does not write preflight reports. It
  does not run smoke tasks, call Gateway, publish, generate, evaluate,
  schedule, notify, activate stage assessments, mutate learner state, or flip
  runtime config. It always keeps `configChangeApplied=false`,
  `writefulSchedulingAllowed=false`, and `runtimeConfigChange=false`. The
  activation row is not a permission grant, but when writeful execution is
  separately enabled the scheduler execution service must read back a valid
  summary-only `writeful_execution` activation record before it can delegate
  publication.
  Release review, authorization, closure, and activation readbacks must scan
  public inputs, dependency outputs, and final public DTOs for private
  path/token-looking values as well as privacy-risk keys. Activation must also
  scan saved activation output and list readback before returning repository
  rows. Failures return finding paths only and must not echo private values.
- `npm run smoke:runtime-enablement` delegates to
  `learning-automation-runtime-enablement-service.evaluate` by default and
  returns a no-write `growth.learningAutomationRuntimeEnablement.v1` readback
  after release activation. It requires valid summary-only activation audit
  rows for selected gates, compares them with injected runtime config booleans,
  and reports `activation_record_required`, `activation_record_invalid`,
  `ready_for_manual_runtime_config_enablement`, `partial_config`, or
  `verified_enabled`. Runtime enablement projects latest preflight report
  id/status/advisory readiness flags only from activation records and never
  reads preflight reports directly. `--operation list` reads existing runtime
  enablement rows, and `--operation record --allow-write` writes only
  `learning_growth_automation_runtime_enablements` through
  `learning-automation-runtime-enablement-service.recordEnablement` and
  `automation-runtime-enablements.js`. It does not flip runtime config, grant
  scheduler permission, call Gateway, publish, generate, evaluate, schedule,
  notify, activate stage assessments, or mutate learner state. It always keeps
  `configChangeApplied=false`, `runtimeConfigChange=false`,
  `runtimeConfigMutationPerformed=false`, `writefulSchedulingAllowed=false`,
  `backgroundSchedulingAllowed=false`, and `backgroundWorkerAllowed=false`.
- `npm run smoke:release-controls` and
  `GET /api/v1/growth/automation/release-controls` delegate to
  `learning-automation-release-controls-service.summarize` and return one
  no-write `growth.learningAutomationReleaseControls.v1` Owner status surface
  over readiness, review, closure, activation, runtime enablement, and bounded
  persisted activation/runtime enablement audit-record summaries. It reads
  those records only through `releaseActivationService.listActivations` and
  `runtimeEnablementService.listEnablements`, exposes `auditReadback` plus
  `activation_records` / `runtime_enablement_records` steps, and reports the
  first blocking ladder status, required actions, missing evidence/check /
  approval keys, one next action, and latest preflight report
  id/status/advisory readiness flags. Those preflight fields are projected only
  from activation/runtime DTOs and persisted activation/runtime audit records;
  release controls does not read the preflight repository directly. It owns no
  repository or table, writes no records, runs no smoke tasks, calls no Gateway,
  publishes nothing, schedules nothing, and keeps all runtime mutation and
  scheduling permission flags false.
- `npm run smoke:release-approval` delegates to the approval service. It
  defaults to read-only list, supports read-only approval bag projection, and
  requires explicit `--allow-write` for `record`.
- `npm run smoke:owner-review-evidence` delegates to
  `learning-automation-owner-review-evidence-service.evaluate`. It is no-write
  and aggregates existing proposal, digest, failure-policy, action-handoff,
  scheduler execution/run, worker-target, and release-readiness DTOs into one
  summary-only Owner automation evidence read model. It owns no table, records
  nothing, enables no scheduling, and is backend evidence only.

Required behavior:

- aggregate summary-only evidence for Owner daily UI, audit/correction UI,
  stage-checkpoint separation from `npm run smoke:stage-assessment`, proposal
  review, production proposal smoke evidence from `npm run smoke:proposal`,
  backend Owner review evidence from
  `npm run smoke:owner-review-evidence`, the release-readiness
  `owner_review_evidence` key or persisted `ownerReviewEvidence` record
  including bounded proposal lifecycle and downstream automation-stage counts,
  automation digest UI, digest review,
  active failure policy, delivered action
  handoff, automation action handoff UI, production action handoff smoke evidence from
  `npm run smoke:action-handoff`, Owner-explicit execution gate status,
  scheduler execution UI, production scheduler execution smoke evidence from
  `npm run smoke:scheduler-execution`, scheduler run default-disabled status,
  scheduler run UI, production scheduler run smoke evidence from
  `npm run smoke:scheduler-run`, scheduler worker-target UI, production
  scheduler worker target smoke evidence from
  `npm run smoke:scheduler-worker-target`, reviewed enabled worker targets,
  worker lease/timer default-disabled status, production scheduler worker smoke
  evidence from
  `npm run smoke:scheduler-worker`, production planner readiness
  smoke evidence from `npm run smoke:planner-readiness`, production
  daily-loop preview smoke evidence from
  `npm run smoke:daily-loop-preview`, production target-provisioning smoke
  evidence from `npm run smoke:target-provisioning` or the default
  `target_provisioning` release-bundle task, production learning-loop state smoke
  evidence from `npm run smoke:learning-loop-state`, production cycle-history
  smoke evidence from `npm run smoke:cycle-history` or the default
  `cycle_history` release-bundle task, production Owner audit smoke evidence
  from `npm run smoke:owner-audit` or the default `owner_audit`
  release-bundle task, production controlled daily-loop
  draft/publish/advance smoke evidence from
  `npm run smoke:daily-loop -- --operation draft|publish|advance --allow-write ...`
  or the explicit write-gated `daily_loop_write` release-bundle task,
  production learner-cycle audit smoke evidence from
  `npm run smoke:learner-cycle` or the default `learner_cycle`
  release-bundle task,
  production scheduler dry-run smoke evidence from
  `npm run smoke:scheduler-dry-run`, release-readiness internal
  no-write scheduler dry-run safety evidence, platform Action Inbox/Web Push
  receipt evidence from `npm run smoke:platform-action-evidence` or the
  default `platform_action` release-bundle task,
  central embedded visual evidence from
  `npm run smoke:central-visual-evidence` or the default `central_visual`
  release-bundle task after the Home AI central visual harness has produced
  a bounded artifact, release evidence bundle self-audit evidence from
  `npm run smoke:release-evidence-bundle-audit`, optional final
  release-controls readback through the non-default `release_controls`
  release-bundle task, optional final release-inventory readback through the
  non-default `release_inventory` release-bundle task, optional final
  release-dashboard readback through the non-default `release_dashboard`
  release-bundle task, optional final release-workbench readback through the
  non-default `release_workbench` release-bundle task, explicit evidence JSON,
  or persisted release-evidence record projection, Owner automation review
  evidence through the default `owner_review_evidence` release-bundle task,
  explicit evidence JSON, or a persisted release-evidence record projection,
  and explicit release approval records for each writeful config gate. The
  legacy `--owner-review-evidence` readiness flag is deprecated remediation
  metadata only and cannot satisfy Owner review evidence;
- return bounded check statuses such as `pass`, `missing`, `blocked`, or
  `not_applicable`;
- return a bounded `releaseReview` remediation plan derived from non-passing
  checks so Owner/release tooling can see the next required action without
  traversing raw check details;
- persist optional Owner-created summary-only snapshots for audit review;
- support structured production evidence collection without Codex by accepting
  only bounded evidence JSON, release-approval JSON, versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` evidence bundles through
  `--evidence-bundle-file` / `--evidence-bundle-json`, and summary evidence
  flags through the CLI;
- keep `writefulSchedulingAllowed=false` and never flip runtime config;
- never call Gateway, Owner audit services directly, publish plans, generate
  cards, evaluate submissions, record proposal execution, run scheduler
  execution, start scheduler ticks, deliver notifications, activate stage
  assessments, or mutate learner state.

Required harness:

- `tests/learning-automation-release-readiness-repository.test.js`;
- `tests/learning-automation-release-approval-repository.test.js`;
- `tests/learning-automation-release-approval-service.test.js`;
- `tests/learning-automation-release-evidence-repository.test.js`;
- `tests/learning-automation-release-evidence-service.test.js`;
- `tests/learning-automation-platform-action-evidence-service.test.js`;
- `tests/learning-automation-central-visual-evidence-service.test.js`;
- `tests/learning-automation-release-evidence-bundle-audit-service.test.js`;
- `tests/learning-automation-release-collection-run-repository.test.js`;
- `tests/learning-automation-release-collection-run-service.test.js`;
- `tests/learning-automation-release-readiness-service.test.js`;
- `tests/growth-target-provisioning-smoke-script.test.js`;
- `tests/growth-platform-action-evidence-smoke-script.test.js`;
- `tests/growth-central-visual-evidence-smoke-script.test.js`;
- `tests/growth-release-evidence-bundle-audit-smoke-script.test.js`;
- `tests/growth-release-collection-run-smoke-script.test.js`;
- `tests/growth-automation-release-approval-smoke-script.test.js`;
- `tests/growth-automation-release-evidence-smoke-script.test.js`;
- `tests/growth-release-readiness-smoke-script.test.js`;
- `tests/learning-automation-release-evidence-bundle-service.test.js`;
- `tests/growth-release-evidence-bundle-script.test.js`;
- `tests/learning-automation-release-activation-repository.test.js`;
- `tests/learning-automation-release-activation-service.test.js`;
- `tests/growth-release-activation-smoke-script.test.js`;
- `tests/learning-automation-runtime-enablement-repository.test.js`;
- `tests/learning-automation-runtime-enablement-service.test.js`;
- `tests/growth-runtime-enablement-smoke-script.test.js`;
- `tests/learning-automation-release-controls-service.test.js`;
- `tests/growth-release-controls-smoke-script.test.js`;
- `tests/learning-automation-release-dashboard-service.test.js`;
- `tests/growth-release-dashboard-smoke-script.test.js`;
- `tests/learning-automation-release-workbench-service.test.js`;
- `tests/growth-release-workbench-smoke-script.test.js`;
- `tests/learning-automation-owner-review-evidence-service.test.js`;
- `tests/growth-automation-owner-review-evidence-smoke-script.test.js`;
- `tests/learning-automation-release-package-service.test.js`;
- `tests/learning-automation-release-package-repository.test.js`;
- `tests/growth-release-package-script.test.js`;
- `tests/learning-automation-release-evidence-bundle-service.test.js` and
  `tests/growth-release-evidence-bundle-script.test.js` for the optional
  non-default `release_controls`, `release_inventory`, and
  `release_dashboard`, and `release_workbench` evidence-bundle tasks;
- route tests in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`,
  including the `releaseReview` remediation fields;
- smoke syntax and package-script checks through `npm run check`;
- docs-locality checks and broad local validation.

Remaining release gaps:

- product UI evidence for Owner daily, audit/correction, proposal review,
  digest/action/execution/run, worker-target views, and release package review.
  Backend Owner review evidence now exists through
  `npm run smoke:owner-review-evidence`, and the release package review UI can
  build a summary-only candidate before recording it. Release-readiness now has
  a first-class `releasePackageReviewUiEvidence` /
  `release_package_review_ui_evidence` gate for the package review row, but that
  gate still needs a real summary UI/visual artifact with candidate-build,
  candidate-status, and record-package-action coverage before it can pass in
  production. Local Harness now proves that the backend workbench action can
  either record an existing package artifact, explicitly delegate
  build-and-record to the package service with bounded unavailable-service
  failure, or delegate a `release_preflight` action to
  `learning-automation-release-preflight-service.recordReport` without owning
  the preflight repository. It also proves the Owner workbench action wrapper
  can persist and read back bounded
  `growth.learningAutomationReleaseWorkbenchActionAudit.v1` rows through
  `npm run smoke:release-workbench-action -- --operation list-audits` and
  `learning_growth_automation_release_workbench_actions` without storing raw
  request bodies, artifact paths, raw evidence, delegated write results,
  prompts, transcripts, model output, provider config, or secrets. Local
  Harness also proves that a validated
  release-package-review UI evidence summary can be recorded through
  `npm run smoke:release-evidence` into a temporary Growth SQLite database and
  read back from the release-evidence bag with top-level evidence/check keys
  that `npm run smoke:release-readiness` can consume as a passing
  `release_package_review_ui_evidence` check. Local Harness also proves the
  explicit `release_package_review_ui` bundle task can feed the
  `npm run smoke:release-evidence-collection` CLI with
  `--write-release-evidence-records --allow-write`, persist the same
  validator-gated pass record into
  `learning_growth_automation_release_evidence`, and omit the raw artifact path
  from bundle/collection output. These fixtures do not replace a real Home AI
  visual/UI artifact. These backend/UI affordances do
  not replace product UI or central visual evidence.
  The current proposal selected-cycle create/review/publish panel and release
  package review flow still need central visual/release evidence before they are
  treated as production-complete;
- real production Home AI platform Action Inbox + Web Push dual receipt
  evidence from `npm run smoke:platform-action-evidence`;
- real production central embedded-plugin visual artifact for mobile scroll,
  dark mode, progress, and embedded shell, then ingestion through
  `npm run smoke:central-visual-evidence`;
- production planner readiness smoke from `npm run smoke:planner-readiness`,
  production learning-loop state smoke from `npm run smoke:learning-loop-state`,
  production cycle-history smoke from `npm run smoke:cycle-history` or the
  default `cycle_history` release-bundle task,
  production Owner audit smoke from `npm run smoke:owner-audit` or the default
  `owner_audit` release-bundle task,
  production controlled daily-loop draft/publish/advance smoke from
  `npm run smoke:daily-loop` or the explicit `daily_loop_write`
  release-bundle task, production learner-cycle audit smoke from
  `npm run smoke:learner-cycle` or the default `learner_cycle`
  release-bundle task, and production scheduler dry-run smoke from
  `npm run smoke:scheduler-dry-run`, then release evidence bundle self-audit
  from `npm run smoke:release-evidence-bundle-audit`;
- Owner-visible product UI evidence for recording/reviewing release approvals
  outside the smoke CLI.

## Immediate Execution Guidance

The next implementation slice should be chosen by product goal:

- If the goal is product-visible learning for Fanfan, implement P1 first:
  complete the Owner daily browser loop over the existing daily-loop facade,
  with `npm run smoke:daily-loop-preview` as the no-write backend readiness
  evidence before visual or production review.
- If the goal is backend automation safety before more UI, the service-level
  P5-P6 completed-cycle path is now covered by
  `tests/learning-card-ai-loop-harness.test.js`: a completed Fanfan science
  cycle can produce a summary-only accepted proposal, a read-only scheduler
  `would_publish` candidate, and a pending digest required action without
  automatic publication. Proposal operational smoke is also available through
  `npm run smoke:proposal`, which defaults to read-only list and gates
  create/review/publish with explicit `--allow-write`. The embedded Owner
  automation UI now covers proposal, digest, failure-policy, action-handoff,
  scheduler execution/run, worker-target, and release-workbench readback over
  the existing service boundaries. Implement the remaining evidence around
  P5-P10 next: real `releasePackageReviewUiEvidence`, platform Action
  Inbox/Web Push evidence, production dry-run evidence through
  `npm run smoke:scheduler-dry-run`, central visual evidence, and a
  release-readiness evidence snapshot. The P8 and P9 backend boundaries are
  implemented locally and remain default-disabled; the P10 backend boundary is
  an evidence gate only and must not enable execution or scheduling.

Do not start background writeful scheduling or automatic card publication until
P1, P2, P5, P6, P7, P8, P9 UI/evidence, P10 release-readiness evidence, and
the required platform/visual/harness evidence are complete.

## Definition Of Done

An implementation package is done only when all of these are true:

- the owning Growth-local document is updated;
- service, repository, route, UI, architecture, privacy, and visual harnesses
  are updated according to the touched boundary;
- `node scripts/check-growth-docs-locality.js` passes;
- `node --test tests/growth-docs-locality.test.js` passes;
- focused tests for the touched boundary pass;
- broad local validation passes before commit/deploy;
- UI release has central Home AI embedded-plugin visual evidence;
- `.agent-context/HANDOFF.md` records the changed state and remaining gaps.
