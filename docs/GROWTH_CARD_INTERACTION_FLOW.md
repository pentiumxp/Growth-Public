# Growth Card Interaction Flow

Last updated: 2026-06-12.

This document defines the plugin-owned learner interaction flow for generated
Growth cards. It covers submission, evaluation refresh, optional reflection,
and audio evidence from the embedded Growth UI.

## Scope

The Growth plugin owns this flow end to end:

- render generated Growth cards through the plugin-local card renderer;
- collect text and optional audio evidence in the plugin UI;
- call Growth plugin write routes through the plugin API client;
- show visible submission, evaluation, reflection, and error states;
- play plugin-owned audio through the Growth audio playback routes.

The Home AI host may embed the plugin and provide same-origin proxy
authorization, but the browser must not call Home AI old Growth routes or model
vendors directly.

## Product Rule

Generated ordinary daily cards use `daily_score_once`:

- the learner submits one answer only;
- Growth runs one evaluation only;
- the evaluation score is recorded as the outcome for that card;
- the card completes after the first evaluation, regardless of pass/fail
  threshold;
- rewards are score-proportional;
- reflection is optional and can be submitted once only;
- reflection never reopens grading, requires no second reflection, and does not
  block completion.

The UI must avoid old retry-gate wording such as "must pass", "revise until
passed", or "reflection required" for daily cards.

## UI Flow

The generated daily card detail uses the old Growth card-detail pattern: one
vertical, scrollable workflow page. It should not hide the lower workflow behind
a stepper-only UI. The page renders these sections in order:

1. status rail: `学习 -> 作答 -> 批改 -> 反思（可选）`;
2. score policy: one submission, one evaluation, score-proportional reward, no
   pass-line gate;
3. `学习目标` and prerequisites;
4. `讲解`: short lesson and worked example;
5. `跟做`: learner draft area;
6. `提交作答`: final answer text, optional recording, and visible submit state;
7. saved submission / waiting evaluation / evaluation result;
8. optional one-time reflection after the first evaluation;
9. completion feedback and low-pressure difficulty signal status after
   completion.

The old three-step teaching state may remain in page state for compatibility,
but generated daily cards render all sections together so mobile users can
scroll through the same flow shape as the previous Growth reading cards.

Within the `提交作答` section:

- before submission, show text input, optional audio recorder, and `提交作答`;
- after submission, replace the active submit state with a saved-evidence
  status panel;
- while evaluation is not projected yet, show `等待批改` and a visible
  `刷新批改` action;
- after evaluation, show score, summary, strengths, weak points, and next
  practice suggestions;
- after evaluation, show an optional one-time reflection form with text and
  optional recording;
- after reflection, show saved reflection status and audio playback, and do
  not reopen the reflection form.

Every submit, refresh, recording, or reflection failure must be shown in the
card detail. A failed write must not silently leave the button with no visible
result.

Evaluation processing remains backend-owned. The UI requests evaluation
processing through `POST /api/v1/growth/evaluations/process`; it never calls
Gateway directly. When `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured,
Growth uses `learning-card-evaluation-service` and
`growth-gateway-evaluation-client` to produce one validated
`growth.card.evaluation.v1` result. Without that endpoint, the deterministic
local evaluator remains a fallback. Both paths keep the same
`daily_score_once` rule: one evaluation, no retry-until-pass loop, and score as
the outcome.

The daily-card completion footer may display already-recorded difficulty
signals, but it must not render active difficulty-signal buttons until the Growth
plugin owns the matching persistence route and service. Until that service
exists, the UI shows a read-only status note instead of a dead clickable
control.

## API Boundary

The frontend uses `public/growth-api-client.js` helpers:

- `fetchGrowthCard(taskCardId, workspaceId)`;
- `submitGrowthCardEvidence(taskCardId, payload, workspaceId)`;
- `processGrowthEvaluations(workspaceId, limit)`;
- `submitGrowthCardReflection(taskCardId, payload, workspaceId)`;
- `resolveGrowthApiPath(path, workspaceId)` for audio playback URLs projected
  as `/api/v1/growth/audio/...`.

Write endpoints remain plugin-owned:

```http
POST /api/v1/growth/cards/:taskCardId/submissions
POST /api/v1/growth/evaluations/process
POST /api/v1/growth/cards/:taskCardId/reflections
```

Audio playback remains plugin-owned:

```http
GET /api/v1/growth/audio/submissions/:submissionId
GET /api/v1/growth/audio/reflections/:reflectionId
```

In Home AI embedded proxy mode, the frontend resolves projected Growth audio
paths through the plugin proxy and appends the target learner workspace query.
Direct plugin-port callers use the same helpers without a proxy prefix.

## Back Navigation

Generated teaching/practice card detail is a Growth-owned secondary view. When
the learner opens a card from the Growth board, Growth records an internal
history entry and emits `growth.plugin.navigation` with `canGoBack: true`.
Home AI back or right-swipe gestures send `hermes.plugin.back` to the iframe;
Growth must consume that event while a card detail, history page, or Owner
settings page is open, clear the secondary view, render the parent list, and
emit `growth.plugin.back_result` with `handled: true`.

At the Growth root board, the same back event must return
`growth.plugin.back_result` with `handled: false` so the Home AI host can leave
the plugin and restore the outer route. Browser `popstate` should follow the
same internal route state when available. A practice card detail must not let
right-swipe return directly to the Home AI host while a Growth list parent is
available.

## Audio Evidence

The browser recorder uses `MediaRecorder` when available. The plugin UI keeps
recording state in memory only. The recorder must prefer a MIME type that is
both recordable by `MediaRecorder.isTypeSupported(...)` and playable by the
current browser's `audio.canPlayType(...)`; this prevents Safari/iOS-style
"recorded but cannot replay" states where a browser can create one container
but the embedded player rejects it. When no shared record/play MIME can be
confirmed, the UI may still record with the browser default, but it must surface
a visible recovery message if preview playback fails.

On submit, the selected `Blob` is converted to bounded base64 JSON:

```json
{
  "audio": {
    "dataBase64": "...",
    "name": "growth-submission-...",
    "mime": "audio/webm",
    "durationMs": 4200
  }
}
```

The plugin backend stores accepted audio in `learning_task_audio_blobs` and
returns bounded public audio metadata. Playback MIME must preserve the actual
container: `.webm` is `audio/webm`, `.ogg`/`.opus` are `audio/ogg`, and an
explicit non-generic stored MIME value wins over extension guessing. Docs and
handoffs must not store raw audio payloads, transcripts, or learner answer
bodies.

Both local preview audio and saved submission/reflection audio must have a
visible failure path. A local preview error keeps the recording recoverable for
`重新录音` / `清除` and shows the card-level message. A saved evidence playback
error reveals the bounded saved-audio error text in the evidence panel instead
of relying only on the native browser control.

## State Ownership

`public/app.js` remains the embedded boot/wiring layer. It creates and wires
`public/growth-card-interaction-controller.js`, then delegates generated-card
submission, evaluation refresh, reflection, and recording events to that
controller.

The controller owns ephemeral page state for:

- legacy selected teaching step state kept for compatibility with older
  projections;
- local answer/reflection drafts;
- button busy state;
- visible interaction messages;
- in-memory `MediaRecorder` state.

Business rules remain in plugin services/stores:

- one-submission/one-reflection enforcement:
  `src/stores/growth-learning-sqlite/evidence-writes.js`;
- evaluation queue processing:
  `src/services/growth-evaluation-service.js`;
- Gateway evaluation draft parsing and validation:
  `src/services/learning-card-evaluation-service.js` and
  `src/services/growth-gateway-evaluation-client.js`;
- score-proportional completion/reward settlement:
  `src/stores/growth-learning-sqlite/rewards.js`.
- public board/detail projection:
  `src/stores/growth-learning-sqlite/projection.js` maps a terminal
  `daily_score_once` evaluation to completed/review state regardless of pass
  line or legacy `needs_revision`/`draft_feedback` wording. Formal
  `stage_assessment` cards keep the legacy revision/reflection lanes.

## Harness

Focused frontend coverage lives in `tests/growth-frontend-adapter.test.js`:

- API helper paths for card fetch, submission, reflection, evaluation process,
  and embedded-proxy audio URL resolution;
- generated card detail before submission;
- submitted card waiting for evaluation with visible `刷新批改`;
- generated card detail after one-shot evaluation and optional reflection;
- read-only difficulty-signal status without an inactive clickable control;
- submitted reflection audio playback without reopening reflection.

Backend projection coverage lives in
`tests/growth-learning-sqlite-projection.test.js` and asserts that
`daily_score_once` cards complete after the first terminal evaluation even when
the score is low or a legacy revision status is present, while non-daily cards
still preserve the old revision lane.

Gateway-backed evaluation coverage lives in
`tests/learning-card-evaluation-service.test.js` and asserts valid streaming
response, valid JSON response, official Gateway `/v1/responses`, invalid JSON,
schema-missing output, privacy-risk output, and timeout behavior without direct
model-vendor calls.

Run focused validation:

```bash
node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js
node --test tests/growth-architecture-boundary.test.js
node --test tests/growth-learning-sqlite-projection.test.js
```

Run the full Growth gate before production publish:

```bash
npm run check
npm test
node scripts/check-growth-docs-locality.js
git diff --check
```

For mobile or visual changes, also run the central Home AI embedded plugin
visual harness documented in `docs/HOME_AI_PLATFORM_CONTRACT.md`.
