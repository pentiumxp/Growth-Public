# Home AI Platform Contract Pointer

Last updated: 2026-06-15.
Home AI platform contract version: `20260611-v3`.

## Scope

Growth is a planned standard Home AI embedded plugin. This file records only
Growth-local facts and points back to the canonical Home AI platform contract.

The current Growth plugin workspace is in migration stage. The existing mature
Growth code still lives in the Home AI built-in Growth module and must be
extracted through an explicit service/API boundary rather than by copying the
Home AI server into this plugin. The plugin can read the Home AI
`/api/growth/v1/*` facade, import bounded board/card projections into its
local snapshot store with readback metadata, normalize bounded Growth events,
persist them through a local outbox, deliver them to the Home AI plugin
notification endpoint when Home AI API credentials are configured, and expose a
read-only MCP schema, workspace-key execute endpoint, workspace-bound stdio
wrapper for bounded status, board, card list, and card detail projections, and
plugin-owned playback routes for migrated submission/reflection audio. It also
has a plugin-owned SQLite migration/readback path for full learning-growth
table copies from an explicit backup or development copy, plus a
workspace-bearer submission write endpoint that persists new text/audio
evidence and queues a pending Growth evaluation job, and a lightweight
evaluation processor that writes bounded evaluation records, plus plugin-owned
reflection evidence writes. The Mac production embedded plugin path now uses
this SQLite read path when
`GROWTH_DATA_OWNER=plugin` is set.

## Canonical Home AI Docs

Read these Home AI docs before changing deployment, MCP tools, mobile visual
behavior, plugin provisioning, or cross-plugin reference behavior:

- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/plugin-workspace-platform-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/plugin-mobile-ui-visual-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/macos-dev-to-production-deployment-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/macos-production-access.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/mcp-tool-upgrade-closure.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/macos-ios-simulator-appium.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/MODULES/ai-operations-control-plane.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/ai-operations-control-plane.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/reference-memory-graph-v1.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/reference-memory-graph-harness-plan.md`

## Plugin-Local Facts

Growth-local service/module boundaries are recorded in
`docs/GROWTH_PLUGIN_ARCHITECTURE.md`. That document is plugin-local only; it
does not redefine the Home AI platform contracts below.

Growth-specific product, architecture, implementation, and runbook documents
are indexed in `docs/GROWTH_DOCS_INDEX.md`. Imported Home AI Growth documents
live under `docs/home-ai-growth/` and should be treated as the plugin-local
working copies for future Growth work.

| Field | Value |
| --- | --- |
| `plugin_id` | `growth` |
| `workspace_path_windows` | `not assigned; Mac dev workspace is canonical for Growth migration` |
| `workspace_path_macos_dev` | `/Users/hermes-dev/HermesMobileDev/plugins/growth` |
| `user_entrypoint_symlink` | `/Users/xuxin/Developer/HomeAIDev/growth` |
| `production_source_path_macos` | `/Users/hermes-host/HermesMobile/plugins/growth` |
| `production_data_root_macos` | `/Users/hermes-host/HermesMobile/plugins/growth/data` planned, plus workspace-local `.hermes-growth` bindings |
| `windows_dev_base_url` | `http://127.0.0.1:4881` |
| `macos_dev_base_url` | `http://127.0.0.1:4881` |
| `macos_production_base_url` | `http://127.0.0.1:4881` |
| `launchd_label` | `com.hermesmobile.plugin.growth` |
| `manifest_url` | `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest` |
| `mcp_command` | `node scripts/growth-mcp-wrapper.js --workspace <worker-workspace-root> --api-base-url http://127.0.0.1:4881 --no-workspace-override` |
| `mcp_schema_endpoint` | `GET /api/v1/growth/mcp/schemas` read-only schemas for `growth.get_status`, `growth.get_board`, `growth.list_cards`, and `growth.get_card`. |
| `mcp_execute_endpoint` | `POST /api/v1/growth/mcp/execute` with the workspace-local `.hermes-growth/access-key.txt` bearer and `workspace_id`; executes read-only bounded tools. |
| `mcp_gateway_worker_files` | Home AI materializes `scripts/growth-mcp-wrapper.js` and `src/mcp/growth-mcp-schemas.js` into `<Home-AI-root>/gateway-worker/growth-mcp` before Gateway profile rendering. Copying only the wrapper is invalid because it imports the schema module. |
| `migration_snapshot_import` | `POST /api/v1/growth/migrations/facade-snapshot` with Growth registration bearer; imports bounded Home AI facade board/card projections into plugin snapshot storage. |
| `migration_snapshot_readback` | `GET /api/v1/growth/migrations/readback?workspace_id=<id>` with Growth registration bearer; returns bounded snapshot metadata only. |
| `migration_sqlite_import` | `npm run import:learning-sqlite -- --source-db <backup.sqlite3> --target-db <plugin-data>/growth-learning.sqlite3 --write --workspace-id <workspace>`; copies a verified learning-growth SQLite backup into plugin-owned storage with backup/readback metadata. |
| `migration_sqlite_rollback` | `npm run import:learning-sqlite -- --target-db <plugin-data>/growth-learning.sqlite3 --rollback <backup.sqlite3> --write`; restores the previous plugin-owned SQLite database from the script-created backup. |
| `regenerable_card_retirement` | `node scripts/retire-growth-cards.js --target-db <plugin-data>/growth-learning.sqlite3 --workspace-id <workspace> --dry-run --json`; use `--write` only after dry-run review. Retires old board projection, old KG pilot, and old evergreen cards that can be regenerated, preserving learner history rows. |
| `plugin_learning_db_path` | `GROWTH_LEARNING_DB_PATH`, default `data/growth-learning.sqlite3`. |
| `plugin_data_owner_switch` | `GROWTH_DATA_OWNER=plugin` makes the plugin prefer plugin-owned SQLite for status, board, and card reads. Default remains `home-ai` facade first. |
| `plugin_audio_playback` | `GET /api/v1/growth/audio/submissions/:submissionId` and `GET /api/v1/growth/audio/reflections/:reflectionId`; streams plugin-owned SQLite BLOB audio first, then bounded legacy artifact files for older records. Playback content type preserves explicit non-generic stored MIME values and maps `.webm` to `audio/webm`, `.ogg` / `.opus` to `audio/ogg`. |
| `plugin_submission_write` | `POST /api/v1/growth/cards/:taskCardId/submissions` with the workspace-local `.hermes-growth/access-key.txt` bearer and `workspace_id`; accepts bounded JSON text/audio evidence, resolves native task card ids or legacy `kanban_card_id`, writes plugin-owned submissions/audio BLOBs/sessions, and enqueues pending `learning_growth_evaluation_jobs` rows. |
| `plugin_evaluation_processing` | `POST /api/v1/growth/evaluations/process` with the workspace-local bearer; claims due pending/retry jobs and stale `processing` jobs whose `leaseUntil` has expired, evaluates one submitted daily card through the configured Growth Gateway evaluation service or deterministic local fallback, writes bounded `learning_evaluations`, and marks jobs done/retry/failed. Active `processing` leases are not stolen. If retries are exhausted without a persisted evaluation, card projection exposes bounded `latestEvaluationJob`, `laneId=evaluation_failed`, and `primaryAction=owner_review` so learner UI shows a visible recovery state. Optional dispatcher is controlled by `GROWTH_EVALUATION_WORKER_ENABLED` and `GROWTH_EVALUATION_WORKER_INTERVAL_MS`. |
| `plugin_evaluation_owner_review` | `POST /api/v1/growth/evaluations/owner-review` with `x-hermes-plugin-actor-role=owner`; the current Owner workspace bearer authorizes the call, and the target `workspace_id` must be visible through Growth view targets. `learning-evaluation-owner-review-service` can retry only terminal `failed` evaluation jobs, moves the job back to `retry`, clears lease/error fields, and stores bounded `raw.ownerReviews` audit metadata. It does not reopen learner submission/reflection, does not write raw learner content, and does not call Gateway directly; the next evaluation still runs through `plugin_evaluation_processing`. |
| `plugin_reflection_write` | `POST /api/v1/growth/cards/:taskCardId/reflections` with the workspace-local bearer; accepts bounded text/audio reflection evidence, resolves native task card ids or legacy `kanban_card_id`, writes `learning_task_reflections`, and stores optional reflection audio BLOBs. |
| `plugin_experience_signal_write` | `POST /api/v1/growth/cards/:taskCardId/experience-signals` with the workspace-local bearer; writes learner difficulty feedback through `learning-experience-signal-service`, requires graph target nodes, stores `sourceType=learner_feedback` rows in `learning_growth_experience_signals`, and rejects raw answers, transcripts, prompts, answer keys, secrets, private paths, or provider configuration. |
| `plugin_graph_plan_write` | `POST /api/v1/growth/graph/plans` with the workspace-local bearer; creates bounded `learning_graph_plans` over imported native graph nodes. This route only writes plans; card publication happens through the generation route or explicit graph-binding route. |
| `plugin_card_graph_binding_write` | `POST /api/v1/growth/cards/:taskCardId/graph-binding` with the workspace-local bearer; binds a task card to an existing graph plan and node coverage using the URL card id as authoritative. |
| `plugin_card_generation_write` | `POST /api/v1/growth/cards/generate` with the workspace-local bearer; creates or accepts a graph plan, summarizes bounded historical Growth SQLite data, calls Gateway through the Growth authoring client, validates the draft, and writes the generated `learning_task_cards` row plus graph binding in one transaction. `learning-card-generation-recipe-policy-service` owns V1 `daily_english_v1` defaults, so an ordinary daily request can submit only target workspace, learner id, `recipe_id`, and card schema version. If a daily generation request omits `targetNodeId`, `learning-card-next-target-service` selects a bounded default graph target from `learning-card-recommendation-service`, which prefers the selected learner's latest pending trajectory `nextRecommendation` before falling back to recomputed profile strategy and graph suggestions; legacy no-status recommendations are treated as pending, while accepted/skipped/expired/superseded recommendations are skipped. When a new trajectory recommendation is written for the same learner/program, older pending recommendations are marked superseded. After a generated card publishes, Growth marks the consumed trajectory recommendation `accepted` with bounded ids/timestamps so it is not reused. Generated daily cards carry `daily_score_once`: one evaluation, one reflection stage that can be submitted once, completion after the first evaluation, and score-proportional learning-coin settlement without a pass-line gate. When served through the Home AI same-origin plugin proxy, the host attaches the server-side `.hermes-growth/access-key.txt` bearer to proxied write requests after Hermes workspace access is checked. Direct plugin-port writes still require the bearer explicitly. |
| `plugin_learning_plan_draft_write` | `POST /api/v1/growth/learning-plans/draft` with the workspace-local bearer; Owner cross-learner requests are constrained by Growth view-target visibility. The route delegates to `learning-plan-publisher-service`, which calls the draft-only planner orchestrator, stores a validated summary-only plan in `learning_growth_plan_drafts`, and returns an Owner-safe plan preview DTO. |
| `plugin_learning_plan_publish_write` | `POST /api/v1/growth/learning-plans/:planDraftId/publish` with the workspace-local bearer; Owner cross-learner requests are constrained by Growth view-target visibility. The route delegates to `learning-plan-publisher-service`, which loads the stored validated draft, maps planner strategy roles such as `repair`/`stretch` into supported card-generation roles, calls `learning-card-generation-service`, and marks the plan draft `published` only after card generation succeeds. Failed generation, privacy/provisioning blocks, missing selected items, and stage-assessment direct-publish blocks leave the draft unpublished while recording bounded latest `publishAttempt` metadata in `learning_growth_plan_drafts`. It does not call Gateway or SQLite card publishers directly from the route. |
| `plugin_learning_plan_audit_read` | `GET /api/v1/growth/learning-plans/audit`; Owner or workspace readback for persisted plan-draft and publication audit DTOs after Growth view-target visibility passes. It delegates to `learning-plan-audit-service`, supports bounded query filters for `learnerId`, `programId`, `status`, comma-separated `targetNodeIds`, and `limit`, and returns only public summary DTOs from `learning_growth_plan_drafts` through the repository boundary, including latest publish-attempt status/error/stage. It must not expose raw planner prompts, raw model output, learner answers, transcripts, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_daily_loop_backend` | Owner-only `GET /api/v1/growth/daily-loop/preview`, Owner-only `POST /api/v1/growth/daily-loop/draft`, Owner-only `POST /api/v1/growth/daily-loop/publish`, `npm run smoke:daily-loop-preview`, and `npm run smoke:daily-loop`; Growth-owned backend facade for the Owner-supervised daily loop. Routes enforce Owner role, workspace bearer authorization for writes, and Growth visible-target scope, then delegate to `learning-daily-loop-service`. The preview CLI instantiates the normal Growth service graph and delegates only to `learningDailyLoopService.preview` for local or production no-write preview evidence. The controlled daily-loop CLI also instantiates the normal service graph and defaults to preview; `draft` and `publish` operations require explicit `--allow-write`, and `publish` also requires `--plan-draft-id`. Both CLIs must not import repositories, call Gateway directly, call the plan publisher or card generator directly, evaluate submissions, run schedulers, deliver notifications, activate stage assessments, or act as release/deploy switches. The service composes `learning-card-generation-context-service`, `learning-plan-publisher-service`, `learning-cycle-audit-service`, and `learning-audit-completeness-service` into bounded preview/draft/publish DTOs. It does not call Gateway directly, card generation directly, SQLite tables directly, notifications, Action Inbox, stage-assessment activation, or any scheduler. It strips generated authoring draft internals from publish responses and returns only bounded plan, generation id, audit, completeness, readiness, action, and failure-state metadata. |
| `plugin_learner_cycle_smoke` | `npm run smoke:learner-cycle`; Growth-owned operational smoke for the learner daily-card cycle after a card already exists. It delegates only to `learning-learner-cycle-service` through the normal service graph. The default `audit` operation is no-write and returns summary-only cycle audit/completeness. `submit`, `evaluate`, `reflect`, and `full` require explicit `--allow-write`; production write use must contain real learner evidence explicitly requested by Owner. The service composes Growth submission, evaluation queue, reflection, cycle-audit, and completeness services. It must not import repositories, call Gateway directly, publish plans, generate cards, run schedulers, deliver notifications, activate stage assessments, or expose raw learner answers/reflections, transcripts, raw prompts, answer keys, raw model output, credentials, or provider config. |
| `plugin_learning_evidence_audit_read` | `GET /api/v1/growth/evidence/audit`; Owner or workspace readback for persisted evidence-ledger audit DTOs after Growth view-target visibility passes. It delegates to `learning-evidence-audit-service`, supports bounded query filters for `learnerId`, `programId`, `evidenceId`, `sourceType`, `sourceId`, `taskCardId`, `cardRole`, `status`, comma-separated `targetNodeIds`, and `limit`, and returns only public summary DTOs from `learning_growth_evidence_ledger` through the service/repository boundary. It must not expose raw learner answers, transcripts, raw prompts, raw model output, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_learning_cycle_audit_read` | `GET /api/v1/growth/learning-cycles/audit`; Owner or workspace readback for one card/evaluation/plan learning cycle after Growth view-target visibility passes. It delegates to `learning-cycle-audit-service`, supports bounded query filters for `learnerId`, `programId`, `planDraftId`, `taskCardId`, `evaluationId`, `profileDeltaId`, `evidenceId`, `correctionId`, `sourceId`, comma-separated `targetNodeIds`, and `limit`, and composes public plan, plan publish-attempt, evidence, profile-delta, and correction audit DTOs into bounded counts and a timeline. The route must not inspect SQLite tables directly and the service must not expose raw learner answers, transcripts, raw prompts, raw model output, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_learning_cycle_completeness_read` | `GET /api/v1/growth/learning-cycles/completeness`; Owner or workspace readback for required audit evidence after Growth view-target visibility passes. It delegates to `learning-audit-completeness-service`, supports the same bounded cycle filters as `plugin_learning_cycle_audit_read`, and evaluates only the public cycle-audit DTO for plan publication, publish-attempt visibility, evaluation evidence, profile-delta audit, downstream partial failures, and privacy projection status. Privacy projection is a key-based public DTO check for raw/private fields such as raw prompt, answer key, transcript, private path, provider config, credentials, cookies, tokens, and passwords; safe public text values are not blocked by keyword alone. It returns `complete`, `readyForAutomation`, `summary.missingRequired`, bounded findings, and a bounded cycle summary. It must not read SQLite tables directly, call Gateway, write durable state, start scheduling, or expose raw learner answers, transcripts, prompts, raw model output, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_owner_audit_correction_smoke` | `npm run smoke:owner-audit`; Growth-owned operational smoke over the Owner audit/correction services. The default `audit` operation instantiates the normal Growth service graph and delegates to `learningCycleAuditService.listCycleAudit`, `learningAuditCompletenessService.evaluateCycleCompleteness`, `learningEvidenceAuditService.listEvidenceAudit`, `learningProfileDeltaAuditService.listProfileDeltas`, and `learningOwnerCorrectionService.listCorrections`. The `correction` operation requires explicit `--allow-write`, then delegates only to `learningOwnerCorrectionService.recordCorrection` before refreshing the same bounded audit DTOs. The CLI rejects privacy-risk input keys and must not import repositories, inspect SQLite tables, call Gateway/model vendors, call daily-loop services, draft or publish plans, generate cards, evaluate submissions, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, or act as a deploy/release switch. |
| `plugin_learning_automation_proposal_read_write` | `GET /api/v1/growth/automation/proposals`, Owner-only `POST /api/v1/growth/automation/proposals`, Owner-only `POST /api/v1/growth/automation/proposals/:proposalId/decision`, and Owner-only `POST /api/v1/growth/automation/proposals/:proposalId/publish`; Growth-owned supervised automation proposal boundary. Read is visible-target scoped. Proposal creation requires Owner role, workspace bearer, a visible target, at least one previous source-cycle id, audit-completeness readiness, and target/domain-pack provisioning before any new plan draft is created. `learning-automation-proposal-service` may compose `learning-audit-completeness-service`, `learning-target-provisioning-service`, and `learning-plan-publisher-service.draftPlan`, then persist summary-only `learning_growth_automation_proposals` metadata. Owner decision can move a proposal from `proposed` to `accepted`, `skipped`, `expired`, or `superseded`; `accepted` returns the existing manual plan-publish action but does not publish. The explicit proposal publish route can publish only an already accepted proposal, delegates only to `learning-plan-publisher-service.publishPlanItem`, records bounded execution metadata in `learning_growth_automation_proposals`, and is idempotent after successful execution. The repository rejects privacy-risk keys and non-summary privacy classes. This boundary must not call Gateway directly, model vendors, card generation, authoring, evaluation, stage-assessment activation, or a writeful scheduler. |
| `plugin_learning_automation_scheduler_dry_run` | Owner-only `POST /api/v1/growth/automation/scheduler/dry-run` and `npm run smoke:scheduler-dry-run`; Growth-owned read-only supervised scheduling dry-run boundary. The route requires Owner role, workspace bearer authorization, and Growth visible-target scope, then delegates to `learning-automation-scheduler-service`. The CLI instantiates the normal Growth service graph and delegates to `learningAutomationSchedulerService.dryRun` for local or production dry-run evidence collection without direct repository access. The service lists accepted proposals through `learning-automation-proposal-service`, rechecks source-cycle audit completeness through `learning-audit-completeness-service`, rechecks target/domain-pack provisioning through `learning-target-provisioning-service`, and returns bounded candidate actions such as `would_publish`, `blocked_audit`, `blocked_provisioning`, or `skipped_already_published`. It returns `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and `publishPlanned=false`. It must not call Gateway directly, model vendors, plan publication, card generation, authoring, evaluation, proposal execution recording, notifications, Action Inbox, stage-assessment activation, or SQLite tables directly. |
| `plugin_learning_automation_failure_policy_read_write` | `GET /api/v1/growth/automation/failure-policies`, `GET /api/v1/growth/automation/failure-policies/readiness`, Owner-only `POST /api/v1/growth/automation/failure-policies`, Owner-only `POST /api/v1/growth/automation/failure-policies/:policyId/review`, and `npm run smoke:failure-policy`; Growth-owned rollback/failure-policy readiness boundary. Read is visible-target scoped. Writes require Owner role, workspace bearer authorization, and Growth visible-target scope, then delegate to `learning-automation-failure-policy-service`. The CLI defaults to read-only readiness, supports read-only list, and requires explicit `--allow-write` for create/review. The service stores summary-only draft policies in `learning_growth_automation_failure_policies`, activates/archives/supersedes them through bounded Owner review, reports missing active policy as `missing_active_failure_policy`, and treats active policy as one prerequisite only through `readyForWritefulAutomationPrerequisite=true` while keeping `writefulSchedulingAllowed=false`. It must not call Gateway, plan publication, card generation, accepted-proposal publication, scheduler dry-run, notifications, Action Inbox, stage-assessment activation, or SQLite tables directly. |
| `plugin_learning_automation_action_handoff_read_write` | `GET /api/v1/growth/automation/action-handoffs`, Owner-only `POST /api/v1/growth/automation/action-handoffs`, Owner-only `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`, and `npm run smoke:action-handoff`; Growth-owned bounded action handoff boundary between reviewed automation digests, active failure policy, and Home AI platform notification surfaces. Read is visible-target scoped. Writes require Owner role, workspace bearer authorization, and Growth visible-target scope, then delegate to `learning-automation-action-handoff-service`. The CLI defaults to read-only list; `create` and `deliver` require explicit `--allow-write` and delegate through the same service graph. The service requires digest `status=reviewed`, checks active failure policy readiness, stores summary-only handoff rows in `learning_growth_automation_action_handoffs`, emits `growth.automation.action_required` through `growth-event-service`, and records delivered or `delivery_failed` metadata. It must not call Gateway, scheduler dry-run, plan publication, card generation, accepted-proposal publication, proposal execution recording, stage-assessment activation, or SQLite tables directly. Delivery failure must not mutate learner evidence, profile, rewards, proposal execution, or card state. |
| `plugin_learning_automation_scheduler_execution_read_write` | `GET /api/v1/growth/automation/scheduler/executions`, Owner-only `POST /api/v1/growth/automation/scheduler/execute-once`, and `npm run smoke:scheduler-execution`; Growth-owned default-disabled Owner-explicit scheduler execution boundary. Read is visible-target scoped. Writes require Owner role, workspace bearer authorization, Growth visible-target scope, and `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, then delegate to `learning-automation-scheduler-execution-service`. The CLI defaults to read-only execution list and requires explicit `--allow-write` for execute. When disabled, the service records bounded blocked execution metadata in `learning_growth_automation_scheduler_executions` and performs no publication. When enabled, it supports only `owner_explicit_once`, rechecks delivered action handoff, reviewed digest, active failure-policy readiness, and a matching read-only scheduler dry-run `would_publish` candidate before delegating only to `learning-automation-proposal-service.publishAcceptedProposal`. It must not call Gateway, model vendors, direct plan publication, card generation, authoring, evaluation, notifications, Action Inbox, queues/workers, stage-assessment activation, or SQLite tables directly. This is not background scheduling or production auto-scheduling enablement. |
| `plugin_learning_automation_background_scheduler_read_write` | `GET /api/v1/growth/automation/scheduler/runs`, Owner-only `POST /api/v1/growth/automation/scheduler/run-once`, `npm run smoke:scheduler-run`, and `npm run smoke:scheduler-worker`; Growth-owned default-disabled supervised scheduler tick and worker/lease boundary. Read is visible-target scoped. Writes require Owner role, workspace bearer authorization, Growth visible-target scope, and `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true`, then delegate to `learning-automation-scheduler-run-service`. The run CLI defaults to read-only run list and requires explicit `--allow-write` for run. The worker CLI defaults to disabled no-write status through `learning-automation-scheduler-worker-service.tickTargets`; if `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=true`, worker `tick` / `tick-targets` require explicit `--allow-write`. When disabled, the run service records bounded blocked run metadata in `learning_growth_automation_scheduler_runs` and must not list handoffs, execute actions, publish, enqueue, call Gateway, or mutate learner state. When enabled, it supports only `background_supervised_tick`, lists delivered action handoffs through `learning-automation-action-handoff-service`, converts bounded actions into candidates, and delegates each candidate only to `learning-automation-scheduler-execution-service.executeOnce`. The separate default-disabled worker boundary is `learning-automation-scheduler-worker-target-service`, `learning-automation-scheduler-worker-service`, `automation-scheduler-worker-targets.js`, `automation-scheduler-worker-leases.js`, `learning_growth_automation_scheduler_worker_targets`, `learning_growth_automation_scheduler_worker_leases`, and optional HTTP timer glue controlled by `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`; it may use only reviewed `enabled` worker targets for production, may use `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` only as local fallback, may claim summary-only target leases, and may call only the scheduler run service. It must not call Gateway, model vendors, direct plan publication, card generation, authoring, evaluation, notifications, Action Inbox, stage-assessment activation, or SQLite tables directly outside its repositories. This is not production unattended scheduling; any production background worker requires separate release evidence, reviewed enabled target config, and explicit config. |
| `plugin_learning_automation_scheduler_worker_target_read_write` | `GET /api/v1/growth/automation/scheduler/worker-targets`, Owner-only `POST /api/v1/growth/automation/scheduler/worker-targets`, Owner-only `POST /api/v1/growth/automation/scheduler/worker-targets/:targetId/review`, and `npm run smoke:scheduler-worker-target`; Growth-owned reviewed worker target configuration boundary. Read is visible-target scoped. Writes require Owner role, workspace bearer authorization, and Growth visible-target scope, then delegate to `learning-automation-scheduler-worker-target-service`. Creation requires target/domain-pack/subject provisioning and stores a `proposed` summary-only row in `learning_growth_automation_scheduler_worker_targets`. Review can move a target to `enabled`, `disabled`, or `archived`; enabling rechecks provisioning. The CLI defaults to read-only list, supports read-only runnable listing, and requires explicit `--allow-write` for create/review while keeping `productionSchedulingAllowed=false`. The service and CLI must not call Gateway, model vendors, scheduler run, scheduler execution, plan publication, card generation, authoring, evaluation, notifications, Action Inbox, stage-assessment activation, or learner-state repositories. Environment JSON targets are not production approval. |
| `plugin_domain_pack_provision_write` | `POST /api/v1/growth/domain-pack-provisions` with the workspace-local bearer and `x-hermes-plugin-actor-role=owner`; Owner cross-learner requests are constrained by Growth view-target visibility before any write. The route delegates to `learning-target-provisioning-service`, which validates imported domain-pack/subject options, writes summary-only `learning_growth_domain_pack_provisions` rows, and returns a bounded public provision DTO. It must not expose raw graph JSON, source-document bodies, raw syllabus cache, raw learner content, prompts, answer keys, model output, private paths, or provider configuration. |
| `plugin_stage_assessment_activation` | `POST /api/v1/growth/stage-assessments/eligibility`, `POST /api/v1/growth/stage-assessments/activate`, `POST /api/v1/growth/stage-assessments/challenge`, and `npm run smoke:stage-assessment` with the workspace-local bearer where HTTP writes are used. `learning-stage-assessment-service` owns readiness/cooldown/manual/challenge policy, writes `learning_growth_stage_assessment_cycles` through `stage-assessment-cycles`, and activates `stage_assessment` card generation only through `learning-card-generation-service`. Owner manual activation requires `x-hermes-plugin-actor-role=owner`; learner challenge activation can only target the executor's own workspace. The CLI instantiates the normal service graph, defaults to read-only `stageReadiness`, and requires explicit `--allow-write` for `eligibility`, `activate`, and `complete`; it must not import repositories, call Gateway directly, call plan publication, evaluate submissions, run automation, or mutate learner state outside `learning-stage-assessment-service`. Activated formal cards carry `stageAssessmentCycleId`, active activation metadata, `formal_assessment` completion metadata, default `300` coin reward metadata, and mastery evidence weight `1`. After a formal evaluation is persisted, `growth-evaluation-service` calls the same service to mark the linked cycle completed, preserve the generated card id and activation metadata, and set the cooldown window. |
| `plugin_card_generation_context_read` | `GET /api/v1/growth/card-generation/context`; Owner UI read context for Growth-owned card generation. It is constrained by Growth view-target visibility, accepts bounded query selectors such as `domain`, `subject`, `domainPackId`, `horizon`, and `availableMinutes`, returns Fanfan sample eligibility, `targetProvisioning`, recipe-policy metadata and `generationDefaults`, graph readiness, filtered `graphOptions` domain-pack/subject choices, suggested graph target, bounded history counts, selected learner `learningProfile` projection, Owner-safe `profileV2`, bounded `evidenceAudit`, `ownerAudit` readback over plan-audit, persisted profile-delta, and Owner correction DTOs, explicit `nextCardRecommendation` selection/rationale, bounded `recommendationLifecycle` rows for pending/accepted/superseded trajectory recommendations, `plannerReadiness`, `plannerContextPreview` including read-only `stageAssessment` readiness, and separate `authoringGatewayConfigured`, `evaluationGatewayConfigured`, `plannerGatewayConfigured`, `aiLoopGatewayReady`, and `operatingLoopGatewayReady` state. The embedded UI may call this route after a successful publish to refresh lifecycle context while preserving the published preview. `targetProvisioning`, `graphOptions`, `learningProfile`, `profileV2`, `evidenceAudit`, `ownerAudit`, `planAudit`, `plannerContextPreview`, `nextCardRecommendation`, and `recommendationLifecycle` are target-workspace scoped and summary-only; they must not expose raw learner submissions, transcripts, prompts, answer keys, raw model output, raw graph JSON, source-document bodies, private file paths, or internal source refs. |
| `plugin_profile_delta_audit_read` | `GET /api/v1/growth/profile-delta-audits`; Owner or workspace readback for persisted post-evaluation `profile_delta` audit DTOs after Growth view-target visibility passes. It delegates to `learning-profile-delta-audit-service`, supports bounded query filters for `learnerId`, `programId`, `taskCardId`, `evaluationId`, `profileDeltaId`, and `limit`, and returns only public summary DTOs from `learning_growth_profile_delta_audits`. Changed capability DTOs may include bounded evidence-freshness changes, stale transitions, newly introduced stale reasons, and resolved stale reasons so Owner can audit whether a card refreshed old evidence. It must not expose raw learner answers, transcripts, prompts, raw model output, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_profile_correction_read_write` | `GET /api/v1/growth/profile-corrections` and Owner-only `POST /api/v1/growth/profile-corrections`; Growth-owned Owner audit correction boundary. The write route requires Owner role, visible target, workspace bearer, and target provisioning before `learning-owner-correction-service` writes `sourceType=owner_reviewed_correction` evidence through `learning-evidence-ledger-service`. The read route groups bounded correction DTOs from `learning_growth_evidence_ledger` for visible targets. `learning-profile-v2-service` may absorb these rows as auditable state adjustments but must retain historical evidence ids/source types. Payloads must remain summary-only and must not expose raw learner answers, transcripts, prompts, answer keys, raw model output, source-document bodies, private paths, credentials, or provider configuration. |
| `plugin_stage_assessment_owner_ui` | The Owner `生成` tab includes a compact `阶段测评` section implemented in `public/growth-card-generation-ui.js` and wired through `public/app.js`. It can check eligibility, show dormant/eligible/cooldown/active state, call Owner manual activation, and open the published formal card. The UI stores only ephemeral progress/error/result state and must not duplicate backend eligibility or cooldown policy. |
| `plugin_card_interaction_ui` | Generated card learner interaction is implemented in the Growth embedded UI. It uses plugin API helpers for `GET /api/v1/growth/cards/:taskCardId`, `POST /api/v1/growth/cards/:taskCardId/submissions`, `POST /api/v1/growth/evaluations/process`, Owner-only `POST /api/v1/growth/evaluations/owner-review`, `POST /api/v1/growth/cards/:taskCardId/reflections`, `POST /api/v1/growth/cards/:taskCardId/experience-signals`, and proxied audio playback. It keeps text/audio evidence, record/play MIME selection, preview/saved-audio playback errors, one-shot evaluation, Owner-only failed-evaluation retry and bounded job diagnostics, optional one-time reflection, learner difficulty feedback, and secondary-view back handling inside the plugin boundary. Learner views must not expose Gateway/provider `lastError` details. |
| `plugin_navigation_back` | Growth embedded UI emits `growth.plugin.navigation` and handles Home AI `hermes.plugin.back`. While a card detail or other Growth secondary view is open, back/right-swipe returns to the Growth parent list and emits `growth.plugin.back_result` with `handled:true`. At the root board, it emits `handled:false` so Home AI can restore the outer route. |
| `plugin_ai_card_loop` | Growth owns the summary-only AI loop from profile and graph planning to generation, evaluation evidence, weighted mastery update, profile-delta audit, stage-assessment completion/cooldown, trajectory, recommendation lifecycle, and next-card strategy. The plugin slice is documented in `docs/GROWTH_AI_CARD_LOOP.md` and uses `learning-mastery-profile-service`, `learning-stage-assessment-service`, `learning-card-trajectory-service`, `learning-card-recommendation-service`, `learning-card-next-target-service`, `learning-next-card-strategy-service`, and the Gateway evaluation boundary when configured. Home AI does not own old Growth server logic for this loop. |
| `plugin_learning_system_scheme` | `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` is the durable Growth-local system scheme for the AI-guided learning product. It records the product thesis, non-negotiable principles, core loop, learner state model, Gateway-only model-entered steps, daily practice versus stage-assessment card families, Owner modes, automation maturity ladder, durable ownership map, implementation package sequence, and harness contract. It does not redefine Home AI platform contracts; it points implementation work back to the canonical platform docs and Growth service/harness documents. |
| `plugin_learning_operating_loop_target` | The next Growth architecture target is documented in `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` and `docs/GROWTH_LEARNING_OPERATING_LOOP.md`, with implementation details in `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` and staged delivery planning in `docs/GROWTH_AI_LEARNING_ROADMAP.md`. The roadmap is also the durable Growth-local product plan for the capability model, scientific learning policy, Owner operating modes, release gates, and documentation/harness contract. It extends the card-level AI loop with a first-class summary-only evidence ledger, Profile V2 projection, post-evaluation profile-delta audit, Owner-reviewed correction evidence, Gateway-backed planner, Owner audit surface, target/domain-pack provisioning, low-pressure multi-subject card planning, supervised proposal review, and eventual multi-workspace/domain-pack generalization. The backend foundation is implemented through `learning-evidence-ledger-service`, `learning-evidence-audit-service`, `learning-profile-v2-service`, `learning-profile-delta-service`, `learning-profile-delta-audit-service`, `learning-owner-correction-service`, `learning-plan-audit-service`, `learning-cycle-audit-service`, `learning-audit-completeness-service`, `learning-daily-loop-service`, `learning-loop-state-service`, `learning-automation-proposal-service`, `learning-automation-scheduler-service`, `learning-automation-digest-service`, `learning-automation-failure-policy-service`, `learning-automation-action-handoff-service`, `learning-automation-scheduler-execution-service`, `learning-automation-scheduler-run-service`, `learning-automation-scheduler-worker-target-service`, `learning-automation-scheduler-worker-service`, `learning-automation-release-readiness-service`, `learning-planner-context-service`, `growth-gateway-planner-client`, `learning-plan-validation-service`, `learning-plan-orchestrator-service`, `learning-plan-publisher-service`, and `learning-target-provisioning-service`. `GET /api/v1/growth/card-generation/context` now exposes Owner-safe planner readiness, planner context preview, Profile V2, evidence audit, plan-audit readback over recent validated drafts, publication links, and latest publish-attempt status, `targetProvisioning`, and filtered `graphOptions` domain-pack/subject projections for selected subject/domain query parameters. Owner-only daily-loop routes provide a service-owned preview/draft/publish facade over context, planner publisher, cycle audit, and completeness without adding a new model or scheduler boundary. `GET /api/v1/growth/learning-loop/state` provides a compact Owner-only summary state and next-action projection from daily-loop preview plus stage-assessment readiness. `GET /api/v1/growth/evidence/audit` provides bounded readback over persisted evidence-ledger rows for visible targets; `GET /api/v1/growth/learning-cycles/audit` provides one-cycle audit aggregation; `GET /api/v1/growth/learning-cycles/completeness` provides read-only required-audit evidence checks before UI closure or future automation dry runs; `GET`/`POST /api/v1/growth/automation/proposals`, `POST /api/v1/growth/automation/proposals/:proposalId/decision`, and `POST /api/v1/growth/automation/proposals/:proposalId/publish` provide the Owner-reviewed proposal layer before automatic publication, `POST /api/v1/growth/automation/scheduler/dry-run` provides the first read-only scheduling dry-run without writes or publication, `GET`/`POST /api/v1/growth/automation/digests` provide the reviewed dry-run packet layer, `GET`/`POST /api/v1/growth/automation/failure-policies` plus readiness/review routes provide the active failure-policy prerequisite, `GET`/`POST /api/v1/growth/automation/action-handoffs` plus deliver route provide bounded platform action metadata, `GET /api/v1/growth/automation/scheduler/executions` plus Owner-only `POST /api/v1/growth/automation/scheduler/execute-once` provide default-disabled Owner-explicit execution without enabling background scheduling, `GET /api/v1/growth/automation/scheduler/runs` plus Owner-only `POST /api/v1/growth/automation/scheduler/run-once` provide default-disabled supervised scheduler tick audit, `GET`/`POST /api/v1/growth/automation/scheduler/worker-targets` plus review routes provide Owner-reviewed worker target configuration, and `GET /api/v1/growth/automation/release-readiness` plus snapshot routes provide advisory release evidence without enabling unattended scheduling. `learning_growth_automation_scheduler_worker_targets`, `learning_growth_automation_scheduler_worker_leases`, and `learning_growth_automation_release_readiness` provide target/lease/release-evidence audit without enabling unattended scheduling. Evaluation processing now returns bounded `profile_delta` audit data after ledger/profile writes and persists it in `learning_growth_profile_delta_audits`, including evidence-freshness and stale-reason transitions; `GET /api/v1/growth/profile-delta-audits` provides bounded readback for visible targets; profile-delta failure is visible but non-fatal. Owner corrections are written/read through `POST`/`GET /api/v1/growth/profile-corrections`. Graph import infers node domain-pack membership by node domain for multi-pack seeds that omit per-node `domainPackId`, and graph plan/card audit DTOs retain `domainPackId`, `domain`, and `subject` provenance. `tests/learning-card-ai-loop-harness.test.js` covers a service-level Fanfan science vertical and a non-sample provisioned science vertical from planner draft through Profile V2 and profile-delta audit. `npm run smoke:planner-readiness` provides a bounded no-write Gateway readiness smoke for real planner config checks. `npm run smoke:daily-loop-preview` provides a bounded no-write daily-loop preview smoke over `learning-daily-loop-service.preview` for local or production daily-loop readiness evidence. `npm run smoke:learning-loop-state` provides a bounded no-write state smoke over `learning-loop-state-service` for local or production Owner-loop readiness evidence. `npm run smoke:scheduler-dry-run` provides a bounded no-write scheduler dry-run smoke over `learning-automation-scheduler-service.dryRun` for local or production dry-run evidence. `npm run smoke:digest` provides a service-owned digest evidence smoke that defaults to read-only list/get and requires explicit `--allow-write` for create/review summary-only digest rows. `npm run smoke:release-readiness` provides a service-owned no-write release-readiness evaluation by default, accepts summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` evidence bundles through file or inline JSON, and creates a summary-only advisory snapshot only with `--write-snapshot`. Embedded Owner production-complete scope/provision/profile-delta/correction/completeness/proposal/digest/action/execution/run/worker-target/release-readiness UI, production execution of the planner readiness smoke, production daily-loop preview smoke evidence, production learning-loop state smoke evidence, production scheduler dry-run smoke evidence, production release-readiness smoke evidence, and full multi-workspace rollout remain later slices. |
| `plugin_learning_loop_state_read` | Growth owns compact learning-loop state readback through `learning-loop-state-service`, Owner-only `GET /api/v1/growth/learning-loop/state`, and `npm run smoke:learning-loop-state`. The service returns `growth.learningLoopState.v1`, `privacyClass=summary_only`, and `summaryOnly=true` by composing existing `learning-daily-loop-service.preview` output with read-only `learning-stage-assessment-service.stageReadiness`. It is a UI/harness projection only: no durable writes, no direct SQLite access, no Gateway calls, no model-vendor calls, no plan publication, no card generation, no evaluation, no scheduler execution/ticks, no notification delivery, no Action Inbox emission, no stage-assessment activation, and no learner-state mutation. |
| `plugin_learning_owner_daily_loop_ui` | The Owner `生成` tab has a minimal supervised daily-loop UI over Growth-owned service routes. It loads `GET /api/v1/growth/card-generation/context`, reads `GET /api/v1/growth/learning-loop/state`, drafts through `POST /api/v1/growth/daily-loop/draft`, renders a bounded plan preview, and publishes one selected item only after Owner explicitly clicks `发布为卡片` through `POST /api/v1/growth/daily-loop/publish`. Browser code may show progress, bounded failures, and generated-card links, but must not call Gateway directly, import Home AI old Growth server logic, compute Profile V2 or learning policy locally, auto-publish, evaluate, schedule, notify, activate stage assessments, or expose raw learner/model/source payloads. |
| `plugin_learning_closed_loop_plan` | `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` is the Growth-local closed-loop product contract for the supervised AI learning loop. It records the product goal, learner state model, daily versus stage-assessment card families, Gateway-only model boundaries, service-first architecture, Owner workflow, audit requirements, supervised automation proposal policy, generalization rules, failure policy, implementation stages, and harness contract. The backend learning-cycle audit aggregate is now implemented through `learning-cycle-audit-service` and `GET /api/v1/growth/learning-cycles/audit`, composing existing plan, plan publish-attempt, evidence, profile-delta, and correction readbacks for one card/evaluation/plan without route-level table access or raw private payload exposure. The read-only audit-completeness gate is implemented through `learning-audit-completeness-service` and `GET /api/v1/growth/learning-cycles/completeness`; it reports missing required audit evidence and readiness for UI/future automation review without writing state or starting automation. The proposal layer is documented as Owner-reviewed dry-run automation: it can persist a summary-only proposal after completeness and provisioning pass, record bounded Owner decisions, and execute an accepted proposal only through the existing plan-publish service while recording bounded execution metadata; it cannot schedule work. |
| `plugin_learning_implementation_plan` | `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` is the Growth-local implementation package plan for the supervised AI learning system. It records the target outcome, non-negotiable Service First/Gateway-only/summary-only boundaries, current backend baseline, model-entered steps, durable state map, delivery packages from Owner daily browser loop through writeful scheduler, immediate implementation choice, and package-level definition of done. It does not add a new platform contract; it points implementation work back to the canonical Home AI platform contracts and Growth-local service/harness docs. |
| `plugin_learning_next_stage_plan` | `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` is the Growth-local next-stage plan for the supervised AI learning system. It records the preferred product-visible Owner daily loop path, the backend-only release-readiness evidence path, Fanfan science daily playbook, readiness semantics, harness matrix, and definition of done. The release-readiness boundary is evidence-only and must not be treated as a Home AI platform release switch, scheduler permission, Gateway boundary, publication boundary, evaluation boundary, notification delivery boundary, stage-assessment activation boundary, or learner-state mutation boundary. |
| `plugin_learning_automation_digest_read_write` | `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` defines the Growth-local digest gate between scheduler dry-run evidence and any future writeful scheduler. The backend is implemented through `learning-automation-digest-service`, `automation-digests.js`, `learning_growth_automation_digests`, visible-target scoped `GET /api/v1/growth/automation/digests`, Owner-only `POST /api/v1/growth/automation/digests`, Owner-only `POST /api/v1/growth/automation/digests/:digestId/review`, and `npm run smoke:digest`. The CLI delegates to the normal service graph, defaults to read-only list, supports read-only get, and requires explicit `--allow-write` for create/review evidence. Digest creation calls scheduler dry-run through the digest service, requires non-writeful dry-run flags, persists summary-only candidates/blocked/required-action packets, and review records only bounded Owner review metadata. It must not call Gateway, publish plans, record proposal execution, send notifications, call Action Inbox, activate stage assessments, enqueue workers, or treat `readyForAutomation=true` as publish permission. |
| `plugin_learning_automation_failure_policy` | `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md` defines the Growth-local rollback/failure-policy gate for scheduling readiness. The backend is implemented through `learning-automation-failure-policy-service`, `automation-failure-policies.js`, `learning_growth_automation_failure_policies`, visible-target scoped `GET /api/v1/growth/automation/failure-policies`, visible-target scoped `GET /api/v1/growth/automation/failure-policies/readiness`, Owner-only `POST /api/v1/growth/automation/failure-policies`, Owner-only `POST /api/v1/growth/automation/failure-policies/:policyId/review`, and `npm run smoke:failure-policy`. The CLI delegates to the normal service graph, defaults to read-only readiness, supports read-only list, and requires explicit `--allow-write` for create/review evidence. Policy creation stores draft summary-only policy/rollback/failure metadata; review can activate, archive, or supersede the draft; readiness treats active policy as one prerequisite only and keeps `writefulSchedulingAllowed=false`. It must not call Gateway, publish plans, record proposal execution, send notifications, call Action Inbox, activate stage assessments, call scheduler dry-run, enqueue workers, or treat policy activation as publish permission. |
| `plugin_learning_automation_action_handoff` | `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` defines the Growth-local action handoff gate between reviewed automation digests, active failure policy, and Home AI platform notification surfaces. The backend is implemented through `learning-automation-action-handoff-service`, `automation-action-handoffs.js`, `learning_growth_automation_action_handoffs`, visible-target scoped `GET /api/v1/growth/automation/action-handoffs`, Owner-only `POST /api/v1/growth/automation/action-handoffs`, Owner-only `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`, and `npm run smoke:action-handoff`. Handoff creation requires a reviewed digest and active failure-policy readiness; delivery emits bounded `growth.automation.action_required` metadata through `growth-event-service` and records delivered or `delivery_failed` status. The CLI defaults to read-only list and requires `--allow-write` for create/deliver evidence. It must not call Gateway, scheduler dry-run, publish plans, record proposal execution, generate cards, activate stage assessments, or treat notification delivery as publish permission. |
| `plugin_learning_automation_scheduler_execution` | `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` defines the Growth-local default-disabled Owner-explicit scheduler execution boundary. The backend is implemented through `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js`, `learning_growth_automation_scheduler_executions`, visible-target scoped `GET /api/v1/growth/automation/scheduler/executions`, and Owner-only `POST /api/v1/growth/automation/scheduler/execute-once`. It supports only `owner_explicit_once`, records blocked state while `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` is false, rechecks delivered handoff, reviewed digest, active failure-policy readiness, and read-only dry-run before publishing when enabled, delegates only to accepted-proposal publish, and must not be treated as a background scheduler or production auto-scheduling enablement. |
| `plugin_learning_automation_background_scheduler` | `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` defines the Growth-local background scheduler contract. It separates read-only scheduler dry-run, Owner-explicit execution, default-disabled scheduler ticks, reviewed worker target configuration, default-disabled worker leases, and any future unattended worker. The safe backend shape is `learning-automation-scheduler-run-service`, `automation-scheduler-runs.js`, `learning_growth_automation_scheduler_runs`, visible-target scoped `GET /api/v1/growth/automation/scheduler/runs`, Owner-only `POST /api/v1/growth/automation/scheduler/run-once`, `learning-automation-scheduler-worker-target-service`, `automation-scheduler-worker-targets.js`, `learning_growth_automation_scheduler_worker_targets`, worker-target list/create/review routes, and `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false` by default. The scheduler tick may coordinate delivered handoff actions only by delegating to the execution service; the worker may use only reviewed enabled targets for production and delegate only to the run service. Neither boundary may call Gateway, publish plans directly, generate cards directly, activate stage assessments, or become production auto-scheduling without separate platform, visual, production dry-run, reviewed-target, and release evidence. |
| `plugin_learning_automation_release_readiness` | `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` and `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` define the Growth-local release-readiness evidence boundary. The backend is `learning-automation-release-readiness-service`, `automation-release-readiness.js`, `learning_growth_automation_release_readiness`, visible-target scoped `GET /api/v1/growth/automation/release-readiness`, visible-target scoped `GET /api/v1/growth/automation/release-readiness/snapshots`, Owner-only `POST /api/v1/growth/automation/release-readiness/snapshots`, and `npm run smoke:release-readiness`. The CLI delegates to the normal service graph, defaults to no-write evaluation, accepts bounded summary evidence/approval inputs including versioned `growth.learningAutomationReleaseEvidenceBundle.v1` bundles through `--evidence-bundle-file` / `--evidence-bundle-json`, `--stage-checkpoint-evidence`, `--automation-digest-ui-evidence`, `--production-proposal-smoke-evidence`, `--automation-action-handoff-ui-evidence`, `--scheduler-execution-ui-evidence`, `--scheduler-run-ui-evidence`, `--scheduler-worker-target-ui-evidence`, `--production-action-handoff-smoke-evidence`, `--production-scheduler-execution-smoke-evidence`, `--production-scheduler-run-smoke-evidence`, `--production-scheduler-worker-target-smoke-evidence`, `--production-scheduler-worker-smoke-evidence`, `--production-planner-readiness-evidence`, `--production-daily-loop-preview-smoke-evidence`, `--production-learning-loop-state-smoke-evidence`, `--production-daily-loop-write-smoke-evidence`, `--production-scheduler-dry-run-smoke-evidence`, `--writeful-execution-approval`, `--background-scheduler-approval`, and `--background-worker-approval`, and persists only explicit `--write-snapshot` summary-only review artifacts. Service approval input may also use `releaseApproval`, `approvals`, or top-level approval fields. It summarizes product UI, audit UI, stage-checkpoint evidence from `npm run smoke:stage-assessment`, proposal UI, production proposal smoke from `npm run smoke:proposal`, digest/action/execution/run/worker-target UI, active policy, delivered handoff, production action handoff smoke from `npm run smoke:action-handoff`, production scheduler execution smoke from `npm run smoke:scheduler-execution`, production scheduler run smoke from `npm run smoke:scheduler-run`, production scheduler worker target smoke from `npm run smoke:scheduler-worker-target`, reviewed worker target, production scheduler worker smoke from `npm run smoke:scheduler-worker`, production planner readiness smoke from `npm run smoke:planner-readiness`, production daily-loop preview smoke from `npm run smoke:daily-loop-preview`, production learning-loop state smoke from `npm run smoke:learning-loop-state`, production controlled daily-loop draft/publish smoke, production scheduler dry-run smoke from `npm run smoke:scheduler-dry-run`, internal no-write scheduler dry-run safety, platform Action Inbox/Web Push, central visual, config, and explicit approval evidence. It always keeps `writefulSchedulingAllowed=false` and must not call Gateway, daily-loop services, publish, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, mutate learner state, or act as a platform release switch. |
| `plugin_learning_automation_release_evidence_bundle` | `npm run smoke:release-evidence-bundle` is a Growth-owned summary-only evidence bundle builder implemented by `learning-automation-release-evidence-bundle-service` and `scripts/build-growth-release-evidence-bundle.js`. It runs selected no-write/default-disabled smoke CLIs through an injected command runner, including planner readiness, daily-loop preview, learning-loop state, stage assessment readiness, proposal, scheduler dry-run, action handoff, scheduler execution/run, worker target, and worker smoke tasks by default. It normalizes their bounded JSON summaries into `growth.learningAutomationReleaseEvidenceBundle.v1`, maps stage-assessment readiness into `stageCheckpointEvidence`, and can write that artifact to `--output-file` for `npm run smoke:release-readiness -- --evidence-bundle-file <path>`. It has no route, no repository, and no durable business writes. It must not call Gateway, Home AI old Growth server logic, daily-loop services, publication, generation, evaluation, scheduler execution/ticks, notification delivery, stage activation, learner-state mutation, or production deploys. |
| `plugin_learning_automation_release_approval` | Growth persists explicit summary-only release approvals per writeful config gate through `learning-automation-release-approval-service`, `automation-release-approvals.js`, and `learning_growth_automation_release_approvals`. Visible-target scoped `GET /api/v1/growth/automation/release-approvals` lists public DTOs; Owner-only `POST /api/v1/growth/automation/release-approvals` records one canonical gate approval; `npm run smoke:release-approval` defaults to read-only list/bag and requires explicit `--allow-write` for record. The readiness service reads active approvals as evidence and projects `releaseReview.persistedApprovalKeys`, but this does not flip runtime config and always keeps `writefulSchedulingAllowed=false`. This boundary must not call Gateway, publish, generate cards, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, mutate learner state, or act as a platform release switch. |
| `plugin_learning_evidence_ledger` | `learning-evidence-ledger-service` writes summary-only `learning_growth_evidence_ledger` rows for daily evaluations, formal stage assessments, reflections, learner experience signals, and Owner-reviewed corrections. `growth-evaluation-service` records ledger evidence after evaluation/profile persistence, and `learning-owner-correction-service` records Owner correction evidence after target visibility/provisioning passes. The ledger is idempotent by source and graph node, stores low daily evidence weight, high formal assessment weight, and bounded correction weight, and rejects raw answers, transcripts, raw prompts, answer keys, raw model output, private paths, secrets, tokens, cookies, and provider configuration. |
| `plugin_learning_profile_v2` | `learning-profile-v2-service` is a backend read projection over the evidence ledger plus optional legacy profile projection. It returns capability states, evidence counts/weights, evidence-freshness metadata, stale-evidence summaries, strengths, weaknesses, misconceptions, pressure signals, stage-readiness hints, and planner hints without treating unobserved graph nodes as weaknesses. Daily evidence and formal stage-assessment evidence use separate freshness windows; stale strengths become low-pressure review hints rather than stretch claims. `owner_reviewed_correction` evidence is applied as an auditable state adjustment while retaining older evidence ids/source types and without refreshing learner-evidence recency. |
| `plugin_learning_planner_boundary` | Growth owns a Gateway-only learning planner boundary through `growth-gateway-planner-client`, `learning-planner-context-service`, `learning-plan-validation-service`, `learning-plan-orchestrator-service`, and `learning-plan-publisher-service`. Planner input is `growth.learningPlanner.input.v1` and summary-only, including bounded stale-evidence summaries from Profile V2 and bounded read-only stage-assessment readiness from `learning-stage-assessment-service.stageReadiness()`. Planner output is a `growth.learningPlanDraft.v1` draft until validation accepts schema, graph binding, allowed role, horizon policy, evidence requirements, and privacy. The backend horizon policy covers low-pressure `daily_plan`, short no-backlog `weekly_plan`, low-pressure `repair_plan`, and `stage_checkpoint_plan` suggestions that must declare `learning-stage-assessment-service` activation. The planner does not publish cards directly; `learning-plan-publisher-service` persists validated drafts in `learning_growth_plan_drafts`, can explicitly publish one selected non-formal plan item through the existing card-generation service, and refuses direct `stage_assessment` publication with `stage_assessment_activation_required`. `learning-plan-orchestrator-service.smokePlannerReadiness()` and `npm run smoke:planner-readiness` are no-write checks that return bounded readiness/context/draft summaries only. |
| `card_authoring_model_boundary` | Growth card generation and authoring are plugin-owned and Gateway-only. The service slice exists in `learning-card-generation-service`, `learning-card-authoring-service`, `growth-gateway-authoring-client`, and `learning-card-authoring-validation-service`, with `history-summary` and `card-authoring-publisher` SQLite repositories underneath. Growth may use Home AI Gateway access/config but must not import Home AI old Growth server logic or call model vendors directly. `growth-gateway-authoring-client` supports the fake harness `{ kind, input }` protocol and official Gateway `/v1/responses` protocol selected by `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or inferred from the endpoint. |
| `card_evaluation_model_boundary` | Growth card evaluation is plugin-owned and Gateway-only when `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured. `learning-card-evaluation-service` assembles bounded authenticated evaluation input, calls `growth-gateway-evaluation-client`, validates the `growth.card.evaluation.v1` draft, and returns the bounded evaluator DTO consumed by `growth-evaluation-service`. `growth-gateway-evaluation-client` supports fake harness `{ kind, input }`, valid streaming response, valid JSON response, official Gateway `/v1/responses`, empty output, invalid JSON, model timeout, repair pass failure, and privacy-risk output handling. Without an evaluation endpoint, Growth keeps the deterministic local evaluator as a fallback. |
| `plugin_view_targets` | `GET /api/v1/growth/view-targets`; returns Growth-provisioned view targets. Through the Home AI proxy, only `x-hermes-plugin-actor-role=owner` receives multiple targets. Workspace actors receive only their current workspace target and cannot enumerate other Growth users. |
| `historical_audio_blob_backfill` | `npm run backfill:audio-blobs -- --db <plugin-data>/growth-learning.sqlite3 --workspace-id <workspace> --legacy-audio-root <Home-AI-data-root> --dry-run --json`; use `--write` only after dry-run shows acceptable `would_backfill`, `file_missing`, and sample evidence. |
| `legacy_audio_roots` | `GROWTH_LEGACY_AUDIO_ROOTS`, path-delimited; optional override for old Home AI artifact roots. If omitted, the plugin derives the standard sibling Home AI `data` root from its workspace. Do not expose raw absolute file paths to clients. |
| `event_endpoint` | `POST /api/v1/growth/events` with Growth registration bearer; queues a bounded Growth event and posts it to Home AI `POST /api/hermes-plugins/growth/notifications` when delivery is configured. |
| `event_outbox_store` | `data/growth-event-outbox.json` by default, override with `GROWTH_EVENT_OUTBOX_STORE_PATH`. |
| `dev_runtime_prerequisites` | Node.js 20+ and npm; no Python dependency yet. |
| `deploy_command` | Use the Home AI Mac access runbook after production service facts are created. |
| `credential_locations` | Workspace-local ignored `.hermes-growth` config/key files only by reference. Do not record raw keys or launch tokens here. |
| `reference_contract_status` | Not implemented. Growth may later expose bounded references to programs, cards, submissions, and mastery profile records. |
| `mobile_visual_harness_status` | Uses the central Home AI visual toolchain for embedded shell validation. Growth iframe roots consume `hermes.plugin.viewport` for host iframe sizing, and mobile layout changes must run the Growth frontend adapter/layout harness plus the Home AI `embedded-plugin-shell` iOS visual harness before production publish. |
| `visual_toolchain_contract` | `20260610-visual-toolchain-shared-lane`; use Home AI central Appium/live-debug/visual harness scripts, not plugin-local copies. |
| `ai_ops_control_plane_command` | `cd /Users/hermes-dev/HermesMobileDev/app && node scripts/ai-ops-control-plane.js intake --task "<task>" --json` |
| `ai_ops_required_flow` | `intake -> required-checks -> lane allocate if visual -> evidence append -> production smoke -> handoff` |
| `ai_ops_evidence_ledger` | `$HOME/.homeai-qa/growth-evidence-ledger.jsonl` |
| `ios_live_debug_available` | `yes`; use Home AI `npm run ios:pwa:debug` after the plugin is registered in the host. |
| `ios_visual_harness_command` | `cd /Users/hermes-dev/HermesMobileDev/app && npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/` |
| `plugin_manifest_actions_status` | `declared`; Growth exposes manifest `actions` for host Dock `常用`, long-press menus, and search. |
| `growth_docs_locality` | `node scripts/check-growth-docs-locality.js`; Growth-specific docs must exist in this plugin workspace, while broad platform contracts remain centralized in the Home AI app workspace. |

## Required Local Validation

Run:

```bash
npm run check
npm test
```

`npm run check` must syntax-check every Growth runtime JavaScript file under
`scripts/`, `src/`, and `public/`.
`scripts/check-growth-syntax-coverage.js` and
`tests/growth-architecture-boundary.test.js` enforce that the check script has
no missing runtime files, stale check entries, or duplicate check entries.

For core SQLite helper and identifier refactors, also run:

```bash
node --test tests/growth-learning-sqlite-core.test.js
```

For SQLite read-projection refactors, also run:

```bash
node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js
```

For SQLite audio playback or backfill refactors, also run:

```bash
node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-store.test.js
```

For SQLite evidence write refactors, also run:

```bash
node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js
```

For learner difficulty or experience-signal write changes, also run:

```bash
node --test tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js
```

For SQLite evaluation queue refactors, also run:

```bash
node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/learning-evaluation-owner-review-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For SQLite reward or learning-coin ledger refactors, also run:

```bash
node --test tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js
```

For regenerable card retirement or old board projection cleanup, also run:

```bash
node --test tests/growth-card-retirement-service.test.js tests/growth-learning-sqlite-store.test.js
node scripts/retire-growth-cards.js \
  --target-db <plugin-data>/growth-learning.sqlite3 \
  --workspace-id <workspace-id> \
  --dry-run \
  --json
```

For Growth service orchestration, facade client, or snapshot projection
refactors, also run:

```bash
node --test tests/growth-service-models.test.js tests/growth-service-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js
```

For Growth service write provider or command-boundary refactors, also run:

```bash
node --test tests/growth-service-write-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js
```

For embedded frontend adapter or plugin-route launch refactors, also run:

```bash
node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js
```

For architecture boundary refactors, also run:

```bash
node --test tests/growth-architecture-boundary.test.js
```

For Owner daily-loop backend facade changes, also run:

```bash
node --test tests/growth-daily-loop-smoke-script.test.js tests/growth-daily-loop-preview-smoke-script.test.js tests/learning-daily-loop-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-cycle-audit-service.test.js tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For Owner learning-loop state readback changes, also run:

```bash
node --test tests/learning-loop-state-service.test.js tests/growth-learning-loop-state-smoke-script.test.js tests/learning-daily-loop-service.test.js tests/learning-stage-assessment-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For Growth-specific documentation movement or card-generation rule changes,
also run:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
```

For Growth card-authoring model boundary changes, also run:

```bash
node scripts/check-growth-card-authoring-boundary.js
node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js
```

For Growth AI card loop or Gateway evaluation boundary changes, also run:

```bash
node --test tests/learning-card-ai-loop-harness.test.js tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js
node scripts/check-growth-card-authoring-boundary.js
```

For Growth learning operating-loop foundation, evidence ledger, Profile V2, or
planner-boundary changes, also run:

```bash
node --test tests/learning-evidence-ledger-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-profile-v2-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-repository.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-profile-delta-service.test.js tests/learning-planner-context-service.test.js tests/learning-plan-orchestrator-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-target-provisioning-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-evaluation-service.test.js tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For Owner-reviewed profile correction backend changes, also run:

```bash
node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-owner-correction-service.test.js tests/learning-profile-v2-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For Owner audit readback context changes, also run:

```bash
node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-card-generation-context-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For learning-cycle audit aggregate changes, also run:

```bash
node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-cycle-audit-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For learning-cycle audit completeness changes, also run:

```bash
node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-audit-completeness-service.test.js tests/learning-cycle-audit-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For Owner audit/correction smoke CLI changes, also run:

```bash
node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-owner-correction-service.test.js tests/learning-cycle-audit-service.test.js tests/learning-audit-completeness-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For supervised automation proposal changes, also run:

```bash
node --test tests/learning-automation-proposal-repository.test.js tests/learning-automation-proposal-service.test.js tests/growth-automation-proposal-smoke-script.test.js tests/learning-audit-completeness-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:proposal -- --workspace-id <workspace> --learner-id <learner> --json
```

For supervised automation scheduler dry-run changes, also run:

```bash
node --test tests/learning-automation-scheduler-service.test.js tests/learning-automation-proposal-service.test.js tests/learning-audit-completeness-service.test.js tests/learning-target-provisioning-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For supervised automation digest changes, also run:

```bash
node --test tests/learning-automation-digest-repository.test.js tests/learning-automation-digest-service.test.js tests/growth-automation-digest-smoke-script.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:digest
```

For supervised automation action handoff changes, also run:

```bash
node --test tests/learning-automation-action-handoff-repository.test.js tests/learning-automation-action-handoff-service.test.js tests/growth-event-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
```

For supervised automation scheduler execution changes, also run:

```bash
node --test tests/learning-automation-scheduler-execution-repository.test.js tests/learning-automation-scheduler-execution-service.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:scheduler-execution -- --workspace-id smoke_workspace --json
```

For supervised automation scheduler run/tick changes, also run:

```bash
node --test tests/learning-automation-scheduler-run-repository.test.js tests/learning-automation-scheduler-run-service.test.js tests/growth-automation-scheduler-run-smoke-script.test.js tests/learning-automation-scheduler-execution-service.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:scheduler-run -- --workspace-id smoke_workspace --json
```

For supervised automation scheduler worker target changes, also run:

```bash
node --test tests/learning-automation-scheduler-worker-target-repository.test.js tests/learning-automation-scheduler-worker-target-service.test.js tests/growth-automation-scheduler-worker-target-smoke-script.test.js tests/learning-automation-scheduler-worker-service.test.js tests/learning-automation-scheduler-worker-lease-repository.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:scheduler-worker-target -- --workspace-id smoke_workspace --json
```

For supervised automation scheduler worker changes, also run:

```bash
node --test tests/growth-automation-scheduler-worker-smoke-script.test.js tests/learning-automation-scheduler-worker-service.test.js tests/learning-automation-scheduler-worker-lease-repository.test.js tests/learning-automation-scheduler-run-service.test.js tests/growth-architecture-boundary.test.js
npm run smoke:scheduler-worker -- --workspace-id smoke_workspace --json
```

For stage-assessment eligibility/activation changes, also run:

```bash
node --test tests/learning-stage-assessment-service.test.js tests/learning-stage-assessment-cycles-repository.test.js tests/growth-stage-assessment-smoke-script.test.js tests/learning-card-generation-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
npm run smoke:stage-assessment -- --workspace-id smoke_workspace --target-node-id smoke_node --json
```

For Growth Knowledge Graph source-pack recovery, dry-run import, or native
graph repository changes, also run:

```bash
node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js
node --test tests/learning-graph-plan-binding-service.test.js tests/growth-routes.test.js
node scripts/import-learning-graph-pack.js \
  --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --dry-run \
  --json
```

Before importing to production, first run the same script with `--write` against
a throwaway SQLite target and verify readback counts. Production write mode
must use the plugin data database, create a timestamped backup, and must not
copy source PDF/HTML bodies or raw private content into runtime tables.

For SQLite migration staging, run a dry-run first:

```bash
npm run import:learning-sqlite -- \
  --source-db <verified-learning-growth-backup.sqlite3> \
  --target-db data/growth-learning.sqlite3 \
  --workspace-id <workspace-id> \
  --dry-run \
  --json
```

Only use `--write` after the source `quick_check`, required table list, and
bounded target readback are clean. The script output is limited to table counts,
integrity/readback metadata, backup path, and board/card counts.

After Home AI host registration is added, also run the central platform
contract checker and the relevant iOS visual harness scenario from the Home AI
main workspace.

## Extraction Boundary

The mature built-in Growth module is the source of business behavior, but it
must be extracted incrementally:

1. stable plugin manifest and provisioning;
2. Home AI facade-backed board projection API;
3. local snapshot store, facade snapshot import, and migration readback;
4. plugin-owned SQLite table migration/readback for board/card projections and
   historical audio playback;
5. submission evidence write extraction with transitional Home AI proxy;
6. async evaluation processing extraction;
7. reflection evidence write extraction;
8. Growth learning coin settlement and mastery profile extraction;
9. MCP write tools and Reference / Memory Graph links.

Growth learning coins are Growth-domain rewards. A completed card may settle
Growth coins inside the plugin and mark the card complete, but it must not
write platform `通宝` ledger entries or trigger real-time conversion.
Growth-coin-to-`通宝` exchange is a Home AI platform currency workflow: it is
administrator-operated, normally monthly, based on total eligible Growth coin
balance, and must remain idempotent and auditable before any `通宝` mutation or
Growth coin clearing occurs.

Monthly exchange must use the Growth coin balance/ledger, not completed-card
state. Card completion has already settled Growth coins. This plugin exposes
`GET /api/v1/growth/learning-coins/balance` and
`POST /api/v1/growth/learning-coins/monthly-exchange-clear` for the
Growth-domain side of administrator exchange. The administrator exchange flow
is monthly by default: Home AI reads the eligible Growth coin balance, applies
the exchange-rate policy, credits platform `通宝`, records audit linkage, and
then calls the plugin clear route. The clear route writes only an idempotent
negative learning-coin ledger entry, zeroes or reduces the exchanged Growth coin
balance, does not write `通宝`, and does not mutate card status. Home AI remains
responsible for administrator authorization, exchange-rate policy, platform
`通宝` ledger credit, and audit linkage.

Growth plugin launch accepts route hints from Home AI. For a card detail launch,
the embedded URL carries `pluginRoute=card&pluginItemId=<taskCardId>`; the
plugin must open that card detail after loading the board. Compatibility Home AI
links using `view=learning&taskCardId=<taskCardId>` are converted by the host
before launch and must not require the plugin to know about the legacy host
view.

Growth plugin launch and viewport broadcasts also carry bounded Home AI
appearance metadata. The plugin maps `pluginTheme`/`theme` and
`pluginFontSize`/`fontSize` onto `document.documentElement.dataset.theme` and
`dataset.fontSize` before rendering the legacy Growth UI, and updates those
values when `hermes.plugin.viewport` or `hermes.plugin.appearance` messages
arrive. Home AI `pluginFontSize=default` maps to the legacy Growth CSS
`standard` size token.

The plugin-owned SQLite board projection must preserve the mature built-in
Growth UI semantics: cancelled, retired, and superseded cards are hidden;
sequence groups show completed cards plus the first current uncompleted card
while later cards are marked as hidden future; and lanes use the Growth
workflow buckets (`ready`, `waiting_ai`, `needs_revision`,
`reflection_required`, `locked_until`, `completed_recent`) instead of generic
active/waiting/completed grouping. Generated daily cards with
`daily_score_once` are projected as `completed_recent` after the first terminal
evaluation record even if the score is low or an old evaluator status says
`needs_revision`, `draft_feedback`, or `reflection_required`; formal assessment
cards keep those gated lanes.

Owner cross-learner viewing is a Growth plugin UI/API responsibility. Home AI
does not pass secrets to enable it; the same-origin proxy sends bounded actor
headers only. The plugin uses `GET /api/v1/growth/view-targets` to build the
right-top switcher. Only Owner actor context may list and switch among all
Growth-provisioned workspaces. Non-Owner workspace actor context receives only
the current Growth workspace target.

The current MCP wrapper is read-only and workspace-bound. It reads
`.hermes-growth/config.json` and `.hermes-growth/access-key.txt`, strips
`workspace_id` from Gateway-facing tool schemas, rejects model-provided
workspace overrides, and injects the bound workspace id into the plugin execute
endpoint. `growth.list_cards` returns summary-only card records and must not
include task instructions or `instructionPreview`. Home AI development Gateway
materialization has been verified for `weixin_stephen`: the workspace
provisioning executor syncs the required worker file set, mirrors
`.hermes-growth` into `/Users/<hm-user>/HermesWorkspace`, renders profile YAML,
and writes `toolsets`, `mcpServers`, and `configPath` back to the Gateway
manifest. Production Gateway callables remain pending until the Growth
production service and first-install deploy are completed.

Do not copy the full Home AI repository, deployment scripts, Gateway runtime,
or central server composition into this plugin.
