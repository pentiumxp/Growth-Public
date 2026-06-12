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

The card detail keeps the existing teaching/practice shape:

1. `讲解`: short lesson and worked example.
2. `跟做`: learner draft area.
3. `检查`: final answer submission, optional recording, feedback, and optional
   reflection.

On the `检查` step:

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

Every submit or refresh failure must be shown in the card detail. A failed
write must not silently leave the button with no visible result.

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

## Audio Evidence

The browser recorder uses `MediaRecorder` when available. The plugin UI keeps
recording state in memory only. On submit, the selected `Blob` is converted to
bounded base64 JSON:

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
returns bounded public audio metadata. Docs and handoffs must not store raw
audio payloads, transcripts, or learner answer bodies.

## State Ownership

`public/app.js` remains the embedded boot/wiring layer. It creates and wires
`public/growth-card-interaction-controller.js`, then delegates generated-card
submission, evaluation refresh, reflection, and recording events to that
controller.

The controller owns ephemeral page state for:

- selected teaching step;
- local answer/reflection drafts;
- button busy state;
- visible interaction messages;
- in-memory `MediaRecorder` state.

Business rules remain in plugin services/stores:

- one-submission/one-reflection enforcement:
  `src/stores/growth-learning-sqlite/evidence-writes.js`;
- evaluation queue processing:
  `src/services/growth-evaluation-service.js`;
- score-proportional completion/reward settlement:
  `src/stores/growth-learning-sqlite/rewards.js`.

## Harness

Focused frontend coverage lives in `tests/growth-frontend-adapter.test.js`:

- API helper paths for card fetch, submission, reflection, evaluation process,
  and embedded-proxy audio URL resolution;
- generated card detail before submission;
- generated card detail after one-shot evaluation and optional reflection;
- submitted reflection audio playback without reopening reflection.

Run focused validation:

```bash
node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js
node --test tests/growth-architecture-boundary.test.js
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
