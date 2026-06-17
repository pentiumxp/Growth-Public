#!/usr/bin/env node
"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const requiredApprovalKey = firstArgValue(args, ["--required-approval-key", "--requiredApprovalKey"], "");
  const requiredApprovalKeys = splitCsv(firstArgValue(args, ["--required-approval-keys", "--requiredApprovalKeys"], ""))
    .concat(requiredApprovalKey ? [requiredApprovalKey] : []);
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    requiredApprovalKeys: requiredApprovalKeys.length ? requiredApprovalKeys : undefined,
    activationGates: activationGates.length ? activationGates : undefined
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "release_artifact_template_smoke_workspace_required" };
  return { ok: true };
}

function runOperation(service, input) {
  return projectArtifactTemplateSmokeReadback(service.template(input));
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function itemCountByKind(items = [], kind = "") {
  return asArray(items).filter((item) => cleanString(item?.kind, 160) === kind).length;
}

function compactAction(value = {}) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key, 160),
    action: cleanString(action.action, 160),
    endpointKey: cleanString(action.endpointKey || action.endpoint_key, 120),
    requiredActor: cleanString(action.requiredActor || action.required_actor || "owner", 80)
  };
}

function projectArtifactTemplateSmokeReadback(result = {}) {
  const template = objectOnly(result.releaseArtifactTemplate);
  const manifest = objectOnly(template.artifactManifestTemplate);
  const checklist = objectOnly(template.releaseEvidenceChecklist);
  const checklistItems = asArray(checklist.items);
  const actionPlan = objectOnly(template.releaseEvidenceActionPlan);
  const actionItems = asArray(actionPlan.actions);
  return Object.assign({}, result, {
    releaseArtifactTemplateStatus: cleanString(template.status || result.status, 120),
    manifestSchemaVersion: cleanString(template.manifestSchemaVersion || manifest.schemaVersion, 180),
    artifactSlotCount: Number(template.artifactSlotCount || asArray(template.artifactSlots).length || 0) || 0,
    artifactTaskIds: asArray(template.artifactTaskIds).map((item) => cleanString(item, 140)).filter(Boolean),
    readyForManifestInput: template.readyForManifestInput === true,
    releaseEvidenceChecklistStatus: cleanString(checklist.status, 120),
    checklistItemCount: checklistItems.length,
    artifactChecklistItemCount: itemCountByKind(checklistItems, "home_ai_visual_artifact"),
    collectionChecklistItemCount: itemCountByKind(checklistItems, "release_evidence_collection_task"),
    writeGatedItemCount: itemCountByKind(checklistItems, "write_gated_release_evidence"),
    statePrerequisiteItemCount: itemCountByKind(checklistItems, "release_state_prerequisite"),
    approvalItemCount: itemCountByKind(checklistItems, "release_approval"),
    recordItemCount: itemCountByKind(checklistItems, "release_record"),
    unsupportedItemCount: itemCountByKind(checklistItems, "manual_or_unsupported_release_evidence"),
    releaseEvidenceActionPlanStatus: cleanString(actionPlan.status, 120),
    actionCount: Number(actionPlan.actionCount || actionItems.length || 0) || 0,
    submittableActionCount: Number(actionPlan.submittableActionCount || 0) || 0,
    phaseBlockedActionCount: Number(actionPlan.phaseBlockedActionCount || 0) || 0,
    readyPhase: cleanString(actionPlan.readyPhase, 120),
    nextSubmittableAction: compactAction(actionPlan.nextSubmittableAction)
  });
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  const validation = validateInput(input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationReleaseEvidenceArtifactTemplateService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "release_artifact_template" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_artifact_template_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectArtifactTemplateSmokeReadback,
  runOperation,
  validateInput
};
