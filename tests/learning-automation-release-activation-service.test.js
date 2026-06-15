"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationReleaseActivationService
} = require("../src/services/learning-automation-release-activation-service");

function readyClosure(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseClosure.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    advisoryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_owner_release_activation",
    backendEvidenceComplete: true,
    readyForOwnerReleaseActivation: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    releaseClosure: {
      schemaVersion: "growth.learningAutomationReleaseClosure.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_release_activation",
      backendEvidenceComplete: true,
      readyForOwnerReleaseActivation: true,
      missingApprovalKeys: [],
      requiredActionCount: 0,
      requiredActions: [],
      nextAction: null,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    }
  }, overrides);
}

function serviceWith(records = {}, config = {}, repository = null) {
  return createLearningAutomationReleaseActivationService({
    config,
    repository,
    releaseClosureService: {
      summarize(input) {
        records.input = input;
        return records.closure || readyClosure();
      }
    }
  });
}

test("release activation preflight identifies disabled runtime gates that are ready for Owner config enablement", () => {
  const records = {};
  const service = serviceWith(records, {
    automationWritefulExecutionEnabled: false,
    automationBackgroundSchedulerEnabled: false,
    automationBackgroundWorkerEnabled: false
  });

  const result = service.preflight({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGates: ["writeful_execution", "background_scheduler"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseActivation.v1");
  assert.equal(result.status, "ready_for_owner_config_enablement");
  assert.equal(result.preflightPassed, true);
  assert.equal(result.readyForOwnerRuntimeConfigDecision, true);
  assert.equal(result.activationAllowed, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.configChangeApplied, false);
  assert.deepEqual(result.requestedActivationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(records.input.requiredApprovalKeys, [
    "writefulExecutionApproval",
    "backgroundSchedulerApproval"
  ]);
  assert.deepEqual(result.activationPreflight.nextAction.configKeys, [
    "automationWritefulExecutionEnabled",
    "automationBackgroundSchedulerEnabled"
  ]);
});

test("release activation preflight reports already enabled gates without applying config changes", () => {
  const result = serviceWith({}, {
    automationWritefulExecutionEnabled: true
  }).preflight({
    workspaceId: "weixin_fanfan",
    activationGate: "writeful_execution"
  });

  assert.equal(result.status, "already_enabled");
  assert.equal(result.preflightPassed, true);
  assert.equal(result.readyForOwnerRuntimeConfigDecision, false);
  assert.equal(result.activationAllowed, false);
  assert.equal(result.activationGates[0].alreadyEnabled, true);
  assert.equal(result.activationPreflight.nextAction.key, "monitor_release_execution_readback");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
});

test("release activation preflight surfaces approval and closure gaps", () => {
  const result = serviceWith({
    closure: readyClosure({
      status: "approval_required",
      backendEvidenceComplete: false,
      readyForOwnerReleaseActivation: false,
      releaseClosure: {
        schemaVersion: "growth.learningAutomationReleaseClosure.summary.v1",
        summaryOnly: true,
        status: "approval_required",
        backendEvidenceComplete: false,
        readyForOwnerReleaseActivation: false,
        missingApprovalKeys: ["backgroundSchedulerApproval"],
        requiredActionCount: 1,
        requiredActions: [{
          key: "record_backgroundSchedulerApproval",
          action: "record_release_approval",
          requiredActor: "owner"
        }],
        nextAction: {
          key: "record_backgroundSchedulerApproval",
          action: "record_release_approval",
          requiredActor: "owner"
        }
      }
    })
  }).preflight({
    workspaceId: "weixin_fanfan",
    activationGate: "background_scheduler"
  });

  assert.equal(result.status, "approval_required");
  assert.equal(result.preflightPassed, false);
  assert.equal(result.readyForOwnerRuntimeConfigDecision, false);
  assert.deepEqual(result.missingApprovalKeys, ["backgroundSchedulerApproval"]);
  assert.equal(result.activationPreflight.nextAction.key, "record_backgroundSchedulerApproval");
});

test("release activation preflight rejects privacy-risk input, invalid gates, and unsafe closure boundaries", () => {
  const privacy = serviceWith().preflight({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_activation_privacy_failed");

  const invalidGate = serviceWith().preflight({
    workspaceId: "weixin_fanfan",
    activationGate: "unknown_gate"
  });
  assert.equal(invalidGate.ok, false);
  assert.equal(invalidGate.error, "learning_automation_release_activation_gate_invalid");
  assert.deepEqual(invalidGate.invalidActivationGates, ["unknown_gate"]);

  const unsafeClosure = serviceWith({
    closure: readyClosure({
      writefulSchedulingAllowed: true
    })
  }).preflight({ workspaceId: "weixin_fanfan" });
  assert.equal(unsafeClosure.ok, true);
  assert.equal(unsafeClosure.status, "blocked");
  assert.equal(unsafeClosure.preflightPassed, false);

  const missingClosure = createLearningAutomationReleaseActivationService({}).preflight({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(missingClosure.ok, false);
  assert.equal(missingClosure.error, "learning_automation_release_activation_closure_unavailable");
});

test("release activation service records summary-only activation audit records through repository", () => {
  const saved = [];
  const records = {};
  const service = serviceWith(records, {
    automationWritefulExecutionEnabled: false
  }, {
    saveActivation(input) {
      saved.push(input);
      return {
        ok: true,
        duplicate: false,
        activation: Object.assign({ activationId: "lgaract_1" }, input)
      };
    },
    listActivations(input) {
      return saved.filter((item) => item.workspaceId === input.workspaceId);
    }
  });

  const recorded = service.recordActivation({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    activationGate: "writeful_execution",
    note: "Owner reviewed closure evidence.",
    requestedBy: "weixin_owner",
    recordedBy: "weixin_owner",
    recordedAt: "2026-06-16T08:45:00.000Z"
  });

  assert.equal(recorded.ok, true);
  assert.equal(recorded.activation.activationId, "lgaract_1");
  assert.equal(recorded.activation.activationDecision.decision, "approved_for_config_enablement");
  assert.equal(recorded.activation.activationDecision.recordOnly, true);
  assert.equal(recorded.activation.configChangeApplied, false);
  assert.equal(recorded.activation.writefulSchedulingAllowed, false);
  assert.equal(recorded.activation.runtimeConfigChange, false);
  assert.equal(saved[0].privacyClass, "summary_only");
  assert.equal(saved[0].summaryOnly, true);
  assert.equal(saved[0].activationPreflight.preflightPassed, true);

  const listed = service.listActivations({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan"
  });
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listed.activations[0].workspaceId, "weixin_fanfan");
});

test("release activation service requires repository for record and list operations", () => {
  const service = serviceWith();
  const recorded = service.recordActivation({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(recorded.ok, false);
  assert.equal(recorded.error, "learning_automation_release_activation_repository_unavailable");

  const listed = service.listActivations({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(listed.ok, false);
  assert.equal(listed.error, "learning_automation_release_activation_repository_unavailable");
});
