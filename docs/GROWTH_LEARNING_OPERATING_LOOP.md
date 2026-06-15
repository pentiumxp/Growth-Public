# Growth Learning Operating Loop

Last updated: 2026-06-16.

## Purpose

This document defines the next Growth architecture target: an AI-driven
learning operating loop that can start with Fanfan and later apply to any
authorized learner workspace, subject, or knowledge domain.

For the durable system scheme, use
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`. For the closed-loop product
contract, use `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`. For execution
sequencing, delivery packages, and package-level definition of done, use
`docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`. For durable-state ownership
and harness requirements, use
`docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` as the implementation
blueprint. Use `docs/GROWTH_AI_LEARNING_ROADMAP.md` as the staged roadmap for
the capability model, scientific learning policy, Owner operating modes,
delivery order, release gates, documentation and harness contract, and the
immediate next slice. Use `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` as the
current next-stage selector for the Owner daily loop path or the backend-only
release-readiness evidence path. Use
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before implementing
digest, notification, Action Inbox, rollback, or writeful scheduling behavior.
Use `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` before
changing Owner-explicit scheduler execution.
Use `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before
changing supervised scheduler run/tick behavior or any future background
worker.
This document remains the product and architecture target.

The existing Growth AI card loop can already generate a graph-bound daily card,
accept learner evidence, run one evaluation, update weighted mastery evidence,
write trajectory, recommend the next card, and close a formal stage-assessment
cycle. That is the card-level loop.

The next target is broader. Growth should become a learning operating system
inside the plugin boundary:

1. observe bounded learning evidence;
2. maintain an auditable learner profile;
3. plan the next learning objective from profile plus knowledge graph;
4. author low-pressure daily cards or formal stage assessments through Gateway;
5. evaluate evidence through Gateway;
6. update profile and trajectory;
7. explain the next recommendation to Owner;
8. repeat over weeks and months without creating high-pressure backlog debt.

## Product Principles

Growth V1 should optimize for these constraints:

- AI-driven: planning, card authoring, and evaluation use Gateway-backed model
  boundaries where configured.
- Closed loop: every generated card should feed profile and the next planning
  decision through summary-only evidence.
- Auditable: Owner can inspect why Growth selected a target, what evidence was
  used, what changed in the profile, and why the next step was recommended.
- Scientific enough for product use: formal mastery claims require stronger
  evidence than daily practice. Low-confidence or stale evidence should stay
  marked as such.
- Low pressure: ordinary daily cards should take about 10-15 minutes, use one
  submission, one evaluation, one optional reflection, and no pass-line retry.
- Cumulative: daily evidence is low weight, stage assessment evidence is high
  weight, and profile state changes over time from repeated evidence.
- Extensible: Fanfan is the first target, but learner workspace, knowledge
  graph, subject, and card recipe must be parameters rather than hard-coded
  product assumptions.

## System-Level Implementation Plan

The long-term product is not a one-off card generator. Growth should operate
as a supervised AI learning loop:

1. Owner provisions the target learner and domain pack.
2. Growth projects current learner state from summary-only evidence.
3. Gateway drafts the next learning plan.
4. Growth validates and stores the plan as an Owner-auditable draft.
5. Owner or a controlled service action publishes one selected plan item.
6. Gateway authors the card from the validated plan.
7. The learner completes one low-pressure card flow.
8. Gateway evaluates the submitted evidence once.
9. Growth writes evaluation, rewards, evidence ledger, profile, trajectory, and
   profile-delta audit projections.
10. The next planner context uses the updated profile and evidence.

The loop must stay supervised and auditable before it becomes more automatic.
Owner should be able to answer four questions for any generated card:

- why this learner received this target now;
- which bounded evidence and profile state supported the decision;
- what changed after the learner completed the card;
- what Growth recommends next and whether that recommendation is low pressure.

### Deterministic And Model-Owned Boundaries

Only three steps enter a model:

| Step | Model boundary | Status |
| --- | --- | --- |
| Plan | Gateway planner drafts `growth.learningPlanDraft.v1`. | Backend V1 exists for daily, weekly, repair, and stage-checkpoint draft validation; Owner UI and production smoke are pending. |
| Author | Gateway authoring drafts the learner-facing card. | Implemented for generated cards and planner-published items. |
| Evaluate | Gateway evaluation drafts `growth.card.evaluation.v1`. | Implemented when evaluation Gateway config is present; deterministic fallback remains a local/harness boundary. |

Everything else must remain deterministic and service-owned: target
provisioning, graph option selection, validation, publish transactions,
reward settlement, evidence-ledger writes, Profile V2 projection, profile
delta projection, stage-assessment cooldown policy, and Owner audit DTOs.
Models may provide draft content or grading summaries, but they must not
directly write durable state.

### Next Implementation Sequence

From the current backend foundation, implementation should proceed in this
order unless an urgent production bug changes priority:

1. Embedded planner/provision UI:
   - render `graphOptions`, `targetProvisioning`, planner readiness, and
     Profile V2 in the Owner `生成` tab;
   - call draft and publish routes from the plugin UI;
   - keep explicit Owner publish; no free-form prompt box.
2. Production readiness:
   - run the no-write planner readiness smoke against real Gateway config;
   - run the central Home AI embedded-plugin visual harness before deploy;
   - keep production enablement gated by bounded smoke evidence.
3. Weekly and stage-checkpoint planning:
   - use the implemented backend horizon policy for `weekly_plan`,
     `repair_plan`, and `stage_checkpoint_plan`;
   - keep formal checkpoints as suggestions until
     `learning-stage-assessment-service` activates a cycle;
   - avoid creating daily backlog debt.
4. Multi-workspace/domain-pack rollout:
   - require explicit provisions for non-sample targets;
   - keep actor workspace and learner target workspace separate;
   - verify no Owner data is mixed into learner profile, evidence, or plan
     context.
5. Supervised automation proposal:
   - create an Owner-reviewed next-learning proposal from a completed source
     cycle;
   - require audit completeness and target provisioning before plan drafting;
   - store summary-only proposal rationale and Owner policy;
   - keep publication manual through the existing plan publish route.
6. Automation digest gate:
   - backend persistence for summary-only dry-run review packets is
     implemented locally before any scheduler writes;
   - show would-publish, blocked, skipped, and already-published candidates;
   - keep publication on explicit Owner actions.
7. Longer-term supervised scheduling:
   - require digest review, proposal review, audit completeness, rollback,
     notification/action handoff, reviewed worker targets, and failure
     visibility before background publication is considered.

### Acceptance Criteria

The operating loop is not considered complete until all of these are true:

- every generated card is linked to a graph plan or validated planner item;
- every model step has a validated draft boundary before durable writes;
- Owner can inspect plan reason, evidence basis, profile delta, and next
  recommendation without raw private content;
- daily cards remain one submission, one evaluation, and one optional
  reflection, completing after the first evaluation regardless of score;
- formal stage assessments stay separate, higher weight, cooldown-aware, and
  service-activated;
- a visible learner cannot receive generated content for a domain pack until
  view-target visibility and learning target provisioning both pass;
- failed model output, failed validation, and failed DB transactions stop at a
  visible draft/job/failure state instead of producing partial cards or hidden
  waiting states;
- focused harnesses cover valid, invalid, privacy-risk, timeout, and
  transaction-failure paths before production rollout.

## Next Architecture Optimization Plan

The next architecture work should move in small, evidence-backed stages. The
goal is not "more AI calls"; the goal is a complete learning loop where every
AI decision is grounded in bounded state, validated before writes, and later
auditable by Owner.

The operating loop should be optimized in this order:

1. make one Owner-supervised daily card browser-complete;
2. make the completed cycle explainable and correctable;
3. keep formal stage checkpoints separate from daily practice;
4. generalize target/domain-pack provisioning beyond the Fanfan sample;
5. make supervised proposals reviewable in the plugin UI;
6. keep scheduler dry-run read-only and visible;
7. add the automation digest gate before writeful scheduling;
8. use the default-disabled Owner-explicit execution backend only after action
   handoff, policy, digest, and dry-run gates can be audited.
9. treat reviewed worker target configuration and worker leases as a separate
   background-scheduler proof layer, not as production automation approval.

This order intentionally prioritizes auditability and low-pressure learning
over background automation. A scheduler that cannot explain the previous
cycle from bounded records is not part of the target architecture.

### 1. Owner-supervised daily loop

This is the immediate product slice.

Required behavior:

- Owner uses the Growth `生成` tab, not Codex, to select learner, domain pack,
  subject, horizon, and time budget.
- The UI renders `graphOptions`, `targetProvisioning`, Profile V2,
  `evidenceAudit`, `ownerAudit`, planner readiness, authoring readiness, and
  evaluation readiness.
- Owner drafts one plan through the Growth route, reviews the validated
  preview, then explicitly publishes one selected low-pressure daily item.
- Publication keeps the existing card generation service as the only card
  authoring write boundary.
- After learner completion, Owner can refresh the same surface and see profile
  delta, correction history, and next recommendation.

Required backend rule:

- no new route may call Gateway directly;
- no frontend code may compute profile diffs, inspect raw Profile V2 payloads,
  or assemble raw prompts;
- all UI state must be a projection of existing service DTOs.

Required harness:

- context service and route tests for target scoping;
- frontend adapter/layout tests for the `生成` tab;
- central embedded-plugin visual harness for mobile scroll, dark mode, and
  progress states;
- docs-locality checks after rule changes.

### 2. Audit-complete profile loop

The profile loop should become understandable before it becomes more
automatic.

Required behavior:

- every completed daily or formal card has an evidence-ledger row or visible
  non-fatal downstream failure;
- every profile delta can be read back through a bounded public DTO;
- Owner corrections are additive evidence, not destructive edits;
- Profile V2 can explain capability state, confidence, recency, pressure
  signals, and known misconceptions from persisted summaries.

Required backend rule:

- profile projection remains read-only and service-owned;
- profile-delta audit is created from before/after bounded projections, not
  raw answers or raw model output;
- corrections go through `learning-owner-correction-service` and the evidence
  ledger.

### 3. Stage checkpoint loop

Stage checkpoints should be stronger evidence, not harder daily homework.

Required behavior:

- planner may suggest `stage_checkpoint_plan`;
- the suggestion stays an Owner-auditable draft until
  `learning-stage-assessment-service` confirms eligibility or Owner override;
- formal card publication happens only through assessment activation;
- completion updates high-weight evidence and cooldown.

Required backend rule:

- daily planning cannot silently publish a formal assessment;
- missed daily cards do not accumulate as backlog debt;
- formal assessment coverage nodes must be explicit and graph-bound.

### 4. Multi-workspace and domain-pack generalization

Fanfan remains the first sample, but no core rule should be Fanfan-specific.

Required behavior:

- Owner can view many learners, but generation requires a visible target and an
  active provision for the selected domain pack and subject;
- the target learner workspace owns profile, evidence, plan, card, and audit
  rows;
- the Owner workspace is only the actor context.

Required backend rule:

- target visibility and target provisioning both pass before planning,
  authoring, correction, or publish writes;
- graph target nodes must belong to the selected provisioned graph context;
- public projections never mix Owner actor data into learner state.

### 5. Later supervised automation

Automation should be added only after Owner audit is complete enough to explain
every decision.

Required behavior:

- first, Owner reviews a single next-learning proposal linked to a completed
  auditable cycle;
- later, Owner may review a digest of proposed next cards or weekly sequence;
- proposal creation stores the source cycle, new plan draft, selected item,
  graph target, evidence basis, profile state, validation result, and Owner
  policy before any publication;
- proposal review records a bounded Owner decision: `accepted`, `skipped`,
  `expired`, or `superseded`;
- an accepted proposal may expose a manual publish action, but it must not
  publish the card by itself;
- accepted proposal publish execution is a separate explicit Owner action that
  delegates to the existing plan publisher and records bounded execution
  metadata;
- scheduling publishes only reviewed proposals or validated plan items.

Required backend rule:

- proposal creation must pass audit completeness and target provisioning before
  a new plan draft is created;
- proposal creation may enter only the existing planner boundary through
  `learning-plan-publisher-service.draftPlan`;
- proposal decision may update only proposal status and bounded decision
  metadata;
- proposal publish execution may publish only an accepted proposal through
  `learning-plan-publisher-service.publishPlanItem` and may update only bounded
  proposal execution metadata;
- proposal creation must not call Gateway directly, card generation, authoring,
  evaluation, stage-assessment activation, or a scheduler;
- background workers may enqueue validated drafts only after the proposal layer
  and Owner policy have been proven, and model drafts still pass the same
  validation and publish services;
- failures remain visible and retryable;
- automation should not bypass Owner audit, target provisioning, or stage
  assessment activation.

## Non-Goals

- Growth does not call model vendors directly. Gateway remains the only model
  boundary.
- Growth does not import or call Home AI old Growth server internals.
- Growth does not store raw access keys, tokens, full learner transcripts, full
  learner answers, raw model responses, raw prompts, hidden answer keys, or
  private file paths in durable loop records.
- Daily cards do not become formal exams. A low daily score is evidence for the
  next plan, not a failure gate that blocks completion.
- The first generalized loop does not need to solve every subject. It needs one
  cross-subject slice, such as a Fanfan science daily card, to prove the
  abstraction.

## Current Capability Boundary

As of 2026-06-15, Growth owns these implemented or documented boundaries:

- native knowledge-graph import, graph plans, and card graph bindings;
- Gateway-backed card authoring through `learning-card-authoring-service`;
- Gateway-backed card evaluation through `learning-card-evaluation-service`
  when `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured;
- `daily_score_once` daily cards: one submission, one evaluation, one
  reflection, score-proportional reward, no pass-line retry;
- learner difficulty signals anchored to graph nodes;
- weighted mastery updates through `learning-mastery-profile-service`;
- trajectory and next-card recommendation lifecycle;
- Owner generation context and embedded Owner generation UI;
- formal `stage_assessment` activation, card generation, high-weight profile
  evidence, completion, and cooldown.
- the first operating-loop backend foundation:
  `learning-evidence-ledger-service`, `learning-profile-v2-service`,
  `learning-planner-context-service`, `growth-gateway-planner-client`,
  `learning-plan-validation-service`, and
  `learning-plan-orchestrator-service`;
- persisted planner draft and publish services:
  `learning-plan-publisher-service` and `learning_growth_plan_drafts`;
- Owner daily-loop backend facade through `learning-daily-loop-service` and
  Owner-only `GET /api/v1/growth/daily-loop/preview`,
  `POST /api/v1/growth/daily-loop/draft`, and
  `POST /api/v1/growth/daily-loop/publish`, composing context, draft/publish,
  cycle audit, and completeness without a new model or scheduler boundary;
- Owner learning-loop state readback through `learning-loop-state-service` and
  Owner-only `GET /api/v1/growth/learning-loop/state`, composing daily-loop
  preview and read-only stage-assessment readiness into
  `growth.learningLoopState.v1` without writes, Gateway calls, publication,
  generation, evaluation, scheduling, notifications, or stage activation;
- bounded plan/evidence/profile-delta/correction audit aggregation through
  `learning-cycle-audit-service` and
  `GET /api/v1/growth/learning-cycles/audit`;
- selectable historical-cycle readback through
  `learning-cycle-history-service`,
  `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`, composing public audit DTOs into
  summary-only rows without writes or model calls;
- read-only audit-completeness checks through
  `learning-audit-completeness-service` and
  `GET /api/v1/growth/learning-cycles/completeness`, which reports missing
  required audit evidence before UI closure or future supervised automation
  dry runs without writing state or starting scheduling;
- the locally implemented supervised automation proposal boundary:
  `learning-automation-proposal-service`,
  `learning_growth_automation_proposals`, and
  `GET`/`POST /api/v1/growth/automation/proposals`,
  `POST /api/v1/growth/automation/proposals/:proposalId/decision`, and
  `POST /api/v1/growth/automation/proposals/:proposalId/publish` as the
  Owner-reviewed layer before any scheduling;
- native graph domain-pack and subject option projection for Owner context
  through `graph-repository.domainPackOptions()` and
  `card-generation-context.graphOptions`;
- target/domain-pack provisioning policy through
  `learning-target-provisioning-service` and
  `learning_growth_domain_pack_provisions`, separating "Owner can view this
  learner" from "Growth is allowed to plan/generate cards for this learner and
  domain pack";
- a bounded no-write planner readiness smoke boundary through
  `learning-plan-orchestrator-service.smokePlannerReadiness()` and
  `npm run smoke:planner-readiness`.

This is enough to close one card and one formal assessment cycle, build a
bounded planner context, persist a validated plan draft, publish one selected
plan item into the existing card-generation service, and expose bounded
post-evaluation profile-delta/correction readback plus cycle audit and
audit-completeness readback. It also implements the first supervised
automation proposal layer as a dry-run Owner-review boundary. It is not yet
enough to claim a complete learning operating system because embedded Owner
plan/audit/proposal UI, multi-card weekly plans, production execution of the
planner readiness smoke, and embedded domain-pack/subject selection remain
later slices.

## Current Product Capability

If Owner wants to create a science card for Fanfan today, the implemented
backend can support the controlled path below. The embedded Owner UI still
needs the plan-preview/publish panel before this becomes a normal browser-only
operation.

1. Load `GET /api/v1/growth/card-generation/context` for the Fanfan target
   workspace with bounded selectors such as `learnerId=fanfan`,
   `domainPackId=uk_hk_curriculum_foundation`, `domain=science`,
   `subject=science`, `horizon=daily_plan`, and `availableMinutes=15`.
2. Inspect readiness:
   - `graphOptions` shows provisioned graph/domain-pack and subject choices;
   - `targetProvisioning` shows whether the target learner is allowed to use
     the selected domain pack/subject;
   - `profileV2` and `evidenceAudit` show summary-only learner state;
   - `plannerReadiness`, `plannerContextPreview`, and Gateway readiness show
     whether planner, authoring, and evaluation boundaries are available.
3. Run a no-write readiness smoke with `npm run smoke:planner-readiness --`
   and the same target/domain selectors when checking a real Gateway
   configuration. The smoke returns a bounded draft summary only; it must not
   print raw model text or raw learner content.
4. Draft a plan through `POST /api/v1/growth/learning-plans/draft`. The route
   stores a validated `growth.learningPlanDraft.v1` preview in
   `learning_growth_plan_drafts`.
5. Publish one selected plan item through
   `POST /api/v1/growth/learning-plans/:planDraftId/publish`. Publication
   delegates to `learning-card-generation-service`, so the card is still
   graph-bound, authoring is Gateway-only, and SQLite publish remains
   transactional.
6. The learner completes the generated daily card with one submission, one
   evaluation, and one optional reflection.
7. Evaluation, reflection, and learner signal summaries flow back into the
   evidence ledger, Profile V2, trajectory, and next recommendation.
8. Owner or UI drilldown can read
   `GET /api/v1/growth/learning-cycles/history` to select older cycles,
   `GET /api/v1/growth/learning-cycles/audit` for the bounded cycle timeline,
   and
   `GET /api/v1/growth/learning-cycles/completeness` for required audit
   findings before treating the cycle as closed.

Current implemented capability is therefore backend-complete for a single
Fanfan science vertical and service harness. It also includes persisted
profile-delta audit readback for later Owner review. Product completeness
still requires the embedded Owner UI to expose graph options, plan draft
preview, explicit publish, provision controls, and audit refresh without using
Codex as the operational interface.

## Target Operating Loop

The target loop is:

1. Knowledge graph and domain packs define capability nodes, prerequisites,
   evidence requirements, and assessment coverage.
2. Growth reads the learner profile, recent evidence ledger entries, recent
   experience signals, stage-assessment cycle state, and recent trajectory.
3. `learning-planner-context-service` assembles summary-only planning context.
4. `learning-plan-orchestrator-service` calls Gateway to draft a learning plan
   for a horizon such as today, this week, or a stage checkpoint.
5. `learning-plan-validation-service` validates schema, graph binding,
   allowed card roles, pressure policy, evidence requirements, privacy, and
   bounded content.
6. A validated plan is stored as an auditable draft or published plan.
7. `learning-card-generation-service` authors the selected card from the plan.
8. The learner completes the card in the existing plugin card flow.
9. `learning-card-evaluation-service` evaluates the submission through Gateway
   or the visible fallback boundary.
10. `learning-evidence-ledger-service` records summary-only evidence derived
    from evaluation, reflection, learner signals, stage assessment completion,
    and Owner-reviewed correction evidence.
11. `learning-profile-v2-service` projects evidence into learner profile state.
12. `learning-card-trajectory-service` records the card outcome and next
    recommendation.
13. Owner sees a bounded audit view: plan reason, evidence basis, profile delta,
    and next recommendation.

## Layered Architecture

| Layer | Responsibility | Current state | Next target |
| --- | --- | --- | --- |
| Knowledge layer | Imported graph nodes, prerequisites, evidence requirements, domain packs, assessment coverage. | Native KG import, graph planning, graph binding, and backend domain-pack/subject option projection are implemented. Graph import now infers a node's domain pack from node domain when multi-pack seeds omit explicit node `domainPackId`, and graph plans carry `domainPackId`, `domain`, and `subject` into downstream card audit metadata. | Expose domain-pack selection in the embedded Owner UI and add planner-facing graph summaries for more subjects. |
| Evidence ledger | Unified summary-only evidence records across evaluations, reflections, learner signals, stage assessments, and Owner-reviewed corrections. | `learning-evidence-ledger-service` and `learning_growth_evidence_ledger` are implemented for daily evaluation, formal assessment, reflection, experience-signal, and Owner-reviewed correction evidence. `learning-evidence-audit-service` and `GET /api/v1/growth/evidence/audit` provide bounded readback over persisted evidence rows for visible targets. | Add broader Owner audit UI projection over the implemented backend DTOs. |
| Profile layer | Mastery, confidence, stability, recency, misconceptions, habits, pressure signals, interests, and subject-specific descriptors. | `learning-profile-v2-service` projects ledger evidence plus optional legacy profile context, applies Owner-reviewed correction evidence as a bounded auditable state adjustment, exposes evidence-freshness metadata, and Owner generation context now exposes a bounded Profile V2 projection. | Add richer Owner audit explanations in the embedded UI. |
| Planner layer | Multi-horizon objective selection and card-role decision. | Gateway planner context, client, validation, orchestrator, plan-draft storage, backend draft route, backend publish route, Owner generation-context planner readiness, and no-write readiness smoke are implemented. | Add embedded Owner plan preview UI, run production planner smoke with real config, and add weekly/stage-checkpoint horizons. |
| Target provisioning layer | Learner/domain-pack/subject authorization for learning generation after view-target visibility passes. | Fanfan sample fallback and explicit domain-pack provisions are owned by `learning-target-provisioning-service`; V1 stores summary-only rows in `learning_growth_domain_pack_provisions`. | Expose Owner provision controls in the embedded UI and use the same policy for all non-sample learners. |
| Authoring layer | Generate validated teaching, practice, repair, stretch, integration, project, or assessment cards. | Daily English, stage assessment generation, and planner-backed single-item publication are implemented. | Generalize recipe policy beyond English and route provisioned non-English subject cards from validated plans. |
| Execution layer | Learner card UI, submission, optional audio, one evaluation, one reflection, low-pressure completion. | Implemented for generated daily cards. | Keep stable while adding subject-specific card content. |
| Evaluation layer | Gateway evaluation, bounded DTO, visible failure/retry, evidence derivation. | Implemented with Gateway/fallback boundary. | Add subject-aware rubrics and evidence mapping into ledger. |
| Stage layer | Formal assessment eligibility, activation, high-weight evidence, cooldown. | Implemented as a service boundary. | Use profile confidence and ledger freshness to suggest assessment cycles. |
| Audit layer | Owner-visible reason, evidence basis, plan publication link, profile delta, model-boundary state, failure state, Owner-reviewed correction trail, historical-cycle selection, and required audit completeness. | Owner generation context shows profile, recommendation, planner readiness, planner context preview, Profile V2, bounded evidence audit items, and `ownerAudit` readback over plan-audit, persisted profile-delta, and correction DTOs. Evidence-audit readback is implemented through `learning-evidence-audit-service` and `GET /api/v1/growth/evidence/audit`; plan-audit readback is implemented through `learning-plan-audit-service`; profile-delta persistence/readback are implemented through `learning_growth_profile_delta_audits` and `GET /api/v1/growth/profile-delta-audits`; Owner-reviewed corrections are implemented through `learning-owner-correction-service`, `POST /api/v1/growth/profile-corrections`, and `GET /api/v1/growth/profile-corrections`; cycle-level readback is implemented through `learning-cycle-audit-service` and `GET /api/v1/growth/learning-cycles/audit`; selectable cycle history is implemented through `learning-cycle-history-service`, `GET /api/v1/growth/learning-cycles/history`, and `npm run smoke:cycle-history`; required audit evidence readback is implemented through `learning-audit-completeness-service` and `GET /api/v1/growth/learning-cycles/completeness`. | Add embedded older-cycle history selection controls over the implemented history/audit/completeness backend DTOs. |
| Automation proposal layer | Owner-reviewed proposal creation, decision, and explicit accepted-proposal publish execution before any scheduling or automatic publication. | The target boundary is `learning-automation-proposal-service`, `learning_growth_automation_proposals`, `GET`/`POST /api/v1/growth/automation/proposals`, `POST /api/v1/growth/automation/proposals/:proposalId/decision`, and `POST /api/v1/growth/automation/proposals/:proposalId/publish`: previous cycle completeness and target provisioning are required before a new plan draft can become a proposal, Owner decisions record `accepted`, `skipped`, `expired`, or `superseded`, and accepted publish execution delegates to the plan publisher while recording bounded execution metadata. | Add proposal review UI and harness before making proposals a primary Owner workflow. |
| Scheduler dry-run layer | Read-only candidate inspection before any writeful scheduling worker. | `learning-automation-scheduler-service` and Owner-only `POST /api/v1/growth/automation/scheduler/dry-run` list accepted proposals, skip already-published executions, recheck audit completeness and target provisioning, and return `would_publish`, blocked, or skipped candidates without writes, Gateway calls, publication, notifications, or stage activation. | Add Owner digest/review UI and real production platform Action Inbox/Web Push receipt evidence before considering writeful scheduling. |
| Automation failure-policy layer | Summary-only rollback, failure visibility, and manual retry prerequisite before writeful scheduling. | `learning-automation-failure-policy-service`, `learning_growth_automation_failure_policies`, and visible-target/Owner scoped `/api/v1/growth/automation/failure-policies` routes are implemented. Draft policies activate only through Owner review; readiness reports active policy as one prerequisite and keeps `writefulSchedulingAllowed=false`. | Render policy readiness in Owner automation UI and keep writeful scheduling blocked until action UI/platform evidence and visual evidence exist. |
| Automation action handoff layer | Summary-only Owner action metadata after reviewed digest and active failure policy. | `learning-automation-action-handoff-service`, `learning_growth_automation_action_handoffs`, visible-target/Owner scoped `/api/v1/growth/automation/action-handoffs` routes, and `growth.automation.action_required` event mapping are implemented. Delivery records `delivered` or `delivery_failed` without publishing, proposal execution, Gateway, scheduler, or learner-state mutation. `learning-automation-platform-action-evidence-service` and `npm run smoke:platform-action-evidence` now read delivered Growth event-outbox receipts into summary-only release evidence without reading Home AI Action Inbox/Web Push internals. | Render action/delivery state in Owner automation UI and collect real production platform receipt evidence before writeful scheduling. |
| Automation scheduler execution layer | Default-disabled Owner-explicit execution after every scheduling gate is rechecked. | `learning-automation-scheduler-execution-service`, `learning_growth_automation_scheduler_executions`, visible-target scoped `GET /api/v1/growth/automation/scheduler/executions`, and Owner-only `POST /api/v1/growth/automation/scheduler/execute-once` are implemented. Disabled config records blocked execution; enabled execution rechecks delivered handoff, reviewed digest, active policy, matching dry-run, final release authorization, and valid `writeful_execution` activation audit readback before delegating only to accepted-proposal publish. | Keep production enablement blocked until Owner automation UI, platform action evidence, visual evidence, production dry-run evidence, explicit release approval, and activation record evidence exist. Background scheduling remains a separate future layer. |
| Automation scheduler run layer | Default-disabled supervised tick over delivered handoff actions. | `learning-automation-scheduler-run-service`, `learning_growth_automation_scheduler_runs`, visible-target scoped `GET /api/v1/growth/automation/scheduler/runs`, and Owner-only `POST /api/v1/growth/automation/scheduler/run-once` are the safe target boundary. Disabled config records blocked run state; enabled ticks may list delivered handoffs and delegate candidates only to the execution service. | Keep production background scheduling blocked until scheduler-run harness, Owner automation UI, platform action evidence, visual evidence, production dry-run evidence, and explicit release approval exist. |
| Automation scheduler worker target layer | Owner-reviewed target configuration for any future worker. | `learning-automation-scheduler-worker-target-service`, `automation-scheduler-worker-targets.js`, `learning_growth_automation_scheduler_worker_targets`, and visible-target/Owner scoped worker-target routes are implemented. Creation requires target provisioning, review can enable/disable/archive, and enabling rechecks provisioning. | Use reviewed `enabled` targets for production; treat environment JSON target lists as local fallback only. |
| Automation scheduler worker lease layer | Default-disabled timer/lease boundary over reviewed scheduler-run targets. | `learning-automation-scheduler-worker-service`, `automation-scheduler-worker-leases.js`, `learning_growth_automation_scheduler_worker_leases`, and optional HTTP timer glue are implemented. `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false` by default; when enabled, the worker prefers reviewed enabled targets, claims one lease per summary-only target, and calls only `learning-automation-scheduler-run-service.runOnce`. Active leases are protected and stale leases are reclaimable. | Keep production unattended scheduling blocked until Owner automation UI, platform action evidence, visual evidence, production dry-run evidence, reviewed enabled target config, and explicit worker release approval exist. |
| Generalization layer | Workspace, learner, graph pack, subject, and recipe become parameters. | Fanfan sample and daily English are operational; Fanfan science is covered by a service-level vertical harness; backend context exposes `graphOptions`. A non-sample science vertical harness now proves unprovisioned blocking, explicit provision enablement, wrong-subject blocking, and target-workspace scoped plan/card/evidence/profile/audit rows. | Promote subject/domain-pack selection into Owner UI and route projections for any provisioned target. |

## Learning Modes

Growth uses two different card modes. They must not be merged.

### Daily practice cards

Daily cards are ordinary low-pressure learning events. They exist to keep the
learner moving, collect evidence, and choose the next small step.

Rules:

- expected time: 10-15 minutes;
- card roles: `teaching`, `practice`, `repair`, `stretch`, or a supported
  generation role mapped from those planner roles;
- learner flow: one submission, one evaluation, one optional reflection;
- completion: after the first evaluation, regardless of score;
- reward: score-proportional within the card reward cap;
- evidence weight: low or medium;
- failure meaning: weak evidence for the next plan, not a blocked card.

### Stage assessment cards

Stage assessment cards are formal checkpoint events. They are not daily
homework and should not appear as accumulated backlog.

Rules:

- expected time: 25-30 minutes;
- card role: `stage_assessment`;
- activation: through `learning-stage-assessment-service` only;
- coverage: explicit assessment coverage nodes;
- completion: formal evaluation followed by cycle completion/cooldown;
- reward: higher cap, currently default `300` coins;
- evidence weight: high, currently `1`;
- failure meaning: profile and planning evidence, not an immediate pressure
  loop.

The planner may recommend a stage checkpoint, but activation remains a
separate service-owned decision. Daily planning must not silently publish a
formal assessment.

## Planned Service Boundaries

Future code should keep the service-first boundary used by the current Growth
plugin. The route layer should remain HTTP glue.

### `learning-evidence-ledger-service`

Owns durable, summary-only evidence records.

Implementation status: implemented. The service writes through
`learning_growth_evidence_ledger`, records daily evaluation, reflection,
experience signal, and formal assessment evidence, rejects privacy-risk keys,
and is used by `growth-evaluation-service` after an evaluation/profile update
is persisted.

Inputs:

- persisted evaluation DTOs;
- persisted reflection metadata and summary;
- learner experience signals;
- stage-assessment completion metadata;
- Owner-reviewed corrections.

Outputs:

- idempotent evidence ledger rows;
- bounded evidence DTOs for profile projection and Owner audit;
- source references by id, not by private path or raw payload.

The service must reject raw answers, raw transcripts, raw prompts, hidden
answer keys, raw model output, secrets, cookies, tokens, push endpoints,
private file paths, and provider configuration.

### `learning-owner-correction-service`

Owns bounded Owner-reviewed profile correction evidence.

Implementation status: implemented. The service validates target provisioning,
rejects privacy-risk payloads, writes `sourceType=owner_reviewed_correction`
rows through `learning-evidence-ledger-service`, and reads grouped public
correction DTOs from the same ledger. It does not write a separate mutable
profile override table and does not delete or rewrite historical evidence.

Routes:

- `POST /api/v1/growth/profile-corrections` records a correction after Owner
  role, visible-target, and workspace-bearer checks pass;
- `GET /api/v1/growth/profile-corrections` reads bounded correction DTOs for
  visible targets.

Allowed correction actions:

- `confirm_profile_delta`;
- `mark_observed`;
- `mark_needs_repair`;
- `mark_misconception`;
- `mark_weak`;
- `mark_stable`;
- `mark_mastered`.

The service stores only summary fields: correction id, review action, target
node ids, status, bounded reason/note, reviewer workspace id, profile-delta id,
task card id, evaluation id, source evidence ids, target-provision mode, and
selected graph context. It must reject raw learner answers, transcripts, raw
prompts, answer keys, raw model output, source-document bodies, private paths,
credentials, and provider configuration.

### `learning-profile-v2-service`

Owns learner profile projection from ledger and current profile tables.

Implementation status: implemented as a read projection over the evidence
ledger with optional legacy profile projection context. It aggregates
capability states, strengths, weaknesses, pressure signals, stale-evidence
freshness, and planner hints without turning unobserved nodes into weaknesses.
When it sees `owner_reviewed_correction` evidence, it applies the correction as
an auditable state adjustment for the affected graph nodes while keeping the
older evidence ids and source types visible in the projection. Owner
corrections do not refresh the learning-evidence timestamp; stale daily or
formal evidence must be refreshed by learner evidence.

Profile V2 should include:

- capability mastery status;
- evidence weight total and evidence count;
- confidence and stability;
- evidence recency, evidence freshness, stale reasons, and stale-evidence
  summaries;
- known misconception summaries;
- repeated friction signals such as `too_hard`, `not_learned`, or fatigue;
- strengths and preferred formats;
- subject-level readiness summaries;
- stage-assessment readiness hints.

Profile V2 should not turn unobserved graph nodes into weaknesses. Unobserved
means no evidence, not failure.

### `learning-planner-context-service`

Assembles bounded planning input from:

- knowledge graph summaries;
- Profile V2;
- pending trajectory recommendation;
- recent evidence ledger summaries;
- stage assessment cycle state;
- Owner-selected subject/domain constraints;
- available time and pressure policy.

This service owns privacy filtering before any planner model call.

Implementation status: implemented. It produces
`growth.learningPlanner.input.v1` summary-only planning input from graph
candidate nodes, Profile V2, recent evidence, stage-assessment readiness,
constraints, and privacy flags. Stage readiness is read-only in this context:
the service consumes `learning-stage-assessment-service.stageReadiness()` and
must not call the writeful eligibility/activation paths from planner-context
or Owner context reads.

### `learning-plan-orchestrator-service`

Calls Gateway to draft structured plans. It should support:

- `daily_plan`: one or a small number of low-pressure cards;
- `weekly_plan`: a short sequence of teach, practice, repair, and stretch;
- `stage_checkpoint_plan`: formal assessment suggestion or cooldown state;
- `repair_plan`: prerequisite repair after repeated weak evidence.

The planner decides objectives and card roles. It does not publish cards
directly.

Implementation status: implemented for Planner V1 draft creation through
`growth-gateway-planner-client` plus `learning-plan-validation-service`.
Validation now includes horizon policy for `daily_plan`, `weekly_plan`,
`repair_plan`, and `stage_checkpoint_plan`. Validated draft persistence and
single-item publication are owned by `learning-plan-publisher-service`.
Stage-checkpoint drafts can be stored for Owner audit, but direct publication
of a formal `stage_assessment` item is blocked with
`stage_assessment_activation_required`; formal cards still require
`learning-stage-assessment-service`.

### `learning-plan-validation-service`

Validates planner output before storage or card generation:

- schema version;
- learner/workspace scope;
- graph node ids exist and belong to the selected graph/domain pack;
- card role is allowed for the requested horizon;
- ordinary daily tasks obey low-pressure policy;
- stage assessments have explicit coverage and activation policy;
- evidence requirements are observable;
- no raw private fields are present.

Invalid plans should fail visibly and stay draft/reviewable. They must not
silently publish a card.

Implementation status: implemented for `growth.learningPlanDraft.v1`,
daily-plan low-pressure policy, weekly-plan short-sequence/no-backlog policy,
repair-plan low-pressure policy, stage-checkpoint activation-policy
requirements, target-node membership, allowed roles, required evidence fields,
and privacy-risk output rejection.

### `learning-plan-publisher-service`

Stores validated plans and turns selected plan items into card-generation
requests. It should preserve audit metadata linking:

- plan id;
- selected graph nodes;
- profile snapshot summary;
- evidence basis ids;
- generated card id;
- recommendation lifecycle id.

Implementation status: implemented for backend V1. Validated plan drafts are
stored in `learning_growth_plan_drafts`; `POST
/api/v1/growth/learning-plans/draft` returns an Owner-safe persisted preview,
and `POST /api/v1/growth/learning-plans/:planDraftId/publish` publishes one
selected item through `learning-card-generation-service`. The service marks a
draft `published` only after card generation succeeds. Owner embedded preview
UI and production planner readiness smoke remain later slices.

### `learning-daily-loop-service`

Owns the Owner-supervised daily-loop backend facade for UI and harness use.

Implementation status: implemented. The service composes
`learning-card-generation-context-service`, `learning-plan-publisher-service`,
`learning-cycle-audit-service`, and `learning-audit-completeness-service`.
It provides:

- `preview`: bounded readiness/context plus optional cycle audit and
  completeness readback;
- `draft`: context preflight plus plan draft delegation;
- `publish`: plan publish delegation, bounded generation ids, publish-attempt
  failure visibility, and post-publish audit/completeness refresh.

Routes:

- Owner-only `GET /api/v1/growth/daily-loop/preview`;
- Owner-only `POST /api/v1/growth/daily-loop/draft`;
- Owner-only `POST /api/v1/growth/daily-loop/publish`.

The service must not call Gateway directly, call card generation directly,
read or write SQLite tables directly, start scheduling, notify Action Inbox,
activate stage assessments, or expose generated authoring draft internals.

### `learning-loop-state-service`

Owns compact Owner-loop state readback for UI and harness use.

Implementation status: implemented. The service composes
`learning-daily-loop-service.preview` and read-only
`learning-stage-assessment-service.stageReadiness` into
`growth.learningLoopState.v1`.

It returns:

- target, scope, readiness, profile, audit, stage-assessment, and
  recommendation summaries;
- one `status` value for the current loop;
- one `nextAction` for Owner review, draft, publish, audit completion,
  target provisioning, graph selection, or planner configuration.

Routes and smoke:

- Owner-only `GET /api/v1/growth/learning-loop/state`;
- no-write `npm run smoke:learning-loop-state`.

The service must not call Gateway, import repositories, publish plans,
generate cards, evaluate submissions, start schedulers, deliver notifications
or handoffs, activate stage assessments, or mutate learner state.

### `learning-plan-audit-service`

Owns bounded readback for validated plan drafts and publication audit links.

Implementation status: implemented. The service reads
`learning_growth_plan_drafts` only through the plan-draft repository and
returns public DTOs containing plan draft id, horizon, status, selected item,
generated task-card id, generated graph-plan id, bounded target node ids,
basis evidence ids, timestamps, and summary-only item reasons. It supports
workspace, learner, program, status, target-node, and limit filters. The
Owner generation context projects this as `ownerAudit.planAudit` and
`planAudit`; `GET /api/v1/growth/learning-plans/audit` exposes the same
service boundary after Growth view-target visibility passes.

The service must not publish cards, call Gateway, compute profile deltas, or
expose raw planner payloads, prompts, model output, source-document bodies,
private paths, learner answers, transcripts, tokens, cookies, or provider
configuration.

### `learning-target-provisioning-service`

Owns the policy that decides whether a visible target learner is allowed to
use a selected domain pack, domain, subject, and graph-node set for planning
or card generation.

Implementation status: backend V1 is defined for explicit provisions and the
Fanfan sample fallback. The service writes summary-only provision rows through
`learning_growth_domain_pack_provisions`, exposes provisioned graph options to
Owner context, and is the required guard before planner draft, plan publish,
and direct card generation.

This service is separate from `GET /api/v1/growth/view-targets`.
`view-targets` answers "can this actor see this learner?" Target provisioning
answers "can Growth plan/generate learning content for this learner and this
domain pack?" A learner can be visible but not provisioned for a subject.

Rules:

- Owner can create or update a provision only after target visibility passes;
- non-Owner workspace actors cannot provision another learner;
- the provision stores workspace id, learner id, program id, domain pack id,
  domain, subject, status, source, and bounded policy metadata only;
- provisions validate against imported native graph/domain-pack options;
- generated plans and cards must use graph nodes that belong to the selected
  provisioned pack/domain/subject;
- the Fanfan sample fallback exists only to keep the first sample workflow
  operable before every target has explicit provisions;
- no raw graph JSON, source-document bodies, raw syllabus cache, learner
  answers, transcripts, prompts, answer keys, model output, private paths, or
  credentials may be stored in provision rows or returned in public provision
  DTOs.

## Planner Model Contract

The planner model input must be structured and summary-only:

```json
{
  "schemaVersion": "growth.learningPlanner.input.v1",
  "target": {
    "workspaceId": "weixin_stephen",
    "learnerId": "fanfan",
    "displayName": "Fanfan"
  },
  "horizon": "daily_plan",
  "constraints": {
    "availableMinutes": 15,
    "lowPressure": true,
    "allowedCardRoles": ["teaching", "practice", "repair", "stretch"]
  },
  "knowledgeGraph": {
    "domainPackId": "uk_hk_curriculum_foundation",
    "candidateNodes": [
      {
        "nodeId": "science-force-basic",
        "label": "basic force explanation",
        "prerequisiteNodeIds": ["science-observation-language"],
        "evidenceRequired": ["explain_cause_effect"]
      }
    ]
  },
  "profileSummary": {
    "strengths": ["short bounded summaries"],
    "weaknesses": ["short bounded summaries"],
    "staleEvidence": ["bounded refresh-needed summaries"],
    "recentMisconceptions": ["short bounded summaries"],
    "pressureSignals": ["too_hard:2"]
  },
  "recentEvidence": [
    {
      "evidenceId": "evidence_...",
      "sourceType": "daily_evaluation",
      "graphNodeIds": ["science-observation-language"],
      "scoreBand": "medium",
      "summary": "bounded summary"
    }
  ]
}
```

Planner output must be a draft:

```json
{
  "schemaVersion": "growth.learningPlanDraft.v1",
  "horizon": "daily_plan",
  "planSummary": "bounded Owner-visible reason",
  "items": [
    {
      "itemId": "plan_item_...",
      "cardRole": "teaching",
      "subject": "science",
      "targetNodeIds": ["science-force-basic"],
      "estimatedMinutes": 12,
      "difficultyBand": "foundation",
      "supportLevel": "guided",
      "evidenceRequirements": ["explain_cause_effect"],
      "reason": "bounded reason",
      "pressurePolicy": {
        "completionPolicy": "daily_score_once",
        "passScoreRequired": false
      }
    }
  ],
  "audit": {
    "basisEvidenceIds": ["evidence_..."],
    "profileSnapshotId": "profile_snapshot_..."
  }
}
```

The validated plan may then feed existing card authoring.

## Model Boundary Map

The operating loop has three model-entered steps. All three go through Gateway
and all three produce drafts before durable writes.

| Step | Owning service | Gateway purpose | Durable write after validation |
| --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` through `growth-gateway-planner-client` | Choose the next objective, card role, graph target, difficulty, support level, and evidence requirements from Profile V2 plus knowledge graph summaries. | `learning-plan-publisher-service` stores a validated summary-only row in `learning_growth_plan_drafts`. |
| Author | `learning-card-authoring-service` through `growth-gateway-authoring-client` | Write the learner-facing card content from a validated `learningGraphPlan` or validated planner item. | `card-authoring-publisher` transactionally writes the card, parent rows, graph binding, and publish audit metadata. |
| Evaluate | `learning-card-evaluation-service` through `growth-gateway-evaluation-client` | Score the current submitted evidence and produce bounded feedback/evidence summaries. | `growth-evaluation-service` writes `learning_evaluations`, reward settlement, profile/trajectory updates, and evidence-ledger rows. |

Model inputs may contain bounded current evidence only at the evaluation step.
Planning and authoring must use summaries, graph metadata, profile state,
recent evidence summaries, and experience signals. They must not include full
historical answers, full transcripts, raw prompts, raw model output, hidden
answer keys, secrets, private paths, or provider configuration.

The deterministic local evaluator remains a fallback/harness boundary when no
evaluation Gateway endpoint is configured. It is not the final production
pedagogy path for ordinary AI-driven cards.

## Closed-Loop State Transitions

A successful daily operating-loop cycle should have this auditable shape:

1. `learning-evidence-ledger-service` contains recent summary-only evidence
   for target/prerequisite nodes.
2. `learning-profile-v2-service` projects capability state, weakness,
   pressure, freshness, and planner hints.
3. `learning-planner-context-service` assembles
   `growth.learningPlanner.input.v1`.
4. `learning-plan-orchestrator-service` receives a Gateway draft and
   validation accepts `growth.learningPlanDraft.v1`.
5. `learning-plan-publisher-service` persists the draft.
6. Owner or a controlled service call publishes one selected item.
7. `learning-card-generation-service` generates and publishes one graph-bound
   card.
8. The learner submits exactly one answer payload for the daily card.
9. The evaluation worker evaluates once and persists the result.
10. Rewards settle idempotently from the score and policy.
11. Evaluation/reflection/signal evidence is projected into the evidence
    ledger.
12. Profile V2 and trajectory projections change the next planning context.

If any model output fails validation, the state should stop at a visible draft,
retryable queue job, or Owner-reviewable failure. Growth must not create a
half-plan, half-card, or half-evaluation.

## Evidence Ledger Contract

The ledger is the central audit trail for learning state, not a replacement for
source tables. Source tables remain authoritative for submissions,
evaluations, reflections, rewards, audio, and stage cycles. The ledger stores a
bounded learning-evidence projection over those sources.

Minimum ledger fields:

| Field | Meaning |
| --- | --- |
| `evidence_id` | Stable idempotency key for the evidence projection. |
| `workspace_id` | Target learner workspace. |
| `learner_id` | Target learner id. |
| `program_id` | Program/domain context when known. |
| `graph_node_ids_json` | Existing graph nodes affected by the evidence. |
| `source_type` | `daily_evaluation`, `reflection`, `experience_signal`, `stage_assessment`, `owner_review`, or `backfill_summary`. |
| `source_id` | Source row id, such as evaluation id, reflection id, signal id, or cycle id. |
| `card_role` | Card role when evidence came from a task card. |
| `evidence_weight` | Bounded numeric weight. Daily evidence is low; stage assessment evidence can be `1`. |
| `confidence` | Confidence of the evidence summary. |
| `score_band` | Bounded score bucket, not necessarily raw score. |
| `status` | `observed`, `weak`, `stable`, `mastered`, `misconception`, or `needs_repair`. |
| `summary_json` | Short bounded summaries for profile and Owner audit. |
| `privacy_class` | Expected to remain `summary_only` for V1. |
| `created_at` | Evidence projection timestamp. |

The ledger must be idempotent by `(source_type, source_id, graph_node_id)` or a
stronger explicit source key.

## Profile V2 Contract

Profile V2 should be a read projection. It should not require the planner,
authoring, or UI code to inspect raw source tables directly.

Profile output should include:

- `capabilityStates`: graph-node keyed mastery, status, confidence, evidence
  count, evidence weight total, last observed date, learning-evidence dates,
  evidence freshness, and stale flags;
- `strengths`: short bounded summaries with evidence ids;
- `weaknesses`: short bounded summaries with evidence ids;
- `staleEvidence`: graph-node keyed bounded summaries whose learning evidence
  should be refreshed before stretch claims or formal assessment;
- `misconceptions`: misconception summaries with affected graph nodes;
- `learningHabits`: bounded signals such as finishes quickly, needs examples,
  benefits from audio reflection, or repeated fatigue;
- `pressureSignals`: recent `too_hard`, `not_learned`, or low-confidence
  streaks;
- `stageReadiness`: eligible, dormant, cooldown, or active signals by
  capability cluster;
- `recommendedPlannerHints`: deterministic hints for planner input, not final
  card decisions.

## Low-Pressure Policy

Ordinary daily cards:

- target 10-15 minutes;
- expose one active submission box;
- evaluate once;
- allow one reflection;
- complete after first evaluation;
- settle score-proportional Growth learning coins;
- use low or medium evidence weight;
- feed the planner rather than forcing immediate retries.

Formal stage assessment cards:

- target 25-30 minutes;
- are not daily homework debt;
- require activation policy and explicit coverage;
- use high evidence weight;
- update profile more strongly than daily cards;
- move to cooldown after completion.

## Owner Audit Surface

Owner should eventually be able to inspect:

- selected learner workspace and domain pack;
- current Profile V2 summary;
- recent evidence ledger items;
- planner input summary;
- model-boundary readiness for planner, authoring, and evaluation;
- validated plan draft and reasons;
- generated card id and graph bindings;
- evaluation result and profile delta;
- stage-assessment eligibility and cooldown;
- visible failures and Owner review actions.

Owner audit must remain bounded. It should never expose full private answers,
full transcripts, raw prompts, raw model responses, hidden answer keys, access
tokens, or private file paths.

Current backend/API status:

- `GET /api/v1/growth/card-generation/context` accepts bounded selectors such
  as `domain`, `subject`, `domainPackId`, `horizon`, and `availableMinutes`
  after target visibility passes.
- The route returns `graphOptions` from native graph tables, including
  imported domain-pack and subject options for the selected target context.
- The route returns `plannerReadiness` and `plannerContextPreview` from
  `learning-planner-context-service`, including candidate-node counts,
  bounded profile summary, recent evidence summaries, low-pressure
  constraints, and summary-only privacy flags.
- The route returns Owner-safe `profileV2` from
  `learning-profile-v2-service`, excluding legacy profile raw payloads.
- The route returns bounded `evidenceAudit` rows from
  `learning-evidence-ledger-service`.
- `GET /api/v1/growth/evidence/audit` returns persisted public evidence-ledger
  DTOs after target visibility passes. It supports bounded learner, program,
  evidence id, source type, source id, task-card id, card role, status,
  target-node, and limit filters, and must remain summary-only.
- `GET /api/v1/growth/profile-delta-audits` returns persisted public
  profile-delta DTOs after target visibility passes. It supports bounded
  learner, program, task-card, evaluation, profile-delta id, and limit
  filters, and must remain summary-only.
- `readiness.operatingLoopGatewayReady` is true only when planner, authoring,
  and evaluation Gateway boundaries are configured. Existing direct card
  generation readiness remains separate so non-planner generation can still be
  inspected.
- `npm run smoke:planner-readiness` can check the planner Gateway boundary
  without writing a plan or card. It returns bounded status and draft summary
  fields only.

Remaining Owner audit work is the embedded UI rendering for plan, evidence,
profile, persisted profile delta, Owner corrections, and next-recommendation
audit. The backend `ownerAudit` projection is already exposed by
`GET /api/v1/growth/card-generation/context`.

## Generalization Beyond Fanfan

Fanfan is the sample target. Generalization requires these parameters to be
explicit:

- actor workspace and target learner workspace;
- learner id;
- graph/domain pack id;
- subject and program id;
- planner horizon;
- allowed card roles;
- available minutes;
- pressure policy;
- Gateway readiness;
- Owner permissions and target visibility.

The first generalized slice should be a Fanfan science daily card because it
forces the system to use a non-English subject while still keeping one learner,
one target workspace, and one low-pressure daily card flow.

## Domain-Pack And Subject Selection

Growth must not hard-code science, English, or Fanfan into planner inputs. The
selection chain is:

1. `graph-repository.domainPackOptions()` projects imported native graph
   domain packs and distinct subjects from SQLite.
2. `learning-target-provisioning-service` filters those options through the
   selected learner's active provisions, with a Fanfan sample fallback while
   the first sample remains the only fully enabled target.
3. `learning-card-generation-context-service` exposes the bounded projection
   as `graphOptions` plus `targetProvisioning`.
4. Owner UI uses `graphOptions.domainPacks` and `graphOptions.subjects` to
   choose a target domain pack and subject.
5. Planner context receives the selected `domainPackId`, `domain`, and
   `subject`.
6. Card generation and graph binding validate that selected target nodes
   belong to the imported graph/domain context.

`graphOptions` is read-only and summary-only. It may include:

- `ok`, `available`, selected domain pack, selected domain, and selected
  subject;
- domain-pack id, import id, title, domain, source kind, version, visibility,
  import status, node count, subject count, subject labels, and update time;
- a deduplicated subject list for the current target context.

It must not expose `raw_json`, source-document bodies, raw syllabus cache,
private paths, raw prompts, learner answers, transcripts, or model output.

`targetProvisioning` is the policy summary for the selected target. It may
include:

- `ok`;
- `targetEnabled`;
- `mode`, such as `explicit_provision` or `sample_default`;
- selected domain pack, domain, and subject;
- a bounded failure code such as `learning_target_not_provisioned`;
- summary-only provision ids and status.

It must not include raw provision policy internals beyond bounded public
metadata and must not include raw learner or source-document payloads.

Defaulting rule:

- an ordinary `daily_english_v1` request can still use recipe defaults when
  Owner did not explicitly choose a graph selector;
- when Owner supplies `domain`, `subject`, or `domainPackId`, those selectors
  override the English recipe defaults for preview and planner context;
- card publication still validates actual target graph nodes before writing.

## Implementation Roadmap

### Phase 0: Current card and assessment loop

Status: implemented.

- daily generated card loop;
- Gateway authoring and evaluation boundaries;
- Profile/mastery update;
- trajectory recommendation lifecycle;
- stage assessment activation, high-weight evidence, completion, and cooldown.

### Phase 1: Operating-loop documentation and harness contract

Status: this document defines the target.

Deliverables:

- add this document to the Growth docs index;
- update architecture docs with the target service boundaries;
- add focused harness expectations before implementation.

### Phase 2: Evidence ledger and Profile V2

Status: backend foundation implemented; publication/UI audit remains later.

Implemented:

- `learning-evidence-ledger-service`;
- SQLite repository for ledger rows;
- idempotent evidence projection from evaluation, reflection, signals, and
  stage assessment completion;
- `learning-profile-v2-service`;
- expanded stale-evidence policy that differentiates daily evidence from
  longer-lived formal stage-assessment evidence;
- Owner corrections as auditable state adjustments that do not refresh
  learning-evidence recency;
- planner hints that route stale evidence to low-pressure review/refresh
  instead of treating stale strengths as stretch evidence;
- tests for idempotency, privacy, daily low weight, stage high weight,
  unobserved-node behavior, pressure signals, stale-evidence policy, and
  planner hints.

### Phase 3: Planner V1

Status: backend draft, publish, horizon-policy validation, stage-checkpoint
direct-publish blocking, and no-write readiness-smoke foundation are
implemented; Owner UI and production execution of the planner smoke remain
later.

Implemented:

- `learning-planner-context-service`;
- `learning-plan-orchestrator-service`;
- `growth-gateway-planner-client`;
- `learning-plan-validation-service`;
- `learning-plan-publisher-service`;
- `learning_growth_plan_drafts` SQLite repository;
- `POST /api/v1/growth/learning-plans/draft`;
- `POST /api/v1/growth/learning-plans/:planDraftId/publish`;
- fake Gateway planner harness;
- valid JSON, invalid JSON, high-pressure daily-policy failure, and
  privacy-risk output harnesses;
- bounded `weekly_plan` acceptance plus weekly backlog/formal-assessment
  rejection harnesses;
- `stage_checkpoint_plan` acceptance only when the draft declares activation
  through `learning-stage-assessment-service`;
- direct publish blocking for stage-checkpoint/formal-assessment items so a
  planner draft cannot bypass `learning-stage-assessment-service`;
- plan draft persistence, publish success, publish failure, and route scoping
  harnesses;
- `smokePlannerReadiness()` and `npm run smoke:planner-readiness`, returning a
  bounded no-write draft summary for real Gateway readiness checks.

Remaining:

- embedded Owner UI for plan preview and explicit publish.
- run the planner readiness smoke against production Gateway config before
  deploying planner UI.

Planner V1 should produce a draft plan. It should not directly publish cards
without validation and explicit service-owned publication.

### Phase 4: Science daily-card vertical

Status: service-level closed-loop harness implemented; explicit target
provisioning policy is the backend guard for taking this beyond the Fanfan
sample. Embedded Owner UI and production planner smoke remain later.

Implemented:

- one science planner item using harness KG/domain data;
- persisted plan preview for a Fanfan science daily card at the service/route
  boundary;
- Gateway authoring through the existing card authoring path;
- learner completion through the existing daily card evidence flow;
- evaluation to ledger to Profile V2 to next recommendation.

Remaining:

- embedded Owner UI for plan preview and explicit publish;
- production planner readiness smoke execution with real Gateway config;
- embedded subject/domain-pack selection. Backend context now exposes
  `graphOptions`, accepts `domain`, `subject`, and `domainPackId` selectors,
  and validates the science vertical at service level, but the embedded UI does
  not yet expose the selector.
- embedded Owner controls for creating or reviewing target/domain-pack
  provisions.

This phase proves that the loop is subject-general, not English-specific.

### Phase 4.5: Target/domain-pack provisioning

Status: backend contract documented; backend service/harness is the required
guard before broad multi-target rollout.

Deliverables:

- `learning-target-provisioning-service`;
- `learning_growth_domain_pack_provisions` repository/table;
- Owner-only provision route:
  `POST /api/v1/growth/domain-pack-provisions`;
- generation context projection of `targetProvisioning` and filtered
  `graphOptions`;
- enforcement in planner draft, plan publish, and direct card generation;
- focused tests for sample fallback, non-sample blocking, explicit provision
  success, wrong-subject rejection, wrong-node rejection, route Owner policy,
  and raw graph/provision data exclusion.

Completion criterion:

- a non-Fanfan visible learner cannot receive a generated card for a domain
  pack until Owner creates a valid provision;
- Fanfan sample still works without manual provisioning during V1;
- no route or UI path can bypass the service by passing only `domainPackId` or
  `targetNodeId`.

### Phase 4.6: Post-evaluation profile delta

Status: backend service, durable audit persistence, and harness implemented.

Implemented:

- `learning-profile-delta-service`;
- `learning-profile-delta-audit-service`;
- bounded Profile V2 snapshot before and after a processed evaluation;
- `profile_delta` DTO returned by `growth-evaluation-service` and ready for
  later Owner audit surfaces;
- graph-node keyed changes for status band, score band, confidence, evidence
  count, evidence weight, stale flag, evidence-freshness state,
  newly introduced or resolved stale reasons, pressure signal changes, and
  planner hint changes;
- evidence basis ids, task card id, submission id, evaluation id, and target
  learner scope;
- `learning_growth_profile_delta_audits` durable SQLite repository with
  idempotent evaluation-scoped persistence;
- `GET /api/v1/growth/profile-delta-audits` readback route constrained by
  Growth view-target visibility;
- no raw learner answer, transcript, prompt, raw model output, hidden answer
  key, source-document body, private path, or provider configuration.

Completion criterion:

- after one daily or formal evaluation, Owner can inspect a bounded report of
  what changed in Profile V2 and why;
- profile-delta failure is visible and non-fatal: it must not duplicate the
  evaluation, reward, evidence ledger, or trajectory writes;
- duplicate processing is idempotent by evaluation id;
- focused harness proves changed-node projection, no-change projection,
  unavailable profile service behavior, durable persistence, idempotent
  repository behavior, evidence-freshness change projection, and raw-marker
  exclusion.

Remaining:

- render the persisted public DTO in the embedded Owner audit UI rather than
  browser-side raw profile diffs.

### Phase 5: Stage-cycle planning and reports

Status: backend checkpoint-suggestion policy and read-only stage-readiness
projection are implemented at the planner validation/context/publisher
boundary; richer UI rendering remains later.

Deliverables:

- planner-generated stage checkpoint suggestions with explicit
  `learning-stage-assessment-service` activation policy;
- Owner-visible stage readiness report backed by summary-only
  `plannerContextPreview.stageAssessment`;
- evidence freshness and confidence thresholds;
- cooldown-aware scheduling;
- no daily backlog debt after missed days.

### Phase 6: Multi-workspace and domain-pack generalization

Deliverables:

- target learner selector beyond Fanfan sample;
- Owner provision controls beyond Fanfan sample;
- domain-pack import/selection;
- per-workspace learner profiles and evidence ledger separation;
- Owner permission checks and target visibility harness;
- route and UI projections that never mix Owner actor data with learner target
  data.
- backend service harness for non-sample provisioned targets.

## Harness Requirements

The next implementation should add focused tests before broad integration:

- `tests/learning-evidence-ledger-service.test.js`
  - implemented;
  - idempotent ledger writes from evaluation/reflection/signal/stage sources;
  - daily evidence weight is low and formal assessment evidence weight is high;
  - raw answers, transcripts, prompts, answer keys, raw model output, private
    paths, and provider config are rejected.
- `tests/learning-evidence-audit-service.test.js`
  - implemented;
  - public evidence history readback supports learner, program, evidence,
    source, task-card, card-role, status, target-node, and limit filters;
  - public DTOs strip raw/private summary fields before reaching routes or UI;
  - route harness proves visible-target scoping for
    `GET /api/v1/growth/evidence/audit`.
- `tests/learning-profile-v2-service.test.js`
  - implemented;
  - profile projection merges ledger evidence by graph node;
  - unobserved nodes are not projected as weaknesses;
  - stale evidence, source-specific freshness, Owner-correction non-refresh
    behavior, and repeated pressure signals are visible;
  - misconception summaries stay bounded.
- `tests/learning-plan-orchestrator-service.test.js`
  - implemented;
  - planner input is summary-only;
  - valid JSON and streaming Gateway outputs are accepted;
  - invalid JSON, missing graph targets, high-pressure daily policy, and privacy
    risk output fail closed;
  - readiness smoke returns only bounded no-write status and draft summaries.
- `tests/growth-planner-readiness-smoke-script.test.js`
  - implemented;
  - CLI argument parsing supports target workspace, learner, program,
    domain-pack, domain, subject, horizon, available minutes, and repeated or
    CSV target node ids;
  - target node ids are de-duplicated before reaching the service.
- `tests/learning-plan-publisher-service.test.js`
  - implemented;
  - validated plan drafts are persisted as summary-only audit records;
  - selected plan items publish through card generation and update draft status
    only after success;
  - publish failures leave the stored draft in `draft` state.
- `tests/learning-daily-loop-service.test.js`
  - implemented;
  - preview composes context with optional cycle audit and completeness;
  - draft and publish delegate to the plan publisher instead of calling
    Gateway or card generation directly;
  - publish returns bounded generation ids and strips authoring draft internals;
  - publish failure keeps bounded publish-attempt state visible;
  - privacy-risk input is rejected before downstream service calls.
- `tests/learning-automation-proposal-service.test.js`
  - required for the proposal slice;
  - source-cycle id is required before any planner draft call;
  - audit completeness failure blocks before any planner draft call;
  - unprovisioned targets block before any planner draft call;
  - successful proposal stores summary-only policy/rationale and returns an
    explicit Owner publish action;
  - Owner decision records `accepted`, `skipped`, `expired`, or `superseded`
    without publishing;
  - duplicate same-status decision is idempotent and conflicting terminal
    decision fails closed;
  - accepted-only proposal publish execution delegates to
    `learning-plan-publisher-service.publishPlanItem`;
  - successful execution writes bounded generated card/graph ids and is
    idempotent on retry;
  - failed or blocked execution writes bounded failure metadata without hiding
    the accepted proposal;
  - privacy-risk input keys fail closed;
  - proposal creation does not call card generation, authoring, evaluation,
    direct Gateway clients, stage-assessment activation, or scheduling.
- `tests/learning-plan-audit-service.test.js`
  - implemented;
  - recent validated plan drafts are projected as bounded public audit DTOs;
  - published drafts expose selected item, generated task-card id, generated
    graph-plan id, basis evidence ids, and timestamps;
  - workspace, learner, program, target-node, status, and limit filters stay
    service-owned;
  - raw planner prompts, learner answers, transcripts, source bodies, private
    paths, and provider config are excluded.
- `tests/learning-target-provisioning-service.test.js`
  - implemented for the target/domain-pack provisioning slice;
  - Fanfan sample fallback is enabled without explicit provisions;
  - non-sample learners are blocked until an active provision exists;
  - Owner-created provisions validate imported domain-pack/subject options;
  - target node ids must belong to the selected provisioned graph context;
  - public provision DTOs remain summary-only.
- `tests/learning-profile-delta-service.test.js`
  - implemented for the post-evaluation audit slice;
  - changed capability states are projected from before/after Profile V2
    snapshots;
  - evidence-freshness transitions and resolved stale reasons are projected;
  - no-change and unavailable-profile cases return bounded visible states;
  - delta output carries evidence ids and target graph node ids only;
  - persistence success and persistence failure are visible without throwing;
  - raw answers, transcripts, prompts, answer keys, raw model output, source
    document bodies, private paths, and provider config are excluded.
- `tests/learning-profile-delta-audit-repository.test.js`
  - implemented for durable audit persistence;
  - records, lists, and de-duplicates profile deltas by evaluation;
  - rejects privacy-risk keys and non-summary privacy class.
- `tests/growth-evaluation-service.test.js`
  - includes profile-delta orchestration after the evaluation/ledger
    write path;
  - profile-delta failure must not duplicate evaluation, reward, ledger,
    trajectory, or stage-assessment writes.
- `tests/learning-graph-repository.test.js`
  - implemented;
  - native graph tables project domain-pack and subject options without
    exposing `raw_json` or source material;
  - multi-domain-pack imports infer omitted node `domainPackId` from node
    domain before falling back to the first pack.
- `tests/learning-planner-context-service.test.js`
  - implemented;
  - Fanfan science context is assembled from graph candidates, Profile V2-style
    summaries, recent ledger evidence, and low-pressure daily constraints.
- `tests/learning-card-ai-loop-harness.test.js`
  - implemented with the `Fanfan science operating loop drafts, publishes,
    evaluates, and updates Profile V2` scenario;
  - implemented with the `provisioned non-sample science operating loop is
    blocked until target provision and then stays target-scoped` scenario;
  - Fanfan science daily plan -> generated card -> submission -> Gateway
    evaluation -> evidence ledger -> Profile V2 -> persisted profile delta ->
    next recommendation;
  - non-sample draft and direct generation are blocked before planner/authoring
    Gateway calls until an explicit domain-pack/subject provision exists;
  - wrong-subject requests stay blocked after provision;
  - no raw historical answer marker appears in planner, authoring, evaluation,
    profile, trajectory, or Owner audit projections.
- `tests/growth-routes.test.js`
  - implemented for draft/publish backend routes;
  - Owner plan preview, publish, and domain-pack provision routes are
    target-workspace scoped;
  - workspace actors cannot enumerate or plan for other learners.
- `tests/growth-architecture-boundary.test.js`
  - route files delegate planner, ledger, profile, and provisioning decisions
    to services;
  - no direct model vendor client is imported by Growth.

Doc locality must also include this document:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
```

## Implementation Progress And Next Slice

The first backend sequence was:

1. add evidence ledger schema/repository/service;
2. project existing evaluation/reflection/signal/stage evidence into the
   ledger;
3. add Profile V2 projection over the ledger;
4. add planner context assembly without a model call;
5. add fake Gateway planner harness and validation service;
6. implement a Fanfan science daily-card plan preview;
7. only then wire plan publication into card generation.

This order keeps the AI plan grounded in auditable evidence before adding more
UI or more card types.

Implementation progress on 2026-06-15:

- items 1-5 are implemented as backend/service/harness slices;
- item 6 has a service-level Fanfan science planner-context harness and a
  backend draft/publish route foundation, plus an end-to-end service harness
  from planner draft through Profile V2;
- item 7 has an initial backend publish bridge through
  `learning-plan-publisher-service`, plus an Owner-only daily-loop backend
  facade through `learning-daily-loop-service`; embedded Owner UI and
  production planner readiness smoke remain pending;
- target/domain-pack provisioning backend and harness are implemented, so
  non-sample rollout has a service-owned guard instead of relying on
  view-target visibility alone;
- post-evaluation profile-delta audit is implemented as a service-owned
  projection over bounded Profile V2 snapshots, injected into
  `growth-evaluation-service`, returned as `profile_delta`, persisted in
  `learning_growth_profile_delta_audits`, and covered by
  repository/service/evaluation/AI-loop harness.
- the supervised automation proposal boundary is implemented locally as the
  first non-scheduling automation layer: it requires source-cycle audit
  completeness and target provisioning, stores summary-only proposal metadata,
  records bounded Owner decision metadata, executes accepted proposal
  publication only through the plan publisher, records bounded execution
  metadata, and keeps writeful scheduling out of this layer.
- the scheduler dry-run boundary is implemented locally as a read-only service
  and Owner-only route: it lists accepted proposals, skips already-published
  executions, rechecks audit completeness and target provisioning, returns
  bounded candidate actions, and performs no writes or publication.
- the automation failure-policy boundary is implemented locally as a
  summary-only repository/service/route layer: it stores rollback/failure
  policy drafts, activates them through Owner review, reports active policy as
  one future scheduling prerequisite, and keeps `writefulSchedulingAllowed`
  false.
- the automation scheduler execution boundary is implemented locally as a
  default-disabled Owner-explicit repository/service/route layer: it records
  blocked execution when disabled, rechecks delivered handoff, reviewed digest,
  active failure-policy readiness, scheduler dry-run, final release
  authorization, and valid `writeful_execution` release activation audit
  readback when enabled, delegates only to accepted-proposal publish, and
  records bounded execution metadata without adding a background scheduler.
- the background scheduler contract is now Growth-local documentation in
  `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`: the safe tick
  boundary remains default-disabled, records summary-only run state, delegates
  only to execution, and must not become a production worker without platform,
  visual, dry-run, and release evidence.
- release-readiness production evidence can now be passed as a versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` summary-only bundle
  through `npm run smoke:release-readiness -- --evidence-bundle-file <path>`
  or `--evidence-bundle-json <json>`. The bundle can be built by
  `npm run smoke:release-evidence-bundle`, which runs selected no-write or
  default-disabled smoke CLIs, includes no-write cycle-history evidence,
  read-only Owner audit evidence, no-write profile-feedback evidence, read-only
  learner-cycle audit, read-only stage-assessment readiness, proposal smoke,
  platform action receipt evidence, central visual artifact evidence, and read-only release approval bag
  projection by default, and emits
  only summary evidence. The default `profile_feedback` task maps to
  `productionProfileFeedbackSmokeEvidence` and fails closed unless a bounded
  completed-cycle selector can read back audit completeness, persisted evidence,
  persisted profile delta, Profile V2, recommendation, and next loop state. The
  default `cycle_history` task maps to
  `productionCycleHistorySmokeEvidence` and proves bounded historical-cycle
  selection through the read-only cycle-history service. The default
  `owner_audit` task maps to `productionOwnerAuditSmokeEvidence` and proves
  bounded Owner audit/completeness/correction readback through the read-only
  Owner audit smoke. The default `platform_action` task maps to
  `platformActionEvidence` and proves a delivered
  `growth.automation.action_required` receipt exists in Growth's event outbox;
  Home AI still owns Action Inbox/Web Push internals and the evidence stores
  only bounded receipt metadata. The default `central_visual` task maps to
  `centralVisualEvidence` and validates a Home AI central visual harness
  artifact without starting Appium or running visual tooling inside Growth; the
  bundle stores only bounded visual summary fields and raw artifact paths are
  omitted. The
  default `learner_cycle` task is audit-only and maps to
  `productionLearnerCycleSmokeEvidence`; write operations still require direct
  `npm run smoke:learner-cycle` with explicit Owner-requested learner
  evidence. Controlled daily-loop draft/publish smoke
  can be added only with the explicit non-default `daily_loop_write` task plus
  `--allow-write-evidence`, and the builder then delegates to the existing
  daily-loop smoke write gate instead of importing daily-loop services. The
  written bundle should then be validated by
  `npm run smoke:release-evidence-bundle-audit`, which emits separate
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1` evidence for
  schema, summary-only status, default task coverage, pass counts, required
  evidence keys, and privacy/path leak checks before release-readiness treats
  the bundle as complete evidence. This
  remains input normalization only: readiness remains no-write by default,
  `--write-snapshot` is still explicit, and the boundary still cannot enable
  writeful scheduling.
- after bundle, bundle audit, and release-readiness artifacts exist,
  `npm run smoke:release-collection-run` can evaluate or persist one
  sanitized `growth.learningAutomationReleaseCollectionRun.v1` collection
  record. It defaults to no-write, strips artifact paths to file names, and
  writes `learning_growth_automation_release_collection_runs` only with
  explicit `--write-record`. This gives Owner/release tooling durable evidence
  of what was collected without running smoke tasks or changing scheduler
  permission.
- after a collection run exists, `npm run smoke:release-decision` can evaluate
  or persist one sanitized `growth.learningAutomationReleaseDecision.v1`
  Owner decision. It defaults to no-write, writes
  `learning_growth_automation_release_decisions` only with explicit
  `--allow-write` / `--write-record`, and requires a ready collection run for
  `approved`. This is review evidence only and does not flip runtime config,
  enable writeful scheduling, or grant scheduler permission.
- `npm run smoke:release-review` and
  `GET /api/v1/growth/automation/release-review` provide the no-write readback
  that future Owner UI can use: current readiness, latest collection run,
  latest decision, approval bag, status, and next action. It is a service-only
  projection and does not write tables, run smoke tasks, flip runtime config,
  or schedule work.
- `npm run smoke:release-authorization` and
  `GET /api/v1/growth/automation/release-authorization` provide the final
  no-write authorization readback consumed by scheduler execution. It requires
  approved release review, ready latest collection run, approved latest
  decision, and active `writefulExecutionApproval`; missing authorization
  makes scheduler execution record `blocked` before publication.
- `npm run smoke:release-closure` and
  `GET /api/v1/growth/automation/release-closure` provide a single no-write
  closure readback for Owner/release tooling. It composes release-review and
  release-authorization summaries into
  `growth.learningAutomationReleaseClosure.v1`, including
  `backendEvidenceComplete`, `readyForOwnerReleaseActivation`, missing
  check/evidence/approval keys, required actions, and one next action while
  still keeping `writefulSchedulingAllowed=false` and
  `runtimeConfigChange=false`.
- `npm run smoke:release-activation` and
  `GET /api/v1/growth/automation/release-activation` provide the no-write
  activation preflight after release closure. It composes the closure readback,
  selected activation gates (`writeful_execution`, `background_scheduler`,
  `background_worker`), current config booleans, approval keys, required
  actions, and one next action into
  `growth.learningAutomationReleaseActivation.v1`. It can report
  `readyForOwnerRuntimeConfigDecision=true`, but it does not apply config,
  grant scheduler permission, or run scheduling; it keeps
  `configChangeApplied=false`, `writefulSchedulingAllowed=false`, and
  `runtimeConfigChange=false`.
- `GET /api/v1/growth/automation/release-activations`, Owner-only
  `POST /api/v1/growth/automation/release-activations`, and
  `npm run smoke:release-activation -- --operation record --allow-write`
  provide the activation audit-record layer. These records persist only
  summary-only Owner intent and the latest activation preflight summary in
  `learning_growth_automation_release_activations`; they do not apply
  runtime config, start scheduler execution, or change learner state. When
  writeful execution is separately enabled, scheduler execution must read back
  a valid `writeful_execution` activation record before publication; missing or
  invalid records are blocked before the accepted-proposal publish boundary.
- release-readiness output also includes bounded summary-only remediation
  fields: missing check keys, blocked check keys, missing evidence keys,
  required actions, and one next action. These fields support Owner/release
  review and do not enable scheduling or execution.

The next product-completeness slice is embedded UI and production readiness:

1. add an Owner-safe embedded plan preview panel in the existing `生成` tab;
2. render the provisioned `graphOptions` domain-pack/subject selector and
   `targetProvisioning` status in the UI;
3. call `POST /api/v1/growth/learning-plans/draft` from the UI for the
   selected learner, domain pack, subject, horizon, and available minutes;
4. render the validated draft with reason, target nodes, estimated minutes,
   card role, and evidence requirements;
5. call `POST /api/v1/growth/learning-plans/:planDraftId/publish` only after
   explicit Owner action;
6. refresh generation context after publish while preserving the published
   card preview;
7. add Owner provision controls for non-sample targets;
8. render profile-delta audit from persisted public DTOs after learner
   completion;
9. run `npm run smoke:planner-readiness` against real Gateway config and add
   central visual harness coverage before production deploy.

The next backend-only slice should be driven by the embedded UI/readback needs
that appear while adding Owner planner, provision, and audit panels.
