const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalReleaseEvidenceKey,
  createLearningAutomationReleaseEvidenceService
} = require("../src/services/learning-automation-release-evidence-service");
const {
  UI_GATE_SPECS,
  createLearningAutomationUiEvidenceService
} = require("../src/services/learning-automation-ui-evidence-service");

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

function createService(options = {}) {
  const rows = [];
  const calls = [];
  const service = createLearningAutomationReleaseEvidenceService({
    uiEvidenceService: options.uiEvidenceService,
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

function validOwnerDailyUiEvidence(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      checkKey: "owner_daily_ui_evidence",
      uiGate: "owner_daily",
      status: "pass",
      route: "/?embed=hermes#generate",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: "growth-owner-daily.png",
      coverage: UI_GATE_SPECS.ownerDailyUiEvidence.requiredCoverage,
      requiredCoverage: UI_GATE_SPECS.ownerDailyUiEvidence.requiredCoverage,
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  }, overrides);
}

function validReleasePackageReviewUiEvidence(overrides = {}) {
  const spec = UI_GATE_SPECS.releasePackageReviewUiEvidence;
  return Object.assign({
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "releasePackageReviewUiEvidence",
    checkKey: spec.checkKey,
    uiGate: spec.uiGate,
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "releasePackageReviewUiEvidence",
      checkKey: spec.checkKey,
      uiGate: spec.uiGate,
      status: "pass",
      route: "/?embed=hermes#generate",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: "growth-release-package-review.png",
      coverage: spec.requiredCoverage,
      requiredCoverage: spec.requiredCoverage,
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  }, overrides);
}

test("automation release evidence service canonicalizes release evidence keys and records non-UI summary-only evidence", () => {
  const { calls, service } = createService();

  const result = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "central_visual_evidence",
    evidence: { evidenceId: "central_visual_1", source: "central_visual_harness" },
    recordedBy: "weixin_owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.evidence.evidenceKey, "centralVisualEvidence");
  assert.equal(calls[0].type, "saveEvidence");
  assert.equal(calls[0].input.privacyClass, "summary_only");
  assert.equal(calls[0].input.checkKey, "central_visual_evidence");
  assert.equal(calls[0].input.evidence.summaryOnly, true);
  assert.equal(calls[0].input.evidence.writefulSchedulingAllowed, false);
});

test("automation release evidence service requires UI validator before pass UI evidence persists", () => {
  const withoutValidator = createService();
  const unavailable = withoutValidator.service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: validOwnerDailyUiEvidence()
  }));
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.error, "learning_automation_release_evidence_ui_validator_unavailable");
  assert.equal(withoutValidator.calls.length, 0);

  const withValidator = createService({
    uiEvidenceService: createLearningAutomationUiEvidenceService()
  });
  const invalid = withValidator.service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { ok: true, evidenceKey: "ownerDailyUiEvidence" }
  }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "learning_automation_release_evidence_ui_validation_failed");
  assert.ok(invalid.missingRequired.includes("required_ui_coverage"));
  assert.equal(withValidator.calls.length, 0);
});

test("automation release evidence service saves pass UI evidence only after validator acceptance", () => {
  const { calls, service } = createService({
    uiEvidenceService: createLearningAutomationUiEvidenceService()
  });

  const result = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: validOwnerDailyUiEvidence(),
    recordedBy: "weixin_owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.evidence.evidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.evidence.evidence.schemaVersion, "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1");
  assert.equal(result.evidence.evidence.validatedBy, "learning-automation-ui-evidence-service");
  assert.equal(result.evidence.evidence.validationSchemaVersion, "growth.learningAutomationUiEvidence.v1");
  assert.equal(result.evidence.evidence.readyForReleaseEvidence, true);
  assert.equal(result.evidence.evidence.uiEvidence.screenshotArtifactName, "growth-owner-daily.png");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.evidence.validatedBy, "learning-automation-ui-evidence-service");
  assert.equal(JSON.stringify(calls[0].input.evidence).includes("/Users/"), false);
});

test("automation release evidence service can record blocked UI evidence without making it a pass gate", () => {
  const { service } = createService();
  const result = service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_audit_ui_evidence",
    status: "blocked",
    evidence: { evidenceId: "owner_audit_blocked_1", status: "blocked" }
  }));

  assert.equal(result.ok, true);
  assert.equal(result.evidence.status, "blocked");
  assert.equal(result.evidence.evidence.ok, false);
  assert.equal(result.evidence.evidence.uiValidationRequiredForPass, true);

  const bag = service.evidenceBag(scope());
  assert.equal(bag.ok, true);
  assert.equal(bag.evidence.ownerAuditUiEvidence, undefined);
});

test("automation release evidence service returns evidence bag for release-readiness", () => {
  const { service } = createService({
    uiEvidenceService: createLearningAutomationUiEvidenceService()
  });
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_daily_ui_evidence",
    evidence: validOwnerDailyUiEvidence()
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "central_visual_evidence",
    evidence: { evidenceId: "central_visual_1", artifactId: "central_harness_artifact" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_review_evidence",
    evidence: {
      evidenceId: "owner_review_1",
      source: "owner_review_smoke",
      ownerReviewStageSummary: {
        acceptedProposalCount: 1,
        reviewedDigestCount: 1,
        deliveredHandoffCount: 1,
        publishedSchedulerExecutionCount: 1,
        completedSchedulerRunCount: 1,
        passedGateCount: 7,
        missingGateCount: 2,
        missingGateKeys: ["digest_owner_review_present"],
        nextAction: {
          key: "digest_owner_review_present",
          action: "review_automation_digest",
          requiredActor: "owner"
        }
      }
    }
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
    evidenceKey: "release_package_review_ui_evidence",
    evidence: validReleasePackageReviewUiEvidence()
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "production_recommendation_lifecycle_smoke_evidence",
    evidence: { evidenceId: "recommendation_lifecycle_1", source: "recommendation_lifecycle_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "production_operating_loop_history_smoke_evidence",
    evidence: { evidenceId: "operating_loop_history_1", source: "operating_loop_history_smoke" }
  }));
  service.recordEvidence(Object.assign(scope(), {
    evidenceKey: "owner_audit_ui_evidence",
    status: "blocked",
    evidence: { evidenceId: "owner_audit_blocked_1" }
  }));

  const bag = service.evidenceBag(scope());

  assert.equal(bag.ok, true);
  assert.deepEqual(bag.evidenceKeys, ["centralVisualEvidence", "ownerDailyUiEvidence", "ownerReviewEvidence", "productionOperatingLoopHistorySmokeEvidence", "productionRecommendationLifecycleSmokeEvidence", "productionTargetProvisioningSmokeEvidence", "releasePackageReviewUiEvidence", "releaseWorkbenchSmokeEvidence", "stageCheckpointControlsEvidence"]);
  assert.equal(bag.evidence.ownerDailyUiEvidence.ok, true);
  assert.equal(bag.evidence.ownerDailyUiEvidence.source, "growth-learning-automation-ui-evidence-service");
  assert.equal(bag.evidence.ownerDailyUiEvidence.schemaVersion, "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1");
  assert.equal(bag.evidence.ownerDailyUiEvidence.validationSchemaVersion, "growth.learningAutomationUiEvidence.v1");
  assert.equal(bag.evidence.ownerDailyUiEvidence.validatedBy, "learning-automation-ui-evidence-service");
  assert.equal(bag.evidence.ownerDailyUiEvidence.readyForReleaseEvidence, true);
  assert.deepEqual(bag.evidence.ownerDailyUiEvidence.uiEvidence.missingCoverage, []);
  assert.equal(bag.evidence.ownerDailyUiEvidence.uiEvidence.failedAssertionCount, 0);
  assert.equal(bag.evidence.centralVisualEvidence.schemaVersion, "growth.learningAutomationReleaseEvidenceRecord.evidence.v1");
  assert.equal(bag.evidence.centralVisualEvidence.privacyClass, "summary_only");
  assert.equal(bag.evidence.centralVisualEvidence.summaryOnly, true);
  assert.equal(bag.evidence.centralVisualEvidence.evidenceKey, "centralVisualEvidence");
  assert.equal(bag.evidence.centralVisualEvidence.checkKey, "central_visual_evidence");
  assert.equal(bag.evidence.centralVisualEvidence.ok, true);
  assert.equal(bag.evidence.centralVisualEvidence.present, true);
  assert.equal(bag.evidence.centralVisualEvidence.artifactId, "central_harness_artifact");
  assert.equal(bag.evidence.releaseWorkbenchSmokeEvidence.summaryOnly, true);
  assert.equal(bag.evidence.releaseWorkbenchSmokeEvidence.privacyClass, "summary_only");
  assert.equal(bag.evidence.releaseWorkbenchSmokeEvidence.checkKey, "release_workbench_smoke_evidence");
  assert.equal(bag.evidence.releasePackageReviewUiEvidence.evidenceKey, "releasePackageReviewUiEvidence");
  assert.equal(bag.evidence.releasePackageReviewUiEvidence.checkKey, "release_package_review_ui_evidence");
  assert.equal(bag.evidence.releasePackageReviewUiEvidence.uiGate, "release_package_review");
  assert.equal(bag.evidence.releasePackageReviewUiEvidence.readyForReleaseEvidence, true);
  assert.equal(bag.evidence.ownerReviewEvidence.source, "owner_review_smoke");
  assert.equal(bag.evidence.ownerReviewEvidence.ownerReviewStageSummary.acceptedProposalCount, 1);
  assert.equal(bag.evidence.ownerReviewEvidence.ownerReviewStageSummary.deliveredHandoffCount, 1);
  assert.equal(bag.evidence.ownerReviewEvidence.ownerReviewStageSummary.passedGateCount, 7);
  assert.deepEqual(bag.evidence.ownerReviewEvidence.ownerReviewStageSummary.missingGateKeys, ["digest_owner_review_present"]);
  assert.equal(bag.evidence.ownerReviewEvidence.ownerReviewStageSummary.nextAction.action, "review_automation_digest");
  assert.equal(bag.evidence.productionRecommendationLifecycleSmokeEvidence.source, "recommendation_lifecycle_smoke");
  assert.equal(bag.evidence.productionOperatingLoopHistorySmokeEvidence.source, "operating_loop_history_smoke");
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
  assert.equal(canonicalReleaseEvidenceKey("production_operating_loop_history_smoke_evidence"), "productionOperatingLoopHistorySmokeEvidence");
  assert.equal(canonicalReleaseEvidenceKey("production_recommendation_lifecycle_smoke_evidence"), "productionRecommendationLifecycleSmokeEvidence");
  assert.equal(canonicalReleaseEvidenceKey("stage_checkpoint_controls_evidence"), "stageCheckpointControlsEvidence");
  assert.equal(canonicalReleaseEvidenceKey("release_workbench_smoke_evidence"), "releaseWorkbenchSmokeEvidence");
});
