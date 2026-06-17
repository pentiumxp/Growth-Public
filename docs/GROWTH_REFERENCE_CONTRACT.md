# Growth Reference Contract

Last updated: 2026-06-17.

## Purpose

Growth exposes a V1-minimal Reference / Memory Graph contract for stable
Growth-owned objects. The contract lets Home AI central graph tooling point at
Growth programs, cards, learner evidence, profiles, graph plans, plan drafts,
and completed-cycle profile-feedback readbacks without copying full Growth
facts into the central graph.

This is not the full Home AI Reference / Memory Graph implementation. Growth
only implements the plugin-side reference methods:

- `reference_object_types`
- `reference_get`
- `reference_summarize`

Growth does not implement `reference_search`, `reference_resolve`, graph edge
creation, note linking, event grouping, or central reference graph tables in
this slice.

## Object Types

The V1-minimal Growth object types are:

| Object type | Stable id | Source boundary |
| --- | --- | --- |
| `program` | `program_id` | `learning-reference-contract-service` through `learning-reference-projection` SQLite read projection. |
| `task_card` | `task_card_id` | `growthService.card()` projection, then reference-contract re-cropping. |
| `submission` | `submission_id` | `learning-reference-projection` SQLite read projection. |
| `evaluation` | `evaluation_id` | `learning-reference-projection` SQLite read projection. |
| `reflection` | `reflection_id` | `learning-reference-projection` SQLite read projection. |
| `mastery_profile` | `learner_id` | `learning-profile-v2-service.profileV2()`. |
| `learning_graph_plan` | `learning_graph_plan_id` | `learningGraphRepository.plan()`. |
| `plan_draft` | `plan_draft_id` | `learning-reference-projection` / plan-draft summary projection. |
| `profile_feedback` | `task_card:<id>`, `evaluation:<id>`, `profile_delta:<id>`, `evidence:<id>`, `plan_draft:<id>`, `source:<id>`, `latest_completed`, or `unique_completed` | `learning-profile-feedback-evidence-service.evaluate()` through the normal service graph. |

Aliases such as `card`, `learning_task_card`, `learner_profile`, `profile`,
`graph_plan`, `learning_plan_draft`, `learning_profile_feedback`, and
`completed_cycle_feedback` normalize to the canonical object types above.

## API

Growth exposes read-only HTTP routes:

```text
GET /api/v1/growth/references/object-types
GET /api/v1/growth/references/:objectType/:objectId
GET /api/v1/growth/references/:objectType/:objectId/summary?purpose=<purpose>
```

`reference_get` and `reference_summarize` routes use Growth visible-target
scope. Owner can read visible learner targets; workspace actors cannot
enumerate or resolve another workspace target.

The object-types route returns only supported object type metadata and does not
read learner records.

## Owner UI Consumption

The embedded Owner `生成` tab consumes this contract as a read-only Reference
Chain panel. The browser may call:

- `GET /api/v1/growth/references/object-types`
- `GET /api/v1/growth/references/:objectType/:objectId/summary?purpose=owner_loop`

The panel can summarize current profile, program, learning graph plan, plan
draft, generated task card, selected-cycle evaluation, and selected-cycle
profile-feedback references when those ids are already present in Growth
summary DTOs. Missing ids remain absent; the browser must not fabricate
references, inspect SQLite tables, read raw learner content, call Gateway, or
compute learning policy.

Reference summaries are advisory audit readback for Owner visibility. They do
not generate cards, publish plans, evaluate submissions, alter Profile V2, or
change recommendation lifecycle state.

## MCP

Growth MCP exposes matching read-only tools:

```text
growth.reference_object_types
growth.reference_get
growth.reference_summarize
```

The workspace-bound MCP wrapper removes `workspace_id` from model-visible tool
schemas and injects the authorized workspace id server-side, matching existing
Growth MCP behavior.

## DTO Contract

`reference_get` returns `growth.referenceObject.v1`.

Required public fields:

- `privacyClass: "summary_only"`
- `summaryOnly: true`
- `pluginId: "growth"`
- `workspaceId`
- `objectType`
- `objectId`
- `referenceId`
- `reference`
- `display`
- `summary`
- `relatedObjectRefs`

`reference` follows the platform stable object reference shape:

```json
{
  "workspace_id": "weixin_fanfan",
  "plugin_id": "growth",
  "object_type": "task_card",
  "object_id": "card_1",
  "display": {
    "title": "Science card",
    "subtitle": "science / practice / active",
    "time": "2026-06-17",
    "thumbnail_hint": "practice"
  }
}
```

`reference_summarize` returns `growth.referenceSummary.v1` with compact display,
counts, target-node ids, and related-reference counts for graph display or
answer composition.

## Privacy Boundary

Growth reference output must not expose:

- raw learner answers or reflection text;
- transcripts;
- hidden answers or answer keys;
- raw prompts or model output;
- provider configuration;
- private paths, access keys, cookies, tokens, or credentials;
- full `teachingFlow`, full card instruction body, or full plan draft JSON.

Task-card references deliberately re-crop existing card detail projections. They
keep ids, status, role, timing, counts, target-node ids, latest bounded evidence
ids, and related references, but do not pass through full card detail objects.

SQLite-backed references read only summary columns plus existing public
submission/evaluation/reflection DTO helpers. `raw_json` is never returned.

`profile_feedback` references deliberately delegate to
`learning-profile-feedback-evidence-service.evaluate()` instead of reading
ledger, cycle-history, profile-delta, reward, or recommendation tables. The
stable object id can anchor the completed cycle by task card, evaluation,
profile-delta, evidence, plan draft, correction, or source id. `latest_completed`
and `unique_completed` are read-only discovery aliases; when one resolves, the
returned reference object id is recropped to the selected concrete cycle anchor.
The output keeps only readiness, evidence/profile/profile-delta counts,
reward-count totals, recommendation strategy, next action, target-node ids, and
related Growth object references.

## Service Ownership

The owning service is:

```text
src/services/learning-reference-contract-service.js
```

The SQLite summary projection boundary is:

```text
src/stores/growth-learning-sqlite/reference-projection.js
```

Routes, MCP schemas, and smoke scripts may call only the service boundary. They
must not import SQLite stores, inspect tables, or reconstruct privacy rules.

## Harness

Focused validation for this H1 plugin reference-contract slice:

```text
node --test tests/learning-reference-contract-service.test.js \
  tests/growth-reference-contract-smoke-script.test.js \
  tests/growth-mcp-schemas.test.js \
  tests/growth-mcp-wrapper.test.js \
  tests/growth-routes.test.js \
  tests/growth-architecture-boundary.test.js
npm run --silent check
node scripts/check-growth-docs-locality.js
git diff --check
```

Owner UI consumption is covered by:

```text
node --test tests/growth-frontend-adapter.test.js
```

Operational smoke:

```text
npm run smoke:references -- --operation object-types --workspace-id <workspace> --json
npm run smoke:references -- --operation get --workspace-id <workspace> --object-type task_card --object-id <task-card-id> --json
npm run smoke:references -- --operation summarize --workspace-id <workspace> --object-type mastery_profile --object-id <learner-id> --purpose graph --json
npm run smoke:references -- --operation summarize --workspace-id <workspace> --object-type profile_feedback --object-id task_card:<task-card-id> --purpose owner_loop --json
```

The smoke is read-only and reports `referenceContractWritePerformed=false`.
