"use strict";

const {
  RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA
} = require("./learning-automation-release-evidence-artifact-manifest-service");
const {
  TASK_DEFINITIONS
} = require("./learning-automation-release-evidence-bundle-service");
const {
  UI_EVIDENCE_COLLECTION_TASKS,
  UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY,
  UI_EVIDENCE_COLLECTION_TASK_BY_ID
} = require("./learning-automation-ui-evidence-task-registry");

const RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA = "growth.learningAutomationReleaseEvidenceArtifactTemplate.v1";

const UI_TASK_BY_EVIDENCE_KEY = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.evidenceKey, task])
));
const UI_TASK_BY_UI_GATE = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.uiGate, task])
));
const TASK_BY_ID = new Map(TASK_DEFINITIONS.map((task) => [task.taskId, task]));
const CENTRAL_VISUAL_KEYS = new Set([
  "central_visual",
  "centralVisual",
  "centralVisualEvidence",
  "central_visual_evidence"
]);
const RECORD_ROUTE_KEY_BY_KIND = Object.freeze({
  release_readiness_snapshot: "release_readiness_snapshot",
  release_package: "release_package",
  release_evidence: "release_evidence",
  release_approval: "release_approval",
  release_activation: "release_activation",
  runtime_enablement: "runtime_enablement",
  release_evidence_collection: "release_evidence_collection",
  release_collection_run: "release_evidence_collection",
  release_decision: "release_decision",
  release_preflight: "release_preflight"
});

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
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

function scopeFrom(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 160),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 160),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80)
  };
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-evidence-artifact-template-service",
    schemaVersion: RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error, 180),
    releaseArtifactTemplate: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactTemplate.summary.v1",
      summaryOnly: true,
      status: "blocked",
      artifactSlotCount: 0,
      artifactTaskIds: [],
      artifactSlots: [],
      artifactManifestTemplate: {
        schemaVersion: RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
        privacyClass: "summary_only",
        summaryOnly: true
      }
    },
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  }, extra);
}

function taskIdFromKey(value = "") {
  const key = cleanString(value, 180);
  if (!key) return "";
  const normalized = key.replace(/-/g, "_");
  if (CENTRAL_VISUAL_KEYS.has(key) || CENTRAL_VISUAL_KEYS.has(normalized)) return "central_visual";
  if (UI_EVIDENCE_COLLECTION_TASK_BY_ID[normalized]) return normalized;
  if (UI_TASK_BY_EVIDENCE_KEY[key]) return UI_TASK_BY_EVIDENCE_KEY[key].taskId;
  if (UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY[key]) return UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY[key];
  if (UI_TASK_BY_UI_GATE[key]) return UI_TASK_BY_UI_GATE[key].taskId;
  return "";
}

function collectionTaskIdsFrom(workbenchSummary = {}) {
  const summary = objectOnly(workbenchSummary);
  const keys = [
    ...asArray(summary.missingEvidenceKeys),
    ...asArray(summary.missingCheckKeys)
  ];
  return uniqueStrings(keys.map(taskIdFromKey));
}

function centralVisualSlot(required = true) {
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactSlot.v1",
    summaryOnly: true,
    taskId: "central_visual",
    evidenceKey: "centralVisualEvidence",
    checkKey: "central_visual_evidence",
    manifestField: "centralVisualEvidenceFile",
    fileBodyField: "central_visual_evidence_file",
    required,
    source: "home_ai_central_visual_toolchain"
  };
}

function uiSlot(task, required = true) {
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactSlot.v1",
    summaryOnly: true,
    taskId: task.taskId,
    evidenceKey: task.evidenceKey,
    checkKey: task.checkKey,
    uiGate: task.uiGate,
    manifestMap: "uiEvidenceFiles",
    manifestKey: task.evidenceKey,
    fileField: task.fileField,
    fileBodyField: task.fileBodyField,
    fileFlag: task.fileFlag,
    required,
    source: "home_ai_central_ui_visual_toolchain"
  };
}

function artifactSlotsFor(taskIds = [], requiredTaskIds = []) {
  const requiredSet = new Set(requiredTaskIds.length ? requiredTaskIds : taskIds);
  const selected = new Set(taskIds);
  const slots = [];
  if (selected.has("central_visual")) {
    slots.push(centralVisualSlot(requiredSet.has("central_visual")));
  }
  for (const task of UI_EVIDENCE_COLLECTION_TASKS) {
    if (!selected.has(task.taskId)) continue;
    slots.push(uiSlot(task, requiredSet.has(task.taskId)));
  }
  return slots;
}

function manifestTemplateFromSlots(slots = []) {
  const template = {
    schemaVersion: RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true
  };
  const uiEvidenceFiles = {};
  for (const slot of slots) {
    if (slot.taskId === "central_visual") {
      template.centralVisualEvidenceFile = "";
      continue;
    }
    if (slot.manifestMap === "uiEvidenceFiles" && slot.manifestKey) {
      uiEvidenceFiles[slot.manifestKey] = "";
    }
  }
  if (Object.keys(uiEvidenceFiles).length) template.uiEvidenceFiles = uiEvidenceFiles;
  return template;
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => {
    if (Array.isArray(item)) return item.length > 0;
    return item !== undefined && item !== null && item !== "";
  }));
}

function routePathFor(summary = {}, key = "") {
  const route = asArray(objectOnly(summary).recordRoutes)
    .find((item) => cleanString(item?.key, 140) === key);
  return cleanString(route?.route?.path || route?.path, 220);
}

function taskDefinition(taskId = "") {
  return TASK_BY_ID.get(cleanString(taskId, 140)) || {};
}

function checklistItem(value = {}) {
  return compactObject(Object.assign({
    schemaVersion: "growth.learningAutomationReleaseEvidenceChecklistItem.v1",
    summaryOnly: true
  }, value));
}

function artifactChecklistItems(slots = []) {
  return slots.map((slot) => {
    const task = taskDefinition(slot.taskId);
    return checklistItem({
      key: `artifact:${slot.taskId}`,
      kind: "home_ai_visual_artifact",
      taskId: slot.taskId,
      evidenceKey: slot.evidenceKey,
      checkKey: slot.checkKey,
      uiGate: slot.uiGate,
      source: slot.source,
      commandName: task.commandName,
      action: "collect_home_ai_central_visual_ui_summary_artifact",
      required: slot.required === true,
      manifestField: slot.manifestField || slot.manifestKey,
      fileBodyField: slot.fileBodyField
    });
  });
}

function releaseEvidenceCollectionItems(summary = {}, artifactTaskIds = []) {
  const artifactSet = new Set(artifactTaskIds);
  const supportedTaskIds = uniqueStrings(asArray(summary.releaseEvidenceCollectionSupportedTaskIds));
  const fallbackTaskIds = supportedTaskIds.length
    ? supportedTaskIds
    : uniqueStrings(collectionTaskIdsFrom(summary));
  const requiredSet = new Set(uniqueStrings(asArray(summary.releaseEvidenceCollectionRequiredTaskIds)));
  const routePath = routePathFor(summary, "release_evidence_collection");
  return fallbackTaskIds
    .filter((taskId) => !artifactSet.has(taskId))
    .map((taskId) => {
      const task = taskDefinition(taskId);
      return checklistItem({
        key: `collection:${taskId}`,
        kind: "release_evidence_collection_task",
        taskId,
        evidenceKey: task.evidenceKey || task.outputKey,
        commandName: task.commandName,
        action: "run_release_evidence_collection",
        endpointKey: "release_evidence_collection",
        routePath,
        required: requiredSet.size ? requiredSet.has(taskId) : true
      });
    });
}

function writeGatedChecklistItems(summary = {}) {
  return uniqueStrings(summary.writeGatedReleaseEvidenceCollectionTasks).map((taskId) => {
    const task = taskDefinition(taskId);
    return checklistItem({
      key: `write_gated:${taskId}`,
      kind: "write_gated_release_evidence",
      taskId,
      evidenceKey: task.evidenceKey || task.outputKey,
      commandName: task.commandName,
      action: "explicit_owner_write_evidence_authorization_required",
      requiredActor: "owner",
      required: true
    });
  });
}

function approvalChecklistItems(summary = {}) {
  const routePath = routePathFor(summary, "release_approval");
  return uniqueStrings(summary.missingApprovalKeys).map((approvalKey) => checklistItem({
    key: `approval:${approvalKey}`,
    kind: "release_approval",
    approvalKey,
    action: "record_release_approval",
    endpointKey: "release_approval",
    routePath,
    requiredActor: "owner",
    required: true
  }));
}

function recordChecklistItems(summary = {}) {
  return uniqueStrings(summary.missingRecordKinds).map((kind) => {
    const endpointKey = RECORD_ROUTE_KEY_BY_KIND[kind] || "";
    return checklistItem({
      key: `record:${kind}`,
      kind: "release_record",
      recordKind: kind,
      action: endpointKey === "release_evidence_collection" ? "run_release_evidence_collection" : `record_${kind}`,
      endpointKey,
      routePath: endpointKey ? routePathFor(summary, endpointKey) : "",
      requiredActor: "owner",
      required: true
    });
  });
}

function unsupportedChecklistItems(summary = {}) {
  return uniqueStrings(summary.unsupportedReleaseEvidenceCollectionKeys).map((evidenceKey) => checklistItem({
    key: `unsupported:${evidenceKey}`,
    kind: "manual_or_unsupported_release_evidence",
    evidenceKey,
    action: "owner_review_required",
    requiredActor: "owner",
    required: true
  }));
}

function releaseEvidenceChecklist(workbenchSummary = {}, slots = [], artifactTaskIds = []) {
  const items = [
    ...artifactChecklistItems(slots),
    ...releaseEvidenceCollectionItems(workbenchSummary, artifactTaskIds),
    ...writeGatedChecklistItems(workbenchSummary),
    ...approvalChecklistItems(workbenchSummary),
    ...recordChecklistItems(workbenchSummary),
    ...unsupportedChecklistItems(workbenchSummary)
  ];
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceChecklist.v1",
    summaryOnly: true,
    status: items.length ? "release_evidence_actions_required" : "release_evidence_ready_for_review",
    itemCount: items.length,
    artifactItemCount: items.filter((item) => item.kind === "home_ai_visual_artifact").length,
    collectionTaskItemCount: items.filter((item) => item.kind === "release_evidence_collection_task").length,
    writeGatedItemCount: items.filter((item) => item.kind === "write_gated_release_evidence").length,
    approvalItemCount: items.filter((item) => item.kind === "release_approval").length,
    recordItemCount: items.filter((item) => item.kind === "release_record").length,
    unsupportedItemCount: items.filter((item) => item.kind === "manual_or_unsupported_release_evidence").length,
    items,
    nextAction: items[0] ? {
      key: items[0].key,
      action: items[0].action,
      requiredActor: items[0].requiredActor || "owner"
    } : null
  };
}

function createLearningAutomationReleaseEvidenceArtifactTemplateService(options = {}) {
  const releaseWorkbenchService = options.releaseWorkbenchService || null;

  function template(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_evidence_artifact_template_scope_required", scope);
    if (!releaseWorkbenchService || typeof releaseWorkbenchService.workbench !== "function") {
      return unavailable("release_evidence_artifact_template_workbench_unavailable", scope);
    }

    const workbench = releaseWorkbenchService.workbench(Object.assign({}, input, scope));
    if (!workbench?.ok) {
      return unavailable(workbench?.error || "release_evidence_artifact_template_workbench_blocked", scope, {
        workbenchStatus: cleanString(workbench?.status, 120)
      });
    }

    const workbenchSummary = objectOnly(workbench.releaseWorkbench);
    const taskIds = collectionTaskIdsFrom(workbenchSummary);
    const requiredTaskIds = uniqueStrings(asArray(workbenchSummary.releaseEvidenceCollectionRequiredTaskIds)
      .map(taskIdFromKey))
      .filter((taskId) => taskIds.includes(taskId));
    const slots = artifactSlotsFor(taskIds, requiredTaskIds);
    const artifactTaskIds = slots.map((slot) => slot.taskId);
    const checklist = releaseEvidenceChecklist(workbenchSummary, slots, artifactTaskIds);
    const status = slots.length ? "artifact_manifest_required" : "no_artifact_manifest_required";

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-evidence-artifact-template-service",
      schemaVersion: RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      releaseArtifactTemplate: {
        schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactTemplate.summary.v1",
        summaryOnly: true,
        status,
        manifestSchemaVersion: RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
        artifactSlotCount: slots.length,
        artifactTaskIds,
        artifactSlots: slots,
        artifactManifestTemplate: manifestTemplateFromSlots(slots),
        readyForManifestInput: slots.length === 0,
        missingEvidenceKeys: uniqueStrings(workbenchSummary.missingEvidenceKeys),
        missingCheckKeys: uniqueStrings(workbenchSummary.missingCheckKeys),
        unsupportedReleaseEvidenceCollectionKeys: uniqueStrings(workbenchSummary.unsupportedReleaseEvidenceCollectionKeys),
        writeGatedReleaseEvidenceCollectionTasks: uniqueStrings(workbenchSummary.writeGatedReleaseEvidenceCollectionTasks),
        releaseEvidenceChecklist: checklist,
        nextAction: slots.length ? {
          key: "fill_release_evidence_artifact_manifest",
          action: "collect_home_ai_central_visual_ui_summary_artifacts",
          requiredActor: "owner"
        } : null
      },
      releaseWorkbenchStatus: cleanString(workbench.status || workbenchSummary.status, 120),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return {
    template
  };
}

module.exports = {
  RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA,
  createLearningAutomationReleaseEvidenceArtifactTemplateService,
  taskIdFromKey
};
