"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS,
  DEFAULT_TASK_IDS,
  RELEASE_APPROVAL_KEYS,
  RELEASE_EVIDENCE_COLLECTION_FALLBACK_TASK_IDS,
  RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY,
  RELEASE_EVIDENCE_COLLECTION_TASK_ORDER,
  TASK_DEFINITIONS,
  TASK_ID_BY_RELEASE_EVIDENCE_KEY,
  WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY,
  isCollectionOwnedReleaseEvidenceKey,
  releaseEvidenceCollectionTaskIdForKey,
  taskDefinition,
  taskIdFromReleaseEvidenceKey,
  writeGatedReleaseEvidenceCollectionTaskIdForKey
} = require("../src/services/learning-automation-release-evidence-task-registry");

test("release evidence task registry owns default and opt-in task definitions", () => {
  assert.equal(DEFAULT_TASK_IDS.includes("operating_loop_history"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("profile_feedback"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("release_approval"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("daily_loop_write"), false);
  assert.equal(DEFAULT_TASK_IDS.includes("release_package_review_ui"), false);

  const taskIds = TASK_DEFINITIONS.map((task) => task.taskId);
  assert.equal(taskIds.includes("daily_loop_write"), true);
  assert.equal(taskIds.includes("release_package_review_ui"), true);
  assert.equal(taskIds.includes("release_workbench"), true);
  assert.equal(taskDefinition("operating_loop_history").commandName, "npm run smoke:operating-loop");
  assert.deepEqual(RELEASE_APPROVAL_KEYS, [
    "writefulExecutionApproval",
    "backgroundSchedulerApproval",
    "backgroundWorkerApproval"
  ]);
  assert.deepEqual(RELEASE_EVIDENCE_COLLECTION_FALLBACK_TASK_IDS, ["learning_loop_state"]);
});

test("release evidence task registry maps camel and snake evidence keys", () => {
  assert.equal(
    taskIdFromReleaseEvidenceKey("productionOperatingLoopHistorySmokeEvidence"),
    "operating_loop_history"
  );
  assert.equal(
    taskIdFromReleaseEvidenceKey("production_operating_loop_history_smoke_evidence"),
    "operating_loop_history"
  );
  assert.equal(taskIdFromReleaseEvidenceKey("releaseApproval"), "release_approval");
  assert.equal(taskIdFromReleaseEvidenceKey("release_approval"), "release_approval");
  assert.equal(TASK_ID_BY_RELEASE_EVIDENCE_KEY.release_approval, "release_approval");
});

test("release evidence task registry separates safe collection, write-gated, and owned output keys", () => {
  assert.equal(
    releaseEvidenceCollectionTaskIdForKey("production_operating_loop_history_smoke_evidence"),
    "operating_loop_history"
  );
  assert.equal(
    releaseEvidenceCollectionTaskIdForKey("owner_daily_ui_evidence"),
    "owner_daily_ui"
  );
  assert.equal(
    releaseEvidenceCollectionTaskIdForKey("production_daily_loop_write_smoke_evidence"),
    ""
  );
  assert.equal(
    writeGatedReleaseEvidenceCollectionTaskIdForKey("production_daily_loop_write_smoke_evidence"),
    "daily_loop_write"
  );
  assert.equal(
    WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY.production_daily_loop_write_smoke_evidence,
    "daily_loop_write"
  );
  assert.equal(RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY.production_profile_feedback_smoke_evidence, "profile_feedback");
  assert.equal(RELEASE_EVIDENCE_COLLECTION_TASK_ORDER.includes("operating_loop_history"), true);
  assert.equal(COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS.has("release_evidence_bundle_audit"), true);
  assert.equal(isCollectionOwnedReleaseEvidenceKey("release_evidence_bundle_audit"), true);
});
