# Growth AI Learning Automation Digest Plan

Last updated: 2026-06-18.

## Purpose

This document defines the supervised automation digest layer for the Growth AI
learning loop. It sits between the implemented proposal/scheduler dry-run
backend and any future writeful scheduler.

The digest layer exists to make future automation reviewable before it becomes
scheduled. It must summarize what Growth would do next, why it is allowed, what
is blocked, and which explicit Owner action remains required.

The digest is not a scheduler, not a notification system, and not a model
boundary.

Backend status:

- `learning-automation-digest-service` is implemented locally;
- `automation-digests.js` and `learning_growth_automation_digests` are
  implemented locally;
- `GET /api/v1/growth/automation/digests`,
  `POST /api/v1/growth/automation/digests`, and
  `POST /api/v1/growth/automation/digests/:digestId/review` are implemented
  locally;
- service-owned `npm run smoke:digest` is implemented locally;
- focused repository, service, route, and architecture harnesses are added;
- rollback/failure policy backend is implemented locally through
  `learning-automation-failure-policy-service`,
  `automation-failure-policies.js`, and
  `/api/v1/growth/automation/failure-policies` routes;
- Growth-owned action handoff backend and embedded Owner UI are implemented
  locally through
  `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md`;
- proposal creation can reuse an explicit existing validated plan draft through
  `existingPlanDraftId` / `--existing-plan-draft-id` without drafting a new
  plan, while still checking source-cycle completeness, target provisioning,
  draft status, selected item, and summary-only privacy;
- embedded digest read/refresh/review UI is implemented in the Owner generation
  panel for persisted digest rows. Digest creation UI, platform Action
  Inbox/Web Push product evidence, and writeful scheduling remain future work.

## Position In The Loop

The complete supervised path is:

1. Learner completes a daily card or formal assessment.
2. Growth writes evaluation, evidence ledger, Profile V2, profile-delta audit,
   trajectory, and recommendation lifecycle records.
3. Owner can inspect the cycle audit and completeness readback.
4. Growth may create an Owner-reviewed proposal only after the source cycle is
   auditable and the target is provisioned.
5. Owner can accept, skip, expire, or supersede that proposal.
6. The scheduler dry-run can inspect accepted proposals and report bounded
   candidate actions without writing or publishing.
7. The digest layer persists a summary-only review packet over dry-run
   candidates, blocked candidates, and required Owner actions.
8. Owner reviews the digest and either takes explicit publish actions or leaves
   candidates blocked/skipped.
9. Only after digest review, active rollback/failure policy, Growth action
   handoff, platform notification/action evidence, and visual evidence are
   proven may a future writeful scheduler be considered.

Digest review must therefore happen after proposal review and before any
automatic publication or background scheduling.

## Non-Goals

The digest layer must not:

- call Gateway or model vendors;
- draft a new plan;
- author a card;
- evaluate a learner answer;
- publish a plan item;
- record proposal execution metadata;
- activate formal stage assessments;
- send Web Push, Action Inbox, or Home AI notifications;
- enqueue background work;
- treat `readyForAutomation=true` as permission to publish;
- expose raw learner answers, transcripts, raw prompts, raw model output,
  source-document bodies, hidden answer keys, private paths, secrets, tokens,
  cookies, or provider configuration.

## Service Boundary

The service is:

```text
src/services/learning-automation-digest-service.js
```

It should compose existing services only:

- `learning-automation-scheduler-service` for read-only dry-run candidates;
- `learning-automation-proposal-service` for proposal readback;
- `learning-audit-completeness-service` for source-cycle trust checks;
- `learning-target-provisioning-service` for target/domain-pack validation
  when the dry-run result needs rechecking;
- optional read services such as plan audit, evidence audit, profile-delta
  audit, and cycle audit for bounded Owner explanation.

The service must not call lower-level SQLite tables directly. It should use a
repository only for digest persistence.

## Repository Boundary

The repository is:

```text
src/stores/growth-learning-sqlite/automation-digests.js
```

The table should be named:

```text
learning_growth_automation_digests
```

Minimum summary-only fields:

| Field | Purpose |
| --- | --- |
| `digest_id` | Stable digest id. |
| `workspace_id` | Target learner workspace. |
| `learner_id` | Target learner id. |
| `program_id` | Program scope. |
| `domain_pack_id` | Provisioned domain pack when selected. |
| `domain` | Domain selector. |
| `subject` | Subject selector. |
| `horizon` | Planning horizon, normally `daily_plan` or reviewed weekly scope. |
| `source_policy_json` | Bounded Owner policy and source-cycle filters. |
| `summary_json` | Counts and status totals only. |
| `candidates_json` | Bounded candidate DTOs from scheduler dry-run. |
| `blocked_json` | Bounded blocked/skipped candidate summaries. |
| `required_actions_json` | Explicit Owner actions that remain manual. |
| `privacy_class` | Must be `summary_only`. |
| `created_by` | Owner actor id or role summary. |
| `created_at` | Timestamp. |
| `updated_at` | Timestamp. |

Optional future review fields:

- `review_status`: `pending`, `reviewed`, `archived`, or `superseded`;
- `reviewed_by`;
- `reviewed_at`;
- `review_json`: bounded Owner digest review metadata.

Repository requirements:

- reject privacy-risk keys and private path/token-looking values before
  writing;
- reject any `privacy_class` other than `summary_only`;
- use stable digest ids so duplicate equivalent dry-runs can be idempotent;
- return public DTOs, not raw table rows;
- support bounded listing by target workspace, learner, program, status,
  domain pack, subject, and limit;
- migrate missing optional review columns without changing existing digest
  semantics;
- never store raw dry-run inputs if they contain private payloads.

## Route Boundary

Routes are Owner-controlled for writes and visible-target scoped:

```text
GET  /api/v1/growth/automation/digests
POST /api/v1/growth/automation/digests
POST /api/v1/growth/automation/digests/:digestId/review
```

Route responsibilities:

- parse bounded query/body fields;
- enforce Owner role for writes;
- require the workspace bearer for writes;
- enforce Growth visible-target scope;
- delegate business policy to `learning-automation-digest-service`;
- return bounded digest DTOs and failure states.

Routes must not:

- inspect SQLite tables directly;
- call Gateway;
- publish plan items;
- call card generation;
- send notifications;
- start a scheduler;
- calculate Profile V2 or audit completeness in route code.

## Operational Smoke CLI

The service-owned smoke entry is:

```bash
npm run smoke:digest -- --operation list --workspace-id <workspace>
```

It instantiates the normal Growth service graph and delegates only to
`learningAutomationDigestService`.

Supported operations:

| Operation | Write gate | Service method | Purpose |
| --- | --- | --- | --- |
| `list` | None; this is the default. | `listDigests(input)` | Read-only scoped digest listing. |
| `get` | None; requires `--digest-id`. | `getDigest(input)` | Read-only exact digest readback. |
| `create` | Requires `--allow-write`. | `createDigest(input)` | Runs the service-owned scheduler dry-run path and persists a summary-only pending digest only when dry-run flags remain non-writeful. |
| `review` | Requires `--allow-write` and `--digest-id`. | `reviewDigest(input)` | Marks a pending digest reviewed, archived, or superseded with bounded Owner review metadata. |

Example read-only list:

```bash
npm run smoke:digest -- --workspace-id fanfan --learner-id fanfan --program-id default
```

Example write-gated digest creation:

```bash
npm run smoke:digest -- \
  --operation create \
  --workspace-id fanfan \
  --learner-id fanfan \
  --program-id default \
  --domain-pack-id uk-hk-curriculum-foundation \
  --domain science \
  --subject science \
  --allow-write
```

Example proposal creation from an already validated draft:

```bash
npm run smoke:proposal -- \
  --operation create \
  --workspace-id fanfan \
  --learner-id fanfan \
  --source-task-card-id <completed-card-id> \
  --source-evaluation-id <evaluation-id> \
  --existing-plan-draft-id <draft-plan-id> \
  --selected-item-id <draft-item-id> \
  --allow-write \
  --json
```

This path still delegates to `learning-automation-proposal-service`, loads the
draft through `learning-plan-publisher-service.getPlanDraft`, rejects already
published drafts, rechecks target provisioning against the selected draft item,
and persists only summary-only proposal metadata. It is useful when a validated
draft already exists and Owner wants to construct the supervised digest /
handoff chain without another planner call. It is not production planner
readiness evidence and must not be recorded as a Gateway/model smoke pass.

Example write-gated review:

```bash
npm run smoke:digest -- \
  --operation review \
  --workspace-id fanfan \
  --digest-id <digest-id> \
  --status reviewed \
  --allow-write
```

The CLI must not import repositories directly, inspect `learning_growth_`
tables, call Gateway, draft or publish plans, generate cards, evaluate learner
submissions, record proposal execution, execute scheduler actions, run
scheduler ticks, deliver notifications or action handoffs, enqueue workers,
activate stage assessments, or act as a deployment or release switch.

## Create Digest Flow

`POST /api/v1/growth/automation/digests` should:

1. require Owner role, workspace bearer authorization, and target visibility;
2. normalize target selectors and a bounded limit;
3. call `learning-automation-scheduler-service.dryRun` or equivalent service
   method with `dryRun=true`;
4. reject or mark any dry-run result that is not explicitly non-writeful;
5. build a digest summary with counts for `would_publish`, `blocked_audit`,
   `blocked_provisioning`, `skipped_already_published`, and future policy
   blocks;
6. persist the summary-only digest through the digest repository;
7. return the digest and explicit Owner actions.

The digest may contain a candidate that says "would publish if Owner chooses
the explicit proposal publish action." It must not perform that action.

## List Digest Flow

`GET /api/v1/growth/automation/digests` should:

1. enforce visible-target read scope;
2. support bounded filters for learner, program, domain pack, subject, status,
   and limit;
3. return recent digest DTOs in reverse chronological order;
4. include summary counts, candidate ids, blocked reasons, and required actions;
5. omit raw candidate internals, prompts, answers, transcripts, model output,
   private paths, and provider configuration.

## Review Digest Flow

`POST /api/v1/growth/automation/digests/:digestId/review` should:

1. require Owner role, workspace bearer authorization, and target visibility;
2. allow bounded review states such as `reviewed`, `archived`, or
   `superseded`;
3. optionally store bounded Owner notes or selected candidate ids;
4. never publish or execute selected candidates;
5. leave publication on the existing explicit accepted-proposal publish route.

Digest review records that Owner has read or triaged the packet. It does not
authorize background execution by itself.

## Public DTO Shape

The public digest DTO should include:

- `digestId`;
- `workspaceId`;
- `learnerId`;
- `programId`;
- `domainPackId`, `domain`, and `subject`;
- `horizon`;
- `status`;
- `summary.counts`;
- `candidates[]` with bounded proposal id, plan draft id, selected item id,
  target nodes, decision, reason, completeness summary, provisioning summary,
  and explicit publish action;
- `blocked[]` with bounded proposal id, reason, missing audit/provisioning
  fields, and retry hints;
- `requiredActions[]`;
- `createdBy`, `createdAt`, `updatedAt`;
- optional `review` metadata.

Every candidate must keep these flags explicit when applicable:

```text
dryRun=true
writePlanned=false
writesPerformed=false
publishPlanned=false
publishRequiresOwnerAction=true
```

## Failure Policy

The digest layer should fail closed and visibly:

- scheduler dry-run dependency missing: return a bounded
  `automation_digest_scheduler_unavailable` error and write no digest;
- dry-run reports write intent: reject with `automation_digest_non_readonly`;
- target not visible: return the existing route authorization failure and write
  no digest;
- target not provisioned: persist only a blocked candidate if the scheduler
  dry-run returns a bounded block, otherwise return a bounded failure;
- privacy-risk payload: reject before service or repository write;
- DB failure: no partial digest row should survive;
- stale accepted proposal: record `blocked_audit` or
  `skipped_already_published` rather than publishing.

Failures must be visible in Owner UI and harness output without exposing raw
private content.

## UI Contract

The Owner UI treats digest review as a panel after proposal review.

Minimum UI responsibilities:

- show digest timestamp, target scope, and status;
- show counts for would-publish, blocked, skipped, and already-published
  candidates;
- show bounded candidate rationale and the explicit Owner action;
- show why blocked candidates are blocked;
- let Owner mark a pending digest reviewed, archived, or superseded;
- never auto-publish after digest creation or review;
- keep mobile scroll and dark-mode contrast within the central visual
  contract.

The implemented UI covers persisted digest listing and review only. Digest
creation remains a later explicit Owner action. Digest UI evidence is required
before writeful scheduling or platform notification handoff.

## Harness Contract

Future implementation must add focused harness before broad validation.

Repository harness:

- table creation and optional review-column migration;
- idempotent digest creation for equivalent dry-run input;
- summary-only privacy class enforcement;
- privacy-risk key and private path/token-looking value rejection;
- bounded public DTO projection;
- rollback on failed insert/update.

Service harness:

- creates digest from valid dry-run candidates;
- preserves dry-run flags and explicit Owner actions;
- persists blocked audit and provisioning candidates;
- rejects any dependency result that claims writes or publication;
- rejects privacy-risk inputs and outputs;
- does not call Gateway, card generation, plan publication, proposal publish,
  notification, Action Inbox, stage-assessment activation, or direct SQLite
  table access.

Route harness:

- Owner-only write routes;
- workspace bearer required for writes;
- visible-target read/write scope;
- bounded filters and limits;
- visible failures for missing dependency, privacy block, and DB failure.

Architecture harness:

- `learning-automation-digest-service` may call scheduler dry-run, proposal
  read, audit completeness, target provisioning, and audit read services only;
- it must not import Gateway clients, model vendor clients, card generation,
  plan publisher publish functions, notification clients, Action Inbox clients,
  or stage-assessment activation paths.
- smoke CLI delegates only to `learningAutomationDigestService`, keeps `list`
  and `get` read-only, requires explicit `--allow-write` for `create` and
  `review`, and does not call Gateway, publication, evaluation, scheduler
  execution, scheduler ticks, action handoff, stage assessment activation, or
  repositories directly.

UI harness:

- digest list renders counts and candidate state;
- explicit publish action is displayed as manual and is not triggered by
  digest creation/review;
- blocked reasons are visible;
- review payloads are summary-only and can mark pending digests `reviewed`,
  `archived`, or `superseded`;
- mobile scroll reaches final controls;
- dark mode contrast is readable.

Minimum command group for the future backend slice:

```bash
node --test tests/learning-automation-digest-repository.test.js \
  tests/learning-automation-digest-service.test.js \
  tests/growth-automation-digest-smoke-script.test.js \
  tests/learning-automation-scheduler-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-architecture-boundary.test.js
npm run smoke:digest
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

Writeful scheduling remains blocked until all of these are true:

1. Owner daily-card UI is browser-operable and visually validated.
2. Owner audit/correction UI explains completed cycles from service DTOs.
3. Proposal review UI exists and explicit accepted-proposal publish is usable.
4. Digest backend and digest UI persist and render dry-run review packets.
5. Rollback/failure behavior is implemented, documented, and covered by
   repository/service/route/architecture harness.
6. Growth action handoff backend exists and platform Action Inbox/Web Push
   handoff has separate platform evidence and harness.
7. Central Home AI visual evidence exists for the Owner automation surfaces.

Until then, Growth may provide read-only scheduler dry-runs and digest review
evidence, but it must not run a background scheduler that writes or publishes.
