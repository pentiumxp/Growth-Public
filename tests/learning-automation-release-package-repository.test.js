const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleasePackageRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-packages");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-packages-"));
  const dbPath = path.join(dir, "automation-release-packages.sqlite3");
  const repository = createLearningAutomationReleasePackageRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-16T07:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function samplePackage(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    schemaVersion: "growth.learningAutomationReleasePackage.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_for_release_review",
    packageSummary: {
      schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      collectionRunId: "lgacrn_ready_1",
      writefulSchedulingAllowed: false
    },
    stepSummary: {
      schemaVersion: "growth.learningAutomationReleasePackage.stepSummary.v1",
      summaryOnly: true,
      stepCount: 6,
      passedCount: 6,
      blockedCount: 0
    },
    releaseEvidenceBundleSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      summaryOnly: true,
      taskCount: 18,
      passedCount: 18
    },
    releaseEvidenceBundleAuditSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
      summaryOnly: true,
      status: "pass",
      readyForReleaseEvidence: true
    },
    releaseReadinessSummary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseCollectionRunSummary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      readyForReleaseReview: true
    },
    releaseControlsSummary: {
      schemaVersion: "growth.learningAutomationReleaseControls.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    releaseDashboardSummary: {
      schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
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
      missingRecordKinds: ["runtime_enablement"],
      missingCheckKeys: ["runtime_enablement"],
      persistedApprovalKeys: ["writefulExecutionApproval"],
      persistedEvidenceKeys: ["ownerReviewEvidence"],
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      requiredActionCount: 0
    },
    createdBy: "weixin_owner",
    createdAt: "2026-06-16T07:00:00.000Z"
  }, overrides);
}

test("automation release package repository saves and lists summary-only package records", () => {
  withRepository(({ repository }) => {
    const saved = repository.savePackage(samplePackage());

    assert.equal(saved.ok, true);
    assert.equal(saved.package.status, "ready_for_release_review");
    assert.equal(saved.package.privacyClass, "summary_only");
    assert.equal(saved.package.collectionRunId, "lgacrn_ready_1");
    assert.equal(saved.package.packageSummary.writefulSchedulingAllowed, false);
    assert.equal(saved.package.releaseControlsSummary.runtimeConfigChange, false);
    assert.equal(saved.package.releaseDashboardSummary.runtimeConfigChange, false);
    assert.equal(saved.package.releaseDashboardSummary.nextAction.key, "enable_runtime_config_manually");
    assert.equal(saved.package.releaseDashboardSummary.readinessEvidencePresentCount, 2);
    assert.equal(saved.package.releaseDashboardSummary.readinessEvidenceMissingCount, 28);
    assert.equal(saved.package.releaseDashboardSummary.latestReadinessEvidenceMissingCount, 29);
    assert.deepEqual(saved.package.releaseDashboardSummary.persistedEvidenceKeys, ["ownerReviewEvidence"]);
    assert.equal(JSON.stringify(saved.package).includes("/Users/"), false);

    const duplicate = repository.savePackage(samplePackage());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.package.packageId, saved.package.packageId);

    const listed = repository.listPackages({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_release_review",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].packageId, saved.package.packageId);
    assert.equal(listed[0].stepSummary.stepCount, 6);
    assert.equal(listed[0].releaseDashboardSummary.status, "manual_runtime_config_required");
    assert.equal(listed[0].releaseDashboardSummary.readinessEvidenceSourceBundleId, "lgerb_ready_1");
    assert.equal(listed[0].releaseDashboardSummary.latestReadinessEvidenceSourceBundleId, "lgerb_snapshot_1");
  });
});

test("automation release package repository rejects privacy risks, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.savePackage(samplePackage({
      releaseReadinessSummary: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_package_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.releaseReadinessSummary.rawPrompt"), true);

    const privateValue = repository.savePackage(samplePackage({
      releaseEvidenceBundleSummary: { artifactFileName: "/Users/example/.homeai-qa/release-bundle.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_package_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.releaseEvidenceBundleSummary.artifactFileName"), true);

    const privacyClass = repository.savePackage(samplePackage({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_release_package_privacy_class_required");

    const invalidStatus = repository.savePackage(samplePackage({
      status: "enabled"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_package_status_invalid");
  });
});

test("automation release package repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_release_packages (
          package_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'blocked',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.savePackage(samplePackage({
      packageId: "lgapkg_migrated_1"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.package.packageId, "lgapkg_migrated_1");
    assert.equal(saved.package.packageVersion, "growth.learningAutomationReleasePackage.v1");
    assert.equal(saved.package.releaseControlsSummary.runtimeConfigChange, false);
    assert.equal(saved.package.releaseDashboardSummary.runtimeConfigChange, false);
  });
});
