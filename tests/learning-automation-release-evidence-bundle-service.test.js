const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_TASK_IDS,
  RELEASE_EVIDENCE_BUNDLE_SCHEMA,
  createLearningAutomationReleaseEvidenceBundleService,
  normalizeTaskIds,
  publicScope,
  scopeArgs
} = require("../src/services/learning-automation-release-evidence-bundle-service");

function createServiceWithRunner(runner) {
  const calls = [];
  const service = createLearningAutomationReleaseEvidenceBundleService({
    repoRoot: "/repo/growth",
    nodePath: "/node",
    now: () => new Date("2026-06-15T06:10:00.000Z"),
    runCommand(command, args, options) {
      calls.push({ command, args, options });
      return runner(command, args, options);
    }
  });
  return { calls, service };
}

test("release evidence bundle service normalizes scope and task args", () => {
  assert.deepEqual(normalizeTaskIds({}), Array.from(DEFAULT_TASK_IDS));
  assert.equal(DEFAULT_TASK_IDS.includes("profile_feedback"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("cycle_history"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("owner_audit"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("learner_cycle"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("target_provisioning"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("recommendation_lifecycle"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("stage_checkpoint_controls"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("platform_action"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("central_visual"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("owner_review_evidence"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("daily_loop_write"), false);
  assert.equal(DEFAULT_TASK_IDS.includes("release_controls"), false);
  assert.equal(DEFAULT_TASK_IDS.includes("release_inventory"), false);
  assert.equal(DEFAULT_TASK_IDS.includes("release_dashboard"), false);
  assert.deepEqual(normalizeTaskIds({ tasks: ["planner-readiness", "scheduler_dry_run"] }), [
    "planner_readiness",
    "scheduler_dry_run"
  ]);
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    available_minutes: 15,
    target_node_ids: ["kg_science_fair_test", "kg_science_fair_test"]
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 12,
    targetNodeIds: ["kg_science_fair_test"],
    allowWriteEvidence: false,
    dailyLoopWriteOperation: "draft",
    learnerCycleOperation: "audit",
    taskCardId: "",
    planDraftId: "",
    collectionRunId: "",
    evaluationId: "",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    visualPluginId: "growth",
    visualScenario: "embedded-plugin-shell",
    centralVisualEvidenceFile: "",
    activationGates: [],
    requiredApprovalKeys: [],
    activationRecordLimit: 20,
    runtimeEnablementRecordLimit: 20,
    ownerDailyUiEvidence: false,
    ownerAuditUiEvidence: false,
    stageCheckpointEvidence: false,
    proposalReviewUiEvidence: false,
    automationDigestUiEvidence: false,
    automationActionHandoffUiEvidence: false,
    schedulerExecutionUiEvidence: false,
    schedulerRunUiEvidence: false,
    schedulerWorkerTargetUiEvidence: false
  });
  assert.deepEqual(scopeArgs({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 7,
    targetNodeIds: ["kg_science_fair_test"]
  }), [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--limit", "7",
    "--program-id", "program_science",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--available-minutes", "15",
    "--target-node-id", "kg_science_fair_test"
  ]);
});

test("release evidence bundle service builds summary-only bundle from no-write smoke tasks", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: path.basename(args[0]),
      operation: "readiness",
      summary: { candidateCount: 1 }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    targetNodeIds: ["kg_science_fair_test"],
    taskCardId: "ltask_science_daily_1",
    tasks: ["planner_readiness", "daily_loop_preview", "learning_loop_state", "cycle_history", "owner_audit", "profile_feedback", "learner_cycle", "stage_assessment", "stage_checkpoint_controls", "proposal", "owner_review_evidence"],
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.bundle.schemaVersion, RELEASE_EVIDENCE_BUNDLE_SCHEMA);
  assert.equal(result.bundle.privacyClass, "summary_only");
  assert.equal(result.bundle.summaryOnly, true);
  assert.equal(result.bundle.requestedBy, "owner");
  assert.equal(result.bundle.scope.workspaceId, "weixin_fanfan");
  assert.deepEqual(Object.keys(result.bundle.evidence), [
    "productionPlannerReadinessEvidence",
    "productionDailyLoopPreviewSmokeEvidence",
    "productionLearningLoopStateSmokeEvidence",
    "productionCycleHistorySmokeEvidence",
    "productionOwnerAuditSmokeEvidence",
    "productionProfileFeedbackSmokeEvidence",
    "productionLearnerCycleSmokeEvidence",
    "stageCheckpointEvidence",
    "stageCheckpointControlsEvidence",
    "productionProposalSmokeEvidence",
    "ownerReviewEvidence"
  ]);
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.status, "pass");
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.ok, true);
  assert.equal(result.bundle.summary.taskCount, 11);
  assert.equal(result.bundle.summary.blockedCount, 0);
  assert.equal(calls.length, 11);
  assert.equal(calls[0].command, "/node");
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-planner-readiness.js"));
  assert.ok(calls[2].args[0].endsWith("scripts/smoke-growth-learning-loop-state.js"));
  assert.ok(calls[3].args[0].endsWith("scripts/smoke-growth-cycle-history.js"));
  assert.ok(calls[3].args.includes("--task-card-id"));
  assert.ok(calls[3].args.includes("ltask_science_daily_1"));
  assert.ok(calls[4].args[0].endsWith("scripts/smoke-growth-owner-audit.js"));
  assert.equal(calls[4].args.includes("--operation"), false);
  assert.ok(calls[4].args.includes("--task-card-id"));
  assert.ok(calls[4].args.includes("ltask_science_daily_1"));
  assert.ok(calls[5].args[0].endsWith("scripts/smoke-growth-profile-feedback.js"));
  assert.equal(calls[5].args.includes("--operation"), false);
  assert.ok(calls[5].args.includes("--task-card-id"));
  assert.ok(calls[5].args.includes("ltask_science_daily_1"));
  assert.ok(calls[6].args[0].endsWith("scripts/smoke-growth-learner-cycle.js"));
  assert.ok(calls[6].args.includes("--operation"));
  assert.ok(calls[6].args.includes("audit"));
  assert.ok(calls[6].args.includes("--task-card-id"));
  assert.ok(calls[6].args.includes("ltask_science_daily_1"));
  assert.ok(calls[7].args[0].endsWith("scripts/smoke-growth-stage-assessment.js"));
  assert.ok(calls[7].args.includes("--target-node-id"));
  assert.ok(calls[7].args.includes("kg_science_fair_test"));
  assert.ok(calls[8].args[0].endsWith("scripts/smoke-growth-stage-checkpoint-controls.js"));
  assert.ok(calls[8].args.includes("--target-node-id"));
  assert.ok(calls[8].args.includes("kg_science_fair_test"));
  assert.ok(calls[9].args[0].endsWith("scripts/smoke-growth-automation-proposal.js"));
  assert.ok(calls[10].args[0].endsWith("scripts/smoke-growth-automation-owner-review-evidence.js"));
  assert.ok(calls[3].args.includes("--target-node-id"));
  assert.ok(calls[6].args.includes("--target-node-id"));
  assert.ok(calls[0].args.includes("--json"));
  assert.ok(JSON.stringify(result.bundle).includes("stdout") === false);
});

test("release evidence bundle service blocks learner-cycle write operations from bundle scope", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for learner-cycle write scope");
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    learnerCycleOperation: "full",
    taskCardId: "ltask_science_daily_1",
    tasks: ["learner_cycle"]
  });

  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["learner_cycle"]);
  const evidence = result.bundle.evidence.productionLearnerCycleSmokeEvidence;
  assert.equal(evidence.status, "blocked");
  assert.equal(evidence.error, "release_evidence_bundle_learner_cycle_operation_invalid");
  assert.deepEqual(evidence.allowedOperations, ["audit"]);
  assert.equal(evidence.summary.operation, "full");
  assert.equal(evidence.summary.useDirectSmoke, "npm run smoke:learner-cycle");
  assert.equal(JSON.stringify(result.bundle).includes("learner answer"), false);
});

test("release evidence bundle service collects target-provisioning smoke as bounded multi-workspace evidence", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-target-provisioning-service",
      mode: "explicit_provision",
      targetEnabled: true,
      selectedDomainPackId: "domain_pack_science",
      selectedDomain: "science",
      selectedSubject: "biology",
      selectedTargetNodeIds: ["kg_biology_cells"],
      graphOptions: {
        available: true,
        domainPacks: [{ domainPackId: "domain_pack_science", title: "Science" }],
        subjects: ["biology", "chemistry"]
      }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "domain_pack_science",
    domain: "science",
    subject: "biology",
    targetNodeIds: ["kg_biology_cells"],
    tasks: ["target_provisioning"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.status, "pass");
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.smoke, "npm run smoke:target-provisioning");
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.mode, "explicit_provision");
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.targetEnabled, true);
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.selectedDomainPackId, "domain_pack_science");
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.selectedSubject, "biology");
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.selectedTargetNodeCount, 1);
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.domainPackCount, 1);
  assert.equal(result.bundle.evidence.productionTargetProvisioningSmokeEvidence.summary.subjectCount, 2);
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
  assert.equal(JSON.stringify(result.bundle).includes("rawPrompt"), false);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-target-provisioning.js"));
  assert.ok(calls[0].args.includes("--target-node-id"));
  assert.ok(calls[0].args.includes("kg_biology_cells"));
});

test("release evidence bundle service collects recommendation lifecycle smoke as bounded evidence", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      operation: "list",
      source: "growth-learning-recommendation-lifecycle-service",
      count: 3,
      summary: {
        lifecycleCount: 3,
        pendingCount: 1,
        acceptedCount: 1,
        supersededCount: 1,
        latestTrajectoryId: "lgtraj_latest",
        latestStatus: "pending",
        latestTargetNodeIds: ["kg_science_variables"]
      },
      lifecycle: [{
        trajectoryId: "lgtraj_latest",
        status: "pending",
        reason: "Bounded reason only."
      }]
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_variables"],
    tasks: ["recommendation_lifecycle"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.bundle.evidence), ["productionRecommendationLifecycleSmokeEvidence"]);
  const evidence = result.bundle.evidence.productionRecommendationLifecycleSmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:recommendation-lifecycle");
  assert.equal(evidence.summary.source, "growth-learning-recommendation-lifecycle-service");
  assert.equal(evidence.summary.operation, "list");
  assert.equal(evidence.summary.lifecycleCount, 3);
  assert.equal(evidence.summary.pendingCount, 1);
  assert.equal(evidence.summary.acceptedCount, 1);
  assert.equal(evidence.summary.supersededCount, 1);
  assert.equal(evidence.summary.latestTrajectoryId, "lgtraj_latest");
  assert.deepEqual(evidence.summary.latestTargetNodeIds, ["kg_science_variables"]);
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
  assert.equal(JSON.stringify(result.bundle).includes("rawPrompt"), false);
  assert.equal(JSON.stringify(result.bundle).includes("Bounded reason only."), false);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-recommendation-lifecycle.js"));
  assert.ok(calls[0].args.includes("--target-node-id"));
  assert.ok(calls[0].args.includes("kg_science_variables"));
});

test("release evidence bundle service keeps blocked smoke as bounded evidence", () => {
  const { service } = createServiceWithRunner((command, args) => {
    if (args[0].endsWith("smoke-growth-scheduler-dry-run.js")) {
      return {
        status: 1,
        stdout: JSON.stringify({
          ok: false,
          error: "scheduler_dry_run_smoke_blocked",
          summary: { missingRequired: ["audit_completeness"] }
        })
      };
    }
    return { status: 0, stdout: JSON.stringify({ ok: true, source: "ok" }) };
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["planner_readiness", "scheduler_dry_run"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.bundle.summary.passedCount, 1);
  assert.equal(result.bundle.summary.blockedCount, 1);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["scheduler_dry_run"]);
  assert.deepEqual(result.bundle.tasks.map((task) => task.status), ["pass", "blocked"]);
  assert.equal(result.bundle.evidence.productionSchedulerDryRunSmokeEvidence.status, "blocked");
  assert.equal(result.bundle.evidence.productionSchedulerDryRunSmokeEvidence.error, "scheduler_dry_run_smoke_blocked");
});

test("release evidence bundle service collects release approval bag without evidence splicing", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      operation: "bag",
      releaseApproval: {
        writefulExecutionApproval: {
          approved: true,
          status: "approved",
          approvalId: "lgarap_writeful",
          approvedBy: "owner",
          approvedAt: "2026-06-15T06:10:00.000Z",
          source: "growth_release_approval_record"
        },
        backgroundSchedulerApproval: {
          approved: true,
          status: "approved",
          approvalId: "lgarap_scheduler",
          approvedBy: "owner",
          approvedAt: "2026-06-15T06:10:00.000Z"
        }
      }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["release_approval"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.bundle.evidence, {});
  assert.equal(result.bundle.releaseApproval.writefulExecutionApproval.approved, true);
  assert.equal(result.bundle.releaseApproval.backgroundSchedulerApproval.source, "growth_release_approval_record");
  assert.equal(result.bundle.releaseApproval.writefulExecutionApproval.approvalId, "lgarap_writeful");
  assert.deepEqual(result.bundle.summary.failedTaskIds, []);
  assert.equal(result.bundle.tasks[0].outputKey, "releaseApproval");
  assert.equal(result.bundle.tasks[0].source, "npm run smoke:release-approval");
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-automation-release-approval.js"));
  assert.ok(calls[0].args.includes("--operation"));
  assert.ok(calls[0].args.includes("bag"));
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service collects optional release-controls readback as non-default evidence", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-automation-release-controls-service",
      schemaVersion: "growth.learningAutomationReleaseControls.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      releaseControls: {
        status: "manual_runtime_config_required",
        requiredActionCount: 1,
        missingCheckKeys: ["runtime_enablement"],
        missingEvidenceKeys: ["scheduler_worker_target_ui"],
        missingApprovalKeys: ["backgroundWorkerApproval"],
        auditReadback: {
          status: "ready",
          activationRecords: {
            ok: true,
            status: "records_available",
            count: 1,
            statuses: ["recorded"],
            latestRecordId: "lgaract_1",
            requestedActivationGates: ["writeful_execution"]
          },
          runtimeEnablementRecords: {
            ok: true,
            status: "records_missing",
            count: 0,
            statuses: [],
            latestRecordId: "",
            requestedActivationGates: []
          }
        }
      },
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_release_1",
    activationGates: ["writeful_execution"],
    requiredApprovalKeys: ["writefulExecutionApproval", "backgroundWorkerApproval"],
    activationRecordLimit: 7,
    runtimeEnablementRecordLimit: 6,
    automationDigestUiEvidence: true,
    tasks: ["release_controls"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.bundle.evidence), ["releaseControlsSmokeEvidence"]);
  const evidence = result.bundle.evidence.releaseControlsSmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:release-controls");
  assert.equal(evidence.summary.source, "growth-learning-automation-release-controls-service");
  assert.equal(evidence.summary.status, "manual_runtime_config_required");
  assert.equal(evidence.summary.requiredActionCount, 1);
  assert.deepEqual(evidence.summary.missingCheckKeys, ["runtime_enablement"]);
  assert.deepEqual(evidence.summary.missingEvidenceKeys, ["scheduler_worker_target_ui"]);
  assert.deepEqual(evidence.summary.missingApprovalKeys, ["backgroundWorkerApproval"]);
  assert.equal(evidence.summary.auditReadback.status, "ready");
  assert.equal(evidence.summary.auditReadback.activationRecords.status, "records_available");
  assert.equal(evidence.summary.auditReadback.activationRecords.latestRecordId, "lgaract_1");
  assert.equal(evidence.summary.auditReadback.runtimeEnablementRecords.status, "records_missing");
  assert.equal(evidence.summary.configChangeApplied, false);
  assert.equal(evidence.summary.writefulSchedulingAllowed, false);
  assert.equal(result.bundle.scope.collectionRunId, "lgacrn_release_1");
  assert.deepEqual(result.bundle.scope.activationGates, ["writeful_execution"]);
  assert.deepEqual(result.bundle.scope.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundWorkerApproval"]);
  assert.equal(result.bundle.scope.automationDigestUiEvidence, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-release-controls.js"));
  assert.ok(calls[0].args.includes("--collection-run-id"));
  assert.ok(calls[0].args.includes("lgacrn_release_1"));
  assert.ok(calls[0].args.includes("--activation-gates"));
  assert.ok(calls[0].args.includes("writeful_execution"));
  assert.ok(calls[0].args.includes("--required-approval-keys"));
  assert.ok(calls[0].args.includes("writefulExecutionApproval,backgroundWorkerApproval"));
  assert.ok(calls[0].args.includes("--activation-record-limit"));
  assert.ok(calls[0].args.includes("7"));
  assert.ok(calls[0].args.includes("--runtime-enablement-record-limit"));
  assert.ok(calls[0].args.includes("6"));
  assert.ok(calls[0].args.includes("--automation-digest-ui-evidence"));
  assert.ok(calls[0].args.includes("true"));
  assert.equal(calls[0].args.includes("--allow-write"), false);
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service collects optional release-inventory readback as non-default evidence", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-automation-release-inventory-service",
      schemaVersion: "growth.learningAutomationReleaseInventory.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      releaseInventory: {
        status: "manual_runtime_config_required",
        artifactCount: 7,
        readbackKinds: [
          "release_readiness_snapshot",
          "release_collection_run",
          "release_decision",
          "release_package",
          "release_approval",
          "release_activation",
          "runtime_enablement"
        ],
        missingRecordKinds: ["runtime_enablement"],
        blockedRecordKinds: [],
        latestCollectionRunId: "lgacrn_release_1",
        latestPackageId: "lgapkg_release_1",
        latestDecisionId: "lgard_release_1",
        latestActivationId: "lgaract_release_1",
        latestRuntimeEnablementId: "",
        controls: {
          status: "manual_runtime_config_required",
          requiredActionCount: 1,
          nextActionKey: "enable_runtime_config",
          missingCheckKeys: ["runtime_enablement"],
          blockedCheckKeys: [],
          missingEvidenceKeys: ["scheduler_worker_target_ui"],
          missingApprovalKeys: []
        }
      },
      artifactReadback: {
        packages: {
          ok: true,
          status: "records_available",
          count: 1,
          statuses: ["ready_for_release_review"],
          latest: { id: "lgapkg_release_1", status: "ready_for_release_review" },
          ids: ["lgapkg_release_1"]
        },
        runtimeEnablements: {
          ok: true,
          status: "records_missing",
          count: 0,
          statuses: [],
          latest: null,
          ids: []
        }
      },
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_release_1",
    activationGates: ["writeful_execution"],
    requiredApprovalKeys: ["writefulExecutionApproval"],
    activationRecordLimit: 7,
    runtimeEnablementRecordLimit: 6,
    automationDigestUiEvidence: true,
    tasks: ["release_inventory"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.bundle.evidence), ["releaseInventorySmokeEvidence"]);
  const evidence = result.bundle.evidence.releaseInventorySmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:release-inventory");
  assert.equal(evidence.summary.source, "growth-learning-automation-release-inventory-service");
  assert.equal(evidence.summary.status, "manual_runtime_config_required");
  assert.equal(evidence.summary.artifactCount, 7);
  assert.equal(evidence.summary.latestPackageId, "lgapkg_release_1");
  assert.deepEqual(evidence.summary.missingRecordKinds, ["runtime_enablement"]);
  assert.equal(evidence.summary.controls.status, "manual_runtime_config_required");
  assert.equal(evidence.summary.controls.requiredActionCount, 1);
  assert.equal(evidence.summary.artifactReadback.packages.status, "records_available");
  assert.equal(evidence.summary.artifactReadback.packages.latestId, "lgapkg_release_1");
  assert.equal(evidence.summary.artifactReadback.runtimeEnablements.status, "records_missing");
  assert.equal(evidence.summary.configChangeApplied, false);
  assert.equal(evidence.summary.writefulSchedulingAllowed, false);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-release-inventory.js"));
  assert.ok(calls[0].args.includes("--collection-run-id"));
  assert.ok(calls[0].args.includes("lgacrn_release_1"));
  assert.ok(calls[0].args.includes("--activation-gates"));
  assert.ok(calls[0].args.includes("writeful_execution"));
  assert.ok(calls[0].args.includes("--required-approval-keys"));
  assert.ok(calls[0].args.includes("writefulExecutionApproval"));
  assert.ok(calls[0].args.includes("--activation-record-limit"));
  assert.ok(calls[0].args.includes("7"));
  assert.ok(calls[0].args.includes("--runtime-enablement-record-limit"));
  assert.ok(calls[0].args.includes("6"));
  assert.ok(calls[0].args.includes("--automation-digest-ui-evidence"));
  assert.ok(calls[0].args.includes("true"));
  assert.equal(calls[0].args.includes("--allow-write"), false);
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service collects optional release-dashboard readback as non-default evidence", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-automation-release-dashboard-service",
      schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      releaseDashboard: {
        status: "manual_runtime_config_required",
        readinessStatus: "incomplete",
        controlsStatus: "manual_runtime_config_required",
        inventoryStatus: "manual_runtime_config_required",
        readyForReleaseReview: false,
        requiredActionCount: 2,
        nextAction: { key: "enable_runtime_config", action: "enable_runtime_config", requiredActor: "owner" },
        artifactCount: 7,
        latestCollectionRunId: "lgacrn_release_1",
        latestPackageId: "lgapkg_release_1",
        latestDecisionId: "lgard_release_1",
        latestActivationId: "lgaract_release_1",
        latestRuntimeEnablementId: "",
        missingRecordKinds: ["runtime_enablement"],
        blockedRecordKinds: [],
        missingCheckKeys: ["runtime_enablement"],
        blockedCheckKeys: [],
        missingEvidenceKeys: ["scheduler_worker_target_ui"],
        missingApprovalKeys: [],
        persistedApprovalKeys: ["writefulExecutionApproval"]
      },
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_release_1",
    activationGates: ["writeful_execution"],
    requiredApprovalKeys: ["writefulExecutionApproval"],
    activationRecordLimit: 7,
    runtimeEnablementRecordLimit: 6,
    automationDigestUiEvidence: true,
    tasks: ["release_dashboard"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.bundle.evidence), ["releaseDashboardSmokeEvidence"]);
  const evidence = result.bundle.evidence.releaseDashboardSmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:release-dashboard");
  assert.equal(evidence.summary.source, "growth-learning-automation-release-dashboard-service");
  assert.equal(evidence.summary.schemaVersion, "growth.learningAutomationReleaseDashboard.v1");
  assert.equal(evidence.summary.status, "manual_runtime_config_required");
  assert.equal(evidence.summary.requiredActionCount, 2);
  assert.equal(evidence.summary.nextActionKey, "enable_runtime_config");
  assert.equal(evidence.summary.latestPackageId, "lgapkg_release_1");
  assert.deepEqual(evidence.summary.missingRecordKinds, ["runtime_enablement"]);
  assert.deepEqual(evidence.summary.persistedApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(evidence.summary.configChangeApplied, false);
  assert.equal(evidence.summary.writefulSchedulingAllowed, false);
  assert.equal(evidence.summary.runtimeConfigMutationPerformed, false);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-release-dashboard.js"));
  assert.ok(calls[0].args.includes("--collection-run-id"));
  assert.ok(calls[0].args.includes("lgacrn_release_1"));
  assert.ok(calls[0].args.includes("--activation-gates"));
  assert.ok(calls[0].args.includes("writeful_execution"));
  assert.ok(calls[0].args.includes("--required-approval-keys"));
  assert.ok(calls[0].args.includes("writefulExecutionApproval"));
  assert.ok(calls[0].args.includes("--activation-record-limit"));
  assert.ok(calls[0].args.includes("7"));
  assert.ok(calls[0].args.includes("--runtime-enablement-record-limit"));
  assert.ok(calls[0].args.includes("6"));
  assert.ok(calls[0].args.includes("--automation-digest-ui-evidence"));
  assert.ok(calls[0].args.includes("true"));
  assert.equal(calls[0].args.includes("--allow-write"), false);
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service collects platform action evidence from read-only smoke", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-automation-platform-action-evidence-service",
      status: "pass",
      count: 1,
      latestReceipt: {
        eventId: "event_platform_action",
        actionHandoffId: "lgahand_1",
        inboxItemId: "inbox_1",
        clickUrlPresent: true
      }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["platform_action"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.bundle.evidence), ["platformActionEvidence"]);
  assert.equal(result.bundle.evidence.platformActionEvidence.status, "pass");
  assert.equal(result.bundle.evidence.platformActionEvidence.smoke, "npm run smoke:platform-action-evidence");
  assert.equal(result.bundle.evidence.platformActionEvidence.summary.source, "growth-learning-automation-platform-action-evidence-service");
  assert.equal(result.bundle.evidence.platformActionEvidence.summary.status, "pass");
  assert.equal(result.bundle.evidence.platformActionEvidence.summary.count, 1);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-platform-action-evidence.js"));
  assert.ok(calls[0].args.includes("--json"));
  assert.equal(JSON.stringify(result.bundle).includes("clickUrl"), false);
});

test("release evidence bundle service collects central visual evidence from read-only smoke", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: "growth-learning-automation-central-visual-evidence-service",
      status: "pass",
      readyForReleaseEvidence: true,
      visualEvidence: {
        source: "home-ai-ios-pwa-visual-harness",
        pluginId: "growth",
        scenario: "embedded-plugin-shell",
        screenshotPresent: true,
        screenshotArtifactName: "growth-embedded.png",
        evidenceFileName: "central-visual.json",
        assertionCount: 2,
        failedAssertionCount: 0
      }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["central_visual"],
    centralVisualEvidenceFile: "/Users/xuxin/.homeai-qa/artifacts/central-visual.json"
  });

  assert.equal(result.ok, true);
  assert.equal(result.bundle.evidence.centralVisualEvidence.status, "pass");
  assert.equal(result.bundle.evidence.centralVisualEvidence.smoke, "npm run smoke:central-visual-evidence");
  assert.equal(result.bundle.evidence.centralVisualEvidence.summary.source, "growth-learning-automation-central-visual-evidence-service");
  assert.equal(result.bundle.evidence.centralVisualEvidence.summary.readyForReleaseEvidence, true);
  assert.equal(result.bundle.scope.centralVisualEvidenceFilePresent, true);
  assert.equal(result.bundle.scope.centralVisualEvidenceFile, undefined);
  assert.equal(JSON.stringify(result.bundle).includes("/Users/xuxin/.homeai-qa"), false);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-central-visual-evidence.js"));
  assert.ok(calls[0].args.includes("--central-visual-evidence-file"));
  assert.ok(calls[0].args.includes("/Users/xuxin/.homeai-qa/artifacts/central-visual.json"));
  assert.ok(calls[0].args.includes("--plugin-id"));
  assert.ok(calls[0].args.includes("growth"));
  assert.ok(calls[0].args.includes("--scenario"));
  assert.ok(calls[0].args.includes("embedded-plugin-shell"));
});

test("release evidence bundle service blocks controlled daily-loop write evidence unless explicitly allowed", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for gated write evidence");
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["daily_loop_write"]
  });

  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
  assert.equal(result.bundle.summary.taskCount, 1);
  assert.equal(result.bundle.summary.blockedCount, 1);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["daily_loop_write"]);
  const evidence = result.bundle.evidence.productionDailyLoopWriteSmokeEvidence;
  assert.equal(evidence.status, "blocked");
  assert.equal(evidence.error, "release_evidence_bundle_write_evidence_not_allowed");
  assert.equal(evidence.requiredFlag, "--allow-write-evidence");
  assert.equal(evidence.summary.writeEvidenceAllowed, false);
  assert.equal(result.bundle.tasks[0].source, "npm run smoke:daily-loop");
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service runs controlled daily-loop write smoke only after bundle write approval", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      operation: "publish",
      source: path.basename(args[0]),
      summary: { published: true }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    planDraftId: "lgpd_daily_1",
    dailyLoopWriteOperation: "publish",
    allowWriteEvidence: true,
    tasks: ["daily_loop_write"]
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-daily-loop.js"));
  assert.ok(calls[0].args.includes("--allow-write"));
  assert.ok(calls[0].args.includes("--operation"));
  assert.ok(calls[0].args.includes("publish"));
  assert.ok(calls[0].args.includes("--plan-draft-id"));
  assert.ok(calls[0].args.includes("lgpd_daily_1"));
  const evidence = result.bundle.evidence.productionDailyLoopWriteSmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:daily-loop");
  assert.equal(evidence.summary.operation, "publish");
});

test("release evidence bundle service blocks unsafe daily-loop write task scope before runner execution", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for invalid write scope");
  });

  const invalidOperation = service.buildBundle({
    workspaceId: "weixin_fanfan",
    allowWriteEvidence: true,
    dailyLoopWriteOperation: "preview",
    tasks: ["daily_loop_write"]
  });
  assert.equal(invalidOperation.ok, false);
  assert.equal(invalidOperation.bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_daily_loop_write_operation_invalid");
  assert.deepEqual(invalidOperation.bundle.evidence.productionDailyLoopWriteSmokeEvidence.allowedOperations, ["draft", "publish"]);

  const missingDraftId = service.buildBundle({
    workspaceId: "weixin_fanfan",
    allowWriteEvidence: true,
    dailyLoopWriteOperation: "publish",
    tasks: ["daily_loop_write"]
  });
  assert.equal(missingDraftId.ok, false);
  assert.equal(missingDraftId.bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_plan_draft_id_required");
  assert.equal(calls.length, 0);
});

test("release evidence bundle service fails closed for missing workspace, invalid task, and privacy-risk smoke output", () => {
  const missingWorkspace = createServiceWithRunner(() => ({ status: 0, stdout: "{}" }))
    .service
    .buildBundle({});
  assert.deepEqual(missingWorkspace, {
    ok: false,
    error: "release_evidence_bundle_workspace_required"
  });

  const invalidTask = createServiceWithRunner(() => ({ status: 0, stdout: "{}" }))
    .service
    .buildBundle({ workspaceId: "weixin_fanfan", tasks: ["unknown_task"] });
  assert.equal(invalidTask.ok, false);
  assert.equal(invalidTask.error, "release_evidence_bundle_task_invalid");
  assert.deepEqual(invalidTask.invalidTaskIds, ["unknown_task"]);
  assert.ok(invalidTask.allowedTaskIds.includes("learner_cycle"));
  assert.ok(invalidTask.allowedTaskIds.includes("target_provisioning"));
  assert.ok(invalidTask.allowedTaskIds.includes("daily_loop_write"));

  const privacy = createServiceWithRunner(() => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      rawPrompt: "must not be persisted"
    })
  })).service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["planner_readiness"]
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.status, "blocked");
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.error, "release_evidence_bundle_smoke_privacy_failed");
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.privacyFindingCount, 1);
  assert.equal(JSON.stringify(privacy.bundle).includes("must not be persisted"), false);

  const approvalPrivacy = createServiceWithRunner(() => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      releaseApproval: {
        writefulExecutionApproval: {
          approved: true,
          rawPrompt: "must not be persisted"
        }
      }
    })
  })).service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["release_approval"]
  });
  assert.equal(approvalPrivacy.ok, false);
  assert.equal(approvalPrivacy.bundle.tasks[0].status, "blocked");
  assert.equal(approvalPrivacy.bundle.tasks[0].error, "release_evidence_bundle_smoke_privacy_failed");
  assert.equal(JSON.stringify(approvalPrivacy.bundle).includes("must not be persisted"), false);
});
