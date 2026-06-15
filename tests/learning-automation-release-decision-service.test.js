const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationReleaseDecisionService
} = require("../src/services/learning-automation-release-decision-service");

function readyCollectionRun(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    runId: "lgacrn_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    writefulSchedulingAllowed: false,
    summary: {
      summaryOnly: true,
      readyForReleaseEvidence: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false,
      bundleTaskCount: 18,
      bundlePassedCount: 18,
      bundleBlockedCount: 0,
      missingCheckCount: 0,
      blockedCheckCount: 0,
      requiredActionCount: 0
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      persistedApprovalKeys: ["writefulExecutionApproval"]
    }
  }, overrides);
}

test("release decision service evaluates and records approved summary-only decisions", () => {
  const saved = [];
  const service = createLearningAutomationReleaseDecisionService({
    repository: {
      saveDecision(input) {
        saved.push(input);
        return {
          ok: true,
          duplicate: false,
          decision: Object.assign({ decisionId: "lgard_1" }, input)
        };
      },
      listDecisions() {
        return saved;
      }
    }
  });

  const evaluated = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "approved",
    releaseCollectionRunFile: "/tmp/release/collection-run.json",
    releaseCollectionRun: readyCollectionRun(),
    decidedBy: "weixin_owner"
  });

  assert.equal(evaluated.ok, true);
  assert.equal(evaluated.status, "approved");
  assert.equal(evaluated.approvedForReleaseReview, true);
  assert.equal(evaluated.writefulSchedulingAllowed, false);
  assert.equal(evaluated.runtimeConfigChange, false);
  assert.equal(evaluated.collectionRunSummary.artifactFileName, "collection-run.json");
  assert.equal(JSON.stringify(evaluated).includes("/tmp/release"), false);
  assert.equal(evaluated.collectionRunSummary.collectionRunId, "lgacrn_ready_1");

  const recorded = service.recordDecision({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "approved",
    releaseCollectionRun: readyCollectionRun(),
    decidedBy: "weixin_owner"
  });
  assert.equal(recorded.ok, true);
  assert.equal(recorded.decision.decisionId, "lgard_1");
  assert.equal(saved[0].privacyClass, "summary_only");
  assert.equal(saved[0].decision.approved, true);
  assert.equal(saved[0].decision.writefulSchedulingAllowed, false);
});

test("release decision service blocks approved decisions unless the collection run is ready", () => {
  const service = createLearningAutomationReleaseDecisionService();

  const missingRun = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    collectionRunId: "lgacrn_1",
    status: "approved"
  });
  assert.equal(missingRun.ok, false);
  assert.equal(missingRun.error, "learning_automation_release_decision_invalid");
  assert.ok(missingRun.missingRequired.includes("approved_decision_requires_collection_run"));

  const blockedRun = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    status: "approved",
    releaseCollectionRun: readyCollectionRun({
      status: "blocked",
      readyForReleaseReview: false,
      summary: { readyForReleaseReview: false }
    })
  });
  assert.equal(blockedRun.ok, false);
  assert.ok(blockedRun.missingRequired.includes("approved_decision_requires_ready_collection_run"));

  const blockedDecision = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    collectionRunId: "lgacrn_blocked_1",
    status: "blocked"
  });
  assert.equal(blockedDecision.ok, true);
  assert.equal(blockedDecision.status, "blocked");
  assert.equal(blockedDecision.writefulSchedulingAllowed, false);
});

test("release decision service rejects privacy-risk collection run payloads", () => {
  const service = createLearningAutomationReleaseDecisionService();

  const privacyKey = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    status: "blocked",
    releaseCollectionRun: readyCollectionRun({
      rawPrompt: "do not store"
    })
  });
  assert.equal(privacyKey.ok, false);
  assert.equal(privacyKey.error, "learning_automation_release_decision_privacy_failed");

  const privatePath = service.evaluateDecision({
    workspaceId: "weixin_fanfan",
    status: "blocked",
    releaseCollectionRun: readyCollectionRun({
      releaseReview: {
        summaryOnly: true,
        artifact: "/Users/xuxin/.homeai-qa/private.json"
      }
    })
  });
  assert.equal(privatePath.ok, false);
  assert.equal(privatePath.error, "learning_automation_release_decision_privacy_failed");
});
