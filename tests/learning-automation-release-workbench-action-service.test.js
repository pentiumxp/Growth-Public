"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RELEASE_WORKBENCH_ACTION_SCHEMA,
  createLearningAutomationReleaseWorkbenchActionService
} = require("../src/services/learning-automation-release-workbench-action-service");

function workbenchResult(status = "release_evidence_required") {
  return {
    ok: true,
    status,
    releaseWorkbench: {
      summaryOnly: true,
      status,
      recordRoutes: [
        { key: "release_readiness_snapshot" },
        { key: "release_evidence" },
        { key: "release_approval" },
        { key: "release_evidence_collection" },
        { key: "release_collection_run" },
        { key: "release_decision" },
        { key: "release_package" },
        { key: "release_activation" },
        { key: "runtime_enablement" }
      ]
    }
  };
}

function serviceWith(overrides = {}) {
  const calls = [];
  const service = createLearningAutomationReleaseWorkbenchActionService({
    releaseWorkbenchService: overrides.releaseWorkbenchService || {
      workbench(input) {
        calls.push(["workbench", input]);
        return workbenchResult();
      }
    },
    releaseReadinessService: overrides.releaseReadinessService || {
      createSnapshot(input) {
        calls.push(["release_readiness_snapshot", input]);
        return {
          ok: true,
          snapshot: {
            readinessId: "lgarel_1",
            status: "ready_for_release_review"
          },
          readiness: {
            status: "ready_for_release_review"
          }
        };
      }
    },
    releaseEvidenceService: overrides.releaseEvidenceService || {
      recordEvidence(input) {
        calls.push(["release_evidence", input]);
        return {
          ok: true,
          duplicate: false,
          evidence: {
            evidenceRecordId: "lgarev_1",
            status: "pass",
            evidenceKey: input.evidenceKey
          }
        };
      }
    },
    releaseApprovalService: overrides.releaseApprovalService || {
      recordApproval(input) {
        calls.push(["release_approval", input]);
        return {
          ok: true,
          approval: {
            approvalId: "lgaapp_1",
            status: "approved",
            approvalKey: input.approvalKey
          }
        };
      }
    },
    releaseEvidenceCollectionService: overrides.releaseEvidenceCollectionService || {
      collect(input) {
        calls.push(["release_evidence_collection", input]);
        return {
          ok: false,
          collection: {
            schemaVersion: "growth.learningAutomationReleaseEvidenceCollection.v1",
            summaryOnly: true,
            status: "incomplete",
            writeCollectionRun: input.writeCollectionRun === true,
            summary: {
              collectionRunId: "lgacrn_collect_1",
              collectionRunWritten: input.writeCollectionRun === true
            },
            artifacts: {
              releaseCollectionRun: {
                runId: "lgacrn_collect_1",
                status: "ready_for_release_review"
              }
            }
          }
        };
      }
    },
    releaseCollectionRunService: overrides.releaseCollectionRunService || {
      recordRun(input) {
        calls.push(["release_collection_run", input]);
        return {
          ok: true,
          run: {
            runId: "lgacrn_1",
            status: "ready_for_release_review"
          },
          evaluated: {
            status: "ready_for_release_review"
          }
        };
      }
    },
    releaseDecisionService: overrides.releaseDecisionService || {
      recordDecision(input) {
        calls.push(["release_decision", input]);
        return {
          ok: true,
          decision: {
            decisionId: "lgadec_1",
            status: "approved"
          },
          evaluated: {
            status: "approved"
          }
        };
      }
    },
    releasePackageService: overrides.releasePackageService || {
      recordPackage(input) {
        calls.push(["release_package", input]);
        return {
          ok: true,
          package: {
            packageId: "lgapkg_1",
            status: "ready_for_release_review"
          }
        };
      }
    },
    releaseActivationService: overrides.releaseActivationService || {
      recordActivation(input) {
        calls.push(["release_activation", input]);
        return {
          ok: true,
          activation: {
            activationId: "lgaact_1",
            status: "ready_for_owner_config_enablement"
          },
          evaluated: { status: "ready_for_owner_config_enablement" }
        };
      }
    },
    runtimeEnablementService: overrides.runtimeEnablementService || {
      recordEnablement(input) {
        calls.push(["runtime_enablement", input]);
        return {
          ok: true,
          enablement: {
            enablementId: "lgarte_1",
            status: "verified_enabled"
          },
          evaluated: { status: "verified_enabled" }
        };
      }
    }
  });
  return { service, calls };
}

test("release workbench action records evidence through the existing evidence service", () => {
  const { service, calls } = serviceWith();
  const result = service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { evidenceId: "ui_evidence_1" },
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_WORKBENCH_ACTION_SCHEMA);
  assert.equal(result.status, "recorded");
  assert.equal(result.endpointKey, "release_evidence");
  assert.equal(result.actionRecord.recordId, "lgarev_1");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_evidence"]);
  assert.equal(calls[1][1].workspaceId, "fanfan");
  assert.equal(calls[1][1].evidenceKey, "owner_daily_ui_evidence");
  assert.equal(calls[1][1].evidence.summaryOnly, true);
});

test("release workbench action runs evidence collection even when readiness remains incomplete", () => {
  const { service, calls } = serviceWith();
  const result = service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence_collection",
    actionKey: "release_collection_run",
    tasks: ["learning_loop_state"],
    requiredTaskIds: ["learning_loop_state"],
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "recorded");
  assert.equal(result.endpointKey, "release_evidence_collection");
  assert.equal(result.actionRecord.recordId, "lgacrn_collect_1");
  assert.equal(result.actionRecord.recordStatus, "incomplete");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_evidence_collection"]);
  assert.deepEqual(calls[1][1].tasks, ["learning_loop_state"]);
  assert.deepEqual(calls[1][1].requiredTaskIds, ["learning_loop_state"]);
  assert.equal(calls[1][1].writeCollectionRun, true);
  assert.equal(calls[1][1].writeReleaseEvidenceRecords, true);
  assert.equal(calls[1][1].allowWriteCollection, true);
  assert.equal(calls[1][1].ownerAuthorizedWrite, true);
});

test("release workbench action requires only the selected endpoint write service", () => {
  const calls = [];
  const service = createLearningAutomationReleaseWorkbenchActionService({
    releaseWorkbenchService: {
      workbench(input) {
        calls.push(["workbench", input]);
        return workbenchResult();
      }
    },
    releaseEvidenceService: {
      recordEvidence(input) {
        calls.push(["release_evidence", input]);
        return {
          ok: true,
          evidence: {
            evidenceRecordId: "lgarev_selected_only",
            status: "pass"
          }
        };
      }
    }
  });

  const result = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence"
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionRecord.recordId, "lgarev_selected_only");
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_evidence"]);

  const missingPackage = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_package",
    releasePackage: { summaryOnly: true }
  });
  assert.equal(missingPackage.ok, false);
  assert.equal(missingPackage.error, "learning_automation_release_workbench_action_release_package_unavailable");
});

test("release workbench action records readiness snapshot, collection run, and release decision through advertised services", () => {
  const { service, calls } = serviceWith();

  const snapshot = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_readiness_snapshot",
    evidence: { ownerDailyUiEvidence: { ok: true } },
    releaseApproval: { writefulExecutionApproval: { ok: true } },
    requestedBy: "owner"
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.actionRecord.recordId, "lgarel_1");
  assert.equal(snapshot.runtimeConfigMutationPerformed, false);

  const collectionRun = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_collection_run",
    releaseEvidenceBundle: { schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1", summaryOnly: true },
    releaseEvidenceBundleAudit: { schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1", summaryOnly: true },
    releaseReadiness: { schemaVersion: "growth.learningAutomationReleaseReadiness.v1", summaryOnly: true },
    requestedBy: "owner"
  });
  assert.equal(collectionRun.ok, true);
  assert.equal(collectionRun.actionRecord.recordId, "lgacrn_1");

  const decision = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_decision",
    collectionRunId: "lgacrn_1",
    status: "approved",
    releaseCollectionRun: { schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1", summaryOnly: true },
    requestedBy: "owner"
  });
  assert.equal(decision.ok, true);
  assert.equal(decision.actionRecord.recordId, "lgadec_1");
  assert.equal(decision.writefulSchedulingAllowed, false);
  assert.deepEqual(calls.map((call) => call[0]), [
    "workbench",
    "release_readiness_snapshot",
    "workbench",
    "release_collection_run",
    "workbench",
    "release_decision"
  ]);
});

test("release workbench action records package artifacts only through package record service", () => {
  const { service, calls } = serviceWith();
  const releasePackage = {
    schemaVersion: "growth.learningAutomationReleasePackage.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "fanfan",
    status: "ready_for_release_review"
  };
  const result = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_package",
    releasePackage
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionRecord.recordId, "lgapkg_1");
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_package"]);
  assert.equal(calls[1][1].releasePackage, releasePackage);
  assert.equal(calls[1][1].ownerAuthorizedWrite, true);
});

test("release workbench action records runtime enablement audit without config mutation", () => {
  const { service, calls } = serviceWith();
  const result = service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "runtime_enablement",
    activationGates: ["writeful_execution"],
    enablementDecision: { decision: "runtime_config_verified" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionRecord.recordId, "lgarte_1");
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "runtime_enablement"]);
  assert.deepEqual(calls[1][1].activationGates, ["writeful_execution"]);
  assert.equal(calls[1][1].enablementDecision.summaryOnly, true);
});

test("release workbench action fails closed for missing endpoint, blocked workbench, and privacy risk", () => {
  const missing = serviceWith().service.recordAction({ workspaceId: "fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "release_workbench_action_endpoint_required");

  const blocked = serviceWith({
    releaseWorkbenchService: {
      workbench() {
        return { ok: false, status: "blocked", error: "release_workbench_unavailable" };
      }
    }
  }).service.recordAction({ workspaceId: "fanfan", endpointKey: "release_evidence", evidenceKey: "owner_daily_ui_evidence" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_workbench_unavailable");

  const privacy = serviceWith().service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "release_workbench_action_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("privacy_key:rawPrompt"), true);

  const privateValue = serviceWith().service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { artifactId: "/Users/example/.homeai-qa/private-output.json" }
  });
  assert.equal(privateValue.ok, false);
  assert.equal(privateValue.error, "release_workbench_action_privacy_failed");
  assert.equal(privateValue.privacyFindings.includes("private_value:evidence.artifactId"), true);
});
