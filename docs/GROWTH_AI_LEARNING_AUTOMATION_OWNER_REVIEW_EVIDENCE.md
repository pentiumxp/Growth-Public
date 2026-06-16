# Growth Automation Owner Review Evidence

Last updated: 2026-06-16.

## Purpose

The Owner review evidence boundary gives Growth one summary-only read model for
the supervised automation loop after card generation and learner-cycle
completion. It lets Owner tooling inspect whether the loop has proposal,
digest, failure-policy, action-handoff, scheduler execution, scheduler run,
worker-target, and release-readiness evidence without reading raw learner
content or stitching together ad hoc JSON in Codex.

This boundary is backend evidence only. It is not product UI evidence and must
not be counted as mobile visual evidence.

## Implemented Boundary

- Service: `src/services/learning-automation-owner-review-evidence-service.js`.
- Route: `GET /api/v1/growth/automation/owner-review-evidence`.
- Smoke CLI: `npm run smoke:owner-review-evidence`.
- Schema: `growth.learningAutomationOwnerReviewEvidence.v1`.
- Privacy class: `summary_only`.

The service reads only through existing Growth services:

- `learningAutomationProposalService.listProposals`;
- `learningAutomationDigestService.listDigests`;
- `learningAutomationFailurePolicyService.evaluateReadiness`;
- `learningAutomationActionHandoffService.listHandoffs`;
- `learningAutomationSchedulerExecutionService.listExecutions`;
- `learningAutomationSchedulerRunService.listRuns`;
- `learningAutomationSchedulerWorkerTargetService.listTargets`;
- `learningAutomationReleaseReadinessService.evaluateReadiness`.

It owns no repository or table. It does not write SQLite rows.

## Output Semantics

The top-level DTO contains:

- bounded scope fields: `workspaceId`, `learnerId`, `programId`,
  `domainPackId`, `domain`, `subject`, and `horizon`;
- `automationOwnerReviewEvidence`, a compact Owner summary with status, gate
  counts, next action, missing gate keys, release-readiness keys, and per-stage
  counts;
- per-stage summaries for proposals, digests, failure policy, action handoffs,
  scheduler executions, scheduler runs, worker targets, and release readiness;
- explicit safety flags:
  `writefulSchedulingAllowed=false`,
  `backgroundSchedulingAllowed=false`,
  `backgroundWorkerAllowed=false`,
  `runtimeConfigChange=false`, and `configChangeApplied=false`.

The gate list is advisory. Missing gate keys identify what Owner or release
tooling should inspect next; they do not enable scheduling.

## Forbidden Boundaries

This boundary must not:

- call Gateway, OpenAI, Claude, DeepSeek, or any model vendor;
- generate cards;
- evaluate submissions;
- publish plans;
- call `publishAcceptedProposal`;
- execute scheduler actions;
- run scheduler ticks;
- deliver action handoffs;
- emit platform events;
- activate stage assessments;
- mutate learner state;
- apply runtime config;
- grant scheduler permission;
- import SQLite repositories directly;
- expose raw prompts, raw model output, raw learner text, transcripts, answer
  keys, private paths, credentials, or provider config.

## Harness

Required local harness:

- `tests/learning-automation-owner-review-evidence-service.test.js`;
- `tests/growth-automation-owner-review-evidence-smoke-script.test.js`;
- route coverage in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`;
- syntax coverage through `npm run check`;
- `npm run smoke:owner-review-evidence -- --workspace-id <workspace> --json`.

The smoke CLI is no-write. It instantiates the normal service graph and calls
only `learningAutomationOwnerReviewEvidenceService.evaluate`.

## Current Product Gap

This boundary improves backend observability for the AI-driven loop. The
remaining product evidence still requires embedded Owner UI and central visual
harness coverage for proposal review, digest review, action handoff,
scheduler execution/run, worker-target review, dark mode, mobile scroll, and
progress/error states.
