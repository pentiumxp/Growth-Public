# Growth Test Matrix

Last updated: 2026-06-17.

## Purpose

This is the Growth plugin local test-selection matrix. Use it after
`.agent-context/PROJECT_CONTEXT.md`, `.agent-context/HANDOFF.md`,
`docs/HOME_AI_PLATFORM_CONTRACT.md`, and `docs/GROWTH_DOCS_INDEX.md`.

The matrix is intentionally local to the Growth workspace. Home AI platform
visual, deployment, Action Inbox, and Web Push harnesses remain in the Home AI
app workspace and are referenced from the platform contract instead of copied
here.

## Baseline Gates

Run these for any non-trivial Growth behavior, persistence, route, release, or
documentation change:

| Gate | Command | Meaning |
| --- | --- | --- |
| Syntax and coverage registration | `npm run --silent check` | Every runtime JS file under `scripts`, `src`, and `public` is syntax-checked and registered in `scripts/check-growth-syntax-coverage.js`. |
| Docs locality | `node scripts/check-growth-docs-locality.js` | Growth-specific durable docs exist in this plugin workspace and avoid stale Home AI Growth doc pointers. |
| Whitespace | `git diff --check` | No trailing whitespace or patch format issues. |
| Full local suite | `npm test` | Full plugin-local Node test suite. |
| CodeGraph freshness | `codegraph status` after edits; `codegraph sync` when needed | Structural claims use the current indexed source. |

## Focused Harness Rows

Use the smallest row that covers the change, then widen when a touched contract
crosses rows.

| Change area | Focused harness | Smoke or operational check |
| --- | --- | --- |
| Card authoring, Gateway authoring, card generation, graph binding, target selection | `tests/learning-card-authoring-service.test.js`, `tests/learning-card-authoring-validation-service.test.js`, `tests/learning-card-generation-service.test.js`, `tests/learning-card-generation-recipe-policy-service.test.js`, `tests/growth-card-authoring-boundary.test.js`, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js` | `npm run smoke:planner-readiness` when planner context or target readiness is involved. |
| Learner submission, one-shot evaluation, reflection, audio playback, reward settlement | `tests/growth-learning-sqlite-audio.test.js`, `tests/growth-evaluation-service.test.js`, `tests/learning-card-evaluation-service.test.js`, `tests/learning-learner-cycle-service.test.js`, `tests/growth-learner-cycle-smoke-script.test.js`, `tests/growth-routes.test.js` | `npm run smoke:learner-cycle` defaults to audit-only; write operations require explicit `--allow-write`. |
| Evidence ledger, Profile V2, profile delta, recommendation lifecycle, loop state | `tests/learning-evidence-ledger-service.test.js`, `tests/learning-profile-v2-service.test.js`, `tests/learning-profile-delta-service.test.js`, `tests/learning-profile-feedback-evidence-service.test.js`, `tests/learning-loop-state-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js` | `npm run smoke:profile-feedback`, `npm run smoke:learning-loop-state`. |
| Owner daily loop, plan draft/publish, cycle audit, Owner correction | `tests/learning-daily-loop-service.test.js`, `tests/learning-plan-publisher-service.test.js`, `tests/learning-plan-audit-service.test.js`, `tests/learning-cycle-audit-service.test.js`, `tests/learning-owner-correction-service.test.js`, `tests/growth-owner-audit-smoke-script.test.js`, `tests/growth-routes.test.js` | `npm run smoke:daily-loop-preview`; `npm run smoke:daily-loop` writes only with explicit `--allow-write`. |
| Stage checkpoint separation and controls | `tests/learning-stage-assessment-service.test.js`, `tests/learning-stage-checkpoint-controls-service.test.js`, `tests/growth-stage-assessment-smoke-script.test.js`, `tests/growth-stage-checkpoint-controls-smoke-script.test.js`, `tests/growth-routes.test.js` | `npm run smoke:stage-assessment`, `npm run smoke:stage-checkpoint-controls`. |
| Automation proposal, digest, failure policy, action handoff | `tests/learning-automation-proposal-service.test.js`, `tests/learning-automation-digest-service.test.js`, `tests/learning-automation-failure-policy-service.test.js`, `tests/learning-automation-action-handoff-service.test.js`, matching smoke-script tests, `tests/growth-routes.test.js`, `tests/growth-architecture-boundary.test.js` | `npm run smoke:proposal`, `npm run smoke:digest`, `npm run smoke:failure-policy`, `npm run smoke:action-handoff`. |
| Scheduler dry-run, Owner-explicit execution, scheduler run, worker target, worker lease | `tests/learning-automation-scheduler-service.test.js`, `tests/learning-automation-scheduler-execution-service.test.js`, `tests/learning-automation-scheduler-run-service.test.js`, `tests/learning-automation-scheduler-worker-target-service.test.js`, `tests/learning-automation-scheduler-worker-service.test.js`, matching smoke-script tests, `tests/growth-architecture-boundary.test.js` | `npm run smoke:scheduler-dry-run`, `npm run smoke:scheduler-execution`, `npm run smoke:scheduler-run`, `npm run smoke:scheduler-worker-target`, `npm run smoke:scheduler-worker`. |
| Release readiness, release evidence, release approvals, platform action, central visual, UI evidence | `tests/learning-automation-release-readiness-service.test.js`, `tests/learning-automation-release-evidence-service.test.js`, `tests/learning-automation-release-approval-service.test.js`, `tests/learning-automation-platform-action-evidence-service.test.js`, `tests/learning-automation-central-visual-evidence-service.test.js`, `tests/learning-automation-ui-evidence-service.test.js`, `tests/growth-automation-release-evidence-smoke-script.test.js`, matching smoke-script tests, `tests/growth-architecture-boundary.test.js` | `npm run smoke:release-readiness`, `npm run smoke:release-evidence`, `npm run smoke:release-approval`, `npm run smoke:platform-action-evidence`, `npm run smoke:central-visual-evidence`, `npm run smoke:ui-evidence`. |
| Release package, decision, review, authorization, closure, activation, runtime enablement, controls, inventory, dashboard, workbench, workbench action/audit, preflight, artifact-template | `npm run test:release-union`; add `tests/learning-automation-release-evidence-artifact-template-service.test.js` and `tests/growth-release-artifact-template-smoke-script.test.js` when artifact-template/readback fields change; action wrapper/audit changes are covered by `tests/learning-automation-release-workbench-action-service.test.js`, `tests/learning-automation-release-workbench-action-repository.test.js`, `tests/growth-release-workbench-action-smoke-script.test.js`, and `tests/growth-routes.test.js` so write-then-list audit readback stays service-first. | Matching smoke scripts: `smoke:release-package`, `smoke:release-decision`, `smoke:release-review`, `smoke:release-authorization`, `smoke:release-closure`, `smoke:release-activation`, `smoke:runtime-enablement`, `smoke:release-controls`, `smoke:release-inventory`, `smoke:release-dashboard`, `smoke:release-workbench`, `smoke:release-workbench-action`, `smoke:release-preflight`, `smoke:release-artifact-template`. |
| Embedded plugin UI adapter or learner UI behavior | `tests/growth-frontend-adapter.test.js`, `tests/growth-embedded-layout.test.js`, `tests/growth-routes.test.js` | Run Home AI central embedded-plugin visual harness before production UI release. |
| Docs-only Growth contract change | `tests/growth-docs-locality.test.js` plus `node scripts/check-growth-docs-locality.js` | No production or runtime evidence is implied. |

When changing persisted release-evidence bag fields consumed by
release-readiness, run both
`tests/learning-automation-release-evidence-service.test.js` and
`tests/learning-automation-release-readiness-service.test.js`. The focused
assertion must prove pass records keep `summaryOnly`, `privacyClass`,
`schemaVersion`, `evidenceKey`, and `checkKey` in the bag projection.

## Release Union Harness

`npm run test:release-union` runs the release readback and gate chain that is
too long to keep copying into handoffs. Use it when a change touches release
package, release evidence, release review, authorization, closure, controls,
dashboard, inventory, workbench, preflight, activation, or runtime enablement
readbacks.

This command is still local evidence only. It does not replace real Home AI
platform Action Inbox/Web Push evidence, central visual artifacts, production
smoke output, explicit release approvals, or deployment checks.
