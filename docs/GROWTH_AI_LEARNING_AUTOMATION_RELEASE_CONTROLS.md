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

Companion inventory readback:

- service: `src/services/learning-automation-release-inventory-service.js`
- route: `GET /api/v1/growth/automation/release-inventory`
- CLI: `npm run smoke:release-inventory`

Release inventory is a read-only Owner/visible-target aggregate over the same
release ladder artifacts. It composes release-readiness snapshots, collection
runs, release decisions, package audit records, release approvals, activation
records, runtime enablement records, and release controls through existing
service read methods. It returns `growth.learningAutomationReleaseInventory.v1`
with bounded artifact counts, latest artifact ids, missing/blocked record
kinds, and nested controls state. It owns no repository/table and must not be
treated as a release switch, deploy command, scheduler permission, runtime
configuration writer, or Gateway/model boundary.

The service composes existing Growth-owned services:

- `learning-automation-release-readiness-service.evaluateReadiness`
- `learning-automation-release-review-service.review`, which reads persisted
  release package audit records through
  `learning-automation-release-package-service.listPackages`
- `learning-automation-release-closure-service.summarize`
- `learning-automation-release-activation-service.preflight`
- `learning-automation-release-activation-service.listActivations`
- `learning-automation-runtime-enablement-service.evaluate`
- `learning-automation-runtime-enablement-service.listEnablements`

It does not own a repository or table because it persists no new business
state. Durable release evidence remains in the existing release-readiness,
collection-run, package, decision, approval, activation, runtime-enablement,
scheduler, and worker-target tables. Release-readiness snapshots may include the
bounded `evidenceReadback` catalog from
`learning_growth_automation_release_readiness.evidence_readback_json`; controls
and inventory read it only through the release-readiness service/repository DTOs.
It reads package, activation, and runtime enablement audit rows only through
their owning services and returns bounded record summaries; it must not inspect
SQLite tables directly.

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
- `auditReadback`

The top-level DTO also includes `auditReadback`:

- schema: `growth.learningAutomationReleaseControls.auditReadback.v1`
- `activationRecords`: bounded count, statuses, latest record id, selected
  activation gates, and no-runtime-mutation flags from
  `learning-automation-release-activation-service.listActivations`.
- `runtimeEnablementRecords`: bounded count, statuses, latest record id,
  selected activation gates, required config keys, and no-runtime-mutation
  flags from `learning-automation-runtime-enablement-service.listEnablements`.
- failure to read either persisted audit source returns top-level
  `status=blocked`; missing rows remain visible as `records_missing` rather
  than becoming an exception.

The `steps` array contains bounded summaries for:

- `release_readiness`
- `release_review`, including package audit-record readback fields:
  `packageRecordReadbackAvailable`, `packageRecordRequired`,
  `packageRecordPresent`, `latestPackageId`, `latestPackageStatus`,
  `latestPackageStepCount`, `latestPackageDashboardStatus`,
  `latestPackageDashboardNextActionKey`, and
  `latestPackageDashboardRequiredActionCount`
- `release_closure`
- `release_activation`
- `runtime_enablement`
- `activation_records`
- `runtime_enablement_records`

The release-review service also returns a bounded `packageReadback` summary.
When a persisted package record includes `releaseDashboardSummary`, review,
authorization, closure, controls, inventory, and dashboard readbacks must expose
the latest package's dashboard status, next-action key, required-action count,
and package step count as summary-only fields. Authorization and closure use
those fields only for Owner/audit readback; they do not make package dashboard
state a hard authorization gate. They must not expose raw package artifacts or
raw smoke output.

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
- `runtimeEnablementRecordLimit` / `runtime_enablement_record_limit`
- bounded UI/evidence boolean flags already accepted by release-review

When `collectionRunId` / `collection_run_id` is supplied, release review and
release controls must read back that exact persisted collection-run record
through the collection-run service/repository boundary. They must not silently
fall back to the latest run for the same workspace/program/domain scope.

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
  --activation-record-limit 20 \
  --runtime-enablement-record-limit 20 \
  --json
```

The CLI delegates through the normal Growth service graph and returns
`operation=summarize`. It does not accept `--allow-write`, does not spawn
subprocesses, and does not call smoke CLIs internally.

## Release Evidence Bundle Integration

The release evidence bundle can collect the same no-write controls readback as
an explicit non-default task:

```bash
npm run smoke:release-evidence-bundle -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --task release_controls \
  --activation-gates writeful_execution \
  --required-approval-key writefulExecutionApproval \
  --activation-record-limit 20 \
  --runtime-enablement-record-limit 20 \
  --json
```

This task writes `releaseControlsSmokeEvidence` inside the generated
`growth.learningAutomationReleaseEvidenceBundle.v1` artifact. The task status
means the readback smoke completed and passed privacy checks. It does not mean
that Growth is ready to run automation. Consumers must read the nested
controls summary status (`release_evidence_required`,
`manual_runtime_config_required`, `runtime_verified`, and related states) to
decide the next Owner/platform action.

`release_controls` stays outside `DEFAULT_TASK_IDS` so the normal release
evidence bundle does not become circular. It should be added only as a final
audit/readback task after the default bundle and bundle-audit flow already
exists.

The companion release inventory readback can be collected the same way:

```bash
npm run smoke:release-evidence-bundle -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --task release_inventory \
  --activation-gates writeful_execution \
  --required-approval-key writefulExecutionApproval \
  --activation-record-limit 20 \
  --runtime-enablement-record-limit 20 \
  --json
```

This task writes `releaseInventorySmokeEvidence` inside the same bundle
artifact. It is also non-default and no-write. A passing task proves the
inventory readback was collected; consumers must still read the nested
inventory, controls, and dashboard summaries for the actual release state.

The companion release dashboard read model can also be collected as a final
non-default bundle task:

```bash
npm run smoke:release-evidence-bundle -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --task release_dashboard \
  --activation-gates writeful_execution \
  --required-approval-key writefulExecutionApproval \
  --activation-record-limit 20 \
  --runtime-enablement-record-limit 20 \
  --json
```

This task writes `releaseDashboardSmokeEvidence` inside the bundle artifact.
It is no-write and means only that the dashboard read model was collected.
Consumers must still read the nested dashboard/readiness/controls/inventory
statuses and next action. The task remains outside `DEFAULT_TASK_IDS` to avoid
turning the default evidence bundle into a circular final readback.

## Release Dashboard Read Model

Owner UI and release audit tooling can read one bounded release status model
without joining multiple release services in the browser:

```bash
npm run smoke:release-dashboard -- \
  --workspace-id <workspace> \
  --learner-id <learner> \
  --activation-gates writeful_execution \
  --required-approval-key writefulExecutionApproval \
  --json
```

`learning-automation-release-dashboard-service` composes only
release-readiness, release-controls, and release-inventory service DTOs. It
owns no repository/table, writes no state, and keeps all runtime mutation and
scheduling permission flags false. The dashboard is a display/readback model;
the source of truth remains the nested readiness, controls, and inventory
summaries.

The dashboard also projects the latest persisted package dashboard readback
from inventory as:

- `releaseDashboard.latestPackageStepCount`
- `releaseDashboard.latestPackageDashboardStatus`
- `releaseDashboard.latestPackageDashboardNextActionKey`
- `releaseDashboard.latestPackageDashboardRequiredActionCount`
- `artifactReadback.packages.latestPackageStepCount`
- `artifactReadback.packages.latestPackageDashboardStatus`
- `artifactReadback.packages.latestPackageDashboardNextActionKey`

These are convenience Owner/UI summary fields. They are not approval flags and
do not open runtime scheduling or writeful execution.

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
- `node --test tests/growth-release-review-smoke-script.test.js`
- `node --test tests/growth-release-controls-smoke-script.test.js`
- `node --test tests/learning-automation-release-inventory-service.test.js`
- `node --test tests/growth-release-inventory-smoke-script.test.js`
- `node --test tests/learning-automation-release-evidence-bundle-service.test.js`
- `node --test tests/growth-release-evidence-bundle-script.test.js`
- `node --test tests/growth-routes.test.js`
- `node --test tests/growth-architecture-boundary.test.js`

`tests/growth-release-review-smoke-script.test.js` must include a real SQLite
service-graph scenario that seeds a release collection run and a matching
release package audit record, then executes `scripts/smoke-growth-release-review.js`
in a child process and verifies the package readback fields above, including
the package dashboard summary projection. This prevents the release
review/controls/dashboard ladder from regressing to fake-service-only package
coverage.

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
