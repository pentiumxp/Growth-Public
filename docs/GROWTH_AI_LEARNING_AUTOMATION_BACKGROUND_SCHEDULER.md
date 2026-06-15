# Growth AI Learning Automation Background Scheduler

Last updated: 2026-06-15.

## Purpose

This document defines the Growth-local background scheduler contract for the
AI learning loop. It is the future controlled automation layer after proposal,
digest, failure-policy, action-handoff, and Owner-explicit execution gates.

This document exists to prevent ambiguity between five separate boundaries:

1. `learning-automation-scheduler-service`: read-only dry-run.
2. `learning-automation-scheduler-execution-service`: default-disabled
   Owner-explicit execution of one accepted action.
3. `learning-automation-scheduler-run-service`: default-disabled supervised
   scheduler tick that may inspect delivered handoffs and delegate individual
   actions to the execution service.
4. `learning-automation-scheduler-worker-target-service`: Owner-reviewed
   persistent target configuration for any future worker. This separates
   production target approval from environment-variable fallback.
5. `learning-automation-scheduler-worker-service`: default-disabled local
   timer/lease boundary that may call the scheduler run service for configured
   summary-only targets only when explicitly enabled.
6. A future production background worker: not enabled until product, platform,
   visual, production dry-run, and release gates are complete.

The background scheduler must never become a second learning-policy, model, or
card-publication boundary. It can coordinate already-reviewed actions only.

## Status

Production background scheduling is not enabled. The local backend boundary is
implemented as a default-disabled, Owner-controlled scheduler tick plus a
default-disabled worker/lease timer boundary, and covered by focused
repository, service, route, HTTP-glue, and architecture harnesses.

Implemented local shape:

- service: `learning-automation-scheduler-run-service`;
- repository: `automation-scheduler-runs.js`;
- table: `learning_growth_automation_scheduler_runs`;
- read route: `GET /api/v1/growth/automation/scheduler/runs`;
- controlled tick route: `POST /api/v1/growth/automation/scheduler/run-once`;
- service-owned operational smoke: `npm run smoke:scheduler-run`;
- config gate: `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`;
- downstream writeful gate:
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`, still owned by the
  execution service.

Implemented local worker/lease shape:

- target service: `learning-automation-scheduler-worker-target-service`;
- target repository: `automation-scheduler-worker-targets.js`;
- target table: `learning_growth_automation_scheduler_worker_targets`;
- target routes:
  `GET /api/v1/growth/automation/scheduler/worker-targets`,
  Owner-only `POST /api/v1/growth/automation/scheduler/worker-targets`, and
  Owner-only
  `POST /api/v1/growth/automation/scheduler/worker-targets/:targetId/review`;
- service-owned worker target smoke:
  `npm run smoke:scheduler-worker-target`;
- service: `learning-automation-scheduler-worker-service`;
- repository: `automation-scheduler-worker-leases.js`;
- table: `learning_growth_automation_scheduler_worker_leases`;
- service-owned worker smoke: `npm run smoke:scheduler-worker`;
- timer glue: `src/app/http-server.js`;
- config gate: `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`;
- config target list:
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON`;
- interval and lease config:
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_INTERVAL_MS` and
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_LEASE_MS`;
- worker id config: `GROWTH_AUTOMATION_BACKGROUND_WORKER_ID`.

`GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` must default to false. When
the gate is false, the service records a bounded blocked run and must not list
handoffs, execute actions, publish cards, enqueue work, call Gateway, or mutate
learner state.

The initial controlled tick remains Owner-only. A true unattended worker is a
later production release stage. The local worker service supplies only the
actor, reviewed-target, lease, and timer mechanics needed for a future release; it
does not remove the need for product evidence, central visual evidence,
platform action evidence, production dry-run evidence, and a separate release
decision.

`GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` is a local fallback and
developer escape hatch, not the production source of truth. Production worker
enablement requires reviewed `enabled` rows from
`learning_growth_automation_scheduler_worker_targets` for the selected learner,
domain pack, subject, horizon, and policy version.

## Operating Contract

The only initial tick mode is `background_supervised_tick`.

Required input:

- target workspace after Home AI/Growth visible-target authorization;
- learner id and optional program id;
- domain pack, domain, subject, horizon, and optional limit;
- explicit actor or scheduled-system actor metadata by reference only;
- optional stable run id for idempotent retry and audit UX;
- optional generation key and card schema version passed through to the
  downstream execution service.

Execution flow:

1. Validate workspace scope and reject privacy-risk payload keys.
2. Check `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`.
3. If disabled, record a `blocked` run and stop.
4. If enabled, record `started` summary state.
5. List delivered action handoffs through
   `learning-automation-action-handoff-service.listHandoffs`.
6. Convert delivered handoff actions into bounded candidates.
7. For each candidate, call
   `learning-automation-scheduler-execution-service.executeOnce` with
   `executionMode=owner_explicit_once`.
8. Let the execution service recheck delivered handoff, reviewed digest,
   active failure-policy readiness, matching dry-run candidate, accepted
   proposal, and writeful execution config.
9. Record the run as `completed`, `partial`, `failed`, or `skipped` with only
  summary-only candidate and execution DTOs. The run id and creation timestamp
  remain stable across `started` and final-state writes for the same tick.

The scheduler run service does not decide learning objectives. It does not
draft plans, publish plan items directly, call card generation, or evaluate
learner evidence. It only coordinates previously reviewed action records and
delegates final writes to the stricter execution boundary.

## Operational Smoke

`npm run smoke:scheduler-run` is the service-owned CLI harness for local or
production scheduler run/tick evidence.

Default read-only list:

```bash
npm run smoke:scheduler-run -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --json
```

Explicit controlled tick:

```bash
npm run smoke:scheduler-run -- \
  --operation run \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --domain-pack-id <domain-pack> \
  --domain <domain> \
  --subject <subject> \
  --allow-write \
  --json
```

The default operation is `list`, which delegates only to
`learningAutomationSchedulerRunService.listRuns` and must not create the run
table in an empty SQLite database. The `run` / `run-once` operation requires
explicit `--allow-write` and delegates only to
`learningAutomationSchedulerRunService.runOnce`.

With `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false`, the expected
write-gated run result is a bounded blocked row with
`learning_automation_background_scheduler_disabled`. That blocked run must not
list handoffs, execute actions, publish plans, generate cards, enqueue work,
call Gateway, call model vendors, activate stage assessments, or mutate
learner state. The CLI itself must not import repositories, inspect
`learning_growth_*` tables, call the action-handoff service, call the execution
service, call scheduler dry-run, call proposal publication, or bypass the run
service.

`npm run smoke:scheduler-worker-target` is the service-owned CLI harness for
reviewed scheduler worker target evidence.

Default read-only list:

```bash
npm run smoke:scheduler-worker-target -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --json
```

Read-only runnable target list:

```bash
npm run smoke:scheduler-worker-target -- \
  --operation runnable \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --json
```

Explicit target creation and review:

```bash
npm run smoke:scheduler-worker-target -- \
  --operation create \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --domain-pack-id <domain-pack> \
  --domain <domain> \
  --subject <subject> \
  --target-node-ids <node-id>[,<node-id>] \
  --allow-write \
  --json

npm run smoke:scheduler-worker-target -- \
  --operation review \
  --workspace-id <workspace> \
  --target-id <target-id> \
  --status enabled \
  --allow-write \
  --json
```

The default operation is `list`, which delegates only to
`learningAutomationSchedulerWorkerTargetService.listTargets` and must not
create the worker-target table in an empty SQLite database. The `runnable`
operation delegates only to
`learningAutomationSchedulerWorkerTargetService.listRunnableTargets`. The
`create` and `review` operations require explicit `--allow-write`, delegate
only to `learningAutomationSchedulerWorkerTargetService.createTarget` /
`reviewTarget`, and still keep `productionSchedulingAllowed=false`.

This smoke proves reviewed target configuration only. It must not start worker
timers, claim leases, call scheduler run, call scheduler execution, inspect
handoffs, publish, call Gateway, generate cards, activate stage assessments, or
mutate learner evidence/profile state. A reviewed `enabled` target row is a
future worker prerequisite, not production unattended scheduling permission.

`npm run smoke:scheduler-worker` is the service-owned CLI harness for the
default-disabled worker/lease boundary.

Default disabled status:

```bash
npm run smoke:scheduler-worker -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --json
```

The default operation is `status`, which delegates to
`learningAutomationSchedulerWorkerService.tickTargets`. With
`GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`, the service returns
`learning_automation_scheduler_worker_disabled`; the CLI wraps that expected
disabled state as no-write smoke evidence and must not create worker lease or
scheduler run tables in an empty SQLite database.

Explicit worker tick evidence:

```bash
npm run smoke:scheduler-worker -- \
  --operation tick-targets \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --allow-write \
  --json
```

`tick` and `tick-targets` can claim leases and call the scheduler run service
only when the worker is enabled, so the CLI rejects an enabled-worker operation
unless `--allow-write` is present. The worker still delegates only to
`learningAutomationSchedulerWorkerService.tick` / `tickTargets`, and the run
service still enforces `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`. With
the scheduler disabled, the expected write-gated worker result is a blocked
lease plus a blocked scheduler run; it must not inspect handoffs itself,
execute scheduler actions directly, publish, call Gateway, generate cards,
activate stage assessments, or mutate learner evidence/profile state.

## Worker Target Review Contract

Worker target configuration is a separate persistent gate before any future
background worker can act on a learner/domain scope.

Target creation flow:

1. Owner proposes a target through
   `POST /api/v1/growth/automation/scheduler/worker-targets`.
2. The route enforces Owner role, workspace bearer authorization, and
   Growth visible-target scope.
3. `learning-automation-scheduler-worker-target-service` rechecks
   target/domain-pack/subject provisioning through
   `learning-target-provisioning-service`.
4. The repository stores a `proposed` summary-only target row with target,
   policy, readiness, and review metadata.
5. Owner review can move the row to `enabled`, `disabled`, or `archived`.
6. Enabling rechecks provisioning again. Archived rows cannot be re-enabled.
7. The worker service may use only `enabled` reviewed rows as production
   runnable targets. If no reviewed service is configured, environment JSON is
   treated as a local fallback, not a production release mechanism.

Required target payload is summary-only:

- workspace id, learner id, optional program id;
- domain pack, domain, subject, horizon, and optional target nodes;
- optional candidate limit and policy version;
- bounded readiness and Owner review metadata;
- no raw learner answers, transcripts, prompts, model output, source bodies,
  credentials, provider config, tokens, cookies, or private paths.

The worker target service must not call Gateway, draft plans, publish plans,
generate cards, list handoffs, execute proposals, activate stage assessments,
send notifications, or inspect SQLite tables directly. It only validates
target/provision readiness and persists reviewed summary-only configuration.

## Worker Contract

The local worker boundary is disabled unless
`GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=true`. When disabled, the HTTP
server must not start a scheduler worker timer and the worker service must not
claim leases or call the scheduler run service.

Required worker target input is summary-only:

- workspace id and learner id;
- optional program id;
- domain pack, domain, subject, and horizon;
- optional candidate limit;
- no raw learner evidence, prompts, model output, provider config, tokens, or
  private paths.

Execution flow when the worker is explicitly enabled:

1. Read enabled reviewed targets from
   `learning-automation-scheduler-worker-target-service` when configured.
2. If no target service is configured, read local fallback targets from
   `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON`.
3. Claim one lease per target in
   `learning_growth_automation_scheduler_worker_leases`.
4. If an active lease exists and has not expired, skip that target.
5. If the lease is stale, reclaim it with a new internal lease nonce.
6. Call only `learning-automation-scheduler-run-service.runOnce` with
   `runMode=background_supervised_tick`.
7. Let the run service enforce
   `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`; if that gate is still
   false, it records a blocked run and no handoffs are listed.
8. Release the lease with bounded run id, run status, and summary-only
   assertions.

The local worker has no route. It is timer glue plus a service boundary. It is
not allowed to inspect handoffs, execute proposals, publish plans, call
Gateway, generate cards, notify, or mutate learner state directly.

## Durable State

Table: `learning_growth_automation_scheduler_runs`.

Required public fields:

| Field | Purpose |
| --- | --- |
| `run_id` | Stable run id for audit and idempotent retry UX. |
| `workspace_id`, `learner_id`, `program_id` | Target learning scope. |
| `domain_pack_id`, `domain`, `subject`, `horizon` | Provisioned graph scope and plan horizon. |
| `mode` | Initial mode: `background_supervised_tick`. |
| `status` | `started`, `completed`, `partial`, `failed`, `blocked`, or `skipped`. |
| `reason`, `error` | Bounded status reason and error code. |
| `input_json` | Summary-only tick input. |
| `candidate_json` | Bounded delivered handoff action candidates. |
| `execution_json` | Bounded downstream execution results. |
| `summary_json` | Aggregate counts and forbidden-boundary assertions. |
| `created_by`, `executed_by` | Actor identifiers by reference only. |
| `privacy_class` | Must be `summary_only`. |
| `created_at`, `updated_at` | Audit timestamps. |

The repository must reject privacy-risk keys and non-summary privacy classes.
Public DTOs must not expose raw learner answers, transcripts, raw prompts, raw
model output, answer keys, source-document bodies, private paths, credentials,
cookies, tokens, or provider configuration.

Table: `learning_growth_automation_scheduler_worker_targets`.

Required public fields:

| Field | Purpose |
| --- | --- |
| `target_id` | Stable target config id for one learner/domain/horizon scope. |
| `workspace_id`, `learner_id`, `program_id` | Target learning scope. |
| `domain_pack_id`, `domain`, `subject`, `horizon` | Provisioned graph scope and planner horizon. |
| `status` | `proposed`, `enabled`, `disabled`, or `archived`. |
| `target_version` | Target config schema or policy version. |
| `target_json` | Summary-only target selector, including optional target nodes and limit. |
| `policy_json` | Summary-only scheduling policy knobs; no model/vendor config. |
| `readiness_json` | Bounded provisioning/readiness check metadata. |
| `review_json` | Bounded Owner review metadata. |
| `created_by`, `reviewed_by` | Actor identifiers by reference only. |
| `disabled_reason` | Bounded reason when disabled or archived. |
| `privacy_class` | Must be `summary_only`. |
| `created_at`, `updated_at`, `reviewed_at` | Audit timestamps. |

The repository must reject privacy-risk keys and non-summary privacy classes,
support listing by workspace, learner, subject, horizon, and status, and keep
routes out of table internals.

Table: `learning_growth_automation_scheduler_worker_leases`.

Required public fields:

| Field | Purpose |
| --- | --- |
| `lease_id` | Stable lease id for one worker target scope. |
| `workspace_id`, `learner_id`, `program_id` | Target learning scope. |
| `domain_pack_id`, `domain`, `subject`, `horizon` | Provisioned graph scope and plan horizon. |
| `worker_id` | Actor identifier by reference only. |
| `status` | `claimed`, `released`, `failed`, or `blocked`. |
| `reason`, `error` | Bounded status reason and error code. |
| `run_id`, `run_status` | Bounded link to the scheduler run produced by this worker tick. |
| `input_json` | Summary-only worker target input. |
| `summary_json` | Summary-only run/forbidden-boundary assertions. |
| `attempt_count` | Number of lease claims for the target scope. |
| `privacy_class` | Must be `summary_only`. |
| `claimed_at`, `lease_until`, `heartbeat_at`, `released_at` | Lease timing and recovery metadata. |
| `created_at`, `updated_at` | Audit timestamps. |

The internal lease nonce is stored only to prevent stale-worker release races
and is never projected in public DTOs. It is not an access key, launch token,
Gateway token, cookie, password, or workspace credential.

## Route Contract

```text
GET  /api/v1/growth/automation/scheduler/runs
POST /api/v1/growth/automation/scheduler/run-once
GET  /api/v1/growth/automation/scheduler/worker-targets
POST /api/v1/growth/automation/scheduler/worker-targets
POST /api/v1/growth/automation/scheduler/worker-targets/:targetId/review
```

Read route:

- visible-target scoped;
- supports filters for learner, program, domain pack, domain, subject, horizon,
  status, and limit;
- returns summary-only run DTOs.

Write route:

- Owner-only for the initial controlled tick;
- workspace-bearer authorized;
- visible-target scoped;
- delegates to `learning-automation-scheduler-run-service.runOnce`;
- returns a bounded blocked result while
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false`;
- must not call execution, publication, Gateway, or repository code directly
  from the route.

Worker target routes:

- list route is visible-target scoped and returns only public summary DTOs;
- create and review routes are Owner-only and workspace-bearer authorized;
- create delegates to
  `learning-automation-scheduler-worker-target-service.createTarget`;
- review delegates to
  `learning-automation-scheduler-worker-target-service.reviewTarget`;
- routes must not call Gateway, scheduler run, execution, publication,
  card-generation, stage-assessment, or repository functions directly.

## Safety Gates

Background scheduling can be considered only after all of these are complete:

- Owner daily UI is product-usable and visually validated.
- Owner audit/correction UI is product-usable and privacy-tested.
- Stage-assessment controls are separate from daily plan publication.
- Proposal review UI exists.
- Digest, failure-policy, action-handoff, and execution UI exists.
- Platform Action Inbox/Web Push evidence exists in the Home AI workspace.
- Central Home AI embedded-plugin visual evidence exists for mobile and
  embedded shell.
- Production dry-run evidence exists for the target scope.
- A Growth-owned release-readiness evidence snapshot records product,
  platform, visual, reviewed-target, production dry-run, config, and explicit
  approval evidence without enabling scheduling.
- `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true` has explicit release
  approval for the execution boundary.
- `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true` has a separate release
  approval for scheduler ticks or a future worker.
- `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=true` has a separate release
  approval for the timer/lease worker and reviewed `enabled` worker target
  rows. Environment JSON targets are not sufficient for production
  unattended scheduling.

Enabling scheduler ticks does not bypass the execution service. Every action
still needs the execution-time gates defined in
`docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md`.

## Forbidden Boundaries

The background scheduler run service must not:

- call Gateway or model vendors;
- draft plans;
- publish plans directly;
- call card generation directly;
- call authoring or evaluation services;
- activate stage assessments;
- write learner submissions, reflections, rewards, evidence ledger rows, or
  Profile V2 records;
- call Action Inbox/Web Push directly;
- enqueue work outside the documented scheduler run boundary;
- inspect SQLite tables directly outside its repository.

The scheduler worker service must not:

- call Gateway or model vendors;
- create, enable, disable, or archive worker targets;
- list handoffs;
- execute scheduler actions directly;
- publish plans directly;
- call card generation directly;
- call Action Inbox/Web Push directly;
- activate stage assessments;
- read or write learner evidence/profile/card tables directly.

The scheduler worker target service must not:

- call Gateway or model vendors;
- list handoffs;
- call scheduler run or scheduler execution;
- publish plans directly;
- call card generation directly;
- activate stage assessments;
- send notifications or Action Inbox/Web Push payloads;
- read or write learner evidence/profile/card tables directly.

The only allowed worker path is:

```text
learning-automation-scheduler-worker-service
  -> learning-automation-scheduler-run-service.runOnce
  -> learning-automation-scheduler-execution-service.executeOnce
  -> learning-automation-proposal-service.publishAcceptedProposal
  -> learning-plan-publisher-service.publishPlanItem
  -> learning-card-generation-service
```

The only allowed writeful path is:

```text
learning-automation-scheduler-run-service
  -> learning-automation-scheduler-execution-service.executeOnce
  -> learning-automation-proposal-service.publishAcceptedProposal
  -> learning-plan-publisher-service.publishPlanItem
  -> learning-card-generation-service
```

Each downstream service keeps its own validation, privacy, idempotency, and
failure rules.

## Failure Policy

Failure behavior is fail-closed:

- disabled background config records `blocked`;
- invalid mode records `blocked`;
- missing handoff service records a bounded unavailable error;
- missing execution service records a bounded unavailable error;
- no delivered actions records `skipped`;
- downstream blocked or failed executions are aggregated as `failed` or
  `partial`;
- no scheduler run may create partial card rows itself;
- all downstream publication failure details remain bounded execution DTOs.

Any failed or partial run must be visible to Owner audit before retry. The
retry path should reuse stable run/action ids where possible.

## Harness

Focused harness for this boundary:

- `tests/learning-automation-scheduler-worker-lease-repository.test.js`;
- `tests/learning-automation-scheduler-worker-target-repository.test.js`;
- `tests/learning-automation-scheduler-worker-service.test.js`;
- `tests/learning-automation-scheduler-worker-target-service.test.js`;
- `tests/growth-automation-scheduler-worker-target-smoke-script.test.js`;
- `tests/growth-automation-scheduler-worker-smoke-script.test.js`;
- `tests/learning-automation-scheduler-run-repository.test.js`;
- `tests/learning-automation-scheduler-run-service.test.js`;
- `tests/growth-automation-scheduler-run-smoke-script.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`;
- `tests/growth-docs-locality.test.js`.

Required and implemented assertions:

- disabled config records blocked state and does not list handoffs or execute
  actions;
- invalid mode fails closed;
- privacy-risk input is rejected;
- no delivered handoffs records a skipped run;
- delivered actions delegate only to
  `learning-automation-scheduler-execution-service.executeOnce`;
- partial downstream execution becomes visible `partial` run state;
- repository migrates bounded columns, supports domain/horizon filters,
  rejects privacy-risk keys, and enforces `summary_only`;
- routes enforce Owner writes, workspace bearer, and visible-target scope;
- `npm run smoke:scheduler-run` defaults to read-only list, requires explicit
  `--allow-write` for run/tick, records default-disabled blocked state, and
  keeps the CLI out of repositories, Gateway, execution, publication, card
  generation, action-handoff delivery, stage activation, learner-state
  mutation, and direct table access;
- worker timer is default-disabled in `src/app/http-server.js`;
- worker service does not claim leases or call scheduler run while disabled;
- active leases are protected and expired leases are reclaimed;
- worker target creation requires target provisioning and stores only
  summary-only `proposed` records;
- worker target review supports `enabled`, `disabled`, and `archived`, and
  enabling rechecks provisioning;
- worker target routes enforce Owner writes and visible-target reads;
- `npm run smoke:scheduler-worker-target` defaults to read-only list, supports
  read-only runnable listing, requires explicit `--allow-write` for
  create/review, proves target provisioning plus Owner review through services,
  and keeps the CLI out of repositories, Gateway, scheduler run/execution,
  handoffs, publication, card generation, worker timers, stage activation,
  learner-state mutation, and direct table access;
- `npm run smoke:scheduler-worker` defaults to disabled no-write status,
  rejects enabled-worker operations without explicit `--allow-write`, delegates
  only to `learning-automation-scheduler-worker-service.tick` / `tickTargets`,
  proves blocked lease/run behavior while the scheduler gate remains disabled,
  and keeps the CLI out of repositories, Gateway, scheduler run/execution
  bypasses, handoffs, publication, card generation, stage activation,
  learner-state mutation, and direct table access;
- worker service delegates only to scheduler-run service;
- worker service prefers reviewed enabled persistent targets before local
  environment fallback;
- worker leases release as `blocked` when scheduler run remains disabled;
- architecture guard proves no direct Gateway, direct plan publication,
  direct card generation, stage-assessment activation, queue/worker, or direct
  table access from the run service.

Broad validation after implementation changes:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
npm run check
npm test
git diff --check
```

UI or production release still requires the central Home AI embedded-plugin
visual harness and production dry-run evidence.
