const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_COLLECTION_RUN_SCHEMA,
  createLearningAutomationReleaseCollectionRunService
} = require("../src/services/learning-automation-release-collection-run-service");

function sampleBundle(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: "2026-06-15T18:30:00.000Z",
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan"
    },
    tasks: [{
      taskId: "planner_readiness",
      status: "pass",
      evidenceKey: "productionPlannerReadinessEvidence",
      commandName: "npm run smoke:planner-readiness"
    }, {
      taskId: "scheduler_dry_run",
      status: "pass",
      evidenceKey: "productionSchedulerDryRunSmokeEvidence",
      commandName: "npm run smoke:scheduler-dry-run"
    }],
    evidence: {
      productionPlannerReadinessEvidence: { ok: true },
      productionSchedulerDryRunSmokeEvidence: { ok: true }
    },
    releaseApproval: {
      writefulExecutionApproval: { approved: true }
    },
    summary: {
      taskCount: 2,
      passedCount: 2,
      blockedCount: 0
    }
  }, overrides);
}

function sampleAudit(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pass",
    readyForReleaseEvidence: true,
    bundle: {
      taskCount: 2,
      passedCount: 2,
      blockedCount: 0
    },
    audit: {
      defaultTaskCoverage: true,
      requiredTaskCount: 2,
      missingRequiredTasks: [],
      unknownRequiredTasks: [],
      blockedRequiredTasks: [],
      missingRequiredEvidenceKeys: []
    },
    missingRequired: []
  }, overrides);
}

function sampleReadiness(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-automation-release-readiness-service",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    checks: [{
      key: "release_evidence_bundle_audit",
      status: "pass"
    }, {
      key: "production_scheduler_dry_run",
      status: "pass"
    }],
    evidence: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.evidence.v1",
      summaryOnly: true,
      externalEvidenceKeys: ["releaseEvidenceBundleAudit", "productionSchedulerDryRunSmokeEvidence"]
    },
    summary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      requiredActions: [],
      persistedApprovalKeys: ["writefulExecutionApproval"]
    }
  }, overrides);
}

test("release collection run service evaluates and records summary-only release runs", () => {
  const calls = [];
  const service = createLearningAutomationReleaseCollectionRunService({
    repository: {
      saveRun(input) {
        calls.push(input);
        return {
          ok: true,
          duplicate: false,
          run: Object.assign({ runId: "lgacrn_1" }, input)
        };
      }
    }
  });

  const evaluated = service.evaluateRun({
    releaseEvidenceBundle: sampleBundle(),
    releaseEvidenceBundleAudit: sampleAudit(),
    releaseReadiness: sampleReadiness(),
    releaseEvidenceBundleFile: "/Users/xuxin/.homeai-qa/release-bundle.json",
    releaseEvidenceBundleAuditFile: "/Users/xuxin/.homeai-qa/release-audit.json",
    releaseReadinessFile: "/Users/xuxin/.homeai-qa/release-readiness.json",
    createdBy: "weixin_owner",
    createdAt: "2026-06-15T18:45:00.000Z"
  });

  assert.equal(evaluated.ok, true);
  assert.equal(evaluated.schemaVersion, RELEASE_COLLECTION_RUN_SCHEMA);
  assert.equal(evaluated.status, "ready_for_release_review");
  assert.equal(evaluated.writefulSchedulingAllowed, false);
  assert.equal(evaluated.summary.artifactFileNames.bundle, "release-bundle.json");
  assert.equal(JSON.stringify(evaluated).includes("/Users/xuxin/.homeai-qa"), false);
  assert.equal(evaluated.bundleSummary.tasks.length, 2);
  assert.equal(evaluated.auditSummary.defaultTaskCoverage, true);
  assert.deepEqual(evaluated.readinessSummary.persistedApprovalKeys, ["writefulExecutionApproval"]);

  const recorded = service.recordRun({
    releaseEvidenceBundle: sampleBundle(),
    releaseEvidenceBundleAudit: sampleAudit(),
    releaseReadiness: sampleReadiness()
  });

  assert.equal(recorded.ok, true);
  assert.equal(recorded.run.runId, "lgacrn_1");
  assert.equal(calls[0].privacyClass, "summary_only");
});

test("release collection run service persists blocked evidence runs without opening scheduling", () => {
  const service = createLearningAutomationReleaseCollectionRunService();
  const evaluated = service.evaluateRun({
    releaseEvidenceBundle: sampleBundle({
      tasks: [{
        taskId: "planner_readiness",
        status: "blocked",
        evidenceKey: "productionPlannerReadinessEvidence"
      }],
      summary: {
        taskCount: 1,
        passedCount: 0,
        blockedCount: 1
      }
    }),
    releaseEvidenceBundleAudit: sampleAudit({
      ok: false,
      status: "blocked",
      readyForReleaseEvidence: false,
      bundle: {
        taskCount: 1,
        passedCount: 0,
        blockedCount: 1
      },
      audit: {
        defaultTaskCoverage: false,
        requiredTaskCount: 2,
        blockedRequiredTasks: ["planner_readiness"],
        missingRequiredEvidenceKeys: ["productionPlannerReadinessEvidence"]
      },
      missingRequired: ["passing_required_bundle_tasks"]
    }),
    releaseReadiness: sampleReadiness({
      status: "incomplete",
      summary: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
        summaryOnly: true,
        status: "incomplete",
        readyForReleaseReview: false,
        writefulSchedulingAllowed: false
      },
      releaseReview: {
        summaryOnly: true,
        advisoryOnly: true,
        missingCheckKeys: ["owner_daily_ui_evidence"],
        blockedCheckKeys: [],
        missingEvidenceKeys: ["ownerDailyUiEvidence"],
        requiredActionCount: 1,
        nextAction: { key: "complete_owner_daily_ui_visual_validation", label: "Owner UI evidence" }
      }
    })
  });

  assert.equal(evaluated.ok, true);
  assert.equal(evaluated.status, "blocked");
  assert.equal(evaluated.readyForReleaseReview, false);
  assert.equal(evaluated.writefulSchedulingAllowed, false);
  assert.deepEqual(evaluated.auditSummary.blockedRequiredTasks, ["planner_readiness"]);
  assert.deepEqual(evaluated.releaseReview.missingEvidenceKeys, ["ownerDailyUiEvidence"]);
});

test("release collection run service rejects invalid artifacts and privacy-risk payloads", () => {
  const service = createLearningAutomationReleaseCollectionRunService();

  const missing = service.evaluateRun({
    workspaceId: "weixin_fanfan",
    releaseEvidenceBundle: sampleBundle(),
    releaseEvidenceBundleAudit: sampleAudit()
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_release_collection_run_invalid");
  assert.equal(missing.missingRequired.includes("release_readiness"), true);

  const schema = service.evaluateRun({
    releaseEvidenceBundle: sampleBundle({ schemaVersion: "old" }),
    releaseEvidenceBundleAudit: sampleAudit(),
    releaseReadiness: sampleReadiness()
  });
  assert.equal(schema.ok, false);
  assert.equal(schema.missingRequired.includes("release_evidence_bundle_schema"), true);

  const privacyKey = service.evaluateRun({
    releaseEvidenceBundle: sampleBundle({ evidence: { rawPrompt: "do not store" } }),
    releaseEvidenceBundleAudit: sampleAudit(),
    releaseReadiness: sampleReadiness()
  });
  assert.equal(privacyKey.ok, false);
  assert.equal(privacyKey.error, "learning_automation_release_collection_run_privacy_failed");

  const privateValue = service.evaluateRun({
    releaseEvidenceBundle: sampleBundle({ evidence: { safe: "/Users/xuxin/.homeai-qa/private.json" } }),
    releaseEvidenceBundleAudit: sampleAudit(),
    releaseReadiness: sampleReadiness()
  });
  assert.equal(privateValue.ok, false);
  assert.equal(privateValue.privateValueFindings.includes("$.releaseEvidenceBundle.evidence.safe"), true);
});
