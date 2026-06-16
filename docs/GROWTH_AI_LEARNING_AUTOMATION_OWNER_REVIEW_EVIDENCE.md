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
- Release evidence bundle task: default task `owner_review_evidence`, persisted
  as `ownerReviewEvidence`.
- Release-readiness check key: `owner_review_evidence`, with required action
  `run_owner_review_evidence_smoke`.
- Release-readiness smoke flag:
  `npm run smoke:release-readiness -- --owner-review-evidence`.
- Release evidence record key: `owner_review_evidence`, canonicalized as
  `ownerReviewEvidence` for persisted pass-record readback.
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

Proposal lifecycle summary is intentionally more detailed than the execution
gate. The proposal summary reports `proposed`, `accepted`, `skipped`,
`expired`, and `superseded` counts, owner-decision count, and bounded proposal
execution counts for `published`, `blocked`, and `failed`. Only `accepted`
proposals satisfy the publishable proposal gate. `skipped`, `expired`, and
`superseded` records are audit evidence only and must not become scheduler or
publish permission.

The same compact Owner summary also reports downstream automation-stage counts
needed for release review: digest totals, reviewed/pending digest counts,
required-action and blocked-candidate counts, action-handoff totals,
delivered/pending/blocked handoff counts, scheduler execution totals and
`published`/`blocked`/`failed` counts, scheduler run totals and
`completed`/`blocked`/`skipped` counts, reviewed/pending/disabled worker-target
counts, and failure-policy readiness/status. These are summary counters only;
they do not expose raw proposal, digest, handoff, execution, run, target, or
policy rows.

## Release Evidence Integration

`owner_review_evidence` is now part of the default release evidence bundle.
The bundle builder runs `npm run smoke:owner-review-evidence` through its
injected command runner, parses the summary-only result, privacy-scans it, and
stores a bounded `ownerReviewEvidence` item. The bundle stores status, gate
counts, release-readiness status, missing gate/check keys, next-action key,
proposal lifecycle counts, and downstream automation-stage counts; it never
stores smoke stdout, raw dependency DTOs, raw row ids, private paths, or learner
content.

Release-readiness treats `ownerReviewEvidence` as a required backend evidence
check. This proves the Owner automation evidence read model can be collected
and read back; it does not prove proposal/digest/action/execution UI evidence
or mobile visual evidence. Those evidence keys remain separate readiness
requirements.

The same evidence key can also be recorded through the release evidence record
boundary as `owner_review_evidence`. Persisted pass records are projected back
into release-readiness through the canonical `ownerReviewEvidence` key.

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
- `tests/learning-automation-release-evidence-bundle-service.test.js`;
- `tests/growth-release-evidence-bundle-script.test.js`;
- `tests/learning-automation-release-readiness-service.test.js`;
- `tests/growth-release-readiness-smoke-script.test.js`;
- `tests/learning-automation-release-evidence-service.test.js`;
- route coverage in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`;
- syntax coverage through `npm run check`;
- `npm run smoke:owner-review-evidence -- --workspace-id <workspace> --json`.

The smoke CLI is no-write. It instantiates the normal service graph and calls
only `learningAutomationOwnerReviewEvidenceService.evaluate`.

The service harness must cover repository-native proposal lifecycle states.
In particular, `proposed` counts as pending review evidence, while `skipped`,
`expired`, and `superseded` remain owner-decision audit counts and do not pass
the accepted-proposal gate.

The release-evidence bundle harness must also prove the bounded
`ownerReviewEvidence.summary` projection preserves digest, action-handoff,
scheduler execution, scheduler run, worker-target, and failure-policy counts
without carrying raw dependency ids.

## Current Product Gap

This boundary improves backend observability for the AI-driven loop. The
remaining product evidence still requires embedded Owner UI and central visual
harness coverage for proposal review, digest review, action handoff,
scheduler execution/run, worker-target review, dark mode, mobile scroll, and
progress/error states.
