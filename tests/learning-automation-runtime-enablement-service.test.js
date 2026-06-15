"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationRuntimeEnablementService
} = require("../src/services/learning-automation-runtime-enablement-service");

function activationRecord(overrides = {}) {
  return Object.assign({
    activationId: "lgaract_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_owner_config_enablement",
    activationVersion: "growth.learningAutomationReleaseActivation.v1",
    privacyClass: "summary_only",
    requestedActivationGates: ["writeful_execution"],
    activationGates: [{
      key: "writeful_execution",
      readyForEnablement: true,
      currentEnabled: false
    }],
    activationPreflight: {
      schemaVersion: "growth.learningAutomationReleaseActivation.summary.v1",
      summaryOnly: true,
      preflightPassed: true,
      configChangeApplied: false,
      runtimeConfigChange: false,
      writefulSchedulingAllowed: false
    },
    activationDecision: {
      schemaVersion: "growth.learningAutomationReleaseActivation.decision.v1",
      summaryOnly: true,
      preflightPassed: true,
      decision: "approved_for_config_enablement",
      recordOnly: true,
      advisoryOnly: true,
      configChangeApplied: false,
      runtimeConfigChange: false,
      writefulSchedulingAllowed: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationReleaseActivation.evidence.v1",
      summaryOnly: true,
      preflightPassed: true
    }
  }, overrides);
}

function serviceWith(records = [], config = {}, repository = null, capture = {}) {
  return createLearningAutomationRuntimeEnablementService({
    config,
    repository,
    releaseActivationService: {
      listActivations(input) {
        capture.input = input;
        return {
          ok: true,
          count: records.length,
          activations: records
        };
      }
    }
  });
}

test("runtime enablement requires a valid release activation audit record before manual config enablement", () => {
  const capture = {};
  const result = serviceWith([], {
    automationWritefulExecutionEnabled: false
  }, null, capture).evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGate: "writeful_execution"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationRuntimeEnablement.v1");
  assert.equal(result.status, "activation_record_required");
  assert.equal(result.runtimeConfigVerified, false);
  assert.equal(result.readyForManualRuntimeConfigEnablement, false);
  assert.equal(result.runtimeEnablement.nextAction.action, "record_release_activation");
  assert.deepEqual(capture.input.activationGates, ["writeful_execution"]);
  assert.equal(result.configChangeApplied, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
});

test("runtime enablement reports ready-for-manual-config when activation readback is valid but config remains disabled", () => {
  const result = serviceWith([activationRecord()], {
    automationWritefulExecutionEnabled: false
  }).evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGate: "writeful_execution"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_manual_runtime_config_enablement");
  assert.equal(result.activationSummary.validGateCount, 1);
  assert.deepEqual(result.currentConfig.disabledConfigKeys, ["automationWritefulExecutionEnabled"]);
  assert.equal(result.readyForManualRuntimeConfigEnablement, true);
  assert.equal(result.runtimeConfigVerified, false);
  assert.equal(result.runtimeEnablement.nextAction.action, "enable_runtime_config_outside_growth");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.backgroundSchedulingAllowed, false);
  assert.equal(result.backgroundWorkerAllowed, false);
});

test("runtime enablement verifies enabled config through readback without granting scheduler permission", () => {
  const result = serviceWith([activationRecord({
    status: "already_enabled",
    activationGates: [{
      key: "writeful_execution",
      readyForEnablement: false,
      currentEnabled: true
    }]
  })], {
    automationWritefulExecutionEnabled: true
  }).evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGate: "writeful_execution"
  });

  assert.equal(result.status, "verified_enabled");
  assert.equal(result.runtimeConfigVerified, true);
  assert.equal(result.readyForManualRuntimeConfigEnablement, false);
  assert.deepEqual(result.currentConfig.enabledConfigKeys, ["automationWritefulExecutionEnabled"]);
  assert.equal(result.runtimeEnablement.nextAction.action, "monitor_scheduler_execution_release_readback");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
});

test("runtime enablement rejects invalid activation records, privacy-risk input, and invalid gates", () => {
  const invalidRecord = serviceWith([activationRecord({
    status: "blocked"
  })]).evaluate({
    workspaceId: "weixin_fanfan",
    activationGate: "writeful_execution"
  });
  assert.equal(invalidRecord.ok, true);
  assert.equal(invalidRecord.status, "activation_record_invalid");
  assert.deepEqual(invalidRecord.activationSummary.missingActivationGates, ["writeful_execution"]);

  const privacy = serviceWith([]).evaluate({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_runtime_enablement_privacy_failed");

  const invalidGate = serviceWith([]).evaluate({
    workspaceId: "weixin_fanfan",
    activationGate: "unknown_gate"
  });
  assert.equal(invalidGate.ok, false);
  assert.equal(invalidGate.error, "learning_automation_runtime_enablement_gate_invalid");
  assert.deepEqual(invalidGate.invalidActivationGates, ["unknown_gate"]);
});

test("runtime enablement service records summary-only enablement audit records through repository", () => {
  const saved = [];
  const service = serviceWith([activationRecord()], {
    automationWritefulExecutionEnabled: false
  }, {
    saveEnablement(input) {
      saved.push(input);
      return {
        ok: true,
        duplicate: false,
        enablement: Object.assign({ enablementId: "lgrten_1" }, input)
      };
    },
    listEnablements(input) {
      return saved.filter((item) => item.workspaceId === input.workspaceId);
    }
  });

  const recorded = service.recordEnablement({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGate: "writeful_execution",
    note: "Owner will apply runtime config outside Growth.",
    requestedBy: "weixin_owner",
    recordedBy: "weixin_owner",
    recordedAt: "2026-06-16T10:15:00.000Z"
  });

  assert.equal(recorded.ok, true);
  assert.equal(recorded.enablement.enablementId, "lgrten_1");
  assert.equal(recorded.enablement.enablementDecision.recordOnly, true);
  assert.equal(recorded.enablement.enablementDecision.advisoryOnly, true);
  assert.equal(recorded.enablement.configChangeApplied, false);
  assert.equal(recorded.enablement.runtimeConfigMutationPerformed, false);
  assert.equal(saved[0].privacyClass, "summary_only");
  assert.equal(saved[0].summaryOnly, true);
  assert.equal(saved[0].status, "ready_for_manual_runtime_config_enablement");

  const listed = service.listEnablements({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan"
  });
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listed.enablements[0].status, "ready_for_manual_runtime_config_enablement");
});
