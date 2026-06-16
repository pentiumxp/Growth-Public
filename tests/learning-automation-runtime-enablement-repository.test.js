"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationRuntimeEnablementRepository
} = require("../src/stores/growth-learning-sqlite/automation-runtime-enablements");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-runtime-enablement-"));
  const dbPath = path.join(dir, "automation-runtime-enablements.sqlite3");
  const repository = createLearningAutomationRuntimeEnablementRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-16T10:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleEnablement(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    status: "ready_for_manual_runtime_config_enablement",
    enablementVersion: "growth.learningAutomationRuntimeEnablement.v1",
    summaryOnly: true,
    privacyClass: "summary_only",
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false,
    requestedActivationGates: ["writeful_execution"],
    requiredConfigKeys: ["automationWritefulExecutionEnabled"],
    currentConfig: {
      schemaVersion: "growth.learningAutomationRuntimeConfig.summary.v1",
      summaryOnly: true,
      disabledConfigKeys: ["automationWritefulExecutionEnabled"],
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false
    },
    activationSummary: {
      schemaVersion: "growth.learningAutomationRuntimeActivationReadback.v1",
      summaryOnly: true,
      activationRecordCount: 1,
      validGateCount: 1
    },
    enablementDecision: {
      schemaVersion: "growth.learningAutomationRuntimeEnablement.decision.v1",
      summaryOnly: true,
      decision: "ready_for_manual_runtime_config_enablement",
      recordOnly: true,
      advisoryOnly: true,
      configChangeApplied: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationRuntimeEnablement.evidence.v1",
      summaryOnly: true
    },
    requestedBy: "weixin_owner",
    recordedBy: "weixin_owner"
  }, overrides);
}

test("automation runtime enablement repository saves, lists, and de-duplicates summary-only records", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveEnablement(sampleEnablement());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.enablement.workspaceId, "weixin_fanfan");
    assert.equal(saved.enablement.collectionRunId, "lgacrn_ready_1");
    assert.equal(saved.enablement.status, "ready_for_manual_runtime_config_enablement");
    assert.equal(saved.enablement.enablementDecision.recordOnly, true);
    assert.equal(saved.enablement.currentConfig.configChangeApplied, false);
    assert.equal(saved.enablement.recordedBy, "weixin_owner");
    assert.equal(saved.enablement.recordedAt, "2026-06-16T10:00:00.000Z");
    assert.equal(saved.enablement.privacyClass, "summary_only");

    const duplicate = repository.saveEnablement(sampleEnablement({
      evidenceSummary: { evidenceId: "different" }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.enablement.enablementId, saved.enablement.enablementId);

    const listed = repository.listEnablements({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_manual_runtime_config_enablement",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].enablementId, saved.enablement.enablementId);
    assert.equal(JSON.stringify(listed[0]).includes("rawPrompt"), false);

    assert.deepEqual(repository.listEnablements({ workspaceId: "other_workspace" }), []);
  });
});

test("automation runtime enablement repository rejects privacy risks, runtime changes, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveEnablement(sampleEnablement({
      enablementDecision: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_runtime_enablement_privacy_failed");

    const privateValue = repository.saveEnablement(sampleEnablement({
      activationSummary: { artifact: "/Users/example/.homeai-qa/runtime.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_runtime_enablement_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.activationSummary.artifact"), true);

    const runtimeChange = repository.saveEnablement(sampleEnablement({
      configChangeApplied: true
    }));
    assert.equal(runtimeChange.ok, false);
    assert.equal(runtimeChange.error, "learning_automation_runtime_enablement_no_runtime_change_required");

    const invalidStatus = repository.saveEnablement(sampleEnablement({
      status: "config_enabled"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_runtime_enablement_status_invalid");

    const privateClass = repository.saveEnablement(sampleEnablement({
      status: "blocked",
      privacyClass: "private"
    }));
    assert.equal(privateClass.ok, false);
    assert.equal(privateClass.error, "learning_automation_runtime_enablement_privacy_class_required");
  });
});
