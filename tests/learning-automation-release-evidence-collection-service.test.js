const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_EVIDENCE_COLLECTION_SCHEMA,
  createLearningAutomationReleaseEvidenceCollectionService
} = require("../src/services/learning-automation-release-evidence-collection-service");
const {
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

function bundle(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: "2026-06-16T07:00:00.000Z",
    scope: scope(),
    evidence: {
      productionPlannerReadinessEvidence: {
        ok: true,
        status: "pass",
        evidenceId: "planner_ready"
      }
    },
    releaseApproval: {
      writefulExecutionApproval: {
        approved: true,
        status: "approved"
      }
    },
    tasks: [{
      taskId: "planner_readiness",
      status: "pass",
      ok: true,
      evidenceKey: "productionPlannerReadinessEvidence"
    }],
    summary: {
      taskCount: 1,
      passedCount: 1,
      blockedCount: 0,
      failedTaskIds: []
    }
  }, overrides);
}

function audit(overrides = {}) {
  return Object.assign(scope(), {
    ok: true,
    source: "growth-learning-automation-release-evidence-bundle-audit-service",
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "pass",
    readyForReleaseEvidence: true,
    missingRequired: []
  }, overrides);
}

function readiness(overrides = {}) {
  return Object.assign(scope(), {
    ok: true,
    source: "growth-learning-automation-release-readiness-service",
    schemaVersion: "growth.learningAutomationReleaseReadiness.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    writefulSchedulingAllowed: false,
    summary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      summaryOnly: true,
      requiredActionCount: 0,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: []
    }
  }, overrides);
}

function collectionRun(overrides = {}) {
  return Object.assign(scope(), {
    ok: true,
    source: "growth-learning-automation-release-collection-run-service",
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    runId: "lgacrn_ready_1",
    writefulSchedulingAllowed: false,
    summary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
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
      domEvidencePresent: true,
      screenshotArtifactName: "growth-release-package-review.png",
      coverage: spec.requiredCoverage,
      requiredCoverage: spec.requiredCoverage,
      missingCoverage: [],
      assertionCount: 2,
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

function releaseEvidenceServiceWithRows(rows = []) {
  return createLearningAutomationReleaseEvidenceService({
    uiEvidenceService: createLearningAutomationUiEvidenceService(),
    repository: {
      saveEvidence(input) {
        const evidence = Object.assign({
          evidenceRecordId: `lgarev_${rows.length + 1}`,
          status: input.status || input.evidence?.status || "pass",
          observedAt: input.observedAt || "2026-06-16T07:00:00.000Z"
        }, input);
        rows.push(evidence);
        return { ok: true, duplicate: false, evidence };
      },
      listEvidence(input) {
        return rows.filter((row) => {
          if (input.status && row.status !== input.status) return false;
          if (input.evidenceKey && row.evidenceKey !== input.evidenceKey) return false;
          return true;
        });
      }
    }
  });
}

function serviceWith(records = {}) {
  const bundleValue = records.bundle || bundle();
  const auditValue = records.audit || audit();
  const readinessValue = records.readiness || readiness();
  const collectionValue = records.collectionRun || collectionRun();
  const releaseCollectionRunService = {
    evaluateRun(input) {
      records.collectionInput = input;
      return collectionValue;
    }
  };
  if (!records.omitRecordRun) {
    releaseCollectionRunService.recordRun = function recordRun(input) {
      records.collectionRecordInput = input;
      return {
        ok: true,
        run: collectionRun({ runId: "lgacrn_written_1" }),
        evaluated: collectionValue
      };
    };
  }
  const releaseEvidenceService = records.releaseEvidenceService || (records.omitRecordEvidenceService ? null : {
    recordEvidence(input) {
      records.releaseEvidenceRecordInputs = records.releaseEvidenceRecordInputs || [];
      records.releaseEvidenceRecordInputs.push(input);
      if (typeof records.recordEvidenceResult === "function") {
        return records.recordEvidenceResult(input);
      }
      return {
        ok: true,
        duplicate: Boolean(records.duplicateEvidenceRecords),
        evidence: {
          evidenceRecordId: `lgarev_${input.evidenceKey}`,
          evidenceKey: input.evidenceKey,
          status: input.status || "pass",
          evidence: input.evidence,
          observedAt: input.observedAt
        }
      };
    }
  });
  return createLearningAutomationReleaseEvidenceCollectionService({
    now: () => new Date("2026-06-16T07:00:00.000Z"),
    evidenceBundleService: {
      buildBundle(input) {
        records.bundleInput = input;
        return records.bundleResult || {
          ok: bundleValue.summary.blockedCount === 0,
          bundle: bundleValue,
          summary: bundleValue.summary
        };
      }
    },
    evidenceBundleAuditService: {
      evaluate(input) {
        records.auditInput = input;
        return auditValue;
      }
    },
    releaseReadinessService: {
      evaluateReadiness(input) {
        records.readinessInput = input;
        return readinessValue;
      }
    },
    releaseCollectionRunService,
    releaseEvidenceService
  });
}

test("release evidence collection service composes bundle, audit, readiness, and collection run", () => {
  const records = {};
  const result = serviceWith(records).collect(Object.assign(scope(), {
    tasks: ["planner_readiness"],
    requiredTaskIds: ["planner_readiness"],
    requestedBy: "owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.collection.schemaVersion, RELEASE_EVIDENCE_COLLECTION_SCHEMA);
  assert.equal(result.collection.privacyClass, "summary_only");
  assert.equal(result.collection.summaryOnly, true);
  assert.equal(result.collection.status, "ready_for_release_review");
  assert.equal(result.collection.writefulSchedulingAllowed, false);
  assert.equal(result.collection.runtimeConfigChange, false);
  assert.equal(result.collection.configChangeApplied, false);
  assert.equal(result.collection.schedulerPermissionGranted, false);
  assert.deepEqual(result.collection.steps.map((step) => step.key), [
    "release_evidence_bundle",
    "release_evidence_bundle_audit",
    "release_readiness",
    "release_collection_run"
  ]);
  assert.equal(result.collection.summary.stepCount, 4);
  assert.equal(result.collection.summary.collectionRunWritten, false);
  assert.equal(records.auditInput.bundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(records.readinessInput.evidence.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
  assert.equal(records.readinessInput.evidence.productionPlannerReadinessEvidence.evidenceId, "planner_ready");
  assert.equal(records.readinessInput.releaseApproval.writefulExecutionApproval.status, "approved");
  assert.equal(records.collectionInput.releaseReadiness.schemaVersion, "growth.learningAutomationReleaseReadiness.v1");
  assert.equal(records.releaseEvidenceRecordInputs, undefined);
  assert.equal(JSON.stringify(result.collection).includes("stdout"), false);
});

test("release evidence collection service gates collection-run writes", () => {
  const denied = serviceWith().collect(Object.assign(scope(), {
    writeCollectionRun: true
  }));
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "release_evidence_collection_write_not_allowed");
  assert.equal(denied.requiredFlag, "--allow-write");

  const records = {};
  const written = serviceWith(records).collect(Object.assign(scope(), {
    writeCollectionRun: true,
    allowWriteCollection: true
  }));
  assert.equal(written.ok, true);
  assert.equal(records.collectionRecordInput.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(written.collection.summary.collectionRunWritten, true);
  assert.equal(written.collection.summary.collectionRunId, "lgacrn_written_1");
});

test("release evidence collection service gates release evidence record writes", () => {
  const denied = serviceWith().collect(Object.assign(scope(), {
    writeReleaseEvidenceRecords: true
  }));
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "release_evidence_collection_write_not_allowed");
  assert.equal(denied.writeReleaseEvidenceRecords, true);

  const records = {};
  const written = serviceWith(records).collect(Object.assign(scope(), {
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    allowWriteCollection: true,
    requestedBy: "owner"
  }));

  assert.equal(written.ok, true);
  assert.equal(written.collection.writeReleaseEvidenceRecords, true);
  assert.deepEqual(written.collection.steps.map((step) => step.key), [
    "release_evidence_bundle",
    "release_evidence_bundle_audit",
    "release_readiness",
    "release_collection_run",
    "release_evidence_records"
  ]);
  assert.deepEqual(records.releaseEvidenceRecordInputs.map((input) => input.evidenceKey), [
    "productionPlannerReadinessEvidence",
    "releaseEvidenceBundleAudit"
  ]);
  assert.equal(records.releaseEvidenceRecordInputs[0].workspaceId, "weixin_fanfan");
  assert.equal(records.releaseEvidenceRecordInputs[0].collectionRunId, "lgacrn_written_1");
  assert.equal(records.releaseEvidenceRecordInputs[0].evidence.privacyClass, "summary_only");
  assert.equal(records.releaseEvidenceRecordInputs[0].evidence.summaryOnly, true);
  assert.equal(records.releaseEvidenceRecordInputs[1].evidence.readyForReleaseEvidence, true);
  assert.equal(written.collection.artifacts.releaseEvidenceRecords.status, "pass");
  assert.equal(written.collection.summary.releaseEvidenceRecordsWritten, true);
  assert.equal(written.collection.summary.releaseEvidenceRecordAttemptedCount, 2);
  assert.equal(written.collection.summary.releaseEvidenceRecordRecordedCount, 2);
  assert.equal(written.collection.summary.releaseEvidenceRecordBlockedCount, 0);
  assert.deepEqual(written.collection.artifacts.releaseEvidenceRecords.evidenceKeys, [
    "productionPlannerReadinessEvidence",
    "releaseEvidenceBundleAudit"
  ]);
});

test("release evidence collection service preserves UI evidence fields for persisted release evidence records", () => {
  const rows = [];
  const releaseEvidenceService = releaseEvidenceServiceWithRows(rows);
  const result = serviceWith({
    releaseEvidenceService,
    bundle: bundle({
      evidence: {
        releasePackageReviewUiEvidence: validReleasePackageReviewUiEvidence()
      },
      tasks: [{
        taskId: "release_package_review_ui",
        status: "pass",
        ok: true,
        evidenceKey: "releasePackageReviewUiEvidence"
      }],
      summary: {
        taskCount: 1,
        passedCount: 1,
        blockedCount: 0,
        failedTaskIds: []
      }
    })
  }).collect(Object.assign(scope(), {
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    allowWriteCollection: true,
    requestedBy: "owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.collection.artifacts.releaseEvidenceRecords.status, "pass");
  assert.deepEqual(result.collection.artifacts.releaseEvidenceRecords.evidenceKeys, [
    "releaseEvidenceBundleAudit",
    "releasePackageReviewUiEvidence"
  ]);
  const uiRow = rows.find((row) => row.evidenceKey === "releasePackageReviewUiEvidence");
  assert.ok(uiRow);
  assert.equal(uiRow.checkKey, "release_package_review_ui_evidence");
  assert.equal(uiRow.evidence.schemaVersion, "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1");
  assert.equal(uiRow.evidence.validationSchemaVersion, "growth.learningAutomationUiEvidence.v1");
  assert.equal(uiRow.evidence.validatedBy, "learning-automation-ui-evidence-service");
  assert.equal(uiRow.evidence.uiGate, "release_package_review");
  assert.equal(uiRow.evidence.readyForReleaseEvidence, true);
  assert.equal(uiRow.evidence.uiEvidence.evidenceKey, "releasePackageReviewUiEvidence");
  assert.equal(uiRow.evidence.uiEvidence.checkKey, "release_package_review_ui_evidence");
  assert.equal(uiRow.evidence.uiEvidence.screenshotArtifactName, "growth-release-package-review.png");
  assert.deepEqual(uiRow.evidence.uiEvidence.coverage, [
    "package_candidate_build",
    "package_candidate_status",
    "record_package_action"
  ]);
  assert.deepEqual(uiRow.evidence.uiEvidence.missingCoverage, []);
  assert.equal(uiRow.evidence.uiEvidenceBoundary.homeAiOwnsVisualHarness, true);
  assert.equal(uiRow.evidence.writefulSchedulingAllowed, false);
});

test("release evidence collection service strips transient evidence file inputs after bundle collection", () => {
  const records = {};
  const result = serviceWith(records).collect(Object.assign(scope(), {
    centralVisualEvidenceFile: "/Users/xuxin/.homeai-qa/artifacts/central-visual.json",
    releasePackageReviewUiEvidenceFile: "/Users/xuxin/.homeai-qa/artifacts/release-package-ui.json",
    evidence: {
      centralVisualEvidenceFile: "/Users/xuxin/.homeai-qa/artifacts/nested-central-visual.json"
    },
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    allowWriteCollection: true,
    requestedBy: "owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(records.bundleInput.centralVisualEvidenceFile, "/Users/xuxin/.homeai-qa/artifacts/central-visual.json");
  assert.equal(records.bundleInput.releasePackageReviewUiEvidenceFile, "/Users/xuxin/.homeai-qa/artifacts/release-package-ui.json");
  assert.equal(records.bundleInput.evidence.centralVisualEvidenceFile, "/Users/xuxin/.homeai-qa/artifacts/nested-central-visual.json");
  assert.equal(records.auditInput.centralVisualEvidenceFile, undefined);
  assert.equal(records.auditInput.releasePackageReviewUiEvidenceFile, undefined);
  assert.equal(records.readinessInput.centralVisualEvidenceFile, undefined);
  assert.equal(records.readinessInput.releasePackageReviewUiEvidenceFile, undefined);
  assert.equal(records.readinessInput.evidence.centralVisualEvidenceFile, undefined);
  assert.equal(records.collectionRecordInput.centralVisualEvidenceFile, undefined);
  assert.equal(records.collectionRecordInput.releasePackageReviewUiEvidenceFile, undefined);
  assert.equal(records.releaseEvidenceRecordInputs[0].centralVisualEvidenceFile, undefined);
  assert.equal(records.releaseEvidenceRecordInputs[0].releasePackageReviewUiEvidenceFile, undefined);
  assert.equal(JSON.stringify(records.readinessInput).includes(".homeai-qa"), false);
  assert.equal(JSON.stringify(records.collectionRecordInput).includes(".homeai-qa"), false);
});

test("release evidence collection service surfaces release evidence record failures", () => {
  const records = {
    recordEvidenceResult(input) {
      if (input.evidenceKey === "releaseEvidenceBundleAudit") {
        return { ok: false, error: "release_evidence_record_rejected" };
      }
      return {
        ok: true,
        evidence: {
          evidenceRecordId: `lgarev_${input.evidenceKey}`,
          evidenceKey: input.evidenceKey,
          status: "pass",
          evidence: input.evidence
        }
      };
    }
  };
  const result = serviceWith(records).collect(Object.assign(scope(), {
    writeReleaseEvidenceRecords: true,
    allowWriteCollection: true
  }));

  assert.equal(result.ok, false);
  assert.equal(result.collection.status, "blocked");
  assert.equal(result.collection.artifacts.releaseEvidenceRecords.status, "blocked");
  assert.equal(result.collection.artifacts.releaseEvidenceRecords.blockedCount, 1);
  assert.deepEqual(result.collection.artifacts.releaseEvidenceRecords.errors, [{
    evidenceKey: "releaseEvidenceBundleAudit",
    error: "release_evidence_record_rejected"
  }]);
});

test("release evidence collection service fails closed without record boundary", () => {
  const result = serviceWith({ omitRecordRun: true }).collect(Object.assign(scope(), {
    writeCollectionRun: true,
    allowWriteCollection: true
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_collection_run_record_unavailable");
});

test("release evidence collection service fails closed without release evidence record boundary", () => {
  const result = serviceWith({ omitRecordEvidenceService: true }).collect(Object.assign(scope(), {
    writeReleaseEvidenceRecords: true,
    allowWriteCollection: true
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_collection_record_service_unavailable");
});

test("release evidence collection service keeps blocked collection evidence explicit", () => {
  const result = serviceWith({
    bundle: bundle({
      evidence: {
        productionPlannerReadinessEvidence: {
          ok: false,
          status: "blocked",
          error: "planner_not_ready"
        }
      },
      tasks: [{
        taskId: "planner_readiness",
        status: "blocked",
        ok: false,
        evidenceKey: "productionPlannerReadinessEvidence"
      }],
      summary: {
        taskCount: 1,
        passedCount: 0,
        blockedCount: 1,
        failedTaskIds: ["planner_readiness"]
      }
    }),
    audit: audit({
      ok: false,
      status: "blocked",
      readyForReleaseEvidence: false
    }),
    readiness: readiness({
      status: "incomplete",
      readyForReleaseReview: false,
      summary: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
        summaryOnly: true,
        status: "incomplete",
        readyForReleaseReview: false,
        writefulSchedulingAllowed: false
      }
    }),
    collectionRun: collectionRun({
      status: "blocked",
      readyForReleaseReview: false
    })
  }).collect(scope());

  assert.equal(result.ok, false);
  assert.equal(result.collection.status, "blocked");
  assert.equal(result.collection.steps[0].status, "blocked");
  assert.equal(result.collection.summary.blockedCount >= 1, true);
  assert.equal(result.collection.writefulSchedulingAllowed, false);
});

test("release evidence collection service rejects privacy-risk input and artifacts", () => {
  const inputPrivacy = serviceWith().collect(Object.assign(scope(), {
    rawPrompt: "do not store"
  }));
  assert.equal(inputPrivacy.ok, false);
  assert.equal(inputPrivacy.error, "release_evidence_collection_privacy_failed");

  const artifactPrivacy = serviceWith({
    bundle: bundle({
      evidence: {
        productionPlannerReadinessEvidence: {
          ok: true,
          status: "pass",
          detail: "/Users/xuxin/.homeai-qa/private.json"
        }
      }
    })
  }).collect(scope());
  assert.equal(artifactPrivacy.ok, false);
  assert.equal(artifactPrivacy.error, "release_evidence_collection_privacy_failed");
});

test("release evidence collection service reports missing dependencies", () => {
  const result = createLearningAutomationReleaseEvidenceCollectionService().collect(scope());
  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_collection_bundle_service_unavailable");
});
