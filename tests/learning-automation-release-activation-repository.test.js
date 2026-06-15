const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseActivationRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-activations");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-activation-"));
  const dbPath = path.join(dir, "automation-release-activations.sqlite3");
  const repository = createLearningAutomationReleaseActivationRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-16T08:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleActivation(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    status: "ready_for_owner_config_enablement",
    activationVersion: "growth.learningAutomationReleaseActivation.v1",
    summaryOnly: true,
    privacyClass: "summary_only",
    configChangeApplied: false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    requestedActivationGates: ["writeful_execution", "background_scheduler"],
    requiredApprovalKeys: ["writefulExecutionApproval", "backgroundSchedulerApproval"],
    missingApprovalKeys: [],
    releaseClosure: {
      schemaVersion: "growth.learningAutomationReleaseClosure.v1",
      summaryOnly: true,
      privacyClass: "summary_only",
      status: "ready_for_owner_release_activation"
    },
    activationGates: [{
      key: "writeful_execution",
      readyForEnablement: true,
      currentEnabled: false
    }],
    activationPreflight: {
      schemaVersion: "growth.learningAutomationReleaseActivation.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_config_enablement",
      preflightPassed: true,
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    activationDecision: {
      schemaVersion: "growth.learningAutomationReleaseActivation.decision.v1",
      summaryOnly: true,
      decision: "approved_for_config_enablement",
      recordOnly: true,
      configChangeApplied: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationReleaseActivation.evidence.v1",
      summaryOnly: true
    },
    requestedBy: "weixin_owner",
    recordedBy: "weixin_owner"
  }, overrides);
}

test("automation release activation repository saves, lists, and de-duplicates summary-only records", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveActivation(sampleActivation());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.activation.workspaceId, "weixin_fanfan");
    assert.equal(saved.activation.collectionRunId, "lgacrn_ready_1");
    assert.equal(saved.activation.status, "ready_for_owner_config_enablement");
    assert.equal(saved.activation.activationDecision.summaryOnly, true);
    assert.equal(saved.activation.activationPreflight.configChangeApplied, false);
    assert.equal(saved.activation.recordedBy, "weixin_owner");
    assert.equal(saved.activation.recordedAt, "2026-06-16T08:30:00.000Z");
    assert.equal(saved.activation.privacyClass, "summary_only");

    const duplicate = repository.saveActivation(sampleActivation({
      evidenceSummary: { evidenceId: "different" }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.activation.activationId, saved.activation.activationId);
    assert.equal(duplicate.activation.evidenceSummary.schemaVersion, "growth.learningAutomationReleaseActivation.evidence.v1");

    const listed = repository.listActivations({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_owner_config_enablement",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].activationId, saved.activation.activationId);
    assert.equal(JSON.stringify(listed[0]).includes("rawPrompt"), false);

    assert.deepEqual(repository.listActivations({ workspaceId: "other_workspace" }), []);
  });
});

test("automation release activation repository rejects privacy risks, runtime changes, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveActivation(sampleActivation({
      activationDecision: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_activation_privacy_failed");

    const privateValue = repository.saveActivation(sampleActivation({
      releaseClosure: { artifact: "/Users/xuxin/.homeai-qa/release.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_activation_privacy_failed");

    const runtimeChange = repository.saveActivation(sampleActivation({
      configChangeApplied: true
    }));
    assert.equal(runtimeChange.ok, false);
    assert.equal(runtimeChange.error, "learning_automation_release_activation_no_runtime_change_required");

    const invalidStatus = repository.saveActivation(sampleActivation({
      status: "config_enabled"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_activation_status_invalid");

    const privateClass = repository.saveActivation(sampleActivation({
      status: "blocked",
      privacyClass: "private"
    }));
    assert.equal(privateClass.ok, false);
    assert.equal(privateClass.error, "learning_automation_release_activation_privacy_class_required");
  });
});

test("automation release activation repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    db.exec(`
      CREATE TABLE learning_growth_automation_release_activations (
        activation_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'blocked',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.close();

    const result = repository.saveActivation(sampleActivation({ status: "approval_required" }));
    assert.equal(result.ok, true);
    assert.equal(result.activation.programId, "program_science");
    assert.equal(result.activation.activationPreflight.summaryOnly, true);
  });
});
