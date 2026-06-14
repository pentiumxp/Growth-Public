# Growth Card Generation Management UI

Last updated: 2026-06-12.

This document defines the Growth-owned Owner UI for generating learning cards
inside the Growth plugin.

V1 implementation status: the Owner `生成` tab, context route, frontend API
helpers, daily English payload builder, generated-card learner submission /
evaluation / optional-reflection UI, and focused harness are implemented in the
plugin workspace. Production card generation still requires a configured
Gateway authoring endpoint/access boundary.

## Objective

Owner should be able to generate Growth cards for learners who have the Growth
plugin provisioned, without using Codex as the operational interface.

V1 is deliberately narrow:

- Owner-only card generation surface inside the Growth plugin.
- Initial sample target is Fanfan.
- Initial recipe is a daily English card.
- The generated card uses the existing Growth card renderer and board shape.
- The model boundary is Gateway only.
- Published daily cards use the `daily_score_once` policy from
  `docs/GROWTH_CARD_GENERATION_RULES.md`.

## Non-goals

- No direct OpenAI, Claude, DeepSeek, or vendor-specific calls from Growth.
- No Home AI old Growth server route imports or calls.
- No free-form prompt box as the primary authoring path.
- No raw transcript, full homework, hidden answer key, raw model response, or
  private source dump in model input.
- No new learner-facing card UI shape in V1. Generated cards should render like
  existing Growth learning cards.
- No pass/fail retry loop for ordinary daily cards.

## Product Contract

Growth owns card authoring. Home AI can provide the platform Gateway
configuration and authorization boundary, but the plugin owns:

- selecting the target learner workspace;
- assembling the structured authoring request;
- calling Gateway through `growth-gateway-authoring-client`;
- parsing Gateway SSE or JSON output;
- validating the authoring draft;
- writing the accepted card into Growth SQLite;
- showing the published card through the existing Growth board/card UI.

Owner is the actor. The learner workspace is the target. Owner permissions must
not cause writes to fall back into the Owner's own learner data.

In Home AI embedded proxy mode, the iframe may keep `workspaceId=owner` in the
URL so the host can authorize the Owner actor. Growth card generation therefore
keeps a separate plugin-local `selectedWorkspaceId` for the learner target.
Readiness, target-row active state, and generation payloads must use that
selected learner target, not the iframe's Owner workspace.

## V1 Owner Flow

1. Owner opens Growth plugin.
2. Owner opens the Owner management area and selects the `生成` tab.
3. Growth selects the Fanfan sample learner automatically when the current
   Owner workspace is not a supported generation target.
   If the host target list omits the sample target, V1 may fall back to the
   provisioned Fanfan workspace id `weixin_stephen` and then render the target
   returned by the Growth context endpoint.
4. Growth loads card generation context for the selected target learner.
5. Owner can switch back to the Fanfan sample learner if a future navigation
   state lands on another target.
6. Owner selects the `日常英语卡` recipe.
7. Growth shows readiness:
   - learner workspace is provisioned;
   - learning graph is imported;
   - mastery/history summary is available;
   - Gateway authoring boundary is configured;
   - there is no blocking open generation job.
8. Owner reviews the structured plan preview:
   - learning graph plan;
   - learner/mastery summary;
   - recent experience signals;
   - card role, difficulty, and evidence requirements;
   - `daily_score_once` completion policy.
9. Owner presses `生成卡片`.
10. Growth immediately renders a visible progress box with four bounded stages:
   `prepare`, `gateway`, `validation`, and `publish`. The progress box is
   shown inside the plugin UI, uses `role="status"` / `aria-live="polite"`,
   and must remain visible on mobile embedded viewports without relying on the
   user scrolling back to the generate button.
11. Growth calls `POST /api/v1/growth/cards/generate`.
12. Gateway output is converted to an authoring draft.
13. Validation passes or returns a visible authoring error.
14. A validated card is transactionally published to Growth SQLite, including
    the native program/draft parent rows required by the card table.
15. Owner sees the generated card preview and can open the card on the learner
    board.
16. The learner can submit the generated card from the plugin card detail,
    optionally attach a recording, see one-shot evaluation feedback, and submit
    one optional reflection without Codex involvement. The detailed learner
    flow is defined in `docs/GROWTH_CARD_INTERACTION_FLOW.md`.

Formal stage-assessment generation is not part of the daily recipe flow.
Owner/manual or learner challenge assessment creation must call the dedicated
stage-assessment API boundary:

- `POST /api/v1/growth/stage-assessments/eligibility`;
- `POST /api/v1/growth/stage-assessments/activate`;
- `POST /api/v1/growth/stage-assessments/challenge`.

Those routes delegate to `learning-stage-assessment-service`. The generated
formal card still uses the same authoring/publisher pipeline, but the service
adds `stageAssessmentCycleId`, activation metadata, assessment coverage, and
`cardRole=stage_assessment`. The Owner UI can surface these controls in a
tab section without reimplementing eligibility or generation policy in the
frontend.

Implemented V1 Owner stage-assessment controls:

- the `生成` tab renders a compact `阶段测评` section under the learning profile
  panel;
- `检查条件` calls
  `POST /api/v1/growth/stage-assessments/eligibility` and shows the returned
  eligible/dormant/cooldown/active state;
- `生成阶段测评` calls
  `POST /api/v1/growth/stage-assessments/activate` with
  `activation_source=owner_manual`;
- the section shows coverage-node count, formal completion marker, default
  `300` coin reward metadata, cooldown date when present, and the published
  card open action;
- frontend state is only progress/error/result state. Eligibility, cooldown,
  Owner override, and generation policy remain backend-owned.

## UI Placement

Add one Owner-only tab to the existing Owner management tabs:

| Tab | Current status | V1 change |
| --- | --- | --- |
| `总览` | existing | unchanged |
| `画像` | existing | unchanged |
| `任务` | existing | unchanged |
| `奖励` | existing | unchanged |
| `AI分析` | existing | unchanged |
| `生成` | new | Owner card generation management |

The `生成` tab should use the existing settings-tab visual language:

- compact tab row;
- 8px or smaller card/control radii for new UI;
- dense operational rows instead of a marketing page;
- existing Growth card preview style for generated output;
- no nested decorative cards.

## Screen Layout

Desktop layout:

- Top summary bar: selected target, recipe, readiness, last generated result.
- Left column: target learner list and generation history.
- Middle column: recipe, graph target, difficulty, evidence requirements, and
  structured input preview.
- Right column: generated card preview and validation/audit result.

Mobile layout:

- Target selector becomes a horizontal compact row.
- Recipe and readiness appear before the generate button.
- Generated card preview appears directly below the action area.
- Generation history is collapsed after the current result.

Mobile scroll contract:

- The Owner management page is embedded inside a Home AI iframe, so scrolling
  must not depend only on iframe root scrolling.
- Growth must consume the Home AI `hermes.plugin.viewport` message in
  `embed=hermes` mode and apply the host iframe height to
  `--app-height` / `--app-viewport-height` before relying on internal scroll
  panels. The iframe height is the root sizing source; raw `100vh` /
  `100dvh` is not sufficient inside the embedded shell.
- The settings shell must use a fixed-height internal grid and the active tab
  panel must own vertical scrolling with `overflow-y: auto`,
  `-webkit-overflow-scrolling: touch`, and `touch-action: pan-y`.
- The `生成` tab inherits that active-panel scroll surface so the lower
  controls, including `生成卡片`, remain reachable on mobile viewports.
- Release validation for mobile layout must include the central Home AI visual
  toolchain:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- \
  --scenario embedded-plugin-shell \
  --plugin-id growth \
  --debug-url http://127.0.0.1:19073/
```

  If the visual toolchain fails at the Appium, WDA, WebView attach, or live
  debug server layer, classify and recover that layer per the central platform
  contract before treating the result as UI evidence.

## V1 Controls

| Control | Type | V1 behavior |
| --- | --- | --- |
| Learner target | segmented/list row | Fanfan enabled; other provisioned targets can be shown disabled until enabled. |
| Recipe | segmented control | `日常英语卡` selected; future recipes hidden or disabled. |
| Graph target | bounded selector | V1 can use a recommended English graph node from the context endpoint. |
| Difficulty | segmented control | default comes from recipe and history summary; Owner can choose one bounded value later. |
| Evidence requirements | read-only chips | shows what the generated card must collect. |
| Structured input preview | collapsed detail | summary-only JSON families, not raw source payloads. |
| Generate | primary button | ready state submits generation; blocked readiness state stays clickable with `aria-disabled` and must show a visible reason instead of silently using native `disabled`; after a real submit it becomes native disabled and a progress box must appear immediately. |
| Progress box | fixed status panel | shows `prepare`, `gateway`, `validation`, and `publish` stages; no raw model output or private payload is displayed. |
| Open card | secondary button | opens the generated task card in the existing card renderer. |
| Regenerate | secondary/destructive caution | disabled in V1 unless the previous draft failed before publish. |

## Frontend State

Add a plugin-local state slice, for example:

```js
cardGeneration: {
  status: "idle" | "loading_context" | "ready" | "generating" | "published" | "failed",
  selectedWorkspaceId: "", // plugin-local generation target; does not change the iframe's Owner workspace context
  selectedTargetWorkspaceId: "", // legacy alias if a future controller split needs it
  selectedLearnerId: "",
  selectedRecipeId: "daily_english_v1",
  selectedGraphNodeId: "",
  context: null,
  readiness: null,
  generatedCard: null,
  progressStep: "prepare" | "gateway" | "validation" | "publish" | "done" | "failed",
  progressMessage: "",
  error: null
}
```

The UI should be implemented in a new plugin-owned module rather than growing
`public/app.js`:

- `public/growth-card-generation-ui.js`;
- optionally `public/growth-card-generation-controller.js` if event handling is
  large enough to justify a split.

`public/app.js` should only wire loading, state, and render calls.

## API Contract

Existing write endpoint:

```http
POST /api/v1/growth/cards/generate
```

Recommended new read endpoint:

```http
GET /api/v1/growth/card-generation/context?targetWorkspaceId={targetWorkspaceId}
```

Implemented route:

```http
GET /api/v1/growth/card-generation/context?targetWorkspaceId={targetWorkspaceId}
```

Direct plugin-port callers may still use `workspaceId` for backward-compatible
workspace-bearer reads. Home AI same-origin proxy callers must use
`targetWorkspaceId` for context reads and must send the generation target only
in the POST body as `workspace_id`; the proxied URL itself remains under the
Owner workspace authorization context.

The frontend API client must build Growth API paths from path segments instead
of hard-coded `/api/...` string literals. The Home AI same-origin proxy rewrites
static plugin assets and appends the actor `workspaceId`; hard-coded API
literals inside JavaScript can therefore be rewritten into the wrong query
shape. Growth JS and CSS URLs in `public/index.html` should carry a version
query for card-generation releases so mobile WebViews fetch the current API
client and UI state code. The current frontend cache key is
`20260614-recipe-policy-v1`; the frontend adapter harness asserts that
older `20260614-growth-navigation-v1`, `20260614-stage-assessment-ui-v1`, and
`20260614-evaluation-failure-ui-v1`, and
`20260614-owner-evaluation-retry-v1`, and
`20260614-owner-evaluation-retry-ui-v1`, and
`20260614-owner-evaluation-status-ui-v1`, and
`20260614-recommendation-rationale-ui-v1` keys are no longer present.

Recommended context response:

```json
{
  "target": {
    "workspaceId": "weixin_fanfan",
    "learnerId": "fanfan",
    "displayName": "凡凡",
    "enabled": true
  },
  "recipes": [
    {
      "id": "daily_english_v1",
      "label": "日常英语卡",
      "cardRole": "practice",
      "completionPolicy": "daily_score_once"
    }
  ],
  "generationDefaults": {
    "domain": "english",
    "subject": "english",
    "defaultCardRole": "practice",
    "defaultDifficultyBand": "foundation",
    "cardSchemaVersion": "growth.card.authoring.v1"
  },
  "readiness": {
    "workspaceProvisioned": true,
    "learningGraphReady": true,
    "historySummaryReady": true,
    "gatewayConfigured": true,
    "blockingOpenGeneration": false
  },
  "suggestedPlan": {
    "targetNodeId": "node_english_daily_reading_foundation",
    "domain": "english",
    "difficulty": "foundation",
    "evidenceRequirements": ["short_answer", "self_reflection_optional"]
  },
  "nextCardRecommendation": {
    "selectionMode": "recommendation",
    "recommendationMode": "trajectory",
    "strategy": "repair",
    "cardRole": "teaching",
    "difficultyBand": "repair",
    "targetNodeId": "kg_english_evidence_answering",
    "reason": "Latest evaluation trajectory asks for one evidence repair card."
  },
  "historySummary": {
    "recentCards": 6,
    "recentEvaluations": 4,
    "recentReflections": 1
  },
  "learningProfile": {
    "summary": {
      "masteryStateCount": 2,
      "weaknessCount": 1,
      "strengthCount": 1,
      "recentExperienceSignalCount": 1,
      "recentTrajectoryCount": 1
    },
    "weaknesses": [
      {
        "nodeId": "kg_english_evidence_answering",
        "status": "developing",
        "score": 64,
        "summary": "Needs exact text evidence."
      }
    ],
    "recentExperienceSignals": [
      {
        "targetNodeId": "kg_english_evidence_answering",
        "signalType": "not_learned",
        "summary": "Needs another focused practice."
      }
    ],
    "recentTrajectory": [
      {
        "taskCardId": "ltask_1",
        "strategy": "stabilize",
        "performanceSummary": "Score 64; evidence was vague."
      }
    ],
    "nextCardStrategy": {
      "strategy": "stabilize",
      "reason": "Use one more short evidence-answering card."
    }
  }
}
```

The context endpoint must be read-only and summary-only. It must not expose raw
learner submissions, raw transcripts, raw prompts, hidden answer keys, or raw
model output. `learningProfile` is target-workspace scoped; Owner viewing a
learner must see that learner's profile projection, not the Owner workspace's
profile rows.

`learningProfile.recentExperienceSignals` can come from two Growth-owned
sources: evaluation-derived mastery updates and learner-facing difficulty
feedback written by `learning-experience-signal-service` through
`POST /api/v1/growth/cards/:taskCardId/experience-signals`. The Owner
generation page only reads these summary-only signals; it does not write
difficulty feedback from the Owner generation surface.

## Generate Request

The UI should call the existing generation endpoint with a bounded recipe
request. The Owner UI may display the suggested graph target, role, difficulty,
and recommendation rationale, but ordinary daily generation must not require
the browser to submit those graph-policy fields:

```json
{
  "workspace_id": "weixin_fanfan",
  "learner_id": "fanfan",
  "recipe_id": "daily_english_v1",
  "card_schema_version": "growth.card.authoring.v1"
}
```

`learning-card-generation-recipe-policy-service` normalizes the recipe,
English domain/subject defaults, card schema version, and `daily_score_once`
policy. `learning-card-next-target-service` then chooses the graph target from
the selected learner's trajectory/profile before graph fallback. Stage
assessment generation remains a separate explicit coverage flow and does not
use this compact daily recipe payload.

## Daily English Recipe

V1 recipe definition:

| Field | Value |
| --- | --- |
| `recipeId` | `daily_english_v1` |
| Label | `日常英语卡` |
| Role | `practice` or `teaching`, chosen by graph/history summary |
| Duration | 10-15 minutes |
| Evidence | short answer plus optional reflection |
| Completion | first evaluation completes the card |
| Reflection | one optional reflection only |
| Reward | score-proportional up to the card reward cap |
| Tone | low-pressure daily learning, not an exam |

The generated card must include a valid `teachingFlow`:

- learning target;
- prerequisites;
- micro lesson;
- worked example;
- guided practice;
- quick check;
- too-hard fallback;
- evidence to record;
- difficulty basis;
- support level.

## Error States

| State | UI behavior |
| --- | --- |
| Not Owner | Hide the `生成` tab. |
| Target not enabled | Show disabled target row and no generate button. |
| Missing Gateway config | Disable generate and show a bounded configuration status. |
| Missing graph | Disable generate and link to graph import/readiness status. |
| Missing history | Allow generation only if recipe declares history optional. |
| Gateway timeout | Show retryable authoring failure. |
| Empty output | Show validation failure; do not publish. |
| Invalid JSON after repair | Show validation failure; do not publish. |
| Schema or privacy failure | Show Owner review required; do not publish. |
| DB transaction failure | Show publish failure; no generated program, draft, graph binding, or half-card should exist. |

## Production Wiring

The Owner UI calls only Growth plugin routes. It must not call Gateway from the
browser.

When the plugin is embedded through the Home AI same-origin proxy, browser-side
Growth API calls must use the plugin proxy prefix, for example
`/api/hermes-plugins/growth/proxy/api/v1/growth/card-generation/context`.
Absolute browser calls to Home AI root `/api/v1/growth/...` are invalid in
embedded mode because they bypass the plugin proxy dispatcher.

Production generation requires:

- a configured Gateway authoring endpoint:
  `GROWTH_GATEWAY_AUTHORING_ENDPOINT`;
- the official Gateway Responses protocol, either explicit through
  `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint;
- `GROWTH_GATEWAY_AUTHORING_MODEL` when the selected Gateway worker requires an
  explicit model;
- the Gateway token through `GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH` or the
  platform secret boundary.

The Home AI same-origin plugin proxy is the expected UI path. It checks Hermes
workspace access first, then attaches the server-side Growth workspace bearer
to proxied write requests. Direct calls to `http://127.0.0.1:4881` still need
`Authorization: Bearer <workspace-local .hermes-growth/access-key.txt>`.

## Implementation Slices

1. Add read-only context service:
   - `learning-card-generation-context-service`;
   - uses view targets, graph repository, profile projection, and history
     summary;
   - returns readiness, recipe options, selected learner profile/trajectory,
     and next-card strategy reason.
2. Add route:
   - `GET /api/v1/growth/card-generation/context`.
3. Add frontend API helpers:
   - `fetchCardGenerationContext(targetWorkspaceId)`;
   - `generateGrowthCard(payload, targetWorkspaceId)`.
4. Add Owner UI:
   - `growth-card-generation-ui.js`;
   - render inside Owner `生成` tab.
5. Add controller:
   - load context when Owner opens the tab or changes target;
   - submit generation;
   - refresh board or open generated card after publish.
6. Keep existing card renderer:
   - published card appears in board lanes using the existing DTO path.

Implemented V1 files:

- `src/services/learning-card-generation-context-service.js`;
- `src/services/learning-profile-projection-service.js`;
- `GET /api/v1/growth/card-generation/context` in
  `src/routes/growth-routes.js`;
- `public/growth-card-generation-ui.js`;
- `public/growth-homeai-legacy.css`;
- `public/growth-api-client.js`;
- Owner `生成` tab integration in `public/growth-legacy-ui.js`;
- Owner management entry and generation event handling in `public/app.js`.

## Harness Plan

Add focused tests before broad regression runs:

| Boundary | Harness |
| --- | --- |
| Recipe policy service | normalizes compact `daily_english_v1` requests, exposes public recipe context, and leaves stage assessment outside daily defaults |
| Context service | returns Fanfan sample, readiness, recipe, graph suggestion, bounded history summary, selected learner profile projection |
| Profile projection service | returns bounded mastery, weakness, signal, trajectory, and next-card strategy without raw answer/source-ref leakage |
| Context route | Owner-scoped workspace target, not actor-as-target fallback |
| API client | GET context and POST generate with workspace query/header handling |
| UI render | Owner sees `生成`; learner does not; Owner generation page renders learning profile/trajectory projection |
| UI target state | Fanfan enabled, disabled targets do not generate |
| UI readiness | generate button disabled until readiness passes |
| UI submit | calls Growth endpoint, not Gateway directly |
| UI success | published result shows card preview and open-card action |
| UI failures | timeout, invalid JSON, privacy failure, and DB publish failure display bounded messages |
| Gateway wire protocol | official `/v1/responses` request body and nested output text parsing |
| SQLite publish | FK-backed publish creates missing program/draft parent rows and rolls back them with the card on failure |
| Proxy write auth | Home AI same-origin proxy attaches server-side Growth bearer for writes |
| Boundary guard | frontend has no vendor model endpoint and no raw prompt field |

Recommended command group after implementation:

```bash
node --test tests/learning-card-generation-context-service.test.js \
  tests/learning-card-generation-recipe-policy-service.test.js \
  tests/learning-profile-projection-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-frontend-adapter.test.js
npm run check
npm test
git diff --check
```

Current focused harness:

```bash
node --test tests/learning-card-generation-context-service.test.js \
  tests/learning-card-generation-recipe-policy-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-frontend-adapter.test.js
```

## Mockup

The static mockup lives at:

- `docs/mockups/growth-card-generation-management.html`

The exported screenshot should live at:

- `docs/mockups/growth-card-generation-management.png`
