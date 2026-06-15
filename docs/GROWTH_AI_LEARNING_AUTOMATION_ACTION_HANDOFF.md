# Growth AI Learning Automation Action Handoff

Last updated: 2026-06-15.

## Purpose

This document defines the Growth-owned automation action handoff boundary for
the supervised AI learning loop. It is the P7 backend layer between reviewed
automation digests plus active failure policy and Home AI platform notification
surfaces.

The layer answers:

- which reviewed digest actions or blocked candidates require Owner attention;
- which active rollback/failure policy was checked before handoff;
- what bounded notification metadata Growth emitted;
- whether delivery was accepted, failed, or remains pending.

It does not publish cards, schedule work, call Gateway, or move Action Inbox
policy into Growth. Home AI still owns Action Inbox, Web Push, platform
permissions, channel state, and final notification rendering.

## Current Backend Status

Implemented locally:

- `src/services/learning-automation-action-handoff-service.js`;
- `src/stores/growth-learning-sqlite/automation-action-handoffs.js`;
- table `learning_growth_automation_action_handoffs`;
- stable id helper `stableLearningAutomationActionHandoffId`;
- store facade `learningAutomationActionHandoffRepository`;
- app service `learningAutomationActionHandoffService`;
- visible-target scoped
  `GET /api/v1/growth/automation/action-handoffs`;
- Owner-only `POST /api/v1/growth/automation/action-handoffs`;
- Owner-only
  `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`;
- `growth.automation.action_required` event mapping through
  `growth-event-service`;
- focused repository, service, event, route, and architecture harnesses.

Not implemented by this layer:

- digest UI;
- proposal review UI;
- platform Action Inbox or Web Push internals;
- writeful scheduler;
- background worker;
- automatic publication;
- production rollout or visual evidence.

## Non-Goals

The action handoff layer must not:

- call Gateway or model vendors;
- call scheduler dry-run or any future writeful scheduler;
- draft plans;
- author cards;
- evaluate learner evidence;
- publish plan items;
- publish accepted proposals;
- record proposal execution metadata;
- activate stage assessments;
- enqueue learning work;
- inspect SQLite tables from the route or service;
- expose raw learner answers, transcripts, prompts, raw model output,
  source-document bodies, answer keys, private paths, credentials, cookies,
  tokens, or provider configuration.

## Service Boundary

The service is:

```text
src/services/learning-automation-action-handoff-service.js
```

Responsibilities:

- read exactly one reviewed automation digest through
  `learning-automation-digest-service.getDigest`;
- require digest `status=reviewed`;
- evaluate active failure-policy readiness through
  `learning-automation-failure-policy-service.evaluateReadiness`;
- persist summary-only handoff metadata through the repository;
- emit bounded `growth.automation.action_required` events through
  `growth-event-service`;
- record delivery success or visible delivery failure without mutating learner
  state.

Public service methods:

| Method | Purpose |
| --- | --- |
| `createHandoff(input)` | Creates a durable handoff from a reviewed digest after active failure-policy readiness passes. |
| `listHandoffs(input)` | Lists scoped public handoff DTOs. |
| `deliverHandoff(input)` | Emits bounded handoff metadata through the Growth event notification boundary and records delivery status. |

Gating semantics:

| Gate | Required State |
| --- | --- |
| Digest gate | `learning-automation-digest-service.getDigest` returns a digest with `status=reviewed`. |
| Failure-policy gate | `evaluateReadiness` returns `readyForWritefulAutomationPrerequisite=true`. |
| Publication gate | Always blocked in this layer. Handoff delivery never publishes. |
| Scheduling gate | Always blocked in this layer. Handoff delivery never schedules. |

The service returns `writefulSchedulingAllowed=false` even when all P7 handoff
checks pass.

## Repository Boundary

The repository is:

```text
src/stores/growth-learning-sqlite/automation-action-handoffs.js
```

The table is:

```text
learning_growth_automation_action_handoffs
```

Minimum fields:

| Field | Purpose |
| --- | --- |
| `handoff_id` | Stable handoff id for target scope, digest, policy, and actions. |
| `workspace_id` | Target learner workspace. |
| `learner_id` | Target learner id. |
| `program_id` | Program scope. |
| `digest_id` | Reviewed automation digest source. |
| `policy_id` | Active failure policy checked before handoff. |
| `domain_pack_id` | Provisioned domain pack when selected. |
| `domain` | Domain selector. |
| `subject` | Subject selector. |
| `horizon` | Planning horizon. |
| `status` | `pending_delivery`, `delivered`, `delivery_failed`, or `delivery_pending`. |
| `delivery_status` | Delivery-specific status mirror for filtering and retry UI. |
| `delivery_attempts` | Count of bounded delivery attempts. |
| `action_summary_json` | Summary-only counts and non-writeful flags. |
| `actions_json` | Bounded Owner action metadata from digest required actions. |
| `blocked_json` | Bounded blocked candidate metadata from digest blocked items. |
| `policy_readiness_json` | Summary-only active policy readiness check. |
| `notification_json` | Bounded platform notification metadata. |
| `delivery_json` | Bounded latest delivery result or failure. |
| `privacy_class` | Must be `summary_only`. |

Repository rules:

- stable ids make duplicate equivalent handoff creation idempotent;
- `recordDelivery` may move `not_delivered` or `delivery_failed` to
  `delivered`, `delivery_failed`, or `delivery_pending`;
- duplicate delivered records are idempotent;
- privacy-risk keys and non-summary privacy classes are rejected;
- public DTOs are returned instead of raw table rows;
- migration adds delivery/readiness columns before creating indexes.

## Route Boundary

Routes are:

```text
GET  /api/v1/growth/automation/action-handoffs
POST /api/v1/growth/automation/action-handoffs
POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver
```

Route rules:

- read route is visible-target scoped;
- write and delivery routes require Owner role, workspace bearer
  authorization, and visible-target scope;
- route code only normalizes request input and delegates to the service;
- routes must not inspect SQLite tables, call Gateway, publish, schedule,
  generate cards, or call Home AI platform internals directly.

## Event Boundary

Growth event type:

```text
growth.automation.action_required
```

The event maps to a Home AI plugin notification payload with:

- `itemType=approval`;
- `status=open`;
- `pluginRoute=automation`;
- `sourceRef.actionHandoffId`;
- `sourceRef.digestId`.

The event payload is bounded metadata only. It must not include raw learner
content, raw model output, prompts, source-document bodies, credentials, or
provider configuration.

Delivery failure is not learning failure. A dropped or rejected notification:

- records `delivery_failed` on the handoff;
- keeps the reviewed digest and active policy state intact;
- does not publish a card;
- does not record proposal execution;
- does not mutate learner evidence, profile, rewards, or stage state.

## Harness

Focused tests:

```bash
node --test tests/learning-automation-action-handoff-repository.test.js \
  tests/learning-automation-action-handoff-service.test.js \
  tests/growth-event-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-architecture-boundary.test.js
```

Coverage:

- repository idempotency, summary-only privacy class, privacy-key rejection,
  migration, delivery success, delivery failure, and duplicate delivery;
- service reviewed-digest gate, active failure-policy gate, no-action gate,
  handoff persistence, event emission, missing event-service failure, and
  dropped/rejected delivery failure;
- event mapping for `growth.automation.action_required`;
- route Owner-only writes, visible-target reads, workspace bearer writes, and
  bounded failure responses;
- architecture guard for no Gateway, scheduler, publication, card generation,
  proposal execution, stage activation, direct SQLite table access, or raw
  private fields in the service.

Full local gate:

```bash
npm run check
npm test
git diff --check
```

## Release Gate

This backend slice alone does not enable writeful scheduling.

Future writeful scheduling still requires:

1. Owner planner/provision UI closure.
2. Owner audit/correction UI closure.
3. Proposal review UI closure.
4. Digest review UI closure.
5. Active failure policy for the target scope.
6. Action handoff UI or platform Action Inbox/Web Push contract evidence.
7. The default-disabled Owner-explicit scheduler execution backend has
   repository/service/route/architecture harness evidence and remains disabled
   until explicit release approval.
8. Any future background scheduler has separate race, retry, idempotency,
   rollback, notification/action handoff, architecture, production dry-run,
   and release harnesses.
9. Central embedded-plugin visual evidence before production UI release.
