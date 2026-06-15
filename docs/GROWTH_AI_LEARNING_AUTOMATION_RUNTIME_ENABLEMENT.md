# Growth Automation Runtime Enablement

Last updated: 2026-06-16.

## Purpose

Runtime enablement is the final Growth-local audit/readback layer before any
writeful automation configuration can be considered enabled.

This boundary does **not** change runtime configuration. It records and reads
summary-only Owner evidence that:

- release activation audit records exist for selected activation gates;
- the current Growth runtime config booleans are still disabled and require a
  manual platform/deployment action, or have already been enabled and can be
  read back;
- no scheduler permission, background tick permission, worker permission, card
  publication, Gateway call, notification delivery, or learner-state mutation
  was performed by Growth while recording that evidence.

## Service Boundary

Owner service:

- `src/services/learning-automation-runtime-enablement-service.js`

Store boundary:

- `src/stores/growth-learning-sqlite/automation-runtime-enablements.js`
- table: `learning_growth_automation_runtime_enablements`

Routes:

- `GET /api/v1/growth/automation/runtime-enablement`
- `GET /api/v1/growth/automation/runtime-enablements`
- `POST /api/v1/growth/automation/runtime-enablements`

CLI:

- `npm run smoke:runtime-enablement`

The service depends only on
`learning-automation-release-activation-service.listActivations` plus injected
config booleans:

- `automationWritefulExecutionEnabled`
- `automationBackgroundSchedulerEnabled`
- `automationBackgroundWorkerEnabled`

It must not import repositories directly, read environment variables, call
Gateway/model vendors, call Home AI old Growth routes, publish plans, generate
cards, evaluate learner submissions, execute scheduler actions, run scheduler
ticks, deliver notifications, activate stage assessments, or mutate learner
state.

## DTO Contract

Runtime enablement DTOs use:

- schema: `growth.learningAutomationRuntimeEnablement.v1`
- privacy class: `summary_only`
- `summaryOnly=true`
- `recordOnly=true`
- `advisoryOnly=true`
- `configChangeApplied=false`
- `runtimeConfigChange=false`
- `runtimeConfigMutationPerformed=false`
- `writefulSchedulingAllowed=false`
- `backgroundSchedulingAllowed=false`
- `backgroundWorkerAllowed=false`

Valid statuses:

- `activation_record_required`: no valid activation audit readback exists for
  at least one selected gate.
- `activation_record_invalid`: activation rows exist, but none satisfy the
  schema/privacy/status/record-only/preflight/no-runtime-change requirements for
  at least one selected gate.
- `ready_for_manual_runtime_config_enablement`: all selected gates have valid
  activation audit readback and all selected runtime config booleans are still
  disabled.
- `partial_config`: all selected gates have valid activation audit readback,
  and only some selected runtime config booleans are enabled.
- `verified_enabled`: all selected gates have valid activation audit readback
  and all selected runtime config booleans are enabled.
- `blocked`: dependency, scope, privacy, or storage failure.

Supported activation gates mirror release activation:

- `writeful_execution`
- `background_scheduler`
- `background_worker`

## Valid Activation Readback

For each selected gate, runtime enablement requires at least one activation
record that satisfies all of these conditions:

- `activationVersion=growth.learningAutomationReleaseActivation.v1`
- `privacyClass=summary_only`
- `status` is `ready_for_owner_config_enablement` or `already_enabled`
- the record includes the selected activation gate
- activation decision is `recordOnly=true` and `advisoryOnly=true`
- activation preflight/decision/evidence indicates `preflightPassed=true`
- no activation, decision, preflight, evidence, or top-level summary has any
  runtime mutation flag set to true.

Missing or invalid records produce an audit status and required Owner action,
not an exception for normal Owner readback.

## CLI Semantics

Default operation:

```bash
npm run smoke:runtime-enablement -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --activation-gates writeful_execution \
  --json
```

This performs no-write evaluation through the normal Growth service graph.

Read persisted records:

```bash
npm run smoke:runtime-enablement -- \
  --operation list \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --json
```

Record Owner evidence:

```bash
npm run smoke:runtime-enablement -- \
  --operation record \
  --allow-write \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --activation-gates writeful_execution \
  --json
```

`record` writes only `learning_growth_automation_runtime_enablements`. It does
not flip config. The absence of `--allow-write` must return
`runtime_enablement_smoke_write_not_allowed`.

## Harness

Required focused tests:

- `node --test tests/learning-automation-runtime-enablement-repository.test.js`
- `node --test tests/learning-automation-runtime-enablement-service.test.js`
- `node --test tests/growth-runtime-enablement-smoke-script.test.js`
- `node --test tests/growth-routes.test.js`
- `node --test tests/growth-architecture-boundary.test.js`

Broad local gate:

- `npm run check`
- `npm test`
- `git diff --check`

## Production Rule

This boundary can prove that Growth is ready for a manual runtime-config step,
or that the runtime config step has been read back after it happened outside
Growth. It is not itself a deployment, release, config writer, background
scheduler switch, or scheduler permission grant.
