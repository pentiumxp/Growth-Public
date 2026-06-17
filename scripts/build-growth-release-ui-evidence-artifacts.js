#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const {
  UI_GATE_SPECS
} = require("../src/services/learning-automation-ui-evidence-service");
const {
  UI_EVIDENCE_COLLECTION_TASKS
} = require("../src/services/learning-automation-ui-evidence-task-registry");

const ARTIFACT_MANIFEST_SCHEMA = "growth.learningAutomationReleaseEvidenceArtifactManifest.v1";
const RELEASE_UI_ARTIFACT_SCHEMA = "growth.learningAutomationReleaseUiEvidenceArtifact.v1";

const DEFAULT_OUTPUT_DIR = path.join(os.tmpdir(), "growth-release-ui-evidence-artifacts");

const GATE_MARKER_SPECS = Object.freeze({
  ownerDailyUiEvidence: Object.freeze({
    screen: "owner_generation",
    route: "/growth/owner/generate",
    markers: Object.freeze({
      owner_daily_generation: "data-card-generation-advance",
      daily_loop_preview: "data-card-generation-plan-preview",
      target_context: "data-card-generation-target-provisioning"
    })
  }),
  ownerAuditUiEvidence: Object.freeze({
    screen: "owner_audit",
    route: "/growth/owner/generate#audit",
    markers: Object.freeze({
      cycle_history: "data-card-generation-cycle-history",
      cycle_audit: "data-card-generation-cycle-drilldown",
      owner_correction: "data-card-generation-correction-form"
    })
  }),
  proposalReviewUiEvidence: Object.freeze({
    screen: "proposal_review",
    route: "/growth/owner/generate#proposal",
    markers: Object.freeze({
      proposal_list: "data-automation-proposal-row",
      owner_decision: "data-automation-proposal-review",
      status_readback: "data-automation-proposal-action-status"
    })
  }),
  releasePackageReviewUiEvidence: Object.freeze({
    screen: "release_package_review",
    route: "/growth/owner/generate#release",
    markers: Object.freeze({
      package_candidate_build: "data-release-package-build",
      package_candidate_status: "data-release-package-status",
      record_package_action: "data-release-workbench-endpoint=\"release_package\""
    })
  }),
  automationDigestUiEvidence: Object.freeze({
    screen: "automation_digest",
    route: "/growth/owner/generate#digest",
    markers: Object.freeze({
      digest_list: "data-automation-digest-row",
      required_action: "data-automation-digest-review",
      review_state: "data-automation-digest-action-status"
    })
  }),
  automationActionHandoffUiEvidence: Object.freeze({
    screen: "automation_action_handoff",
    route: "/growth/owner/generate#action-handoff",
    markers: Object.freeze({
      handoff_list: "data-automation-action-handoff-row",
      delivery_status: "data-automation-action-handoff-action-status",
      action_inbox_boundary: "data-automation-action-handoff-deliver"
    })
  }),
  schedulerExecutionUiEvidence: Object.freeze({
    screen: "scheduler_execution",
    route: "/growth/owner/generate#scheduler-execution",
    markers: Object.freeze({
      execution_history: "data-automation-scheduler-execution-row",
      disabled_state: "默认禁用",
      owner_execute_action: "data-automation-scheduler-execution-execute"
    })
  }),
  schedulerRunUiEvidence: Object.freeze({
    screen: "scheduler_run",
    route: "/growth/owner/generate#scheduler-run",
    markers: Object.freeze({
      run_history: "data-automation-scheduler-run-row",
      default_disabled: "默认禁用",
      partial_failure_state: "data-automation-scheduler-run-action-status"
    })
  }),
  schedulerWorkerTargetUiEvidence: Object.freeze({
    screen: "scheduler_worker_target",
    route: "/growth/owner/generate#worker-target",
    markers: Object.freeze({
      target_list: "data-automation-scheduler-worker-target-row",
      owner_review_state: "data-automation-scheduler-worker-target-review",
      enabled_disabled_state: "data-automation-scheduler-worker-target-status"
    })
  })
});

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values = [], max = 64) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values).flat()) {
    const clean = cleanString(value, 180);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function splitList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => cleanString(item, 180))
    .filter(Boolean);
}

function parseArgs(args = []) {
  return {
    centralVisualEvidenceFile: firstArgValue(args, [
      "--central-visual-evidence-file",
      "--centralVisualEvidenceFile",
      "--central-visual-file",
      "--home-ai-visual-report"
    ], ""),
    outputDir: firstArgValue(args, ["--output-dir", "--outputDir"], DEFAULT_OUTPUT_DIR),
    manifestOutputFile: firstArgValue(args, [
      "--manifest-output-file",
      "--manifestOutputFile",
      "--output-file",
      "--outputFile"
    ], ""),
    pluginId: firstArgValue(args, ["--plugin-id", "--pluginId"], "growth") || "growth",
    scenario: firstArgValue(args, ["--scenario"], "embedded-plugin-shell") || "embedded-plugin-shell",
    taskIds: splitList(firstArgValue(args, ["--tasks", "--task-ids", "--taskIds"], "")),
    evidenceKeys: splitList(firstArgValue(args, ["--evidence-keys", "--evidenceKeys"], "")),
    json: hasFlag(args, "--json") || hasFlag(args, "--pretty")
  };
}

function parseJsonText(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("json_empty");
  try {
    return JSON.parse(trimmed);
  } catch (firstError) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw firstError;
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function readJsonFile(filePath) {
  return parseJsonText(fs.readFileSync(filePath, "utf8"));
}

function assertionPasses(assertion = {}) {
  const status = cleanString(assertion.status || assertion.result || assertion.state, 80).toLowerCase();
  if (assertion.pass === false || assertion.ok === false) return false;
  if (["fail", "failed", "error", "blocked"].includes(status)) return false;
  return assertion.pass === true || assertion.ok === true || ["pass", "passed", "ok", ""].includes(status);
}

function validateCentralVisualReport(report = {}, options = {}) {
  const pluginId = cleanString(options.pluginId || "growth", 80);
  const scenario = cleanString(options.scenario || "embedded-plugin-shell", 120);
  const assertions = asArray(report.assertions);
  const failedAssertions = assertions.filter((assertion) => !assertionPasses(assertion));
  const screenshot = objectOnly(report.screenshot);
  const metrics = objectOnly(report.metrics);
  const frame = objectOnly(metrics.frame);
  const screenshotBytes = Number(screenshot.bytes || 0) || 0;
  const reportPluginId = cleanString(report.pluginId || metrics.pluginId, 80);
  const reportScenario = cleanString(report.scenario || metrics.scenario, 120);
  const missing = [];
  if (report.ok !== true) missing.push("central_visual_ok");
  if (scenario && reportScenario !== scenario) missing.push("matching_central_visual_scenario");
  if (pluginId && reportPluginId !== pluginId) missing.push("matching_plugin_id");
  if (!screenshot.path && screenshotBytes <= 0) missing.push("screenshot_artifact");
  if (screenshotBytes > 0 && screenshotBytes < 4096) missing.push("screenshot_min_bytes");
  if (assertions.length === 0) missing.push("central_visual_assertions");
  if (failedAssertions.length) missing.push("passing_central_visual_assertions");
  if (frame.exists === false) missing.push("embedded_frame_exists");
  return {
    ok: missing.length === 0,
    missingRequired: missing,
    failedAssertions,
    screenshot,
    metrics,
    checkedAt: cleanString(report.finishedAt || report.finished_at || report.startedAt || report.started_at, 100),
    clientVersion: cleanString(metrics.clientVersion || report.clientVersion || report.client_version, 120),
    assertionCount: assertions.length,
    scenario: reportScenario,
    pluginId: reportPluginId
  };
}

function loadGrowthCardGenerationUi() {
  const sourcePath = path.join(__dirname, "..", "public", "growth-card-generation-ui.js");
  const context = vm.createContext({
    window: {},
    globalThis: {},
    console
  });
  const source = fs.readFileSync(sourcePath, "utf8");
  vm.runInContext(source, context, { filename: sourcePath });
  const api = context.window.HermesGrowthCardGenerationUi || context.globalThis.HermesGrowthCardGenerationUi;
  if (!api || typeof api.renderOwnerCardGenerationPanel !== "function") {
    throw new Error("growth_card_generation_ui_render_unavailable");
  }
  return api;
}

function sampleReleaseArtifactTemplate() {
  return {
    ok: true,
    status: "artifact_manifest_required",
    releaseArtifactTemplate: {
      status: "artifact_manifest_required",
      artifactSlotCount: 9,
      artifactSlots: UI_EVIDENCE_COLLECTION_TASKS.map((task) => ({
        taskId: task.taskId,
        evidenceKey: task.evidenceKey,
        checkKey: task.checkKey,
        uiGate: task.uiGate,
        source: "home_ai_central_ui_visual_toolchain",
        required: true
      })),
      releaseEvidenceChecklist: {
        status: "release_evidence_actions_required",
        items: UI_EVIDENCE_COLLECTION_TASKS.map((task) => ({
          key: `artifact:${task.taskId}`,
          label: task.evidenceKey,
          kind: "home_ai_visual_artifact",
          status: "missing"
        }))
      },
      releaseEvidenceActionPlan: {
        status: "release_evidence_actions_required",
        readyPhase: "release_evidence_prerequisites",
        submittableActionCount: 0,
        actions: [
          {
            key: "prepare:release_evidence_artifact_manifest",
            label: "Prepare release evidence artifact manifest",
            readyToSubmit: false,
            route: {
              path: "/api/v1/growth/automation/release-workbench/actions"
            }
          },
          {
            key: "record:release_package",
            label: "Record release package",
            endpointKey: "release_package",
            readyToSubmit: false
          }
        ]
      }
    }
  };
}

function sampleOwnerPanelOptions() {
  const targetNodeIds = ["kg_ls_science_scientific_enquiry_consider_evidence_and_approach"];
  const planDraft = {
    planDraftId: "lgplan_ui_evidence_sample",
    status: "draft",
    planSummary: "Summary-only science daily plan",
    itemCount: 1,
    targetNodeIds,
    items: [{
      itemId: "item_ui_evidence_sample",
      reason: "Repair weak evidence handling with low pressure daily practice.",
      targetNodeIds,
      evidenceRequirements: ["short_answer", "explain_reasoning"]
    }]
  };
  const proposal = {
    proposalId: "lgaprop_ui_evidence_sample",
    status: "proposed",
    planDraftId: planDraft.planDraftId,
    proposalSummary: "Next science daily card",
    targetNodeIds,
    rationale: {
      plan: {
        selectedItemId: "item_ui_evidence_sample",
        reason: "Use the next validated draft item."
      }
    },
    execution: {
      status: "pending"
    }
  };
  const digest = {
    digestId: "lgadig_ui_evidence_sample",
    status: "pending",
    subject: "science",
    summary: {
      wouldPublish: 1,
      blocked: 0,
      skipped: 0,
      requiredActions: 1
    },
    requiredActions: [{
      proposalId: proposal.proposalId,
      selectedItemId: "item_ui_evidence_sample"
    }],
    candidates: [{
      proposalId: proposal.proposalId
    }]
  };
  const handoff = {
    handoffId: "lgahoff_ui_evidence_sample",
    digestId: digest.digestId,
    deliveryStatus: "pending_delivery",
    proposalId: proposal.proposalId,
    actionSummary: {
      requiredActions: 1,
      blocked: 0
    },
    actions: [{
      proposalId: proposal.proposalId,
      selectedItemId: "item_ui_evidence_sample"
    }]
  };
  return {
    workspaceId: "weixin_stephen",
    viewTargets: [{
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      label: "Fanfan",
      targetEnabled: true
    }],
    state: {
      cardGeneration: {
        status: "drafted",
        selectedWorkspaceId: "weixin_stephen",
        context: {
          target: {
            workspaceId: "weixin_stephen",
            learnerId: "weixin_stephen",
            enabled: true
          },
          readiness: {
            targetEnabled: true,
            learningGraphReady: true,
            historySummaryReady: true,
            plannerContextReady: true,
            plannerGatewayConfigured: true,
            authoringGatewayConfigured: true,
            evaluationGatewayConfigured: true
          },
          graph: {
            nodeCount: 294,
            edgeCount: 329
          },
          targetProvisioning: {
            targetEnabled: true,
            mode: "sample_default",
            selectedDomainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
            selectedDomain: "science",
            selectedSubject: "science",
            selectedTargetNodeId: targetNodeIds[0],
            draft: {
              domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
              subject: "science",
              packs: [{ id: "domain_pack_fanfan_cambridge_pathway_v1", title: "Cambridge Pathway" }],
              subjects: [{ id: "science", title: "Science" }]
            }
          },
          suggestedPlan: {
            title: "Science evidence practice",
            domain: "science",
            subject: "science",
            targetNodeId: targetNodeIds[0],
            targetNodeIds,
            evidenceRequirements: ["short_answer", "explain_reasoning"]
          },
          ownerAudit: {
            ok: true,
            available: true,
            summary: {
              planDraftCount: 1,
              profileDeltaCount: 1,
              correctionCount: 1
            },
            planAudit: {
              items: [{
                planDraftId: planDraft.planDraftId,
                status: "draft",
                targetNodeIds
              }]
            },
            profileDeltaAudit: {
              items: [{
                profileDeltaId: "profile_delta_ui_evidence_sample",
                evaluationId: "lgeval_ui_evidence_sample",
                targetNodeIds,
                status: "pass"
              }]
            },
            profileCorrections: {
              items: [{
                correctionId: "lgcorr_ui_evidence_sample",
                action: "confirm_profile_delta",
                status: "recorded",
                targetNodeIds
              }]
            }
          },
          releaseArtifactTemplate: sampleReleaseArtifactTemplate(),
          releaseWorkbench: {
            ok: true,
            releaseWorkbench: {
              status: "release_evidence_required",
              ownerActionCount: 1,
              missingEvidenceKeys: Object.values(UI_GATE_SPECS).map((spec) => spec.checkKey),
              missingApprovalKeys: ["writefulExecutionApproval"],
              missingRecordKinds: ["release_package"],
              ownerActions: [{
                key: "record:release_package",
                label: "Record release package",
                endpointKey: "release_package",
                action: "record_release_package",
                source: "release workbench"
              }]
            }
          }
        },
        dailyLoopDraftResult: {
          ok: true,
          planDraft
        },
        automationProposals: {
          status: "ready",
          actionStatus: "created",
          actionResult: {
            proposal
          },
          data: {
            ok: true,
            proposals: [proposal]
          }
        },
        automationDigests: {
          status: "ready",
          actionStatus: "reviewed",
          actionResult: {
            digest: Object.assign({}, digest, { status: "reviewed" })
          },
          data: {
            ok: true,
            digests: [digest, Object.assign({}, digest, {
              digestId: "lgadig_ui_evidence_reviewed",
              status: "reviewed"
            })]
          }
        },
        automationActionHandoffs: {
          status: "ready",
          actionStatus: "delivered",
          actionResult: {
            deliveryStatus: "delivered",
            handoff: Object.assign({}, handoff, { deliveryStatus: "delivered" })
          },
          data: {
            ok: true,
            handoffs: [handoff, Object.assign({}, handoff, {
              handoffId: "lgahoff_ui_evidence_delivered",
              deliveryStatus: "delivered"
            })]
          }
        },
        automationSchedulerExecutions: {
          status: "ready",
          actionStatus: "executed",
          actionResult: {
            execution: {
              executionId: "lgasexe_ui_evidence_sample",
              status: "blocked",
              reason: "default disabled"
            }
          },
          data: {
            ok: true,
            executions: [{
              executionId: "lgasexe_ui_evidence_sample",
              status: "blocked",
              handoffId: handoff.handoffId,
              proposalId: proposal.proposalId,
              reason: "default disabled"
            }]
          }
        },
        automationSchedulerRuns: {
          status: "ready",
          actionStatus: "ran",
          actionResult: {
            run: {
              runId: "lgasrun_ui_evidence_sample",
              status: "partial",
              reason: "partial failure sample"
            }
          },
          data: {
            ok: true,
            runs: [{
              runId: "lgasrun_ui_evidence_sample",
              status: "partial",
              reason: "partial failure sample",
              summary: {
                inspectedHandoffs: 1,
                attemptedExecutions: 1
              }
            }]
          }
        },
        automationSchedulerWorkerTargets: {
          status: "ready",
          actionStatus: "reviewed",
          actionResult: {
            target: {
              targetId: "lgastgt_ui_evidence_sample",
              status: "enabled"
            }
          },
          data: {
            ok: true,
            targets: [{
              targetId: "lgastgt_ui_evidence_sample",
              status: "enabled",
              horizon: "daily_plan",
              target: {
                subject: "science",
                domain: "science",
                targetNodeIds
              },
              policy: {
                productionSchedulingAllowed: false
              }
            }, {
              targetId: "lgastgt_ui_evidence_disabled",
              status: "disabled",
              horizon: "daily_plan",
              target: {
                subject: "science",
                domain: "science",
                targetNodeIds
              }
            }]
          }
        },
        releaseWorkbench: {
          status: "ready",
          packageStatus: "built",
          packageCandidate: {
            ok: true,
            packageId: "lgarpkg_ui_evidence_sample",
            packageStatus: "candidate",
            readinessStatus: "incomplete"
          },
          data: {
            ok: true,
            releaseWorkbench: {
              status: "release_evidence_required",
              ownerActionCount: 1,
              missingEvidenceKeys: Object.values(UI_GATE_SPECS).map((spec) => spec.checkKey),
              missingApprovalKeys: ["writefulExecutionApproval"],
              missingRecordKinds: ["release_package"],
              ownerActions: [{
                key: "record:release_package",
                label: "Record release package",
                endpointKey: "release_package",
                action: "record_release_package",
                source: "release workbench"
              }]
            }
          }
        },
        releaseArtifactTemplate: {
          status: "ready",
          data: sampleReleaseArtifactTemplate()
        },
        releaseWorkbenchActionAudits: {
          status: "ready",
          data: {
            actionAudits: [{
              actionAuditId: "lgaraud_ui_evidence_sample",
              endpointKey: "release_package",
              actionKey: "record:release_package",
              status: "recorded"
            }]
          }
        },
        releaseStatusReadbacks: {
          status: "ready",
          data: {
            items: [{
              key: "release_readiness",
              status: "incomplete"
            }]
          }
        },
        releaseEvidenceLedger: {
          status: "ready",
          data: {
            evidence: [],
            approvals: []
          }
        },
        releaseLifecycleRecords: {
          status: "ready",
          data: {
            preflightReports: [],
            activationRecords: [],
            runtimeEnablements: []
          }
        },
        cycleHistory: {
          status: "ready",
          selectedCycle: {
            taskCardId: "ltask_ui_evidence_sample",
            evaluationId: "lgeval_ui_evidence_sample",
            planDraftId: planDraft.planDraftId,
            profileDeltaId: "profile_delta_ui_evidence_sample",
            evidenceId: "lgevid_ui_evidence_sample",
            correctionId: "lgcorr_ui_evidence_sample",
            status: "completed"
          },
          data: {
            cycles: [{
              taskCardId: "ltask_ui_evidence_sample",
              evaluationId: "lgeval_ui_evidence_sample",
              status: "completed"
            }]
          }
        },
        cycleAudit: {
          status: "ready",
          data: {
            ok: true,
            taskCardId: "ltask_ui_evidence_sample"
          }
        },
        ownerCorrection: {
          status: "recorded",
          result: {
            correctionId: "lgcorr_ui_evidence_sample"
          }
        },
        ownerCorrectionDraft: "Summary-only correction note.",
        ownerAuditReviews: {
          status: "ready",
          data: {
            reviews: [{
              reviewId: "lgoar_ui_evidence_sample",
              decision: "accepted",
              status: "recorded"
            }]
          }
        }
      }
    }
  };
}

function renderOwnerPanelHtml() {
  const api = loadGrowthCardGenerationUi();
  return String(api.renderOwnerCardGenerationPanel(sampleOwnerPanelOptions()) || "");
}

function selectedTasks(options = {}) {
  const byTaskId = new Map(UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.taskId, task]));
  const byEvidenceKey = new Map(UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.evidenceKey, task]));
  const taskIds = uniqueStrings(options.taskIds || []);
  const evidenceKeys = uniqueStrings(options.evidenceKeys || []);
  if (!taskIds.length && !evidenceKeys.length) return UI_EVIDENCE_COLLECTION_TASKS;
  const selected = [];
  for (const taskId of taskIds) {
    const normalized = taskId.replace(/-/g, "_");
    if (byTaskId.has(normalized)) selected.push(byTaskId.get(normalized));
  }
  for (const evidenceKey of evidenceKeys) {
    if (byEvidenceKey.has(evidenceKey)) selected.push(byEvidenceKey.get(evidenceKey));
  }
  return Array.from(new Map(selected.map((task) => [task.taskId, task])).values());
}

function markerAssertionsFor(task, html = "") {
  const spec = UI_GATE_SPECS[task.evidenceKey] || {};
  const markerSpec = GATE_MARKER_SPECS[task.evidenceKey] || {};
  const markers = markerSpec.markers || {};
  const assertions = asArray(spec.requiredCoverage).map((coverageId) => {
    const marker = cleanString(markers[coverageId], 240);
    const pass = marker ? html.includes(marker) : false;
    return {
      name: `growth_owner_ui_marker:${task.uiGate}:${coverageId}`,
      status: pass ? "pass" : "failed",
      coverageId,
      markerPresent: pass
    };
  });
  return {
    assertions,
    coverage: assertions.filter((item) => item.status === "pass").map((item) => item.coverageId),
    missingCoverage: assertions.filter((item) => item.status !== "pass").map((item) => item.coverageId)
  };
}

function artifactFileName(task, stamp = "") {
  const suffix = stamp || new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  return `growth-release-ui-${task.uiGate}-${suffix}.json`;
}

function publicScreenshotSummary(screenshot = {}) {
  const source = objectOnly(screenshot);
  const fileName = path.basename(cleanString(source.path || source.file || source.filePath || source.file_path, 500));
  const bytes = Number(source.bytes || source.size || source.byteLength || 0) || 0;
  return {
    screenshotPresent: Boolean(fileName || bytes > 0),
    screenshotArtifactName: fileName,
    screenshotBytes: Math.max(0, bytes)
  };
}

function artifactForTask({ task, central, report, html, observedAt }) {
  const markerSpec = GATE_MARKER_SPECS[task.evidenceKey] || {};
  const marker = markerAssertionsFor(task, html);
  const screenshot = publicScreenshotSummary(central.screenshot);
  const centralAssertions = asArray(report.assertions).map((assertion) => ({
    name: cleanString(assertion.name || assertion.label || "central_visual_assertion", 160),
    status: assertionPasses(assertion) ? "pass" : "failed"
  }));
  const assertionList = [
    ...centralAssertions,
    ...marker.assertions
  ];
  const ok = central.ok && marker.missingCoverage.length === 0;
  return {
    schemaVersion: RELEASE_UI_ARTIFACT_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    ok,
    status: ok ? "pass" : "blocked",
    source: "home-ai-central-ios-pwa-visual-harness+growth-owner-ui-marker-adapter",
    evidenceKey: task.evidenceKey,
    checkKey: task.checkKey,
    uiGate: task.uiGate,
    checkedAt: observedAt || central.checkedAt,
    clientVersion: central.clientVersion,
    route: markerSpec.route || "/growth/owner/generate",
    screen: markerSpec.screen || task.uiGate,
    screenshotPresent: screenshot.screenshotPresent,
    screenshotArtifactName: screenshot.screenshotArtifactName,
    screenshotBytes: screenshot.screenshotBytes,
    domEvidencePresent: true,
    coverage: marker.coverage,
    assertions: assertionList,
    domAssertions: marker.assertions,
    centralVisual: {
      scenario: central.scenario,
      pluginId: central.pluginId,
      assertionCount: central.assertionCount,
      screenshotPresent: screenshot.screenshotPresent,
      screenshotArtifactName: screenshot.screenshotArtifactName
    },
    boundary: {
      summaryOnly: true,
      homeAiOwnsVisualHarness: true,
      growthRunsNoVisualTooling: true,
      growthUsesRenderedUiMarkersOnly: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildReleaseUiEvidenceArtifacts(options = {}) {
  if (!options.centralVisualEvidenceFile) {
    return {
      ok: false,
      error: "central_visual_evidence_file_required"
    };
  }
  const report = readJsonFile(options.centralVisualEvidenceFile);
  const central = validateCentralVisualReport(report, options);
  if (!central.ok) {
    return {
      ok: false,
      error: "central_visual_report_invalid",
      missingRequired: central.missingRequired,
      failedAssertionCount: central.failedAssertions.length
    };
  }
  const tasks = selectedTasks(options);
  if (!tasks.length) {
    return {
      ok: false,
      error: "release_ui_evidence_tasks_empty"
    };
  }
  const html = renderOwnerPanelHtml();
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  const outputDir = path.resolve(options.outputDir || DEFAULT_OUTPUT_DIR);
  const uiEvidenceFiles = {};
  const artifacts = [];
  const invalidTasks = [];
  for (const task of tasks) {
    const artifact = artifactForTask({
      task,
      central,
      report,
      html,
      observedAt: central.checkedAt
    });
    if (!artifact.ok) {
      invalidTasks.push({
        taskId: task.taskId,
        evidenceKey: task.evidenceKey,
        missingCoverage: markerAssertionsFor(task, html).missingCoverage
      });
      continue;
    }
    const filePath = path.join(outputDir, artifactFileName(task, stamp));
    writeJson(filePath, artifact);
    uiEvidenceFiles[task.evidenceKey] = filePath;
    artifacts.push({
      taskId: task.taskId,
      evidenceKey: task.evidenceKey,
      checkKey: task.checkKey,
      uiGate: task.uiGate,
      file: filePath
    });
  }
  if (invalidTasks.length) {
    return {
      ok: false,
      error: "growth_owner_ui_marker_coverage_incomplete",
      invalidTasks
    };
  }
  const manifest = {
    schemaVersion: ARTIFACT_MANIFEST_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    uiEvidenceFiles
  };
  const manifestOutputFile = options.manifestOutputFile
    ? path.resolve(options.manifestOutputFile)
    : path.join(outputDir, `growth-release-ui-evidence-manifest-${stamp}.json`);
  writeJson(manifestOutputFile, manifest);
  return {
    ok: true,
    source: "growth-release-ui-evidence-artifact-builder",
    schemaVersion: "growth.releaseUiEvidenceArtifactBuild.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    outputDir,
    manifestOutputFile,
    artifactCount: artifacts.length,
    artifactTaskIds: artifacts.map((artifact) => artifact.taskId),
    uiEvidenceKeys: artifacts.map((artifact) => artifact.evidenceKey),
    artifacts,
    manifest,
    centralVisual: {
      scenario: central.scenario,
      pluginId: central.pluginId,
      checkedAt: central.checkedAt,
      clientVersion: central.clientVersion,
      assertionCount: central.assertionCount,
      screenshotPresent: publicScreenshotSummary(central.screenshot).screenshotPresent,
      screenshotArtifactName: publicScreenshotSummary(central.screenshot).screenshotArtifactName
    },
    boundary: {
      homeAiOwnsVisualHarness: true,
      growthRunsNoVisualTooling: true,
      growthReadsCentralVisualArtifact: true,
      growthUsesRenderedUiMarkersOnly: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  };
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = buildReleaseUiEvidenceArtifacts(options);
  process.stdout.write(formatResult(result, options.json));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_ui_evidence_artifact_build_failed",
      detail: cleanString(error && error.message ? error.message : error, 220)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  ARTIFACT_MANIFEST_SCHEMA,
  RELEASE_UI_ARTIFACT_SCHEMA,
  GATE_MARKER_SPECS,
  parseArgs,
  parseJsonText,
  validateCentralVisualReport,
  publicScreenshotSummary,
  renderOwnerPanelHtml,
  markerAssertionsFor,
  buildReleaseUiEvidenceArtifacts,
  sampleOwnerPanelOptions
};
