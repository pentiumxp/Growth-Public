# Growth Automation Release Controls

Last updated: 2026-06-16.

## Purpose

Release controls provide one Owner-readable backend status surface for the
Growth automation release ladder.

The boundary is read-only and advisory. It answers: where is the release ladder
blocked, what is the next Owner/platform action, and whether runtime
enablement has only been prepared, still requires a manual platform config
change, or has been read back as enabled.

It is not a release switch, deployment tool, scheduler permission, runtime
configuration writer, card publisher, Gateway caller, or notification sender.

## Service Boundary

Owner service:

- `src/services/learning-automation-release-controls-service.js`

Route:

- `GET /api/v1/growth/automation/release-controls`

CLI:

- `npm run smoke:release-controls`

The service composes existing Growth-owned services:

- `learning-automation-release-readiness-service.evaluateReadiness`
- `learning-automation-release-review-service.review`
- `learning-automation-release-closure-service.summarize`
- `learning-automation-release-activation-service.preflight`
- `learning-automation-runtime-enablement-service.evaluate`

It does not own a repository or table because it persists no new business
state. Durable release evidence remains in the existing release-readiness,
collection-run, decision, approval, activation, runtime-enablement, scheduler,
and worker-target tables.

## DTO Contract

Release controls DTOs use:

- schema: `growth.learningAutomationReleaseControls.v1`
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

Valid top-level statuses:

- `release_evidence_required`: release-readiness evidence is not ready.
- `release_review_required`: collection run or Owner release decision review
  is not approved.
- `release_closure_required`: review/authorization closure is incomplete.
- `release_approval_required`: release approval records are missing for the
  selected gate.
- `release_activation_required`: activation preflight is not ready.
- `activation_record_required`: no valid activation audit row exists for at
  least one selected runtime gate.
- `activation_record_invalid`: activation rows exist but fail summary-only /
  record-only / no-runtime-mutation validation.
- `manual_runtime_config_required`: release activation is recorded and the
  selected runtime config booleans are still disabled.
- `manual_runtime_config_partial`: only some selected runtime config booleans
  have been enabled.
- `runtime_verified`: selected runtime config booleans are enabled and valid
  activation readback exists.
- `blocked`: dependency, scope, or privacy failure.

The `releaseControls` summary includes:

- `requiredActionCount`
- `requiredActions`
- `nextAction`
- `missingCheckKeys`
- `blockedCheckKeys`
- `missingEvidenceKeys`
- `missingApprovalKeys`

The `steps` array contains bounded summaries for:

- `release_readiness`
- `release_review`
- `release_closure`
- `release_activation`
- `runtime_enablement`

## Route Semantics

`GET /api/v1/growth/automation/release-controls` is visible-target scoped. An
Owner can request another visible Growth target. A workspace actor can only
read its current target.

Supported selectors mirror activation/runtime readback:

- `workspaceId` / `workspace_id`
- `learnerId` / `learner_id`
- `programId` / `program_id`
- `domainPackId` / `domain_pack_id`
- `domain`
- `subject`
- `horizon`
- `collectionRunId` / `collection_run_id`
- `requiredApprovalKey` / `required_approval_key`
- `requiredApprovalKeys` / `required_approval_keys`
- `activationGate` / `activation_gate`
- `activationGates` / `activation_gates`
- `activationRecordLimit` / `activation_record_limit`
- bounded UI/evidence boolean flags already accepted by release-review

There is intentionally no POST route. Creating release snapshots, collection
runs, decisions, approvals, activation rows, or runtime-enablement rows remains
owned by their existing service-specific routes and write gates.

## CLI Semantics

Default no-write readback:

```bash
npm run smoke:release-controls -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --activation-gates writeful_execution \
  --json
```

The CLI delegates through the normal Growth service graph and returns
`operation=summarize`. It does not accept `--allow-write`, does not spawn
subprocesses, and does not call smoke CLIs internally.

## Forbidden Boundaries

Release controls must not:

- write repositories or tables;
- run smoke tasks or spawn shell commands;
- call Gateway/model vendors;
- call Home AI old Growth routes or server internals;
- publish plans, generate cards, evaluate submissions, or settle rewards;
- execute scheduler actions or run scheduler ticks;
- deliver notifications or platform actions;
- activate stage assessments;
- mutate learner state;
- mutate runtime config or grant scheduler permission;
- inspect SQLite tables directly;
- expose raw learner answers, transcripts, raw prompts, raw model output,
  answer keys, source document bodies, private paths, credentials, tokens, or
  provider configuration.

## Harness

Required focused tests:

- `node --test tests/learning-automation-release-controls-service.test.js`
- `node --test tests/growth-release-controls-smoke-script.test.js`
- `node --test tests/growth-routes.test.js`
- `node --test tests/growth-architecture-boundary.test.js`

Broad local gate:

- `npm run check`
- `npm test`
- `git diff --check`

Platform contract checks:

- from the Home AI app workspace:
  `node scripts/plugin-workspace-platform-contract-check.js --json`
- `node tests/plugin-workspace-platform-contract-check.test.js`
- `node tests/architecture-code-test-harness-map.test.js`

## Production Rule

Release controls can show that Growth is ready for a manual platform
runtime-config step, or that a platform step has been read back as enabled. The
manual config change and any production deploy remain outside Growth and must
follow the canonical Home AI platform deployment contract.
