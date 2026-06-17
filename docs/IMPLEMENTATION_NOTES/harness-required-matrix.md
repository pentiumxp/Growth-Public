# Growth Harness Required Matrix

Last updated: 2026-06-18.

## Purpose

This note defines the minimum Harness obligation for Growth implementation
slices. It complements `docs/TEST_MATRIX.md` and keeps validation selection
stable across Codex continuation threads.

## Change Classes

| Class | Examples | Minimum Harness |
| --- | --- | --- |
| H1 workflow, cross-plugin contract, or write boundary | Gateway planner/authoring/evaluation, card publication, learner submission/evaluation/reflection, operating-loop `run-next` execution, formal stage-assessment activation/completion, Growth plugin reference-contract API/MCP/object-type behavior, release evidence recording, approvals, scheduler execution/run/worker, activation/runtime enablement writes, route authorization changes. | Service/repository tests for the owner module, route tests when HTTP surface changes, matching smoke-script test when a CLI exists, `tests/growth-architecture-boundary.test.js`, docs-locality, `npm run --silent check`, and `npm test` before claiming closure. |
| H2 projection or contract readback | Read-only DTO fields, release dashboard/review/authorization/closure summaries, evidence-readback projection, package-record summary readback, Owner context read models, active stage-checkpoint loop-state readback, formal-assessment reflection-required projection, plugin-owned SQLite runtime readback fields. | Owning service/store tests with explicit field assertions, route or smoke test when the public surface changes, architecture boundary guard when dependency direction matters, docs-locality, syntax check, and the relevant focused row in `docs/TEST_MATRIX.md`. |
| H3 docs or static non-behavioral change | Durable docs, handoff status, command matrix, comments that do not alter runtime behavior. | `node scripts/check-growth-docs-locality.js`, `tests/growth-docs-locality.test.js` when docs registration changes, `git diff --check`, and syntax coverage if runtime files changed. |

When a change crosses classes, use the higher class and include every affected
row from `docs/TEST_MATRIX.md`.

## Required Selection Steps

1. Read `.agent-context/PROJECT_CONTEXT.md`, `.agent-context/HANDOFF.md`,
   `docs/HOME_AI_PLATFORM_CONTRACT.md`, and `docs/GROWTH_DOCS_INDEX.md`.
2. Classify the slice as H1, H2, or H3 before editing.
3. Use CodeGraph for backend service/provider/route structural context and run
   `codegraph status` before and after structural claims.
4. Select the focused row from `docs/TEST_MATRIX.md`.
5. Add or update the smallest missing service, repository, route, smoke, or
   architecture Harness that proves the changed contract.
6. Update the owning durable document in the same patch as the behavior.
7. Update `.agent-context/HANDOFF.md` before ending substantial work.

## Release Evidence Rule

Release-readiness evidence is summary-only and advisory. Local Harness may
prove DTO shape, privacy filtering, persistence, and readback, but these local
checks do not fabricate production evidence. The following remain external
until real artifacts are collected:

- Home AI platform Action Inbox plus Web Push dual receipt evidence;
- Home AI central visual/UI artifacts;
- production controlled daily-loop write evidence;
- production profile-feedback evidence from a real completed cycle;
- explicit Owner approvals for writeful execution, background scheduler, and
  background worker gates;
- Home AI macOS deployment and production service-health evidence, which
  Growth may validate only from a bounded summary through
  `npm run smoke:production-deployment-evidence` or a matching persisted
  release-evidence record.
- Backend batch collection may persist only pass evidence from tasks that
  passed in a no-write preflight under the same scope. Missing Gateway config,
  missing completed-cycle selectors, and missing graph/provision target data
  remain blocked prerequisites; they must not be replaced by synthetic pass
  evidence.
- When graph/provision target data is missing, restore validated KG data and
  explicit Owner provision first, then rerun no-write target/stage smoke and
  collection. The recovery proof must include KG dry-run/readback, provision
  smoke, target-provisioning resolve, and stage assessment/control readback.

## Local Full-Cycle Harness Rule

`npm run smoke:local-daily-cycle` is an H1 local implementation harness. It may
write local Growth SQLite rows only when `--allow-write` is present. It starts
a local fake Gateway and delegates through existing Growth smoke/service
boundaries for daily-loop advance, learner-cycle full, profile-feedback, and
loop-state readback.

Use it to prove one ordinary daily cycle can close locally after service,
repository, card-generation, evaluation, profile, or recommendation changes.
Do not use it as production Gateway evidence, production release evidence,
Home AI central visual/UI evidence, Action Inbox/Web Push receipt evidence,
scheduler permission, runtime enablement, or deployment health evidence.

When this harness is used as closure evidence, record the summary-only output:
target scope, target node ids, card id, evaluation id, profile delta id,
profile-feedback status, loop-state status/next action, and Gateway call kinds.
Do not record raw learner answers, raw reflections, prompts, model output,
access tokens, private paths, or full DB rows.

## Local Central Visual Harness Rule

Home AI owns the central iOS PWA visual toolchain. Growth work must not copy or
fork that toolchain into the plugin workspace. For local visual validation of
the current Growth workspace, run a local Growth server on a non-production
port, point Home AI dev at that local manifest, provision the target workspace
through the Home AI grant route, then run the central visual scenarios from the
Home AI app workspace.

The current local reference topology is:

- Growth dev server: `http://127.0.0.1:14881`;
- Home AI dev server: `http://0.0.0.0:18797`;
- iOS live-debug server: `http://127.0.0.1:19073/`.

Required scenarios before claiming mobile embedded-shell or dark-mode closure:

- `embedded-plugin-shell --plugin-id growth`;
- `dark-growth-surfaces`.

Latest local pass evidence for this package:

- embedded shell:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260617T223324Z.png`;
- dark Growth surfaces:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260617T223337Z.png`.

These are local visual artifacts. They must not be treated as production
deployment evidence, production Gateway evidence, scheduler permission, release
approval, or persisted release evidence unless they are separately validated and
recorded through the release-evidence boundary under the matching scope.

## Owner Primary Generation UI Rule

The embedded Owner `生成卡片` button is an operating-loop UI boundary. It must
execute the current service-projected next action through
`POST /api/v1/growth/learning-loop/advance` with `action=run_next`; it must not
use direct `POST /api/v1/growth/daily-loop/advance` as the primary browser
policy selector. Direct daily-loop advance remains a service/API/smoke
compatibility path.

Any change to that button or its blocking state must update
`tests/growth-frontend-adapter.test.js` so the source-level assertion proves the
button is wired to `advanceOperatingLoopFromUi()` /
`advanceLearningOperatingLoop()`, daily actions use service-projected
`learningLoopState.nextAction`, non-daily next actions are blocked into
dedicated panels, and progress/error states remain visible.

## Forbidden Harness Shortcuts

- Do not satisfy service-owned release evidence with bare boolean `true`.
- Do not satisfy readiness state prerequisites such as reviewed digest, active
  failure policy, delivered action handoff, or reviewed enabled worker target
  through release-evidence collection records; they must remain automation-state
  actions handled by the owning digest, failure-policy, action-handoff, or
  worker-target service through the Owner workbench facade or direct Owner
  route.
- Do not treat release approvals as runtime config switches.
- Do not treat learning-loop readback or operating-loop run history as
  permission to auto-complete every next action. `learning-operating-loop-service`
  may execute only the current service-projected daily publish/draft action or
  an explicitly confirmed formal checkpoint activation; learner work,
  audit/correction, target provisioning, graph import/selection, context
  refresh, and Gateway configuration remain separate flows. Run history is
  summary-only audit evidence, not a scheduler or release switch.
- Do not run Gateway, card generation, evaluation, scheduler execution,
  notification delivery, stage activation, visual tooling, or deployment from
  release-readiness, release bundle, release package, review, authorization,
  closure, controls, dashboard, inventory, or workbench readback services.
- Do not store raw learner answers, transcripts, raw prompts, raw model output,
  source-document bodies, private paths, credentials, tokens, cookies, provider
  config, or long logs in docs, tests, evidence records, or handoffs.
- Do not prove formal stage checkpoints with only readiness mocks. A formal
  assessment flow change needs persistent evidence for activation, one
  submission, one evaluation, one reflection, high-weight mastery evidence,
  cooldown, and duplicate attempt rejection, unless the change is explicitly
  docs-only.
- Do not treat Growth plugin references as a fact store or graph backend.
  Reference-contract outputs must remain summary-only pointers resolved by the
  owning Growth service; they must not expose raw learner/model content,
  provider config, private paths, secrets, full card instructions, full
  `teachingFlow`, or full plan JSON.
