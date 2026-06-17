# Growth Harness Required Matrix

Last updated: 2026-06-17.

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
- deployment and production service-health evidence.

## Forbidden Harness Shortcuts

- Do not satisfy service-owned release evidence with bare boolean `true`.
- Do not satisfy readiness state prerequisites such as reviewed digest, active
  failure policy, delivered action handoff, or reviewed enabled worker target
  through release-evidence collection records; they must remain external
  automation-state actions until the owning service proves them.
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
