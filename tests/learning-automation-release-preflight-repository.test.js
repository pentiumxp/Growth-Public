"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleasePreflightReportRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-preflight-reports");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-preflight-"));
  const dbPath = path.join(dir, "automation-release-preflight.sqlite3");
  const repository = createLearningAutomationReleasePreflightReportRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-17T10:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleReport(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    status: "ready_for_owner_release_activation",
    privacyClass: "summary_only",
    summary: {
      schemaVersion: "growth.learningAutomationReleasePreflight.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_release_activation",
      readyForProductionDeploy: false,
      readyForProductionDeployReview: true,
      writefulSchedulingAllowed: false
    },
    releasePreflight: {
      schemaVersion: "growth.learningAutomationReleasePreflight.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_release_activation",
      readyForProductionDeploy: false,
      readyForProductionDeployReview: true,
      writefulSchedulingAllowed: false
    },
    releaseDashboard: {
      schemaVersion: "growth.learningAutomationReleasePreflight.dashboardSummary.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required"
    },
    releaseWorkbench: {
      schemaVersion: "growth.learningAutomationReleasePreflight.workbenchSummary.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required"
    },
    releaseClosure: {
      schemaVersion: "growth.learningAutomationReleasePreflight.closureSummary.v1",
      summaryOnly: true,
      status: "ready_for_owner_release_activation"
    },
    createdBy: "owner",
    createdAt: "2026-06-17T10:00:00.000Z"
  }, overrides);
}

test("automation release preflight repository saves and lists summary-only reports", () => {
  withRepository(({ repository }) => {
    const saved = repository.recordReport(sampleReport());

    assert.equal(saved.ok, true);
    assert.equal(saved.report.status, "ready_for_owner_release_activation");
    assert.equal(saved.report.privacyClass, "summary_only");
    assert.equal(saved.report.releasePreflight.readyForProductionDeploy, false);
    assert.equal(saved.report.releasePreflight.readyForProductionDeployReview, true);
    assert.equal(JSON.stringify(saved.report).includes("/Users/"), false);

    const duplicate = repository.recordReport(sampleReport());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.report.preflightReportId, saved.report.preflightReportId);

    const listed = repository.listReports({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_owner_release_activation",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].preflightReportId, saved.report.preflightReportId);
    assert.equal(listed[0].summary.writefulSchedulingAllowed, false);
  });
});

test("automation release preflight repository filters by collection run id", () => {
  withRepository(({ repository }) => {
    repository.recordReport(sampleReport({
      collectionRunId: "lgacrn_old",
      createdAt: "2026-06-17T10:00:00.000Z"
    }));
    repository.recordReport(sampleReport({
      collectionRunId: "lgacrn_new",
      createdAt: "2026-06-17T10:01:00.000Z"
    }));

    const requested = repository.listReports({
      workspaceId: "weixin_fanfan",
      collectionRunId: "lgacrn_old",
      limit: 5
    });
    assert.equal(requested.length, 1);
    assert.equal(requested[0].collectionRunId, "lgacrn_old");
  });
});

test("automation release preflight repository rejects privacy risks, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.recordReport(sampleReport({
      releasePreflight: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_preflight_report_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.releasePreflight.rawPrompt"), true);

    const privateValue = repository.recordReport(sampleReport({
      releaseDashboard: { artifactFileName: "/Users/example/.homeai-qa/release-dashboard.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_preflight_report_privacy_failed");
    assert.equal(privateValue.privacyFindings.includes("$.releaseDashboard.artifactFileName"), true);

    const privacyClass = repository.recordReport(sampleReport({ privacyClass: "raw_private" }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_release_preflight_report_privacy_class_required");

    const invalidStatus = repository.recordReport(sampleReport({ status: "shipping_now" }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_preflight_report_status_invalid");
  });
});
