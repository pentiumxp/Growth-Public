"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationReleaseControlsService
} = require("../src/services/learning-automation-release-controls-service");

function readiness(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseReadiness.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    requiredActionCount: 0,
    writefulSchedulingAllowed: false
  }, overrides);
}

function review(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseReview.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "approved",
    approvedForReleaseReview: true,
    latestCollectionRun: {
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_release_review"
    },
    latestDecision: {
      decisionId: "lgard_approved_1",
      status: "approved"
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReview.summary.v1",
      summaryOnly: true,
      status: "approved",
      requiredActionCount: 0,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: []
    },
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  }, overrides);
}

function closure(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseClosure.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_owner_release_activation",
    backendEvidenceComplete: true,
    readyForOwnerReleaseActivation: true,
    releaseClosure: {
      schemaVersion: "growth.learningAutomationReleaseClosure.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_release_activation",
      requiredActionCount: 0,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      missingApprovalKeys: []
    },
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  }, overrides);
}

function activation(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseActivation.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_owner_config_enablement",
    preflightPassed: true,
    readyForOwnerRuntimeConfigDecision: true,
    requestedActivationGates: ["writeful_execution"],
    missingApprovalKeys: [],
    activationPreflight: {
      schemaVersion: "growth.learningAutomationReleaseActivation.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_config_enablement",
      requiredActionCount: 1,
      requiredActions: [{
        key: "enable_automation_runtime_config",
        action: "enable_runtime_config_gates_after_owner_decision",
        requiredActor: "owner"
      }],
      nextAction: {
        key: "enable_automation_runtime_config",
        action: "enable_runtime_config_gates_after_owner_decision",
        requiredActor: "owner"
      }
    },
    configChangeApplied: false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  }, overrides);
}

function runtime(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationRuntimeEnablement.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "ready_for_manual_runtime_config_enablement",
    runtimeConfigVerified: false,
    requestedActivationGates: ["writeful_execution"],
    runtimeEnablement: {
      schemaVersion: "growth.learningAutomationRuntimeEnablement.summary.v1",
      summaryOnly: true,
      status: "ready_for_manual_runtime_config_enablement",
      requiredActionCount: 1,
      requiredActions: [{
        key: "enable_runtime_config_manually",
        action: "perform_platform_runtime_config_enablement",
        requiredActor: "owner"
      }],
      nextAction: {
        key: "enable_runtime_config_manually",
        action: "perform_platform_runtime_config_enablement",
        requiredActor: "owner"
      }
    },
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false
  }, overrides);
}

function serviceWith(records = {}) {
  return createLearningAutomationReleaseControlsService({
    releaseReadinessService: {
      evaluateReadiness(input) {
        records.readinessInput = input;
        return records.readiness || readiness();
      }
    },
    releaseReviewService: {
      review(input) {
        records.reviewInput = input;
        return records.review || review();
      }
    },
    releaseClosureService: {
      summarize(input) {
        records.closureInput = input;
        return records.closure || closure();
      }
    },
    releaseActivationService: {
      preflight(input) {
        records.activationInput = input;
        return records.activation || activation();
      }
    },
    runtimeEnablementService: {
      evaluate(input) {
        records.runtimeInput = input;
        return records.runtime || runtime();
      }
    }
  });
}

test("release controls summarizes manual runtime config requirement without enabling scheduling", () => {
  const records = {};
  const result = serviceWith(records).summarize({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_ready_1",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseControls.v1");
  assert.equal(result.status, "manual_runtime_config_required");
  assert.equal(result.releaseControls.nextAction.key, "enable_runtime_config_manually");
  assert.equal(result.releaseControls.requiredActionCount, 1);
  assert.equal(result.steps.length, 5);
  assert.equal(result.steps[1].latestCollectionRunId, "lgacrn_ready_1");
  assert.equal(result.configChangeApplied, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.backgroundSchedulingAllowed, false);
  assert.equal(result.backgroundWorkerAllowed, false);
  assert.equal(records.runtimeInput.collectionRunId, "lgacrn_ready_1");
});

test("release controls reports verified runtime state after external config readback", () => {
  const result = serviceWith({
    runtime: runtime({
      status: "verified_enabled",
      runtimeConfigVerified: true,
      runtimeEnablement: {
        schemaVersion: "growth.learningAutomationRuntimeEnablement.summary.v1",
        summaryOnly: true,
        status: "verified_enabled",
        requiredActionCount: 0,
        requiredActions: [],
        nextAction: null
      }
    })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(result.status, "runtime_verified");
  assert.equal(result.steps.find((item) => item.key === "runtime_enablement").ready, true);
  assert.equal(result.releaseControls.requiredActionCount, 0);
  assert.equal(result.releaseControls.nextAction, null);
  assert.equal(result.writefulSchedulingAllowed, false);
});

test("release controls reports missing activation records before runtime config action", () => {
  const result = serviceWith({
    runtime: runtime({
      status: "activation_record_required",
      runtimeEnablement: {
        schemaVersion: "growth.learningAutomationRuntimeEnablement.summary.v1",
        summaryOnly: true,
        status: "activation_record_required",
        requiredActionCount: 1,
        requiredActions: [{
          key: "record_release_activation",
          action: "record_release_activation_audit",
          requiredActor: "owner"
        }],
        nextAction: {
          key: "record_release_activation",
          action: "record_release_activation_audit",
          requiredActor: "owner"
        }
      }
    })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(result.status, "activation_record_required");
  assert.equal(result.releaseControls.nextAction.key, "record_release_activation");
});

test("release controls keeps closure gaps visible before activation", () => {
  const result = serviceWith({
    closure: closure({
      status: "approval_required",
      backendEvidenceComplete: false,
      readyForOwnerReleaseActivation: false,
      releaseClosure: {
        schemaVersion: "growth.learningAutomationReleaseClosure.summary.v1",
        summaryOnly: true,
        status: "approval_required",
        requiredActionCount: 1,
        requiredActions: [{
          key: "record_writefulExecutionApproval",
          action: "record_release_approval",
          approvalKey: "writefulExecutionApproval",
          requiredActor: "owner"
        }],
        nextAction: {
          key: "record_writefulExecutionApproval",
          action: "record_release_approval",
          approvalKey: "writefulExecutionApproval",
          requiredActor: "owner"
        },
        missingApprovalKeys: ["writefulExecutionApproval"]
      }
    }),
    activation: activation({ status: "approval_required", preflightPassed: false }),
    runtime: runtime({ status: "activation_record_required" })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(result.status, "release_closure_required");
  assert.deepEqual(result.releaseControls.missingApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(result.releaseControls.requiredActions.some((item) => item.action === "record_release_approval"), true);
});

test("release controls rejects privacy-risk inputs and missing dependencies", () => {
  const privacy = serviceWith().summarize({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_controls_privacy_failed");

  const missing = createLearningAutomationReleaseControlsService({}).summarize({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_release_controls_readiness_unavailable");
  assert.equal(missing.writefulSchedulingAllowed, false);
});
