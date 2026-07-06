const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const ownerCutoverEvidencePath = path.join(
  repoRoot,
  "docs",
  "IMPLEMENTATION_NOTES",
  "growth-vite-owner-cutover-evidence.json"
);
const ownerApprovalRequestPath = path.join(
  repoRoot,
  "docs",
  "IMPLEMENTATION_NOTES",
  "growth-vite-owner-approval-request.md"
);
const ownerCutoverEvidencePacketPath = path.join(
  repoRoot,
  "docs",
  "IMPLEMENTATION_NOTES",
  "growth-vite-owner-cutover-evidence-packet.md"
);
const deployLaneRequestDraftPath = path.join(
  repoRoot,
  "docs",
  "IMPLEMENTATION_NOTES",
  "growth-vite-deploy-lane-request-draft.json"
);

const requiredExternalEvidence = [
  {
    key: "owner_cutover_approval",
    requiredBefore: "runtime_enablement",
    source: "Owner approval in the source task thread or release authorization record"
  },
  {
    key: "central_mobile_visual_evidence",
    requiredBefore: "runtime_enablement",
    source: "central Home AI visual Harness evidence for the concrete Growth UI change"
  },
  {
    key: "deploy_lane_routing",
    requiredBefore: "production_update",
    source: "Home AI deploy lane task card with source commit, restart label, and bounded readback"
  }
];

const ownerApprovalRequestRequiredMarkers = [
  "approved_for_deploy_lane_request",
  "changes_required",
  "rejected",
  "Suggested approval wording",
  "Deploy-Lane Task Card Draft",
  "historical request shape",
  "Do not deploy from the Growth plugin thread",
  "Do not bypass the Home AI deploy lane",
  "Owner Approval Receipt Fields",
  "bounded_no_secrets"
];

const ownerApprovalRequestRoutingMarkers = [
  "Approval Request Routing",
  "ttc_1b40fc066486468771",
  "Home AI Task Intake",
  "019f091a-6ce0-7932-97b2-a5ba38556f51",
  "owner_approval_request",
  "growth-vite-esm-cutover",
  "Status: completed",
  "Owner decision was returned",
  "`owner_cutover_approval`",
  "`deploy_lane_routing`"
];

const deployLaneRequestDraftRequiredFields = [
  "schemaVersion",
  "summaryOnly",
  "status",
  "sendAllowed",
  "requiresOwnerApproval",
  "cardKind",
  "pluginId",
  "routeKind",
  "target",
  "sourceWorkspace",
  "deployReason",
  "sourceEvidence",
  "requiredDeployLaneWork",
  "productionReadback",
  "nonGoals",
  "returnCardRequired",
  "privacy"
];

function loadOwnerCutoverEvidenceReceipt(filePath = ownerCutoverEvidencePath) {
  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      path: filePath,
      code: "growth_vite_owner_cutover_evidence_missing",
      data: null
    };
  }

  try {
    return {
      ok: true,
      path: filePath,
      data: JSON.parse(fs.readFileSync(filePath, "utf8"))
    };
  } catch (error) {
    return {
      ok: false,
      path: filePath,
      code: "growth_vite_owner_cutover_evidence_invalid_json",
      message: error.message,
      data: null
    };
  }
}

function scenarioPassed(scenarios, name, pluginId) {
  return scenarios.some((scenario) => {
    return scenario
      && scenario.name === name
      && scenario.status === "pass"
      && (!pluginId || scenario.pluginId === pluginId)
      && typeof scenario.artifact === "string"
      && scenario.artifact.length > 0;
  });
}

function centralMobileVisualEvidencePresent(evidence = {}) {
  const scenarios = Array.isArray(evidence.scenarios) ? evidence.scenarios : [];
  return evidence.status === "present"
    && evidence.sufficientForOwnerCutover === true
    && evidence.privacy === "bounded_no_secrets"
    && evidence.preflight
    && evidence.preflight.status === "pass"
    && evidence.preflight.liveDebugOk === true
    && evidence.preflight.appiumOk === true
    && evidence.preflight.wdaOk === true
    && scenarioPassed(scenarios, "embedded-plugin-shell", "growth")
    && scenarioPassed(scenarios, "dark-growth-surfaces");
}

function ownerCutoverApprovalPresent(evidence = {}) {
  return evidence.status === "present"
    && evidence.decision === "approved_for_deploy_lane_request"
    && typeof evidence.approvedAt === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(evidence.approvedAt)
    && typeof evidence.approvalReference === "string"
    && evidence.approvalReference.length > 0
    && evidence.scope === "growth-vite-esm-runtime-cutover"
    && evidence.privacy === "bounded_no_secrets";
}

function deployLaneRoutingEvidencePresent(evidence = {}) {
  return evidence.status === "present"
    && typeof evidence.taskCardId === "string"
    && evidence.taskCardId.length > 0
    && evidence.cardKind === "plugin_deployment"
    && evidence.pluginId === "growth"
    && evidence.routeKind === "deployment"
    && evidence.deployReason === "growth-vite-esm-runtime-cutover"
    && typeof evidence.target === "string"
    && evidence.target.length > 0
    && evidence.returnCardRequired === true
    && evidence.privacy === "bounded_no_secrets";
}

function evidencePresentForKey(key, evidence = {}) {
  if (key === "owner_cutover_approval") {
    return ownerCutoverApprovalPresent(evidence);
  }
  if (key === "central_mobile_visual_evidence") {
    return centralMobileVisualEvidencePresent(evidence);
  }
  if (key === "deploy_lane_routing") {
    return deployLaneRoutingEvidencePresent(evidence);
  }
  return evidence.status === "present";
}

function summarizeEvidence(key, evidence = {}) {
  if (!evidence || evidence.status !== "present") return null;
  if (key === "central_mobile_visual_evidence") {
    return {
      sourceTaskCardId: evidence.sourceTaskCardId,
      returnTaskCardId: evidence.returnTaskCardId,
      sourceThreadId: evidence.sourceThreadId,
      sufficientForOwnerCutover: evidence.sufficientForOwnerCutover,
      artifactCount: Array.isArray(evidence.scenarios) ? evidence.scenarios.filter((scenario) => scenario.artifact).length : 0,
      privacy: evidence.privacy
    };
  }
  if (key === "owner_cutover_approval") {
    return {
      decision: evidence.decision,
      approvedAt: evidence.approvedAt,
      approvalReference: evidence.approvalReference,
      scope: evidence.scope,
      privacy: evidence.privacy
    };
  }
  if (key === "deploy_lane_routing") {
    return {
      taskCardId: evidence.taskCardId,
      cardKind: evidence.cardKind,
      pluginId: evidence.pluginId,
      routeKind: evidence.routeKind,
      deployReason: evidence.deployReason,
      target: evidence.target,
      returnCardRequired: evidence.returnCardRequired,
      privacy: evidence.privacy
    };
  }
  return {
    status: evidence.status
  };
}

function evaluateOwnerCutoverEvidence(receipt = loadOwnerCutoverEvidenceReceipt()) {
  const externalEvidence = receipt.data && receipt.data.externalEvidence && typeof receipt.data.externalEvidence === "object"
    ? receipt.data.externalEvidence
    : {};

  const evaluatedExternalEvidence = requiredExternalEvidence.map((requirement) => {
    const evidence = externalEvidence[requirement.key] || {};
    const present = receipt.ok && evidencePresentForKey(requirement.key, evidence);
    const summary = present ? summarizeEvidence(requirement.key, evidence) : null;
    return Object.assign({}, requirement, {
      status: present ? "present" : "missing"
    }, summary ? { evidence: summary } : {});
  });

  const missingExternalEvidence = evaluatedExternalEvidence
    .filter((item) => item.status !== "present")
    .map((item) => item.key);

  return {
    receipt: {
      ok: receipt.ok,
      path: receipt.path,
      code: receipt.code,
      schemaVersion: receipt.data && receipt.data.schemaVersion,
      updatedAt: receipt.data && receipt.data.updatedAt,
      summaryOnly: receipt.data && receipt.data.summaryOnly
    },
    requiredExternalEvidence: evaluatedExternalEvidence,
    missingExternalEvidence,
    presentExternalEvidence: evaluatedExternalEvidence
      .filter((item) => item.status === "present")
      .map((item) => item.key)
  };
}

function documentMarkerStatus(filePath, markers) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      missingMarkers: markers.slice()
    };
  }
  const text = fs.readFileSync(filePath, "utf8");
  return {
    exists: true,
    missingMarkers: markers.filter((marker) => !text.includes(marker))
  };
}

function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      exists: false,
      code: "missing",
      data: null
    };
  }
  try {
    return {
      ok: true,
      exists: true,
      data: JSON.parse(fs.readFileSync(filePath, "utf8"))
    };
  } catch (error) {
    return {
      ok: false,
      exists: true,
      code: "invalid_json",
      message: error.message,
      data: null
    };
  }
}

function deployLaneRequestDraftStatus(filePath = deployLaneRequestDraftPath) {
  const draft = loadJsonFile(filePath);
  const data = draft.data && typeof draft.data === "object" ? draft.data : {};
  const missingFields = deployLaneRequestDraftRequiredFields.filter((field) => !(field in data));
  const invalidFields = [];
  if (draft.ok) {
    if (data.schemaVersion !== "growth.viteDeployLaneRequestDraft.v1") invalidFields.push("schemaVersion");
    if (data.summaryOnly !== true) invalidFields.push("summaryOnly");
    if (data.status !== "draft_only_not_sent") invalidFields.push("status");
    if (data.sendAllowed !== false) invalidFields.push("sendAllowed");
    if (data.requiresOwnerApproval !== true) invalidFields.push("requiresOwnerApproval");
    if (data.cardKind !== "plugin_deployment") invalidFields.push("cardKind");
    if (data.pluginId !== "growth") invalidFields.push("pluginId");
    if (data.routeKind !== "deployment") invalidFields.push("routeKind");
    if (data.deployReason !== "growth-vite-esm-runtime-cutover") invalidFields.push("deployReason");
    if (data.privacy !== "bounded_no_secrets") invalidFields.push("privacy");
    if (!Array.isArray(data.requiredDeployLaneWork) || data.requiredDeployLaneWork.length === 0) invalidFields.push("requiredDeployLaneWork");
    if (!Array.isArray(data.productionReadback) || data.productionReadback.length === 0) invalidFields.push("productionReadback");
    if (!Array.isArray(data.nonGoals) || !data.nonGoals.includes("Do not bypass the Home AI deploy lane.")) invalidFields.push("nonGoals");
    if (data.returnCardRequired !== true) invalidFields.push("returnCardRequired");
  }
  const ready = draft.ok && missingFields.length === 0 && invalidFields.length === 0;
  return {
    path: filePath,
    exists: draft.exists,
    status: ready ? "draft_only_not_sent" : (draft.exists ? "incomplete" : "missing"),
    sendAllowed: false,
    requiresOwnerApproval: true,
    missingFields,
    invalidFields,
    code: draft.code
  };
}

function currentExternalEvidenceFlags(receipt = loadOwnerCutoverEvidenceReceipt()) {
  const externalEvidence = receipt.data && receipt.data.externalEvidence && typeof receipt.data.externalEvidence === "object"
    ? receipt.data.externalEvidence
    : {};
  return {
    ownerApprovalRecorded: receipt.ok && ownerCutoverApprovalPresent(externalEvidence.owner_cutover_approval || {}),
    deployRoutingRecorded: receipt.ok && deployLaneRoutingEvidencePresent(externalEvidence.deploy_lane_routing || {})
  };
}

function ownerApprovalRequestRoutingStatus(filePath = ownerApprovalRequestPath) {
  const routing = documentMarkerStatus(filePath, ownerApprovalRequestRoutingMarkers);
  const routed = routing.exists && routing.missingMarkers.length === 0;
  const externalFlags = currentExternalEvidenceFlags();
  const completed = routed && externalFlags.ownerApprovalRecorded && externalFlags.deployRoutingRecorded;
  return {
    path: filePath,
    exists: routing.exists,
    status: completed ? "completed" : (routed ? "sent_awaiting_owner_decision" : (routing.exists ? "not_sent" : "missing")),
    taskCardId: routed ? "ttc_1b40fc066486468771" : "",
    targetThreadId: routed ? "019f091a-6ce0-7932-97b2-a5ba38556f51" : "",
    targetThreadTitle: routed ? "Home AI Task Intake" : "",
    cardKind: routed ? "owner_approval_request" : "",
    category: routed ? "growth-vite-esm-cutover" : "",
    approvalRecorded: externalFlags.ownerApprovalRecorded,
    deployRoutingRecorded: externalFlags.deployRoutingRecorded,
    missingMarkers: routing.missingMarkers
  };
}

function ownerCutoverPlanningReadiness() {
  const approvalRequest = documentMarkerStatus(ownerApprovalRequestPath, ownerApprovalRequestRequiredMarkers);
  const approvalRequestRouting = ownerApprovalRequestRoutingStatus();
  const externalFlags = currentExternalEvidenceFlags();
  const evidencePacketExists = fs.existsSync(ownerCutoverEvidencePacketPath);
  const deployDraft = deployLaneRequestDraftStatus();
  const approvalRequestReady = approvalRequest.exists && approvalRequest.missingMarkers.length === 0;
  return {
    ownerApprovalRequest: {
      path: ownerApprovalRequestPath,
      exists: approvalRequest.exists,
      status: approvalRequestReady ? "ready_for_owner_review" : (approvalRequest.exists ? "incomplete" : "missing"),
      missingMarkers: approvalRequest.missingMarkers,
      approvalRecorded: externalFlags.ownerApprovalRecorded
    },
    ownerApprovalRequestRouting: approvalRequestRouting,
    deployLaneDraft: {
      path: deployDraft.path,
      exists: deployDraft.exists,
      status: approvalRequestReady ? deployDraft.status : "incomplete",
      sendAllowed: false,
      requiresOwnerApproval: !externalFlags.ownerApprovalRecorded,
      ownerApprovalRecorded: externalFlags.ownerApprovalRecorded,
      deployRoutingRecorded: externalFlags.deployRoutingRecorded,
      missingFields: deployDraft.missingFields,
      invalidFields: deployDraft.invalidFields,
      code: deployDraft.code
    },
    ownerCutoverEvidencePacket: {
      path: ownerCutoverEvidencePacketPath,
      exists: evidencePacketExists,
      status: evidencePacketExists ? "ready_for_owner_review" : "missing"
    }
  };
}

module.exports = {
  centralMobileVisualEvidencePresent,
  deployLaneRequestDraftPath,
  deployLaneRequestDraftRequiredFields,
  deployLaneRequestDraftStatus,
  deployLaneRoutingEvidencePresent,
  documentMarkerStatus,
  evaluateOwnerCutoverEvidence,
  currentExternalEvidenceFlags,
  loadOwnerCutoverEvidenceReceipt,
  ownerApprovalRequestRoutingMarkers,
  ownerApprovalRequestRoutingStatus,
  ownerCutoverApprovalPresent,
  ownerApprovalRequestPath,
  ownerApprovalRequestRequiredMarkers,
  ownerCutoverEvidencePacketPath,
  ownerCutoverPlanningReadiness,
  ownerCutoverEvidencePath,
  requiredExternalEvidence
};
