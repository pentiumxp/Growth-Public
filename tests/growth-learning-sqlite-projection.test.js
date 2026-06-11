const assert = require("node:assert/strict");
const test = require("node:test");

const {
  lanesForCards,
  publicEvaluation,
  publicReflection,
  publicRewardSettlement,
  publicSubmission,
  summaryForCards
} = require("../src/stores/growth-learning-sqlite/projection");

test("Growth projection helpers produce bounded public records", () => {
  assert.deepEqual(publicSubmission({
    id: "submission_1",
    task_card_id: "card_1",
    status: "submitted",
    submission_kind: "text",
    submitted_at: "2026-06-11T00:00:00.000Z",
    created_at: "2026-06-11T00:00:00.000Z",
    raw_json: JSON.stringify({ audio: { name: "voice.m4a", digest: "abc", size: 12 } })
  }), {
    submissionId: "submission_1",
    taskCardId: "card_1",
    status: "submitted",
    submissionKind: "text",
    submittedAt: "2026-06-11T00:00:00.000Z",
    createdAt: "2026-06-11T00:00:00.000Z",
    audio: {
      kind: "audio",
      name: "voice.m4a",
      mime: "application/octet-stream",
      size: 12,
      durationMs: 0,
      digest: "abc",
      url: "/api/v1/growth/audio/submissions/submission_1"
    },
    submissionCount: 1,
    totalSubmissionCount: 1
  });

  assert.equal(publicEvaluation({
    id: "evaluation_1",
    task_card_id: "card_1",
    status: "completed",
    score: 95,
    passed: 1,
    summary: "x".repeat(900),
    raw_json: JSON.stringify({ revisionRequirements: ["a"], remainingWeaknesses: ["b"] })
  }).summary.length, 700);

  assert.equal(publicReflection({
    id: "reflection_1",
    task_card_id: "card_1",
    status: "submitted",
    mode: "text",
    summary: "ok",
    raw_json: "{}"
  }).reflectionId, "reflection_1");

  assert.equal(publicRewardSettlement({
    id: "settlement_1",
    status: "settled",
    coin_amount: 100,
    raw_json: "{}"
  }).currency, "learning_coin");
});

test("Growth projection summary and lanes preserve visible workflow buckets", () => {
  const cards = [
    { taskCardId: "card_ready", laneId: "ready", status: "published" },
    { taskCardId: "card_revision", laneId: "needs_revision", status: "needs_revision" },
    { taskCardId: "card_completed", laneId: "completed_recent", status: "completed" }
  ];
  const hidden = [{ taskCardId: "future_1" }];

  assert.deepEqual(summaryForCards(cards, cards.concat(hidden), hidden), {
    cardCount: 3,
    visibleCardCount: 3,
    totalCardCount: 4,
    hiddenFutureCardCount: 1,
    sequencePolicy: "current_card_only_then_unlock_next",
    total: 3,
    active: 2,
    waiting_review: 0,
    completed: 1
  });

  const lanes = lanesForCards(cards);
  assert.deepEqual(lanes.map((lane) => [lane.id, lane.cards]), [
    ["today", []],
    ["ready", ["card_ready"]],
    ["locked_until", []],
    ["waiting_ai", []],
    ["needs_revision", ["card_revision"]],
    ["reflection_required", []],
    ["completed_recent", ["card_completed"]]
  ]);
});
