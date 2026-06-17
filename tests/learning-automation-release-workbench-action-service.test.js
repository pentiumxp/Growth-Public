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
        { key: "release_preflight" },
        { key: "release_activation" },
        { key: "runtime_enablement" },
        { key: "automation_digest" },
        { key: "automation_failure_policy" },
        { key: "automation_action_handoff" },
        { key: "automation_scheduler_worker_target" }
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
      buildPackage(input) {
        calls.push(["release_package_build", input]);
        return {
          ok: false,
          package: {
            schemaVersion: "growth.learningAutomationReleasePackage.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            packageId: "lgapkg_build_artifact_1",
            status: "incomplete",
            summary: {
              status: "incomplete",
              packageRecordWritten: true,
              packageRecordId: "lgapkg_build_1"
            }
          },
          record: {
            ok: true,
            package: {
              packageId: "lgapkg_build_1",
              status: "incomplete"
            }
          }
        };
      },
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
    releasePreflightService: overrides.releasePreflightService || {
      recordReport(input) {
        calls.push(["release_preflight", input]);
        return {
          ok: true,
          report: {
            preflightReportId: "lgarpf_1",
            status: "ready_for_owner_release_activation",
            privacyClass: "summary_only"
          },
          releasePreflight: {
            summaryOnly: true,
            readyForProductionDeploy: false,
            readyForProductionDeployReview: true
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
    },
    automationDigestService: overrides.automationDigestService || {
      createDigest(input) {
        calls.push(["automation_digest_create", input]);
        return {
          ok: true,
          duplicate: false,
          digest: {
            digestId: "lgadig_1",
            status: "pending"
          }
        };
      },
      reviewDigest(input) {
        calls.push(["automation_digest_review", input]);
        return {
          ok: true,
          duplicate: false,
          digest: {
            digestId: input.digestId,
            status: input.status || "reviewed"
          }
        };
      }
    },
    automationFailurePolicyService: overrides.automationFailurePolicyService || {
      createPolicy(input) {
        calls.push(["automation_failure_policy_create", input]);
        return {
          ok: true,
          duplicate: false,
          policy: {
            policyId: "lgafp_1",
            status: "draft"
          }
        };
      },
      reviewPolicy(input) {
        calls.push(["automation_failure_policy_review", input]);
        return {
          ok: true,
          duplicate: false,
          policy: {
            policyId: input.policyId,
            status: input.status || "active"
          }
        };
      }
    },
    automationActionHandoffService: overrides.automationActionHandoffService || {
      createHandoff(input) {
        calls.push(["automation_action_handoff_create", input]);
        return {
          ok: true,
          duplicate: false,
          handoff: {
            handoffId: "lgahoff_1",
            status: "pending_delivery",
            deliveryStatus: "not_delivered",
            digestId: input.digestId
          }
        };
      },
      async deliverHandoff(input) {
        calls.push(["automation_action_handoff_deliver", input]);
        return {
          ok: true,
          duplicate: false,
          deliveryStatus: "delivered",
          handoff: {
            handoffId: input.handoffId,
            status: "delivered",
            deliveryStatus: "delivered"
          }
        };
      }
    },
    automationSchedulerWorkerTargetService: overrides.automationSchedulerWorkerTargetService || {
      createTarget(input) {
        calls.push(["automation_scheduler_worker_target_create", input]);
        return {
          ok: true,
          duplicate: false,
          target: {
            targetId: "lgawt_1",
            workerTargetId: "lgawt_1",
            status: "proposed"
          }
        };
      },
      reviewTarget(input) {
        calls.push(["automation_scheduler_worker_target_review", input]);
        return {
          ok: true,
          duplicate: false,
          target: {
            targetId: input.targetId,
            workerTargetId: input.targetId,
            status: input.status || "enabled"
          }
        };
      }
    },
    actionAuditRepository: overrides.actionAuditRepository
  });
  return { service, calls };
}

test("release workbench action records evidence through the existing evidence service", async () => {
  const { service, calls } = serviceWith();
  const result = await service.recordAction({
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

test("release workbench action persists bounded summary-only action audit rows when repository is present", async () => {
  const saved = [];
  const { service } = serviceWith({
    actionAuditRepository: {
      saveActionAudit(input) {
        saved.push(input);
        return {
          ok: true,
          duplicate: false,
          actionAudit: Object.assign({ actionAuditId: "lgawba_1" }, input)
        };
      },
      listActionAudits(input) {
        return saved.filter((item) => item.workspaceId === input.workspaceId);
      }
    }
  });

  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { evidenceId: "ui_evidence_1" },
    requestedBy: "owner",
    createdAt: "2026-06-17T07:00:00.000Z"
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionAuditStatus, "recorded");
  assert.equal(result.actionAudit.actionAuditId, "lgawba_1");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].workspaceId, "fanfan");
  assert.equal(saved[0].endpointKey, "release_evidence");
  assert.equal(saved[0].status, "recorded");
  assert.equal(saved[0].recordId, "lgarev_1");
  assert.equal(saved[0].actionRecord.recordId, "lgarev_1");
  assert.equal(saved[0].actionSummary.writefulSchedulingAllowed, false);
  assert.equal(saved[0].writeResult, undefined);
  assert.equal(JSON.stringify(saved[0]).includes("ui_evidence_1"), false);

  const listed = service.listActionAudits({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence",
    limit: 5
  });
  assert.equal(listed.ok, true);
  assert.equal(listed.schemaVersion, "growth.learningAutomationReleaseWorkbenchActionAuditList.v1");
  assert.equal(listed.actionAuditCount, 1);
  assert.equal(listed.actionAudits[0].recordId, "lgarev_1");
});

test("release workbench action persists bounded blocked audit rows for post-privacy action failures", async () => {
  const saved = [];
  const { service } = serviceWith({
    releaseEvidenceService: {
      recordEvidence() {
        return {
          ok: false,
          error: "release_evidence_record_rejected",
          evidence: {
            evidenceRecordId: "lgarev_rejected",
            rawPrompt: "must not be copied into action audit"
          }
        };
      }
    },
    actionAuditRepository: {
      saveActionAudit(input) {
        saved.push(input);
        return {
          ok: true,
          duplicate: false,
          actionAudit: Object.assign({ actionAuditId: "lgawba_blocked_1" }, input)
        };
      }
    }
  });

  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    requestedBy: "owner"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_record_rejected");
  assert.equal(result.actionAuditStatus, "recorded");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].status, "blocked");
  assert.equal(saved[0].error, "release_evidence_record_rejected");
  assert.equal(saved[0].recordId, "");
  assert.equal(saved[0].actionRecord.rawPrompt, undefined);
  assert.equal(JSON.stringify(saved[0]).includes("must not be copied"), false);
});

test("release workbench action runs evidence collection even when readiness remains incomplete", async () => {
  const { service, calls } = serviceWith();
  const releasePackageReviewUiEvidenceFile = "/Users/hermes-dev/.homeai-qa/release-package-review-ui.json";
  const schedulerRunUiEvidenceFile = "/Users/hermes-dev/.homeai-qa/scheduler-run-ui.json";
  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence_collection",
    actionKey: "release_collection_run",
    tasks: ["learning_loop_state", "release_package_review_ui", "scheduler_run_ui"],
    requiredTaskIds: ["learning_loop_state", "release_package_review_ui", "scheduler_run_ui"],
    releasePackageReviewUiEvidenceFile,
    schedulerRunUiEvidenceFile,
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
  assert.deepEqual(calls[1][1].tasks, ["learning_loop_state", "release_package_review_ui", "scheduler_run_ui"]);
  assert.deepEqual(calls[1][1].requiredTaskIds, ["learning_loop_state", "release_package_review_ui", "scheduler_run_ui"]);
  assert.equal(calls[1][1].releasePackageReviewUiEvidenceFile, releasePackageReviewUiEvidenceFile);
  assert.equal(calls[1][1].schedulerRunUiEvidenceFile, schedulerRunUiEvidenceFile);
  assert.equal(calls[1][1].writeCollectionRun, true);
  assert.equal(calls[1][1].writeReleaseEvidenceRecords, true);
  assert.equal(calls[1][1].allowWriteCollection, true);
  assert.equal(calls[1][1].ownerAuthorizedWrite, true);
});

test("release workbench action reports blocked evidence collection as visible failure", async () => {
  const saved = [];
  const { service } = serviceWith({
    releaseEvidenceCollectionService: {
      collect() {
        return {
          ok: false,
          error: "release_evidence_collection_blocked",
          collection: {
            schemaVersion: "growth.learningAutomationReleaseEvidenceCollection.v1",
            summaryOnly: true,
            status: "blocked",
            summary: {
              collectionRunId: "lgacrn_blocked_1",
              status: "blocked",
              collectionRunWritten: true
            }
          }
        };
      }
    },
    actionAuditRepository: {
      saveActionAudit(input) {
        saved.push(input);
        return {
          ok: true,
          actionAudit: Object.assign({ actionAuditId: "lgawba_blocked_collection_1" }, input)
        };
      }
    }
  });

  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence_collection",
    actionKey: "release_collection_run",
    tasks: ["owner_daily_ui"],
    requiredTaskIds: ["owner_daily_ui"],
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    requestedBy: "owner"
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.error, "release_evidence_collection_blocked");
  assert.equal(result.endpointKey, "release_evidence_collection");
  assert.equal(result.actionRecord.recordId, "lgacrn_blocked_1");
  assert.equal(result.actionRecord.recordStatus, "blocked");
  assert.equal(result.actionAuditStatus, "recorded");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].status, "blocked");
  assert.equal(saved[0].recordId, "lgacrn_blocked_1");
  assert.equal(saved[0].recordStatus, "blocked");
  assert.equal(saved[0].actionSummary.recordStatus, "blocked");
  assert.equal(saved[0].writeResult, undefined);
  assert.equal(JSON.stringify(saved[0]).includes("owner_daily_ui"), false);
});

test("release workbench action still blocks private paths outside transient artifact fields", async () => {
  const { service, calls } = serviceWith();
  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence_collection",
    actionKey: "release_collection_run",
    tasks: ["release_package_review_ui"],
    evidence: {
      artifactPath: "/Users/hermes-dev/.homeai-qa/release-package-review-ui.json"
    },
    writeCollectionRun: true,
    writeReleaseEvidenceRecords: true,
    requestedBy: "owner"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_workbench_action_privacy_failed");
  assert.deepEqual(calls, []);
});

test("release workbench action requires only the selected endpoint write service", async () => {
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

  const result = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence"
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionRecord.recordId, "lgarev_selected_only");
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_evidence"]);

  const missingPackage = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_package",
    releasePackage: { summaryOnly: true }
  });
  assert.equal(missingPackage.ok, false);
  assert.equal(missingPackage.error, "learning_automation_release_workbench_action_release_package_unavailable");
});

test("release workbench action records readiness snapshot, collection run, and release decision through advertised services", async () => {
  const { service, calls } = serviceWith();

  const snapshot = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_readiness_snapshot",
    evidence: { ownerDailyUiEvidence: { ok: true } },
    releaseApproval: { writefulExecutionApproval: { ok: true } },
    requestedBy: "owner"
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.actionRecord.recordId, "lgarel_1");
  assert.equal(snapshot.runtimeConfigMutationPerformed, false);

  const collectionRun = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_collection_run",
    releaseEvidenceBundle: { schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1", summaryOnly: true },
    releaseEvidenceBundleAudit: { schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1", summaryOnly: true },
    releaseReadiness: { schemaVersion: "growth.learningAutomationReleaseReadiness.v1", summaryOnly: true },
    requestedBy: "owner"
  });
  assert.equal(collectionRun.ok, true);
  assert.equal(collectionRun.actionRecord.recordId, "lgacrn_1");

  const decision = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_decision",
    status: "approved",
    requestedBy: "owner"
  });
  assert.equal(decision.ok, true);
  assert.equal(decision.actionRecord.recordId, "lgadec_1");
  assert.equal(decision.writefulSchedulingAllowed, false);
  assert.equal(calls[5][1].autoSelectLatestReadyCollectionRun, true);
  assert.equal(calls[5][1].releaseCollectionRun, undefined);
  assert.deepEqual(calls.map((call) => call[0]), [
    "workbench",
    "release_readiness_snapshot",
    "workbench",
    "release_collection_run",
    "workbench",
    "release_decision"
  ]);
});

test("release workbench action records package artifacts only through package record service", async () => {
  const { service, calls } = serviceWith();
  const releasePackage = {
    schemaVersion: "growth.learningAutomationReleasePackage.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "fanfan",
    status: "ready_for_release_review"
  };
  const result = await service.recordAction({
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

test("release workbench action records preflight report through preflight service only", async () => {
  const { service, calls } = serviceWith();
  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    endpointKey: "release_preflight",
    actionKey: "release_preflight",
    collectionRunId: "lgacrn_1",
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "recorded");
  assert.equal(result.endpointKey, "release_preflight");
  assert.equal(result.actionRecord.recordId, "lgarpf_1");
  assert.equal(result.actionRecord.recordStatus, "ready_for_owner_release_activation");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_preflight"]);
  assert.equal(calls[1][1].workspaceId, "fanfan");
  assert.equal(calls[1][1].programId, "program_science");
  assert.equal(calls[1][1].collectionRunId, "lgacrn_1");
  assert.equal(calls[1][1].allowWritePreflight, true);
  assert.equal(calls[1][1].ownerAuthorizedWrite, true);
});

test("release workbench action fails closed when preflight service is unavailable", async () => {
  const { service, calls } = serviceWith({ releasePreflightService: {} });
  const result = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_preflight",
    actionKey: "release_preflight"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_workbench_action_release_preflight_unavailable");
  assert.deepEqual(calls.map((call) => call[0]), ["workbench"]);
});

test("release workbench action can explicitly build and record a package through package service", async () => {
  const { service, calls } = serviceWith();
  const result = await service.recordAction({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_package",
    actionKey: "release_package",
    buildAndRecordPackage: true,
    tasks: ["planner_readiness", "scheduler_dry_run"],
    requiredTaskIds: ["planner_readiness", "scheduler_dry_run"],
    activationGates: ["writeful_execution"],
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "recorded");
  assert.equal(result.endpointKey, "release_package");
  assert.equal(result.actionRecord.recordId, "lgapkg_build_1");
  assert.equal(result.actionRecord.recordStatus, "incomplete");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.deepEqual(calls.map((call) => call[0]), ["workbench", "release_package_build"]);
  assert.deepEqual(calls[1][1].tasks, ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(calls[1][1].requiredTaskIds, ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(calls[1][1].activationGates, ["writeful_execution"]);
  assert.equal(calls[1][1].writePackageRecord, true);
  assert.equal(calls[1][1].allowWritePackage, true);
  assert.equal(calls[1][1].ownerAuthorizedWrite, true);
});

test("release workbench action fails closed when package build is requested but unavailable", async () => {
  const { service, calls } = serviceWith({
    releasePackageService: {
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
    }
  });

  const result = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_package",
    buildReleasePackage: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_workbench_action_release_package_build_unavailable");
  assert.deepEqual(calls.map((call) => call[0]), ["workbench"]);
});

test("release workbench action records runtime enablement audit without config mutation", async () => {
  const { service, calls } = serviceWith();
  const result = await service.recordAction({
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

test("release workbench action advances Growth automation state prerequisites through existing services", async () => {
  const { service, calls } = serviceWith();

  const createdDigest = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_digest",
    actionKey: "reviewed_automation_digest",
    requestedBy: "owner"
  });
  assert.equal(createdDigest.ok, true);
  assert.equal(createdDigest.actionRecord.recordId, "lgadig_1");
  assert.equal(createdDigest.actionRecord.recordStatus, "pending");

  const reviewedDigest = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_digest",
    actionKey: "reviewed_automation_digest",
    digestId: "lgadig_1",
    requestedBy: "owner"
  });
  assert.equal(reviewedDigest.ok, true);
  assert.equal(reviewedDigest.actionRecord.recordId, "lgadig_1");
  assert.equal(reviewedDigest.actionRecord.recordStatus, "reviewed");

  const createdPolicy = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_failure_policy",
    actionKey: "active_failure_policy",
    requestedBy: "owner"
  });
  assert.equal(createdPolicy.ok, true);
  assert.equal(createdPolicy.actionRecord.recordId, "lgafp_1");
  assert.equal(createdPolicy.actionRecord.recordStatus, "draft");

  const activatedPolicy = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_failure_policy",
    actionKey: "active_failure_policy",
    policyId: "lgafp_1",
    requestedBy: "owner"
  });
  assert.equal(activatedPolicy.ok, true);
  assert.equal(activatedPolicy.actionRecord.recordId, "lgafp_1");
  assert.equal(activatedPolicy.actionRecord.recordStatus, "active");

  const createdHandoff = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_action_handoff",
    actionKey: "delivered_action_handoff",
    digestId: "lgadig_1",
    requestedBy: "owner"
  });
  assert.equal(createdHandoff.ok, true);
  assert.equal(createdHandoff.actionRecord.recordId, "lgahoff_1");
  assert.equal(createdHandoff.actionRecord.recordStatus, "pending_delivery");

  const deliveredHandoff = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_action_handoff",
    actionKey: "delivered_action_handoff",
    handoffId: "lgahoff_1",
    requestedBy: "owner"
  });
  assert.equal(deliveredHandoff.ok, true);
  assert.equal(deliveredHandoff.actionRecord.recordId, "lgahoff_1");
  assert.equal(deliveredHandoff.actionRecord.recordStatus, "delivered");

  const createdTarget = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_scheduler_worker_target",
    actionKey: "reviewed_enabled_worker_target",
    targetNodeIds: ["kg_science_node_1"],
    requestedBy: "owner"
  });
  assert.equal(createdTarget.ok, true);
  assert.equal(createdTarget.actionRecord.recordId, "lgawt_1");
  assert.equal(createdTarget.actionRecord.recordStatus, "proposed");

  const enabledTarget = await service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "automation_scheduler_worker_target",
    actionKey: "reviewed_enabled_worker_target",
    targetId: "lgawt_1",
    requestedBy: "owner"
  });
  assert.equal(enabledTarget.ok, true);
  assert.equal(enabledTarget.actionRecord.recordId, "lgawt_1");
  assert.equal(enabledTarget.actionRecord.recordStatus, "enabled");
  assert.equal(enabledTarget.writefulSchedulingAllowed, false);
  assert.equal(enabledTarget.runtimeConfigMutationPerformed, false);

  assert.deepEqual(calls.map((call) => call[0]), [
    "workbench",
    "automation_digest_create",
    "workbench",
    "automation_digest_review",
    "workbench",
    "automation_failure_policy_create",
    "workbench",
    "automation_failure_policy_review",
    "workbench",
    "automation_action_handoff_create",
    "workbench",
    "automation_action_handoff_deliver",
    "workbench",
    "automation_scheduler_worker_target_create",
    "workbench",
    "automation_scheduler_worker_target_review"
  ]);
  assert.equal(calls[3][1].digestId, "lgadig_1");
  assert.equal(calls[7][1].policyId, "lgafp_1");
  assert.equal(calls[9][1].digestId, "lgadig_1");
  assert.equal(calls[11][1].handoffId, "lgahoff_1");
  assert.deepEqual(calls[13][1].targetNodeIds, ["kg_science_node_1"]);
  assert.equal(calls[15][1].targetId, "lgawt_1");
});

test("release workbench action fails closed for missing endpoint, blocked workbench, and privacy risk", async () => {
  const missing = await serviceWith().service.recordAction({ workspaceId: "fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "release_workbench_action_endpoint_required");

  const blocked = await serviceWith({
    releaseWorkbenchService: {
      workbench() {
        return { ok: false, status: "blocked", error: "release_workbench_unavailable" };
      }
    }
  }).service.recordAction({ workspaceId: "fanfan", endpointKey: "release_evidence", evidenceKey: "owner_daily_ui_evidence" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_workbench_unavailable");

  const privacy = await serviceWith().service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "release_workbench_action_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("privacy_key:rawPrompt"), true);

  const privateValue = await serviceWith().service.recordAction({
    workspaceId: "fanfan",
    endpointKey: "release_evidence",
    evidenceKey: "owner_daily_ui_evidence",
    evidence: { artifactId: "/Users/example/.homeai-qa/private-output.json" }
  });
  assert.equal(privateValue.ok, false);
  assert.equal(privateValue.error, "release_workbench_action_privacy_failed");
  assert.equal(privateValue.privacyFindings.includes("private_value:evidence.artifactId"), true);
});
