# Growth AI Learning Automation Failure Policy

Last updated: 2026-06-15.

## Purpose

This document defines the Growth-owned rollback and failure-policy boundary for
the supervised AI learning loop. It is a safety prerequisite for future
writeful scheduling, not a scheduler and not an execution path.

The policy layer answers:

- what failure states must remain visible to Owner;
- which publish or proposal failures require manual retry;
- what rollback behavior is expected for partial publish attempts;
- whether the target scope has an active policy prerequisite for future
  automation design.

It does not authorize automatic publication. Even when an active policy exists,
`writefulSchedulingAllowed` remains `false` until Owner UI, audit/correction UI,
proposal review UI, digest UI, Growth action handoff, platform Action
Inbox/Web Push evidence, visual evidence, and a separate writeful scheduler
contract all exist.

## Current Backend Status

Implemented locally:

- `src/services/learning-automation-failure-policy-service.js`;
- `src/stores/growth-learning-sqlite/automation-failure-policies.js`;
- table `learning_growth_automation_failure_policies`;
- stable id helper `stableLearningAutomationFailurePolicyId`;
- store facade `learningAutomationFailurePolicyRepository`;
- app service `learningAutomationFailurePolicyService`;
- visible-target scoped
  `GET /api/v1/growth/automation/failure-policies`;
- visible-target scoped
  `GET /api/v1/growth/automation/failure-policies/readiness`;
- Owner-only `POST /api/v1/growth/automation/failure-policies`;
- Owner-only
  `POST /api/v1/growth/automation/failure-policies/:policyId/review`;
- focused repository, service, route, and architecture harnesses.

Not implemented by this layer:

- digest UI;
- proposal review UI;
- platform Action Inbox/Web Push product evidence;
- writeful scheduler;
- background worker;
- automatic publication;
- production rollout.

## Non-Goals

The failure-policy layer must not:

- call Gateway or model vendors;
- draft plans;
- author cards;
- evaluate learner evidence;
- publish plan items;
- publish accepted proposals;
- record proposal execution metadata;
- call scheduler dry-run or a future scheduler directly;
- activate stage assessments;
- send Web Push, Action Inbox, or Home AI notifications;
- enqueue background work;
- expose raw learner answers, transcripts, prompts, raw model output,
  source-document bodies, answer keys, private paths, credentials, cookies,
  tokens, or provider configuration.

## Service Boundary

The service is:

```text
src/services/learning-automation-failure-policy-service.js
```

Responsibilities:

- normalize policy, rollback, and failure summaries;
- force `summaryOnly=true`;
- force `writefulSchedulingAllowed=false`;
- force `maxAutomaticRetries=0`;
- require Owner review before a policy becomes active;
- evaluate whether an active policy exists for a target scope;
- return readiness as a prerequisite only.

Public service methods:

| Method | Purpose |
| --- | --- |
| `createPolicy(input)` | Stores a draft summary-only failure policy for the target scope. |
| `listPolicies(input)` | Lists scoped public policy DTOs. |
| `reviewPolicy(input)` | Moves a draft policy to `active`, `archived`, or `superseded` through bounded Owner review metadata. |
| `evaluateReadiness(input)` | Reports whether an active policy exists for the target scope. |

Readiness semantics:

| Field | Meaning |
| --- | --- |
| `readyForWritefulAutomationPrerequisite` | True only when an active scoped policy exists. It is one prerequisite, not execution permission. |
| `writefulSchedulingAllowed` | Always false in this layer. Future scheduler enablement needs a separate contract and harness. |
| `missingRequired` | Includes `active_failure_policy` when no active scoped policy exists. |
| `requiredActions` | Points Owner to create or activate a policy when missing. |

## Repository Boundary

The repository is:

```text
src/stores/growth-learning-sqlite/automation-failure-policies.js
```

The table is:

```text
learning_growth_automation_failure_policies
```

Minimum fields:

| Field | Purpose |
| --- | --- |
| `policy_id` | Stable policy id for target scope and policy version. |
| `workspace_id` | Target learner workspace. |
| `learner_id` | Target learner id. |
| `program_id` | Program scope. |
| `domain_pack_id` | Provisioned domain pack when selected. |
| `domain` | Domain selector. |
| `subject` | Subject selector. |
| `horizon` | Planning horizon. |
| `status` | `draft`, `active`, `archived`, or `superseded`. |
| `policy_version` | Versioned policy contract id. |
| `policy_json` | Summary-only gating policy. |
| `rollback_json` | Summary-only rollback policy. |
| `failure_json` | Summary-only failure visibility and retry policy. |
| `review_json` | Bounded Owner review metadata. |
| `created_by` | Bounded Owner actor id or role summary. |
| `reviewed_by` | Bounded Owner reviewer id or role summary. |
| `reviewed_at` | Review timestamp. |
| `privacy_class` | Must be `summary_only`. |
| `created_at` / `updated_at` | Audit timestamps. |

Repository requirements:

- reject privacy-risk keys before writing;
- reject any `privacy_class` other than `summary_only`;
- use stable ids so equivalent create calls are idempotent;
- migrate missing `review_json`, `reviewed_by`, `reviewed_at`, and
  `policy_version` columns;
- return public DTOs, not raw rows;
- reject conflicting terminal reviews.

## Route Boundary

Routes are HTTP glue only:

```text
GET  /api/v1/growth/automation/failure-policies
GET  /api/v1/growth/automation/failure-policies/readiness
POST /api/v1/growth/automation/failure-policies
POST /api/v1/growth/automation/failure-policies/:policyId/review
```

Route responsibilities:

- parse bounded query/body fields;
- enforce Growth visible-target scope for reads;
- require Owner role for writes;
- require workspace bearer authorization for writes;
- delegate policy behavior to
  `learning-automation-failure-policy-service`;
- return bounded policy/readiness DTOs.

Routes must not inspect SQLite tables, calculate Profile V2, call Gateway,
publish cards, send notifications, or start scheduling.

## Policy Defaults

Draft policy creation normalizes caller input into these safe defaults:

- `summaryOnly=true`;
- `ownerReviewRequired=true`;
- `digestReviewRequired=true`;
- `proposalReviewRequired=true`;
- `auditCompletenessRequired=true`;
- `targetProvisioningRequired=true`;
- `rollbackPolicyRequired=true`;
- `actionHandoffRequiredBeforeScheduling=true`;
- `writefulSchedulingAllowed=false`;
- rollback uses `service_transaction_rollback`;
- failed plan publish keeps the draft unpublished and records bounded
  publish-attempt metadata;
- failed accepted-proposal publish records bounded execution failure metadata
  and requires Owner retry;
- failed action handoff performs no learning write;
- `retryRequiresOwner=true`;
- `maxAutomaticRetries=0`.

## State Flow

| State | Meaning |
| --- | --- |
| `draft` | Policy is stored but not active. Readiness remains missing. |
| `active` | Policy is an active prerequisite for future automation design. It still does not authorize scheduling. |
| `archived` | Policy is retained for audit but no longer active. |
| `superseded` | Policy has been replaced by a newer scoped policy/version. |

Review transitions are terminal for the current policy row. Repeating the same
terminal review is idempotent; changing terminal state after review is rejected.

## Harness Contract

Repository harness:

- table creation and review/policy-version column migration;
- idempotent policy creation;
- summary-only privacy-class enforcement;
- privacy-risk key rejection;
- bounded public DTO projection;
- invalid and conflicting review rejection.

Service harness:

- draft creation preserves safe defaults;
- caller attempts to enable scheduling or automatic retry are forced off;
- active policy readiness is reported as a prerequisite only;
- missing active policy fails closed with `active_failure_policy`;
- privacy-risk input rejection;
- missing repository failure.

Route harness:

- visible-target scoped reads;
- Owner-only writes;
- workspace bearer required for writes;
- bounded normalizers for create, review, list, and readiness;
- invisible target denial.

Architecture harness:

- routes do not import stores or table names;
- service does not call Gateway, plan publication, accepted-proposal
  publication, scheduler/dry-run, card generation, stage activation, Action
  Inbox, notification clients, or direct SQLite tables;
- store facade owns repository composition.

Focused command group:

```bash
node --test tests/learning-automation-failure-policy-repository.test.js \
  tests/learning-automation-failure-policy-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-architecture-boundary.test.js
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
git diff --check
```

Broad local gate after implementation:

```bash
npm run check
npm test
```

## Release Gate

This layer closes one backend prerequisite only. Writeful scheduling remains
blocked until all of these are true:

1. Owner daily-card UI is browser-operable and visually validated.
2. Owner audit/correction UI explains completed cycles from service DTOs.
3. Proposal review UI exists and accepted-proposal publication is explicit.
4. Digest UI renders persisted dry-run packets and blocked reasons.
5. Growth action handoff backend exists, and platform Action Inbox/Web Push
   evidence has its own contract and harness.
6. The default-disabled Owner-explicit scheduler execution backend has
   repository/service/route/architecture harness evidence and remains disabled
   until explicit release approval.
7. Any future background scheduler has separate race, idempotency, rollback,
   notification/action handoff, architecture, production dry-run, and release
   evidence.
