const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_EVIDENCE_COLLECTION_SCHEMA,
  createLearningAutomationReleaseEvidenceCollectionService
} = require("../src/services/learning-automation-release-evidence-collection-service");

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
    releaseCollectionRunService
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

test("release evidence collection service fails closed without record boundary", () => {
  const result = serviceWith({ omitRecordRun: true }).collect(Object.assign(scope(), {
    writeCollectionRun: true,
    allowWriteCollection: true
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_collection_run_record_unavailable");
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
