# Growth Documentation Index

Last updated: 2026-07-06.

## Rule

Growth-specific product, architecture, implementation, runbook, and handoff
documents belong in this Growth plugin workspace. The Home AI app repository
can keep historical copies or platform-level references, but Growth work should
read and update the plugin-local documents first.

Canonical Home AI platform contracts still live in the Home AI app workspace.
Do not copy broad platform contracts, deployment runbooks, Gateway runtime
docs, Action Inbox docs, Web Push docs, or reference-memory docs here unless
they become Growth-owned.

## Current Plugin-Local Docs

| Document | Purpose |
| --- | --- |
| `docs/HOME_AI_PLATFORM_CONTRACT.md` | Growth-local platform pointer and validation matrix. |
| `docs/TEST_MATRIX.md` | Growth-local focused test matrix for service, route, smoke, release, UI, and docs-only validation selection. |
| `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md` | Required Harness obligation by H1/H2/H3 change class, including release-evidence shortcuts that remain forbidden. |
| `docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md` | Baseline plan for Growth embedded frontend Vite adoption, ESM module split, phased migration, validation, and non-goals. |
| `docs/IMPLEMENTATION_NOTES/growth-vite-completion-audit.md` | Requirement-by-requirement audit that maps the Growth Vite/ESM migration baseline to current evidence, accepted central visual evidence, and remaining Owner/deploy blockers. |
| `docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md` | Owner-review evidence packet for Growth Vite runtime cutover, including local readiness, required external evidence, and deployment ordering. |
| `docs/IMPLEMENTATION_NOTES/growth-vite-owner-approval-request.md` | Ready-for-Owner approval request for Growth Vite runtime cutover, including approval wording, current evidence summary, preserved runtime boundary, and deploy-lane task-card draft. |
| `docs/IMPLEMENTATION_NOTES/growth-vite-deploy-lane-request-draft.json` | Summary-only machine-readable deploy-lane request draft for the Growth Vite runtime cutover; not an approval record and not a sent deploy card. |
| `docs/GROWTH_PLUGIN_ARCHITECTURE.md` | Current plugin service/module architecture, operational smoke scripts, and harness map. |
| `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` | Durable system scheme for Growth's AI-guided learning product: product thesis, supervised learning-program model, daily/checkpoint/program time scales, strategic product planes, closed loop, learner state model, model-entered steps, daily versus stage-assessment card families, Owner modes, automation maturity, implementation packages, and harness contract. |
| `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` | Closed-loop product contract for the supervised AI learning scheme: product goal, learner state model, daily versus stage-assessment card families, Gateway model boundaries, service-first architecture, Owner workflow, audit requirements, supervised automation proposal policy, generalization rules, staged implementation plan, and harness contract. |
| `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` | Execution plan for the supervised AI learning system: target outcome, current baseline, non-negotiable boundaries, program-level workstreams, closure ladder, model-entered steps, durable state map, delivery packages, immediate implementation choice, and package-level definition of done. |
| `docs/GROWTH_LEARNING_OPERATING_LOOP.md` | Target AI-driven learning operating loop, next architecture optimization plan, and implementation plan for evidence ledger, Profile V2, planner, profile-delta audit, target/domain-pack provisioning, supervised automation proposal, cross-subject cards, and multi-workspace generalization. |
| `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` | Execution-ready blueprint for the AI learning loop, including staged execution roadmap, durable records, model boundaries, supervised automation proposal contract, next implementation slices, and harness matrix. |
| `docs/GROWTH_AI_LEARNING_ROADMAP.md` | Roadmap for the supervised AI learning system: planning rule, daily/checkpoint/program time-scale roadmap, capability model, scientific learning policy, Owner operating modes, Fanfan science daily-card playbook, supervised automation proposal playbook, capability readiness levels, product rules, model-entered steps, delivery stages, data ownership, failure policy, release gates, documentation and harness contract, and immediate next slice. |
| `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` | Durable next-stage plan for the supervised AI learning system: end-to-end closed-loop mechanism, current capability summary, current execution decision, next architecture optimization target, product-visible Owner loop path, backend release-readiness gate path, release-readiness smoke/snapshot CLI plus summary-only release evidence records, release evidence bundle builder, release workbench readback/action evidence including Owner-triggered evidence collection, and package audit-record boundary, versioned evidence bundles, readiness DTO and snapshot contract, Fanfan science daily playbook, readiness semantics, harness matrix, and definition of done. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` | Supervised automation digest plan that must sit between proposal/scheduler dry-run evidence and any future writeful scheduler. Defines digest service, repository, route, UI, failure, privacy, and harness boundaries. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md` | Rollback/failure-policy backend contract for scheduling readiness. Defines failure-policy service, repository, routes, readiness semantics, safe defaults, and harness gates without enabling writeful scheduling. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` | Automation action handoff contract between reviewed digest/failure-policy gates and Home AI platform notification surfaces. Defines handoff service, repository, routes, event mapping, delivery failure semantics, and harness gates without enabling writeful scheduling. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` | Default-disabled Owner-explicit scheduler execution boundary. Defines execution service, repository, routes, config gate, gate rechecks, failure semantics, and harness requirements without adding a background worker or production auto-scheduling enablement. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` | Future/default-disabled background scheduler contract. Defines the supervised scheduler tick boundary, run persistence, reviewed worker target configuration, worker lease/timer shape, route shape, config gates, delegation-only execution path, safety gates, forbidden boundaries, and harness requirements without enabling production background scheduling. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_OWNER_REVIEW_EVIDENCE.md` | Summary-only Owner automation evidence read model over proposal, digest, failure-policy, action-handoff, scheduler execution/run, worker-target, and release-readiness services. Defines route, smoke CLI, release evidence bundle/readiness integration, persisted evidence key, DTO, forbidden boundaries, and harness without creating a new table or enabling scheduling. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_CLOSED_LOOP_ACTION_PLAN.md` | No-write closed-loop action-plan readback over operating-loop, profile-feedback, digest, failure-policy, and action-handoff services. Defines Owner-only route, smoke CLI, next-action templates, forbidden boundaries, and Harness without enabling scheduling or mutating learner state. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_RUNTIME_ENABLEMENT.md` | Runtime enablement audit/readback boundary. Defines the summary-only record layer after release activation, current config readback semantics, routes, CLI, statuses, and harness gates without mutating runtime config or granting scheduler permission. |
| `docs/GROWTH_AI_LEARNING_AUTOMATION_RELEASE_CONTROLS.md` | Owner release-controls readback boundary. Defines the single summary-only status surface over readiness, review, closure, activation, and runtime enablement, plus route, CLI, status semantics, forbidden boundaries, and harness gates without writing state or enabling scheduling. |
| `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md` | Native KG import, planning, binding, and runtime migration boundary. |
| `docs/GROWTH_COMPUTING_AI_LITERACY_KG_PLAN.md` | Source-pack and local-development import record for Fanfan's breadth-first computing and AI literacy domain pack, including source strategy, domain-pack identity, strand map, evidence types, stage checkpoints, source hash, validation, and remaining production/target-provisioning steps. |
| `docs/GROWTH_CARD_GENERATION_RULES.md` | Consolidated card generation and evaluation rules for new Growth card authoring and one-shot grading. |
| `docs/GROWTH_AI_CARD_LOOP.md` | Growth-owned AI loop for learner profile, next-card strategy, card generation, Gateway evaluation evidence, trajectory, and profile update. |
| `docs/GROWTH_REFERENCE_CONTRACT.md` | Growth V1-minimal summary-only Reference / Memory Graph plugin-side contract, object types, API, MCP tools, service ownership, privacy boundary, and Harness. |
| `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` | Owner card generation management flow, planner-backed UI plan, browser-complete science sample path, API contract, progress/error contract, and harness plan. |
| `docs/GROWTH_CARD_INTERACTION_FLOW.md` | Learner-facing generated card submission, one-shot evaluation, optional reflection, audio evidence, and harness contract. |
| `docs/home-ai-growth/` | Migrated Home AI Growth-specific docs kept in their original structure for continuity. |

## Scheme Reading Order

For the AI-driven learning scheme, use this reading order before implementation:

1. `docs/HOME_AI_PLATFORM_CONTRACT.md` for the Growth-local platform pointer,
   route boundary matrix, validation commands, and links to canonical Home AI
   platform contracts.
2. `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` for the durable system scheme:
   product thesis, supervised learning-program model, daily/checkpoint/program
   time scales, non-negotiable principles, core loop, learner state model,
   model-entered steps, daily/stage card families, Owner modes, automation
   maturity, implementation packages, and harness contract.
3. `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` for the closed-loop contract:
   product goal, current-versus-target capability boundary, learner-state
   model, card families, model-entered steps, Owner experience, audit rules,
   supervised automation policy, scheduler dry-run boundary, and harness
   contract.
4. `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` for the execution plan:
   current baseline, closure ladder, model-entered steps, delivery packages,
   immediate implementation choice, and definition of done.
5. `docs/GROWTH_AI_LEARNING_ROADMAP.md` for staged product delivery,
   capability readiness levels, release gates, and the immediate next slice.
6. `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` for the current next-stage
   choice and architecture optimization target: product-visible Owner daily
   loop first, current minimal draft/publish UI status, or a backend-only
   release-readiness evidence gate that cannot enable scheduling.
7. `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for execution-ready
   service packages, durable records, state machine, proposal/scheduler
   contracts, and exact harness matrix.
8. `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before implementing
   digest, notification, Action Inbox, rollback, or writeful scheduling work.
9. `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md` before changing
   rollback/failure policy, scheduling readiness, retry eligibility, or
   failure visibility behavior.
10. `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` before changing
   automation notification/action handoff, platform event metadata, delivery
   failure visibility, or related scheduling prerequisites.
11. `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` before
    changing Owner-explicit scheduler execution, execution persistence,
    writeful execution config, or any route that delegates accepted-proposal
    publication from automation.
12. `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before
    changing supervised scheduler run/tick behavior, reviewed worker target
    configuration, background scheduler config, run/worker persistence, or any
    future worker that inspects delivered handoffs.
13. `docs/GROWTH_AI_LEARNING_AUTOMATION_OWNER_REVIEW_EVIDENCE.md` before
    changing the Owner automation evidence read model, route, smoke CLI, or
    backend-only automation-loop evidence semantics.
14. `docs/GROWTH_AI_LEARNING_AUTOMATION_CLOSED_LOOP_ACTION_PLAN.md` before
    changing closed-loop next-action readback, action templates, or the
    Owner-only no-write action-plan route.
15. `docs/GROWTH_AI_LEARNING_AUTOMATION_RUNTIME_ENABLEMENT.md` before
    changing runtime-config enablement audit/readback, final Owner release
    controls, or any record that might be mistaken for a config switch.
16. `docs/GROWTH_AI_LEARNING_AUTOMATION_RELEASE_CONTROLS.md` before changing
    the Owner release-controls aggregation route, CLI, status semantics, or
    any surface that may be mistaken for a release/runtime-config switch.
17. `docs/GROWTH_PLUGIN_ARCHITECTURE.md` for the Service First module map,
   runtime layers, architecture backlog, and route/service/repository
   ownership rules.
18. `docs/GROWTH_COMPUTING_AI_LITERACY_KG_PLAN.md` before creating or
   importing the Fanfan computing and AI literacy domain pack.
19. `docs/GROWTH_REFERENCE_CONTRACT.md` before changing Growth plugin-side
   stable object references, reference MCP tools, or summary-only reference
   projections.
20. `docs/TEST_MATRIX.md` and
   `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md` for focused
   Harness selection and H1/H2/H3 validation obligations.
21. `docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md` before
   changing Growth embedded frontend module structure, Vite build behavior,
   static asset loading, or ESM migration boundaries.
22. `docs/IMPLEMENTATION_NOTES/growth-vite-completion-audit.md` before
   deciding whether the Growth Vite/ESM migration is internally ready for
   Owner cutover review or whether only external Owner/deploy evidence remains.
23. `docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md`
   before requesting Owner runtime-cutover approval or preparing a deploy-lane
   card for the Growth Vite migration.
24. `docs/IMPLEMENTATION_NOTES/growth-vite-owner-approval-request.md` before
   asking Owner for runtime-cutover approval or drafting a deploy-lane task
   card.
25. `docs/IMPLEMENTATION_NOTES/growth-vite-deploy-lane-request-draft.json`
   only after Owner approval when preparing the deploy-lane task card. This is
   a draft, not a sent card or approval record.
26. UI-specific work then reads
   `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` and
   `docs/GROWTH_CARD_INTERACTION_FLOW.md`.

Do not start a Growth AI-learning implementation slice from thread-local
discussion alone. The slice must name its owning document, service boundary,
DTO or persistence boundary, harness, and release evidence before code changes
are considered complete.

## Migrated Home AI Growth Docs

These files were copied from `/Users/hermes-dev/HermesMobileDev/app/docs` into
the Growth plugin workspace on 2026-06-11. Treat these plugin-local paths as
the working copies for future Growth design and implementation work.

### Modules

- `docs/home-ai-growth/MODULES/growth-learning.md`

### Implementation Notes

- `docs/home-ai-growth/IMPLEMENTATION_NOTES/async-growth-evaluation-queue.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-architecture.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-design.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-requirements.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-learning-workflow-contract-harness.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-pluginization-plan.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-flow.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/learning-mastery-profile.md`

### Runbooks

- `docs/home-ai-growth/RUNBOOKS/growth-card-stuck-waiting-ai.md`
- `docs/home-ai-growth/RUNBOOKS/growth-submit-button-disabled.md`

### FanFan Learning Design Notes

- `docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_DESIGN.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_IMPLEMENTATION.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_ARCHITECTURE.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_IMPLEMENTATION_V1_1.zh-CN.md`

## Boundary

- Plugin-local Growth docs may reference Home AI platform contracts by absolute
  path because those contracts remain centralized.
- Plugin-local Growth docs should not require agents to open Home AI app Growth
  docs to understand card generation, KG planning, evaluation, rewards, or
  runbooks.
- Imported historical docs may contain old Home AI code paths such as
  `adapters/*` or `server-routes/*`. Those paths are historical implementation
  references, not a license to copy Home AI server code into the plugin.
- New Growth documentation should be written in English unless it is explicitly
  user-facing product copy.
