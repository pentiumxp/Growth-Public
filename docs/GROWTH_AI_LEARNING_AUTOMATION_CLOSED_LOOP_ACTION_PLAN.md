# Growth Automation Closed-Loop Action Plan

Last updated: 2026-06-18.

## Purpose

The closed-loop action plan is a no-write Owner readback boundary that answers
"what should happen next?" across the AI learning loop.

It does not generate cards, evaluate learner work, publish proposals, review
digests, create handoffs, deliver notifications, execute schedulers, mutate
runtime config, deploy, or update learner state. It composes existing service
readbacks and returns one bounded action template for the next explicit Owner
step.

## Service Boundary

Owner:

- `learning-automation-closed-loop-action-plan-service`

Injected dependencies:

- `learning-operating-loop-service.recommend()`
- `learning-profile-feedback-evidence-service.evaluate()`
- `learning-automation-digest-service.getDigest()` /
  `listDigests()`
- `learning-automation-failure-policy-service.evaluateReadiness()`
- `learning-automation-action-handoff-service.getHandoff()` /
  `listHandoffs()`

Forbidden dependencies:

- Growth SQLite repositories or table names;
- Gateway clients or model vendor clients;
- card generation, card evaluation, plan publication, proposal execution,
  scheduler execution/ticks, worker timers, action-handoff delivery, release
  activation, runtime config mutation, deployment, or Home AI old Growth server
  internals.

## DTO Contract

Schema: `growth.learningAutomationClosedLoopActionPlan.v1`

The DTO is `summary_only` and includes:

- `target`: bounded workspace/learner label metadata.
- `scope`: program, domain pack, domain, subject, horizon, minutes, and node
  selectors.
- `selectedCycle`: the completed cycle selector when one is available through
  profile feedback.
- `phases`: bounded status rows for operating loop, profile feedback, digest,
  failure policy, and action handoff.
- `automationReadiness`: booleans for completed-cycle readiness, digest
  presence/review, failure-policy readiness, handoff presence/delivery, and
  dependency-block count.
- `nextAction`: the single recommended action template.
- `actionTemplates`: bounded templates for the known next actions.
- `writePerformed=false`, `writesPerformed=false`,
  `publishPerformed=false`, and `schedulerStarted=false`.

The DTO must not include raw learner answers, reflections, transcripts, full
task content, full teaching flows, raw prompts, raw model output, source
document bodies, credentials, tokens, cookies, private paths, provider config,
or raw Home AI payloads.

## Next-Action Selection

The service chooses one action in this order:

1. `deliver_action_handoff` when a reviewed handoff exists but its delivery
   status is not `delivered`.
2. `advance_review` when a digest exists but digest review, failure-policy
   readiness, or handoff creation is still incomplete.
3. `prepare_cycle_closure` when profile feedback selected an automation-ready
   completed cycle and no digest exists for the current scope.
4. `collect_platform_action_evidence` when the handoff is delivered and the
   next audit step is platform action evidence collection.
5. `run_learning_loop_next` when the learning operating loop already exposes a
   safe next action such as `draft_daily_plan`.
6. `complete_learner_cycle` when no completed daily cycle is available yet.
7. `refresh_closed_loop_context` when dependencies are inconsistent or
   unavailable.

The action templates are descriptive only. Any write still must go through the
owning route or CLI gate, such as:

- `POST /api/v1/growth/learning-loop/advance`
- `POST /api/v1/growth/automation/cycle-closures/prepare`
- `POST /api/v1/growth/automation/review-advancements/advance`
- `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`

## API And Harness

API:

- `GET /api/v1/growth/automation/closed-loop/action-plan`

Route rules:

- Owner-only.
- Visible-target scoped.
- No workspace bearer required because the route is read-only.
- Delegates only to
  `learningAutomationClosedLoopActionPlanService.actionPlan()`.
- Returns bounded 200/400 JSON and no raw private data.

CLI:

```bash
npm run smoke:closed-loop-action-plan -- \
  --workspace-id weixin_fanfan \
  --learner-id fanfan \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --json
```

The CLI is no-write. Passing `--allow-write` fails closed with
`automation_closed_loop_action_plan_smoke_write_not_supported`.

Focused Harness:

```bash
node --test \
  tests/learning-automation-closed-loop-action-plan-service.test.js \
  tests/growth-automation-closed-loop-action-plan-smoke-script.test.js \
  tests/growth-routes.test.js \
  tests/growth-architecture-boundary.test.js
```

The architecture guard proves the route remains HTTP glue, the service uses
only service dependencies, and the CLI/DTO do not add write permission,
Gateway calls, direct repositories, scheduler execution, notification delivery,
publication, evaluation, stage activation, deployment, or learner-state
mutation.
