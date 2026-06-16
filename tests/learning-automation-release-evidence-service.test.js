const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalReleaseEvidenceKey,
  createLearningAutomationReleaseEvidenceService
} = require("../src/services/learning-automation-release-evidence-service");

function scope(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan"
  }, overrides);
}

function createService() {
  const rows = [];
  const calls = [];
  const service = createLearningAutomationReleaseEvidenceService({
    repository: {
      saveEvidence(input) {
        calls.push({ type: "saveEvidence", input });
        const evidence = Object.assign({
          evidenceRecordId: `lgarev_${rows.length + 1}`,
          status: input.status || input.evidence?.status || "pass",
          observedAt: input.observedAt || "2026-06-16T10:30:00.000Z"
        }, input);
        rows.push(evidence);
        return { ok: true, duplicate: false, evidence };
      },
      listEvidence(input) {
        calls.push({ type: "listEvidence", input });
        return rows.filter((row) => {
          if (input.status && row.status !== input.status) return false;
          if (input.evidenceKey && row.evidenceKey !== input.evidenceKey) return false;
          return true;
        });
      }
    }
  });
  return { calls, rows, service };
}

test("automation release evidence service canonicalizes release evidence keys and records summary-only evidence", () => {
  const { calls, service } = createService();

  const result = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { evidenceId: "owner_daily_ui_1", source: "owner_visual_harness" },
    recordedBy: "weixin_owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.evidence.evidenceKey, "ownerDailyUiEvidence");
  assert.equal(calls[0].type, "saveEvidence");
  assert.equal(calls[0].input.privacyClass, "summary_only");
  assert.equal(calls[0].input.checkKey, "owner_daily_ui_evidence");
  assert.equal(calls[0].input.evidence.summaryOnly, true);
  assert.equal(calls[0].input.evidence.writefulSchedulingAllowed, false);
});

test("automation release evidence service returns evidence bag for release-readiness", () => {
  const { service } = createService();
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { evidenceId: "owner_daily_ui_1", source: "owner_visual_harness" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "central_visual_evidence",
    evidence: { evidenceId: "central_visual_1", artifactId: "central_harness_artifact" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_review_evidence",
    evidence: { evidenceId: "owner_review_1", source: "owner_review_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "production_target_provisioning_smoke_evidence",
    evidence: { evidenceId: "target_provisioning_1", source: "target_provisioning_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "stage_checkpoint_controls_evidence",
    evidence: { evidenceId: "stage_controls_1", source: "stage_checkpoint_controls_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "release_workbench_smoke_evidence",
    evidence: { evidenceId: "release_workbench_1", source: "release_workbench_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "production_recommendation_lifecycle_smoke_evidence",
    evidence: { evidenceId: "recommendation_lifecycle_1", source: "recommendation_lifecycle_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_audit_ui_evidence",
    status: "blocked",
    evidence: { evidenceId: "owner_audit_blocked_1" }
  }));

  const bag = service.evidenceBag(scope());

  assert.equal(bag.ok, true);
  assert.deepEqual(bag.evidenceKeys, ["centralVisualEvidence", "ownerDailyUiEvidence", "ownerReviewEvidence", "productionRecommendationLifecycleSmokeEvidence", "productionTargetProvisioningSmokeEvidence", "releaseWorkbenchSmokeEvidence", "stageCheckpointControlsEvidence"]);
  assert.equal(bag.evidence.ownerDailyUiEvidence.ok, true);
  assert.equal(bag.evidence.ownerDailyUiEvidence.source, "owner_visual_harness");
  assert.equal(bag.evidence.centralVisualEvidence.artifactId, "central_harness_artifact");
  assert.equal(bag.evidence.ownerReviewEvidence.source, "owner_review_smoke");
  assert.equal(bag.evidence.productionRecommendationLifecycleSmokeEvidence.source, "recommendation_lifecycle_smoke");
  assert.equal(bag.evidence.productionTargetProvisioningSmokeEvidence.source, "target_provisioning_smoke");
  assert.equal(bag.evidence.stageCheckpointControlsEvidence.source, "stage_checkpoint_controls_smoke");
  assert.equal(bag.evidence.releaseWorkbenchSmokeEvidence.source, "release_workbench_smoke");
  assert.equal(bag.writefulSchedulingAllowed, false);
});

test("automation release evidence service rejects invalid evidence keys and privacy-risk payloads", () => {
  const { service } = createService();

  const invalid = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "unknown_evidence"
  }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "learning_automation_release_evidence_scope_required");

  const privacyKey = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "ownerDailyUiEvidence",
    rawPrompt: "do not store"
  }));
  assert.equal(privacyKey.ok, false);
  assert.equal(privacyKey.error, "learning_automation_release_evidence_privacy_failed");

  const privacyValue = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "ownerAuditUiEvidence",
    evidence: { artifactId: "/Users/hermes-dev/private-artifact.json" }
  }));
  assert.equal(privacyValue.ok, false);
  assert.equal(privacyValue.error, "learning_automation_release_evidence_privacy_failed");

  assert.equal(canonicalReleaseEvidenceKey("central_visual_evidence"), "centralVisualEvidence");
  assert.equal(canonicalReleaseEvidenceKey("owner_review_evidence"), "ownerReviewEvidence");
  assert.equal(canonicalReleaseEvidenceKey("production_recommendation_lifecycle_smoke_evidence"), "productionRecommendationLifecycleSmokeEvidence");
  assert.equal(canonicalReleaseEvidenceKey("stage_checkpoint_controls_evidence"), "stageCheckpointControlsEvidence");
  assert.equal(canonicalReleaseEvidenceKey("release_workbench_smoke_evidence"), "releaseWorkbenchSmokeEvidence");
});
