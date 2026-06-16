const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_PACKAGE_SCHEMA,
  createLearningAutomationReleasePackageService,
  scopeFrom
} = require("../src/services/learning-automation-release-package-service");

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
    createdAt: "2026-06-16T05:00:00.000Z",
    scope: scope(),
    evidence: {
      productionPlannerReadinessEvidence: { ok: true, status: "pass", evidenceId: "planner_ready" },
      productionSchedulerDryRunSmokeEvidence: { ok: true, status: "pass", evidenceId: "dry_run" }
    },
    releaseApproval: {
      writefulExecutionApproval: { approved: true, status: "approved" }
    },
    tasks: [{
      taskId: "planner_readiness",
      status: "pass",
      ok: true,
      evidenceKey: "productionPlannerReadinessEvidence"
    }, {
      taskId: "scheduler_dry_run",
      status: "pass",
      ok: true,
      evidenceKey: "productionSchedulerDryRunSmokeEvidence"
    }],
    summary: {
      taskCount: 2,
      passedCount: 2,
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
    missingRequired: [],
    audit: {
      defaultTaskCoverage: true,
      blockedRequiredTasks: [],
      missingRequiredEvidenceKeys: []
    }
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
      summaryOnly: true,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      requiredActions: []
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
    writefulSchedulingAllowed: false,
    runId: "lgacrn_ready_1",
    summary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    }
  }, overrides);
}

function controls(overrides = {}) {
  return Object.assign(scope(), {
    ok: true,
    source: "growth-learning-automation-release-controls-service",
    schemaVersion: "growth.learningAutomationReleaseControls.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "manual_runtime_config_required",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false,
    releaseControls: {
      schemaVersion: "growth.learningAutomationReleaseControls.summary.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      requiredActionCount: 1,
      nextAction: {
        key: "enable_runtime_config_manually",
        action: "perform_platform_runtime_config_enablement",
        requiredActor: "owner"
      }
    }
  }, overrides);
}

function dashboard(overrides = {}) {
  return Object.assign(scope(), {
    ok: true,
    source: "growth-learning-automation-release-dashboard-service",
    schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "manual_runtime_config_required",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false,
    releaseDashboard: {
      schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      readinessStatus: "ready_for_release_review",
      controlsStatus: "manual_runtime_config_required",
      inventoryStatus: "manual_runtime_config_required",
      requiredActionCount: 1,
      nextAction: {
        key: "enable_runtime_config_manually",
        action: "perform_platform_runtime_config_enablement",
        requiredActor: "owner"
      },
      readinessEvidencePresentCount: 2,
      readinessEvidenceMissingCount: 28,
      readinessEvidenceSourceBundleId: "lgerb_ready_1",
      latestReadinessSnapshotId: "lgrrs_ready_1",
      latestReadinessEvidencePresentCount: 1,
      latestReadinessEvidenceMissingCount: 29,
      latestReadinessEvidenceSourceBundleId: "lgerb_snapshot_1",
      latestCollectionRunId: "lgacrn_ready_1",
      latestPackageId: "lgapkg_ready_1",
      missingRecordKinds: ["runtime_enablement"],
      missingCheckKeys: ["runtime_enablement"],
      missingEvidenceKeys: ["scheduler_worker_target_ui"],
      persistedApprovalKeys: ["writefulExecutionApproval"],
      persistedEvidenceKeys: ["ownerReviewEvidence"],
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    }
  }, overrides);
}

function serviceWith(records = {}) {
  const bundleValue = records.bundle || bundle();
  const auditValue = records.audit || audit();
  const readinessValue = records.readiness || readiness();
  const collectionValue = records.collectionRun || collectionRun();
  const controlsValue = records.controls || controls();
  const dashboardValue = records.dashboard || dashboard();
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
  return createLearningAutomationReleasePackageService({
    now: () => new Date("2026-06-16T05:00:00.000Z"),
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
    releaseControlsService: {
      summarize(input) {
        records.controlsInput = input;
        return controlsValue;
      }
    },
    releaseDashboardService: {
      dashboard(input) {
        records.dashboardInput = input;
        return dashboardValue;
      }
    }
  });
}

test("release package service composes bundle, audit, readiness, collection run, controls, and dashboard", () => {
  const records = {};
  const result = serviceWith(records).buildPackage(Object.assign(scope(), {
    tasks: ["planner_readiness", "scheduler_dry_run"],
    requiredTaskIds: ["planner_readiness", "scheduler_dry_run"],
    activationGates: ["writeful_execution"],
    requestedBy: "owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.package.schemaVersion, RELEASE_PACKAGE_SCHEMA);
  assert.equal(result.package.privacyClass, "summary_only");
  assert.equal(result.package.summaryOnly, true);
  assert.equal(result.package.status, "ready_for_release_review");
  assert.equal(result.package.writefulSchedulingAllowed, false);
  assert.equal(result.package.runtimeConfigChange, false);
  assert.equal(result.package.configChangeApplied, false);
  assert.equal(result.package.schedulerPermissionGranted, false);
  assert.deepEqual(result.package.steps.map((step) => step.key), [
    "release_evidence_bundle",
    "release_evidence_bundle_audit",
    "release_readiness",
    "release_collection_run",
    "release_controls",
    "release_dashboard"
  ]);
  assert.equal(result.package.summary.stepCount, 6);
  assert.equal(result.package.summary.collectionRunId, "lgacrn_ready_1");
  assert.equal(records.auditInput.bundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(records.readinessInput.evidence.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
  assert.equal(records.readinessInput.evidence.productionPlannerReadinessEvidence.evidenceId, "planner_ready");
  assert.equal(records.readinessInput.releaseApproval.writefulExecutionApproval.status, "approved");
  assert.equal(records.collectionInput.releaseReadiness.schemaVersion, "growth.learningAutomationReleaseReadiness.v1");
  assert.equal(records.controlsInput.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(records.controlsInput.activationGates, ["writeful_execution"]);
  assert.equal(records.dashboardInput.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(records.dashboardInput.activationGates, ["writeful_execution"]);
  assert.equal(result.package.artifacts.releaseDashboard.schemaVersion, "growth.learningAutomationReleaseDashboard.v1");
  assert.equal(result.package.steps[5].requiredActionCount, 1);
  assert.equal(result.package.steps[5].nextActionKey, "enable_runtime_config_manually");
  assert.equal(JSON.stringify(result.package).includes("stdout"), false);
});

test("release package service keeps blocked release evidence explicit without opening scheduling", () => {
  const blockedBundle = bundle({
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
  });
  const result = serviceWith({
    bundle: blockedBundle,
    audit: audit({
      ok: false,
      status: "blocked",
      readyForReleaseEvidence: false,
      missingRequired: ["passing_required_bundle_tasks"]
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
      },
      releaseReview: {
        summaryOnly: true,
        missingCheckKeys: ["production_planner_readiness_evidence"],
        blockedCheckKeys: [],
        missingEvidenceKeys: ["productionPlannerReadinessEvidence"],
        requiredActionCount: 1
      }
    }),
    collectionRun: collectionRun({
      status: "blocked",
      readyForReleaseReview: false
    }),
    controls: controls({
      status: "release_evidence_required",
      releaseControls: {
        summaryOnly: true,
        status: "release_evidence_required",
        requiredActionCount: 1,
        nextAction: { key: "collect_release_evidence" }
      }
    })
  }).buildPackage(scope());

  assert.equal(result.ok, false);
  assert.equal(result.package.status, "blocked");
  assert.equal(result.package.steps[0].status, "blocked");
  assert.equal(result.package.steps[1].status, "blocked");
  assert.equal(result.package.summary.blockedCount >= 1, true);
  assert.equal(result.package.writefulSchedulingAllowed, false);
  assert.equal(result.package.artifacts.releaseControls.status, "release_evidence_required");
  assert.equal(result.package.artifacts.releaseDashboard.status, "manual_runtime_config_required");
});

test("release package service rejects private paths in generated artifacts", () => {
  const result = serviceWith({
    bundle: bundle({
      evidence: {
        productionPlannerReadinessEvidence: {
          ok: true,
          status: "pass",
          detail: "/Users/xuxin/.homeai-qa/private.json"
        }
      }
    })
  }).buildPackage(scope());

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_package_privacy_failed");
  assert.deepEqual(result.privateValueFindings, ["$.artifacts.releaseEvidenceBundle.evidence.productionPlannerReadinessEvidence.detail"]);
});

test("release package service requires explicit allow-write before recording collection run", () => {
  const blocked = serviceWith().buildPackage(Object.assign(scope(), {
    writeCollectionRun: true
  }));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_package_write_not_allowed");
  assert.equal(blocked.requiredFlag, "--allow-write");

  const records = {};
  const written = serviceWith(records).buildPackage(Object.assign(scope(), {
    writeCollectionRun: true,
    allowWritePackage: true
  }));
  assert.equal(written.ok, true);
  assert.equal(records.collectionRecordInput.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(written.package.summary.collectionRunWritten, true);
  assert.equal(written.package.summary.collectionRunId, "lgacrn_written_1");
});

test("release package service fails closed when write mode has no collection record boundary", () => {
  const result = serviceWith({ omitRecordRun: true }).buildPackage(Object.assign(scope(), {
    writeCollectionRun: true,
    allowWritePackage: true
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_package_collection_run_record_unavailable");
});

test("release package service records summary-only package records behind explicit write gate", () => {
  const packageResult = serviceWith().buildPackage(Object.assign(scope(), {
    tasks: ["planner_readiness"],
    requiredTaskIds: ["planner_readiness"],
    requestedBy: "owner"
  }));
  const calls = {};
  const service = createLearningAutomationReleasePackageService({
    repository: {
      savePackage(input) {
        calls.saved = input;
        return {
          ok: true,
          duplicate: false,
          package: Object.assign({}, input, {
            packageId: "lgapkg_saved_1"
          })
        };
      },
      listPackages(input) {
        calls.listed = input;
        return [{
          packageId: "lgapkg_saved_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: input.status || "blocked"
        }];
      }
    }
  });

  const denied = service.recordPackage(Object.assign(scope(), {
    releasePackage: packageResult.package
  }));
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "release_package_write_not_allowed");

  const saved = service.recordPackage(Object.assign(scope(), {
    releasePackage: packageResult.package,
    allowWritePackage: true,
    requestedBy: "owner"
  }));
  assert.equal(saved.ok, true);
  assert.equal(saved.package.packageId, "lgapkg_saved_1");
  assert.equal(calls.saved.privacyClass, "summary_only");
  assert.equal(calls.saved.summaryOnly, true);
  assert.equal(calls.saved.packageSummary.writefulSchedulingAllowed, false);
  assert.equal(calls.saved.stepSummary.stepCount, 6);
  assert.equal(calls.saved.releaseControlsSummary.runtimeConfigChange, false);
  assert.equal(calls.saved.releaseDashboardSummary.status, "manual_runtime_config_required");
  assert.equal(calls.saved.releaseDashboardSummary.nextAction.key, "enable_runtime_config_manually");
  assert.equal(calls.saved.releaseDashboardSummary.readinessEvidencePresentCount, 2);
  assert.equal(calls.saved.releaseDashboardSummary.readinessEvidenceMissingCount, 28);
  assert.equal(calls.saved.releaseDashboardSummary.readinessEvidenceSourceBundleId, "lgerb_ready_1");
  assert.equal(calls.saved.releaseDashboardSummary.latestReadinessEvidencePresentCount, 1);
  assert.equal(calls.saved.releaseDashboardSummary.latestReadinessEvidenceMissingCount, 29);
  assert.equal(calls.saved.releaseDashboardSummary.latestReadinessEvidenceSourceBundleId, "lgerb_snapshot_1");
  assert.deepEqual(calls.saved.releaseDashboardSummary.persistedEvidenceKeys, ["ownerReviewEvidence"]);
  assert.equal(JSON.stringify(calls.saved).includes("artifacts"), false);
  assert.equal(JSON.stringify(calls.saved).includes("productionPlannerReadinessEvidence"), false);

  const listed = service.listPackages(Object.assign(scope(), {
    status: "ready_for_release_review",
    limit: 5
  }));
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(calls.listed.status, "ready_for_release_review");
});

test("release package service rejects invalid package record artifacts", () => {
  const service = createLearningAutomationReleasePackageService({
    repository: {
      savePackage() {
        throw new Error("unexpected save");
      },
      listPackages() {
        return [];
      }
    }
  });

  const missing = service.recordPackage(Object.assign(scope(), {
    allowWritePackage: true
  }));
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "release_package_artifact_required");

  const invalidSchema = service.recordPackage(Object.assign(scope(), {
    allowWritePackage: true,
    releasePackage: {
      schemaVersion: "growth.other.v1",
      privacyClass: "summary_only",
      summaryOnly: true
    }
  }));
  assert.equal(invalidSchema.ok, false);
  assert.equal(invalidSchema.error, "release_package_schema_invalid");

  const invalidPrivacy = service.recordPackage(Object.assign(scope(), {
    allowWritePackage: true,
    releasePackage: {
      schemaVersion: RELEASE_PACKAGE_SCHEMA,
      privacyClass: "raw_private",
      summaryOnly: false
    }
  }));
  assert.equal(invalidPrivacy.ok, false);
  assert.equal(invalidPrivacy.error, "release_package_privacy_class_required");
});

test("release package scope normalization remains bounded", () => {
  assert.deepEqual(scopeFrom({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science"
  }), scope());
});
