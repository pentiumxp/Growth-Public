# Growth Card Generation Management UI

Last updated: 2026-06-15.

This document defines the Growth-owned Owner UI for generating learning cards
inside the Growth plugin.

The system scheme for the broader AI-driven learning loop is
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`; the execution blueprint is
`docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`. This UI document should
follow those documents for state ownership, model boundaries, audit fields, and
harness sequencing.

V1 implementation status: the Owner `生成` tab, context route, frontend API
helpers, daily English payload builder, generated-card learner submission /
evaluation / optional-reflection UI, stage-assessment controls, target
domain-pack/subject controls, and focused harness are implemented in the
plugin workspace. The backend operating-loop slice also exposes planner
readiness, Profile V2, evidence audit, `graphOptions`, plan draft/publish
services, Owner-only daily-loop preview/draft/publish backend facade routes,
compact learning-loop state readback through
`GET /api/v1/growth/learning-loop/state`, no-write learning-loop state smoke,
and a no-write planner readiness smoke. The Owner `生成` tab now reads that
state after loading generation context, renders a summary-only status/next
action panel, renders `targetProvisioning` plus filtered `graphOptions`, lets
Owner apply a selected domain pack/subject to context refresh, and can call the
Owner-only `POST /api/v1/growth/domain-pack-provisions` route for explicit
target enablement. Remaining product closure is older-cycle selection,
central embedded visual evidence, and production release evidence.

## Objective

Owner should be able to generate Growth cards for learners who have the Growth
plugin provisioned, without using Codex as the operational interface.

V1 is deliberately narrow:

- Owner-only card generation surface inside the Growth plugin.
- Initial sample target is Fanfan.
- Initial recipe is a daily English card.
- Next sample subject is Fanfan science from the imported UK/HK curriculum
  domain pack.
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

Target visibility and learning target provisioning are separate checks:

- `GET /api/v1/growth/view-targets` says which learners Owner can see;
- `learning-target-provisioning-service` says which domain pack, domain,
  subject, and graph node set Growth may use for planning/generation;
- a visible non-sample learner is not enabled for card generation until Owner
  creates an active provision for the requested domain pack/subject;
- the Fanfan sample fallback may stay enabled during V1 so the first science
  vertical remains operable before all targets have explicit provisions.

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
5. Growth reads compact learning-loop state for the selected target through
   `GET /api/v1/growth/learning-loop/state` and shows the current status, next
   action, weakness count, audit-gap count, and stage-checkpoint state. This
   panel is read-only UI glue over the backend state service.
6. Owner can switch back to the Fanfan sample learner if a future navigation
   state lands on another target.
7. Owner selects the `日常英语卡` recipe.
8. Growth shows readiness:
   - learner workspace is provisioned;
   - learning graph is imported;
   - mastery/history summary is available;
   - Gateway authoring boundary is configured;
   - Gateway evaluation boundary is shown separately so Owner can see whether
     the post-submit AI loop is model-backed;
   - there is no blocking open generation job.
9. Owner reviews the structured plan preview:
   - learning graph plan;
   - learner/mastery summary;
   - recent experience signals;
   - card role, difficulty, and evidence requirements;
   - `daily_score_once` completion policy.
10. Owner presses `生成卡片`.
11. Growth immediately renders a visible progress box with four bounded stages:
   `prepare`, `gateway`, `validation`, and `publish`. The progress box is
   shown inside the plugin UI, uses `role="status"` / `aria-live="polite"`,
   and must remain visible on mobile embedded viewports without relying on the
   user scrolling back to the generate button.
12. Growth calls `POST /api/v1/growth/cards/generate`.
13. Gateway output is converted to an authoring draft.
14. Validation passes or returns a visible authoring error.
15. A validated card is transactionally published to Growth SQLite, including
    the native program/draft parent rows required by the card table.
16. Owner sees the generated card preview and can open the card on the learner
    board.
17. The learner can submit the generated card from the plugin card detail,
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

## Planner-Backed Owner Flow

This browser operation is implemented for the supervised daily-loop path.

1. Owner opens Growth and selects `生成`.
2. Growth loads `GET /api/v1/growth/card-generation/context` for the selected
   target learner.
3. Growth renders `targetProvisioning`:
   - enabled for Fanfan sample fallback or an explicit active provision;
   - blocked for a visible non-sample learner without an active provision;
   - selected domain pack, domain, subject, and bounded failure reason when
     blocked.
4. Growth renders provisioned `graphOptions`:
   - domain-pack selector, initially showing the imported UK/HK curriculum
     foundation pack when available;
   - subject selector, for example `science`;
   - current learner/profile/evidence summary for the selected target.
5. Owner selects a horizon and time budget, normally `daily_plan` and
   `15` minutes for a daily card.
6. Owner clicks `规划下一张`.
7. UI calls `POST /api/v1/growth/daily-loop/draft` with target workspace,
   learner id, selected domain pack, subject, horizon, and available minutes.
   The facade delegates to the existing plan-publisher draft boundary.
8. Growth renders an Owner-safe plan preview:
   - plan id and validation status;
   - target graph nodes and labels;
   - card role and mapped generation role;
   - difficulty/support level;
   - estimated minutes;
   - evidence requirements;
   - bounded reason and basis evidence ids.
9. Owner clicks `发布为卡片`.
10. UI calls `POST /api/v1/growth/daily-loop/publish` for the selected plan
    item. The facade delegates to the existing plan-publisher publish
    boundary, strips generated authoring draft internals, and refreshes audit
    and completeness DTOs.
11. Growth shows the existing generation progress surface, then preserves the
    published card preview and refreshes context/audit state.

The UI must not call Gateway directly, must not generate from a free-form
prompt, and must not publish a plan item without backend validation. The route
layer remains HTTP glue; selection, validation, role mapping, authoring, and
SQLite writes stay service-owned.

For the first browser-complete science path, the default selectors are:

| Selector | Default |
| --- | --- |
| Learner | Fanfan target from `viewTargets` |
| Learner id | `fanfan` |
| Domain pack | UK/HK curriculum foundation |
| Domain | `science` |
| Subject | `science` |
| Horizon | `daily_plan` |
| Available minutes | `15` |

The UI should treat these defaults as a sample operating path, not as hard
coded business policy. A later non-sample learner must use the same controls
after target visibility and explicit target provisioning pass.

The generated daily card is browser-complete only when all of these happen
without Codex or database-console intervention:

1. context loads for the selected target and subject;
2. a planner draft is created and shown to Owner;
3. one selected daily item is explicitly published;
4. the published card can be opened from the existing card renderer;
5. the learner can submit one answer, receive one evaluation, and optionally
   submit one reflection;
6. Owner can refresh audit context and see bounded plan, evidence, profile
   delta, correction, and next-recommendation summaries.

The progress surface must cover both planner and authoring publication. A
button press cannot be a silent no-op. While drafting or publishing, the UI
must show a visible status row or box with `aria-live="polite"` and a bounded
stage label such as `context`, `planner`, `validation`, `authoring`,
`publish`, `audit_refresh`, `done`, or `failed`.

If publishing fails or is policy-blocked, the UI must preserve the plan preview
and render the bounded `publishAttempt` status/error/stage returned by the
publish response, plan audit, or cycle audit. The UI must not infer publish
state from button state alone.

After the learner completes a generated card, the backend evaluation result can
include a bounded `profile_delta` audit summary and persist it for historical
audit readback. The same Owner management surface should later render:

- evaluation id, score band, and completion policy;
- evidence ledger ids written for the card;
- Profile V2 capability changes by graph node;
- changed planner hints or next recommendation;
- visible non-fatal audit failure if profile-delta projection failed.

This audit panel must consume the backend profile-delta DTO. The browser must
not compare raw Profile V2 payloads itself and must not display raw answers,
transcripts, prompts, model output, source bodies, private paths, or provider
configuration. For historical review, it should consume the implemented
`GET /api/v1/growth/profile-delta-audits` public read DTO rather than
transient evaluation response data.

The implemented card-generation context also exposes `ownerAudit`, which
combines persisted profile-delta audit DTOs and Owner profile-correction DTOs
for the selected target. The UI should treat `ownerAudit` as the default
readback surface for the `生成` tab. Direct profile-delta route reads are useful
for drilldown/history screens, and direct learning-cycle route reads are useful
for one-card cycle drilldown. The daily generation screen should first render
the already-scoped context DTO so target selection, provisioning, Profile V2,
evidence audit, corrections, and next recommendation stay in one refresh
cycle. When Owner opens a specific card/evaluation/plan audit, the UI should
call `GET /api/v1/growth/learning-cycles/audit` rather than joining plan,
evidence, profile-delta, and correction routes in browser code.

Current implementation status: the Owner `生成` tab now renders an
`ownerAudit` panel from the card-generation context. It shows bounded plan
audit counts, published-card ids, persisted profile-delta summaries, recent
Owner correction history, and a compact Owner correction form. The correction
form calls `POST /api/v1/growth/profile-corrections` through
`growth-api-client.js`, writes only a summary-only review action and short
reason over selected graph node ids, then refreshes the same context and
`growth.learningLoopState.v1` readback. Browser code does not mutate Profile
V2 optimistically and does not call Gateway, repositories, or Profile V2
projection logic directly. The Owner `生成` tab now also renders a single-card
cycle drilldown panel. The panel derives a bounded query from the current
context, latest plan draft/publish result, generated card id, and `ownerAudit`
DTO; it then calls `GET /api/v1/growth/learning-cycles/audit` and
`GET /api/v1/growth/learning-cycles/completeness` through
`growth-api-client.js`. It shows only summary counts, a bounded timeline,
`missingRequired`, and finding/remediation labels. It must not join audit
tables in browser code, read repositories, display raw answers/transcripts,
prompts, source bodies, raw model output, private paths, credentials, or
provider configuration, and must not treat `readyForAutomation` as scheduling
permission.

For a compact "can this cycle be trusted for closure" badge, the UI should call
`GET /api/v1/growth/learning-cycles/completeness`. That route is read-only,
visible-target scoped, and delegates to `learning-audit-completeness-service`.
The UI may render `complete`, `readyForAutomation`, `missingRequired`, and
bounded finding messages, but it must not treat `readyForAutomation` as an
instruction to schedule work. The first automation UI should be proposal
review: Owner may request a bounded next-learning proposal for a complete
source cycle, but publication remains a separate explicit Owner action.
Scheduling remains a future Owner-policy slice after proposal review, audit UI,
automation digest review, active failure policy, and notification/action
handoff are proven. The digest plan is
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`; the failure-policy backend
contract is `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`.

### Owner Daily Loop Screen Contract

The planner-backed `生成` tab should be split into four compact panels. They
can be visually simple, but each panel has a service-backed responsibility:

| Panel | Purpose | Source DTO |
| --- | --- | --- |
| Target and scope | Select learner, domain pack, subject, horizon, and available minutes. | `viewTargets`, `graphOptions`, `targetProvisioning`, request selectors. |
| Readiness and profile | Explain whether Growth can plan, author, and evaluate for the target. | `plannerReadiness`, Gateway readiness flags, `profileV2`, `evidenceAudit`. |
| Plan and publish | Draft one plan, show validated item rationale, publish one selected daily item, and show failed/blocked publish-attempt state when no card was created. | `daily-loop/draft`, `daily-loop/publish`, bounded generation ids, `publishAttempt`, cycle audit, completeness. |
| Audit and next step | Show what changed after completion, whether the required audit evidence is present, and what Growth recommends next. | `ownerAudit`, `learning-cycles/completeness`, `nextCardRecommendation`, `recommendationLifecycle`, profile corrections. |
| Proposal review | Show a stored supervised next-learning proposal for a completed auditable cycle, let Owner record `accepted`/`skipped`/`expired`/`superseded`, and keep actual card publication on an explicit publish action. | `automation/proposals`, `automation/proposals/:proposalId/decision`, `automation/proposals/:proposalId/publish`, `learning-cycles/completeness`, existing plan publish route. |
| Automation digest review | Later scheduling-adjacent panel that shows persisted dry-run packets, would-publish candidates, blocked/skipped reasons, active failure-policy readiness, and explicit Owner actions without executing them. | Implemented backend `automation/digests`, `automation/digests/:digestId/review`, `automation/failure-policies`, `automation/failure-policies/readiness`, scheduler dry-run DTOs, proposal readback, audit completeness. |
| Cycle drilldown | Explain one generated card or evaluation as a bounded timeline. | `learning-cycles/audit` aggregate DTO. |

The screen must keep child pressure low:

- daily card default duration is 10-15 minutes;
- the primary daily path publishes at most one selected item at a time;
- low scores are shown as evidence for future planning, not as failure gates;
- reflection remains one optional post-evaluation action;
- stage assessment controls stay separate from the daily plan publish action.

Owner correction should be explicit and bounded. The UI may provide a compact
correction action only after rendering the relevant profile-delta or Profile V2
item. That action must call `POST /api/v1/growth/profile-corrections` and must
not mutate local Profile V2 state optimistically as if the correction already
changed durable evidence. After a successful correction write, the UI refreshes
the context route and renders the corrected state from service DTOs. The first
implemented form offers one textarea, one review-action selector, and one
submit button; it is intended for bounded Owner review notes, not raw learner
answers, transcripts, prompts, model output, or source material.

Before production deploy of this flow, run the no-write Gateway readiness
smoke with the same target selectors:

```bash
npm run smoke:planner-readiness -- \
  --workspace-id weixin_stephen \
  --learner-id fanfan \
  --domain-pack-id uk_hk_curriculum_foundation \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --available-minutes 15 \
  --json
```

The smoke output must remain bounded. It may show readiness state, planner
context counts, schema version, horizon, item count, and target node ids. It
must not print raw planner text, raw prompts, raw learner answers, transcripts,
answer keys, private paths, secrets, or provider configuration.

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
| Learner target | segmented/list row | Visible targets are selectable. Fanfan may be enabled by sample fallback; non-sample targets show a provisioning-required state until an explicit active provision exists. |
| Recipe | segmented control | `日常英语卡` selected; future recipes hidden or disabled. |
| Target provisioning | status row / Owner action | Shows `targetProvisioning.targetEnabled`, mode, selected domain pack/subject, and bounded block reason. The Owner action calls `POST /api/v1/growth/domain-pack-provisions` only after an explicit click. |
| Domain pack | select/menu | Reads `graphOptions.domainPacks`; applying the selector refreshes generation context with `domainPackId`, `domain`, and `subject`. |
| Subject | segmented/select | Reads `graphOptions.subjects`; `science` is the first non-English sample subject. |
| Graph target | bounded selector | V1 can use a recommended English graph node from the context endpoint. Planner-backed UI should normally let the plan choose the exact target node from the selected domain pack/subject. |
| Difficulty | segmented control | default comes from recipe and history summary; Owner can choose one bounded value later. |
| Evidence requirements | read-only chips | shows what the generated card must collect. |
| Structured input preview | collapsed detail | summary-only JSON families, not raw source payloads. |
| Plan draft | preview panel | Shows validated planner item, reason, target node ids, estimated minutes, role, support level, and evidence requirements before publish. |
| Publish attempt | status row | Shows latest bounded `publishAttempt.status`, `error`, `stage`, selected item id, and attempted timestamp when publication failed or was blocked. |
| Profile delta audit | read-only panel | Planned UI panel backed by implemented persisted/public `profile_delta` audit DTO readback; shows bounded changed capability states and evidence basis ids after a generated card is completed. |
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
  targetProvisioning: null,
  readiness: null,
  generatedCard: null,
  publishAttempt: null,
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

Implemented daily-loop facade routes:

```http
GET /api/v1/growth/daily-loop/preview
POST /api/v1/growth/daily-loop/draft
POST /api/v1/growth/daily-loop/publish
```

Implemented lower-level planner routes:

```http
POST /api/v1/growth/learning-plans/draft
POST /api/v1/growth/learning-plans/{planDraftId}/publish
```

Implemented audit read routes:

```http
GET /api/v1/growth/evidence/audit
GET /api/v1/growth/learning-plans/audit
GET /api/v1/growth/learning-cycles/audit
GET /api/v1/growth/learning-cycles/completeness
GET /api/v1/growth/profile-delta-audits
GET /api/v1/growth/profile-corrections
```

Implemented supervised proposal routes:

```http
GET /api/v1/growth/automation/proposals
POST /api/v1/growth/automation/proposals
POST /api/v1/growth/automation/proposals/:proposalId/decision
POST /api/v1/growth/automation/proposals/:proposalId/publish
```

These routes are visible-target scoped and return bounded public DTOs only.
`GET /api/v1/growth/learning-plans/audit` and
`GET /api/v1/growth/learning-cycles/audit` include latest bounded plan
`publishAttempt` metadata so the UI can explain failed or blocked publication
without reading SQLite tables.
`GET /api/v1/growth/learning-cycles/completeness` evaluates the public cycle
audit DTO for required findings and missing evidence. It is the preferred UI
source for readiness/closure badges and for later automation dry-run gates.
`POST /api/v1/growth/automation/proposals` is Owner-only and may create a new
validated plan draft for proposal review only after source-cycle completeness
and target provisioning pass. It returns a proposal plus the explicit Owner
publish action; the UI must still call the existing plan publish route to
create a card.
`POST /api/v1/growth/automation/proposals/:proposalId/decision` is Owner-only
and records only the Owner proposal decision. Valid decisions are `accepted`,
`skipped`, `expired`, and `superseded`. An accepted decision may return the
same explicit publish action for the UI, but it must not publish the card or
schedule any work.
`POST /api/v1/growth/automation/proposals/:proposalId/publish` is Owner-only
and publishes only an already accepted proposal. It delegates to the same
backend plan publisher as `POST /api/v1/growth/learning-plans/:planDraftId/publish`,
records bounded proposal execution metadata, returns a visible failure when
publication fails, and does not schedule future work.
The daily generation screen should prefer the scoped context DTO for its first
refresh, while history/drilldown views can call the direct audit routes. The
cycle audit route is the preferred drilldown API when the UI has a
`taskCardId`, `evaluationId`, or `planDraftId`.

Target/domain-pack provision route:

```http
POST /api/v1/growth/domain-pack-provisions
```

This route is Owner-only and must still pass Growth view-target visibility for
the target workspace before writing a provision. It delegates to
`learning-target-provisioning-service`; the route must not validate domain
pack policy or write `learning_growth_domain_pack_provisions` directly.

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
  "targetProvisioning": {
    "ok": true,
    "targetEnabled": true,
    "mode": "sample_default",
    "selectedDomainPackId": "uk_hk_curriculum_foundation",
    "selectedDomain": "science",
    "selectedSubject": "science",
    "error": ""
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
  "graphOptions": {
    "ok": true,
    "available": true,
    "selectedDomainPackId": "uk_hk_curriculum_foundation",
    "selectedDomain": "science",
    "selectedSubject": "science",
    "subjects": ["science", "physics"],
    "domainPacks": [
      {
        "domainPackId": "uk_hk_curriculum_foundation",
        "importId": "kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1",
        "domain": "science",
        "title": "UK/HK Curriculum Foundation",
        "version": "2026-05-27-v1",
        "nodeCount": 294,
        "subjectCount": 2,
        "subjects": ["science", "physics"]
      }
    ]
  },
  "readiness": {
    "workspaceProvisioned": true,
    "learningGraphReady": true,
    "historySummaryReady": true,
    "gatewayConfigured": true,
    "authoringGatewayConfigured": true,
    "evaluationGatewayConfigured": true,
    "aiLoopGatewayReady": true,
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
  "recommendationLifecycle": [
    {
      "trajectoryId": "traj_accepted_1",
      "status": "accepted",
      "strategy": "repair",
      "targetNodeIds": ["kg_english_evidence_answering"],
      "reason": "Generated an evidence repair card.",
      "taskCardId": "ltask_1",
      "sourceEvaluationId": "eval_1",
      "generatedTaskCardId": "ltask_generated_1",
      "generatedLearningGraphPlanId": "lgp_generated_1",
      "acceptedAt": "2026-06-14T08:10:00.000Z",
      "statusUpdatedAt": "2026-06-14T08:10:00.000Z"
    },
    {
      "trajectoryId": "traj_superseded_1",
      "status": "superseded",
      "strategy": "stretch",
      "targetNodeIds": ["kg_english_main_idea"],
      "reason": "Older stretch suggestion was replaced.",
      "supersededByTrajectoryId": "traj_accepted_1",
      "supersededAt": "2026-06-14T08:12:00.000Z"
    }
  ],
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
model output. `targetProvisioning`, `graphOptions`, `learningProfile`,
`profileV2`, `evidenceAudit`, `plannerContextPreview`,
`nextCardRecommendation`, and `recommendationLifecycle` are target-workspace
scoped; Owner viewing a learner must see that learner's provision,
graph/profile/evidence projections, and recommendation lifecycle, not the
Owner workspace's rows.

The Owner UI renders `recommendationLifecycle` as the read-only "推荐闭环"
panel. Rows may show lifecycle status, strategy, target node id, short reason,
generated card/plan ids, superseded-by trajectory id, and bounded timestamps.
The UI must not write lifecycle state, infer accepted/superseded from raw
trajectory JSON, or display raw learner content.

After a daily card or stage-assessment card publishes, the embedded UI must
refresh `GET /api/v1/growth/card-generation/context` for the selected learner
without calling the full loading path. This keeps the published card preview
and open-card button visible while updating `recommendationLifecycle` so the
Owner sees the consumed recommendation move out of pending state. If the
context refresh fails, the card remains published and the UI shows a bounded
refresh warning instead of rolling back the visible result.

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
| Target not provisioned | Show `learning_target_not_provisioned` or a mapped bounded message, keep the primary action visible with a reason, and offer Owner provision action when the actor is Owner. |
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
- a configured Gateway evaluation endpoint:
  `GROWTH_GATEWAY_EVALUATION_ENDPOINT`;
- the official Gateway Responses protocol for evaluation, either explicit
  through `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint;
- the evaluation Gateway token through
  `GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN_PATH` or the platform secret
  boundary.

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
   - `fetchLearningLoopState(targetWorkspaceId, context)`;
   - `draftGrowthDailyLoop(payload, targetWorkspaceId)`;
   - `publishGrowthDailyLoop(payload, targetWorkspaceId)`;
   - `fetchGrowthCycleAudit(payload, targetWorkspaceId)`;
   - `fetchGrowthCycleCompleteness(payload, targetWorkspaceId)`;
   - `generateGrowthCard(payload, targetWorkspaceId)` remains only as a
     compatibility helper for the legacy direct card-generation route.
4. Add Owner UI:
   - `growth-card-generation-ui.js`;
   - render inside Owner `生成` tab;
   - expose separate `规划下一张` and `发布为卡片` actions.
5. Add controller:
   - load context when Owner opens the tab or changes target;
   - draft one daily plan through
     `POST /api/v1/growth/daily-loop/draft`;
   - show bounded plan preview before publication;
   - publish one selected item through
     `POST /api/v1/growth/daily-loop/publish`;
   - refresh board, card-generation context, and learning-loop state after
     publish;
   - refresh single-card cycle audit/completeness after publish when a cycle
     anchor is available, while keeping failures visible only inside the audit
     drilldown panel.
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

Next planner/provisioning files:

- `src/services/learning-target-provisioning-service.js`;
- `src/stores/growth-learning-sqlite/domain-pack-provisions.js`;
- Owner-only `POST /api/v1/growth/domain-pack-provisions` in
  `src/routes/growth-routes.js`;
- `targetProvisioning` projection in
  `learning-card-generation-context-service`.

## Harness Plan

Add focused tests before broad regression runs:

| Boundary | Harness |
| --- | --- |
| Recipe policy service | normalizes compact `daily_english_v1` requests, exposes public recipe context, and leaves stage assessment outside daily defaults |
| Context service | returns Fanfan sample, readiness, separate planner/authoring/evaluation Gateway status, recipe, `graphOptions`, graph suggestion, bounded history summary, Profile V2, evidence audit, and selected learner profile projection |
| Graph option projection | `tests/learning-graph-repository.test.js` proves domain-pack and subject options project from native graph tables without `raw_json` |
| Planner readiness smoke CLI | `tests/growth-planner-readiness-smoke-script.test.js` proves bounded argument parsing and target-node id de-duplication |
| Planner draft/publish service | `tests/learning-plan-publisher-service.test.js` proves validated plan drafts persist summary-only previews and publish selected items only through the card-generation service |
| Daily-loop backend facade | `tests/learning-daily-loop-service.test.js` and `tests/growth-routes.test.js` prove Owner-only preview/draft/publish delegation, visible-target scope, bounded generation projection, publish failure visibility, audit/completeness refresh, and privacy-risk input rejection |
| Automation proposal repository/service | `tests/learning-automation-proposal-repository.test.js` and `tests/learning-automation-proposal-service.test.js` prove source-cycle id, audit-completeness gate, target provisioning, idempotent summary-only proposal persistence, Owner decision statuses, accepted-only publish execution, execution metadata, legacy decision/execution-column migration, DB-level privacy-class/privacy-key rejection, and no direct card-generation/Gateway/scheduler call |
| Target provisioning service | `tests/learning-target-provisioning-service.test.js` proves sample fallback, non-sample blocking, explicit provision success, subject mismatch rejection, graph-node mismatch rejection, and summary-only public DTOs |
| Domain-pack provision route | `tests/growth-routes.test.js` proves Owner-only provision writes and view-target scoping |
| Profile projection service | returns bounded mastery, weakness, signal, trajectory, and next-card strategy without raw answer/source-ref leakage |
| Context route | Owner-scoped workspace target, not actor-as-target fallback |
| API client | GET context with target/domain-pack/subject query handling, GET learning-loop state, legacy POST generate compatibility, daily-loop draft/publish helpers, profile-correction POST helper, domain-pack provision POST helper, and workspace query/proxy handling |
| UI render | Owner sees `生成`; learner does not; Owner generation page renders target provisioning, domain-pack/subject selectors, learning-loop state, learning profile/trajectory projection, Owner audit/correction summary, separate draft/publish buttons, visible progress, and bounded plan preview |
| UI target state | Visible targets are selectable; non-sample targets do not draft/publish until target provisioning passes |
| UI plan preview | renders the validated daily-loop plan draft id, selected item, target nodes, role, difficulty, evidence requirements, publish attempt state, and publishes only after explicit Owner action |
| UI provisioning | renders `targetProvisioning`, prevents silent no-op generation when blocked, applies selected graph scope through context refresh, and calls the provision route only after explicit Owner action |
| UI audit panel | renders `ownerAudit`, persisted profile-delta audit summaries, Owner correction history, next recommendation, and recommendation lifecycle from context DTOs without raw source payloads |
| UI cycle drilldown | calls `fetchGrowthCycleAudit` and `fetchGrowthCycleCompleteness`, renders single-card timeline/findings/missing-required state, keeps no raw source payloads, and does not schedule or publish |
| UI proposal review | lists and creates supervised proposals from a selected complete cycle, shows bounded rationale and required Owner publish action, records `accepted`/`skipped`/`expired`/`superseded` decisions, can call explicit accepted-proposal publish, and never auto-publishes or schedules after proposal creation or decision |
| UI automation digest review | later panel lists persisted dry-run digests, shows would-publish/blocked/skipped counts, keeps explicit publish manual, records digest review/archive/supersede state, and never publishes or notifies during digest creation or review |
| UI correction action | calls `POST /api/v1/growth/profile-corrections`, refreshes context after success, and does not mutate Profile V2 optimistically in browser state |
| UI evidence audit | renders evidence history from context or `GET /api/v1/growth/evidence/audit`; never displays raw answers, transcripts, prompts, model output, source bodies, private paths, or provider config |
| UI profile-delta audit | render changed capability states from `GET /api/v1/growth/profile-delta-audits` persisted/public backend DTOs and never compute diffs from raw source payloads |
| UI readiness | generate button disabled until authoring readiness passes; evaluation Gateway status remains visible as AI-loop readiness |
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
  tests/learning-graph-repository.test.js \
  tests/learning-plan-publisher-service.test.js \
  tests/learning-target-provisioning-service.test.js \
  tests/growth-planner-readiness-smoke-script.test.js \
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
  tests/learning-graph-repository.test.js \
  tests/learning-target-provisioning-service.test.js \
  tests/growth-routes.test.js \
  tests/growth-frontend-adapter.test.js
```

## Mockup

The static mockup lives at:

- `docs/mockups/growth-card-generation-management.html`

The exported screenshot should live at:

- `docs/mockups/growth-card-generation-management.png`
