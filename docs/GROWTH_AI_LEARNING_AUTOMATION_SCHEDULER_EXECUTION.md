# Growth AI Learning Automation Scheduler Execution

Last updated: 2026-06-16.

## Purpose

This document defines the Growth-local writeful scheduler execution boundary.
It is a backend execution layer, not a background worker and not production
auto-scheduling enablement.

For the separate supervised scheduler tick and future background worker
contract, use
`docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`. Do not infer
background scheduling permission from this execution boundary.

The boundary exists so Growth can audit the final write path before any future
scheduled worker is considered. It records every Owner-explicit execution
attempt in summary-only SQLite state and delegates publication only to the
existing accepted-proposal publish service.

## Status

Implemented locally as a default-disabled backend slice:

- `learning-automation-scheduler-execution-service`;
- `automation-scheduler-executions.js`;
- `learning_growth_automation_scheduler_executions`;
- visible-target scoped
  `GET /api/v1/growth/automation/scheduler/executions`;
- Owner-only
  `POST /api/v1/growth/automation/scheduler/execute-once`;
- final release authorization readback through
  `learning-automation-release-authorization-service`,
  `GET /api/v1/growth/automation/release-authorization`, and
  `npm run smoke:release-authorization`;
- final release activation audit readback through
  `learning-automation-release-activation-service.listActivations`,
  visible-target scoped `GET /api/v1/growth/automation/release-activations`,
  Owner-only `POST /api/v1/growth/automation/release-activations`, and
  `npm run smoke:release-activation -- --operation record --allow-write`;
- persisted runtime enablement audit/readback through
  `learning-automation-runtime-enablement-service`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablement`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablements`,
  Owner-only `POST /api/v1/growth/automation/runtime-enablements`, and
  `npm run smoke:runtime-enablement`. When writeful execution is enabled, the
  execution service requires a matching persisted `verified_enabled`
  runtime-enablement record before publication. The record proves external
  runtime config readback only; it is not a scheduler permission grant and does
  not replace the execution-time activation audit gate;
- service-owned operational smoke `npm run smoke:scheduler-execution`;
- config gate: `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`.

The config gate defaults to false. When the gate is false, `execute-once`
records a bounded blocked execution row and does not inspect handoff state,
publish, enqueue, call Gateway, or mutate learner state.

## Execution Contract

The only supported execution mode is `owner_explicit_once`.

Required input:

- target workspace after Home AI/Growth visible-target authorization;
- learner id and optional program id;
- delivered action handoff id;
- reviewed digest id, normally derived from the handoff;
- active failure-policy readiness, normally derived from target scope;
- accepted proposal id;
- optional plan draft id and selected item id;
- optional collection run id for selecting a specific release review run;
- optional activation gates for the activation-record readback. The execution
  service always requires `writeful_execution`; extra gates can be supplied for
  future Owner evidence, but they do not grant execution by themselves;
- optional explicit execution id for idempotent Owner retry UX;
- optional generation key and card schema version for the downstream publish
  service.

The service rechecks every gate at execution time:

1. `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` is true.
2. `executionMode` is `owner_explicit_once`.
3. `learning-automation-action-handoff-service.getHandoff` returns a delivered
   handoff for the visible target.
4. The handoff contains the requested proposal/action metadata.
5. `learning-automation-digest-service.getDigest` returns the same reviewed
   digest.
6. `learning-automation-failure-policy-service.evaluateReadiness` returns
   `readyForWritefulAutomationPrerequisite=true`.
7. `learning-automation-scheduler-service.dryRun` returns a matching
   `would_publish` candidate with
   `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and
   `publishPlanned=false`.
8. `learning-automation-release-authorization-service.authorize` returns
   `authorized=true` after proving approved release review, ready latest
   collection run, approved latest decision, and active
   `writefulExecutionApproval`.
9. `learning-automation-release-activation-service.listActivations` returns a
   latest summary-only record for the target release scope whose status is
   `ready_for_owner_config_enablement` or `already_enabled`, whose decision is
   `recordOnly=true`, whose preflight passed, whose requested activation gates
   include `writeful_execution`, and whose activation/preflight/evidence
   summaries all keep `configChangeApplied=false`,
   `writefulSchedulingAllowed=false`, and `runtimeConfigChange=false`.
10. `learning-automation-runtime-enablement-service.listEnablements` returns a
    matching persisted summary-only runtime enablement audit row with status
    `verified_enabled`, schema `growth.learningAutomationRuntimeEnablement.v1`,
    `recordOnly=true`, `advisoryOnly=true`, `runtimeConfigVerified=true`, no
    runtime mutation flags, requested gates including `writeful_execution`, and
    current-config readback proving `automationWritefulExecutionEnabled` is
    enabled.
11. Only after all gates pass, the service calls
   `learning-automation-proposal-service.publishAcceptedProposal`.
12. The execution repository records bounded `started`, `published`, `failed`,
   `blocked`, or `skipped` metadata.

The execution service must not call Gateway, model vendors, plan publication
directly, card generation, authoring, evaluation, notifications, Action Inbox,
stage-assessment activation, queues/workers, or SQLite tables directly.

## Durable State

Table: `learning_growth_automation_scheduler_executions`.

Required public fields:

| Field | Purpose |
| --- | --- |
| `execution_id` | Stable execution id. Explicit ids are accepted for idempotent Owner retry UX. |
| `workspace_id`, `learner_id`, `program_id` | Target learning scope. |
| `handoff_id`, `digest_id`, `policy_id` | Reviewed action and readiness gates. |
| `proposal_id`, `plan_draft_id`, `selected_item_id` | Accepted proposal and selected planner item. |
| `mode` | Currently `owner_explicit_once`. |
| `status` | `started`, `published`, `failed`, `blocked`, or `skipped`. |
| `reason`, `error` | Bounded status reason and error code. |
| `gate_json` | Summary-only gate readback. |
| `action_json` | Summary-only action metadata and delegated publish boundary. |
| `execution_json` | Summary-only execution result. |
| `publish_result_json` | Bounded downstream proposal-publish result. |
| `created_by`, `executed_by` | Actor identifiers by reference only. |
| `privacy_class` | Must be `summary_only`. |
| `created_at`, `updated_at` | Audit timestamps. |

The repository rejects privacy-risk keys, private path/token-looking values,
and non-summary privacy classes.
Public DTOs must not expose raw learner answers, transcripts, prompts, raw
model output, answer keys, source-document bodies, private paths, secrets,
tokens, cookies, or provider configuration.

## Route Contract

```text
GET  /api/v1/growth/automation/scheduler/executions
POST /api/v1/growth/automation/scheduler/execute-once
```

Read route:

- visible-target scoped;
- supports filters for learner, program, handoff, digest, proposal, status,
  and limit;
- returns summary-only execution DTOs.

Write route:

- Owner-only;
- workspace-bearer authorized;
- visible-target scoped;
- delegates to `learning-automation-scheduler-execution-service.executeOnce`;
- returns `201` only when the execution publishes through the accepted-proposal
  boundary;
- returns a bounded `400` with a persisted blocked/failed execution for
  disabled config or failed gates.

## Operational Smoke

```bash
npm run smoke:scheduler-execution -- --workspace-id <workspace> --learner-id <learner> --json
```

The default operation is read-only `list`. It delegates only to
`learning-automation-scheduler-execution-service.listExecutions`, opens the
normal service graph, and must not create the execution table when no execution
records exist.

Explicit execution evidence uses:

```bash
npm run smoke:scheduler-execution -- \
  --operation execute \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --collection-run-id <release-collection-run-id> \
  --activation-gates writeful_execution \
  --handoff-id <delivered-handoff-id> \
  --proposal-id <accepted-proposal-id> \
  --allow-write \
  --json
```

`execute` requires explicit `--allow-write` and delegates only to
`learning-automation-scheduler-execution-service.executeOnce`. With the default
`GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=false`, the expected result is a
visible blocked execution row with
`learning_automation_scheduler_execution_disabled`. This is evidence that the
execution boundary is fail-closed; it is not publication approval.

When `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, the same smoke must
still fail closed unless the release authorization readback passes and the
activation audit readback finds a valid summary-only `writeful_execution`
activation record. The activation record is a readback prerequisite only; it
does not flip config and does not grant scheduler permission by itself.
Publication also requires a matching persisted runtime enablement readback
record with status `verified_enabled` proving the external config was enabled
and read back through Growth. Missing, unavailable, or invalid runtime
enablement records block execution before `publishAcceptedProposal`.

The smoke script must not import repositories directly, inspect
`learning_growth_` tables, call Gateway, call the scheduler dry-run service
directly, publish plans directly, generate cards, evaluate learner
submissions, deliver action handoffs, run scheduler ticks, activate stage
assessments, enqueue workers, or mutate learner state outside the execution
service boundary.

## Failure Policy

Failure behavior is fail-closed:

- disabled config records `blocked` with
  `learning_automation_scheduler_execution_disabled`;
- missing handoff records `blocked`;
- undelivered handoff records `blocked`;
- missing or unreviewed digest records `blocked`;
- missing active failure policy records `blocked`;
- dry-run candidate missing or blocked records `blocked`;
- missing or blocked final release authorization records `blocked`;
- missing release activation service, missing activation records, invalid
  activation status/privacy/schema, missing `writeful_execution` gate, failed
  activation preflight, non-record-only decision, or any runtime-config-change
  flag in the activation record records `blocked`;
- missing runtime enablement service, missing runtime enablement records,
  invalid status/privacy/schema, missing `writeful_execution` gate, missing
  `automationWritefulExecutionEnabled` readback, non-record-only decision,
  missing `runtimeConfigVerified=true`, or any runtime mutation flag in the
  runtime enablement record records `blocked`;
- downstream accepted-proposal publish failure records `failed`;
- successful downstream publish records `published`;
- repeated downstream publish remains protected by
  `learning-automation-proposal-service.publishAcceptedProposal` idempotency.

No failure may create partial card rows from the scheduler execution service
itself. Publication remains owned by the existing plan/proposal publish
services.

## Harness

Focused harness:

- `tests/learning-automation-scheduler-execution-repository.test.js`;
- `tests/learning-automation-scheduler-execution-service.test.js`;
- `tests/growth-automation-scheduler-execution-smoke-script.test.js`;
- `tests/learning-automation-release-authorization-service.test.js`;
- `tests/growth-release-authorization-smoke-script.test.js`;
- `tests/learning-automation-scheduler-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`.

Required assertions:

- default-disabled execution records blocked state and does not publish;
- success path rechecks delivered handoff, reviewed digest, active policy
  readiness, scheduler dry-run, release authorization, release activation audit
  readback, and runtime enablement verified readback before publishing;
- missing release authorization records blocked state and does not call
  `publishAcceptedProposal`;
- missing or invalid release activation records blocked state and does not call
  `publishAcceptedProposal`;
- missing or invalid runtime enablement records blocked state and does not call
  `publishAcceptedProposal`;
- publish delegates only to
  `learning-automation-proposal-service.publishAcceptedProposal`;
- failed publish records bounded failure metadata for explicit Owner retry;
- repository migrates bounded columns, rejects privacy-risk keys and private
  path/token-looking values, and enforces `summary_only`;
- routes enforce Owner writes, workspace bearer, and visible-target scope;
- `npm run smoke:scheduler-execution` defaults to read-only list, requires
  `--allow-write` for execute, records default-disabled blocked state, and
  parses collection-run and activation-gate selectors, and rejects privacy-risk
  input;
- architecture guard proves no Gateway, direct card-generation, direct plan
  publish, stage-assessment activation, queue/worker, or direct table access
  from the execution service.

Broad validation after changes:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
npm run check
npm test
git diff --check
```

## Remaining Product Gates

This backend slice does not make scheduled learning product-complete.

Before production enablement, Growth still needs:

- Owner daily UI;
- audit/correction UI;
- proposal review UI;
- digest/action/failure policy UI;
- platform Action Inbox/Web Push product evidence;
- central Home AI embedded-plugin visual evidence;
- production dry-run evidence;
- summary-only release activation audit record for `writeful_execution`;
- persisted summary-only runtime enablement audit record with
  `status=verified_enabled` for `writeful_execution`;
- explicit release approval for
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`.
