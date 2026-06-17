#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const {
  UI_EVIDENCE_COLLECTION_TASKS
} = require("../src/services/learning-automation-ui-evidence-task-registry");
const {
  createLearningAutomationReleaseEvidenceArtifactManifestService
} = require("../src/services/learning-automation-release-evidence-artifact-manifest-service");

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

function operationFromArgs(args) {
  if (hasFlag(args, "--record")) return "record";
  if (hasFlag(args, "--list-audits") || hasFlag(args, "--list-action-audits") || hasFlag(args, "--listActionAudits")) {
    return "list-audits";
  }
  const operation = firstArgValue(args, ["--operation", "--op"], "record") || "record";
  if (operation === "list" || operation === "list_audits" || operation === "listActionAudits") return "list-audits";
  return operation;
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectRepeatedValues(args, names) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      const value = String(args[index + 1] || "").trim();
      if (value) values.push(value);
    }
  }
  return values;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
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

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function listArg(args, repeatedNames, csvNames) {
  return uniqueStrings([
    ...collectRepeatedValues(args, repeatedNames),
    ...splitCsv(firstArgValue(args, csvNames, ""))
  ]);
}

function parseJsonArg(args, names, fallback = undefined) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function uiEvidenceFileInputFromArgs(args) {
  const output = {};
  for (const task of UI_EVIDENCE_COLLECTION_TASKS) {
    const names = [task.fileFlag, `--${task.fileField}`];
    if (task.evidenceKey === "releasePackageReviewUiEvidence") {
      names.push("--ui-evidence-file", "--uiEvidenceFile");
    }
    output[task.fileField] = firstArgValue(args, names, "");
  }
  return output;
}

function releaseEvidenceArtifactManifestFileFromArgs(args) {
  return firstArgValue(args, [
    "--release-evidence-artifact-manifest-file",
    "--releaseEvidenceArtifactManifestFile",
    "--evidence-artifact-manifest-file",
    "--evidenceArtifactManifestFile",
    "--ui-evidence-manifest-file",
    "--uiEvidenceManifestFile"
  ], "");
}

function applyArtifactManifestInput(input) {
  const service = createLearningAutomationReleaseEvidenceArtifactManifestService({
    readFile: fs.readFileSync
  });
  const result = service.applyToInput(input);
  if (result.ok) return result.input;
  return Object.assign({}, input, {
    releaseEvidenceArtifactManifestError: result.error,
    invalidArtifactManifestEntries: result.invalidEntries || []
  });
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  const input = Object.assign({
    operation: operationFromArgs(args),
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    targetNodeIds: listArg(args, ["--target-node-id", "--targetNodeId"], ["--target-node-ids", "--targetNodeIds"]),
    tasks: listArg(args, ["--task", "--task-id", "--taskId"], ["--tasks", "--task-ids", "--taskIds"]),
    requiredTaskIds: listArg(args, ["--required-task", "--required-task-id", "--requiredTaskId"], ["--required-tasks", "--required-task-ids", "--requiredTasks", "--requiredTaskIds"]),
    requiredApprovalKeys: listArg(args, ["--required-approval-key", "--requiredApprovalKey"], ["--required-approval-keys", "--requiredApprovalKeys"]),
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    autoSelectLatestReadyCollectionRun: hasFlag(args, "--auto-select-latest-ready-collection-run")
      || hasFlag(args, "--autoSelectLatestReadyCollectionRun")
      || hasFlag(args, "--auto-select-ready-collection-run")
      || hasFlag(args, "--autoSelectReadyCollectionRun"),
    endpointKey: firstArgValue(args, ["--endpoint-key", "--endpointKey"], ""),
    actionKey: firstArgValue(args, ["--action-key", "--actionKey", "--key"], ""),
    status: firstArgValue(args, ["--status", "--decision", "--decision-status", "--decisionStatus"], ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], ""),
    policyId: firstArgValue(args, ["--policy-id", "--policyId"], ""),
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], ""),
    targetId: firstArgValue(args, ["--target-id", "--targetId", "--worker-target-id", "--workerTargetId"], ""),
    workerTargetId: firstArgValue(args, ["--worker-target-id", "--workerTargetId", "--target-id", "--targetId"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "20")) || 20,
    evidenceKey: firstArgValue(args, ["--evidence-key", "--evidenceKey", "--check-key", "--checkKey"], ""),
    approvalKey: firstArgValue(args, ["--approval-key", "--approvalKey", "--config-gate", "--configGate"], ""),
    activationGates: activationGates.length ? activationGates : undefined,
    releaseEvidenceBundle: parseJsonArg(args, ["--release-evidence-bundle-json", "--releaseEvidenceBundleJson", "--evidence-bundle-json", "--evidenceBundleJson", "--bundle-json", "--bundleJson"], undefined),
    releaseEvidenceBundleAudit: parseJsonArg(args, ["--release-evidence-bundle-audit-json", "--releaseEvidenceBundleAuditJson", "--evidence-bundle-audit-json", "--evidenceBundleAuditJson", "--audit-json", "--auditJson"], undefined),
    releaseReadiness: parseJsonArg(args, ["--release-readiness-json", "--releaseReadinessJson", "--readiness-json", "--readinessJson"], undefined),
    releaseCollectionRun: parseJsonArg(args, ["--release-collection-run-json", "--releaseCollectionRunJson", "--collection-run-json", "--collectionRunJson", "--run-json", "--runJson"], undefined),
    releaseDecision: parseJsonArg(args, ["--release-decision-json", "--releaseDecisionJson", "--decision-json", "--decisionJson"], undefined),
    centralVisualEvidenceFile: firstArgValue(args, ["--central-visual-evidence-file", "--centralVisualEvidenceFile"], ""),
    releasePackage: parseJsonArg(args, ["--release-package-json", "--releasePackageJson"], undefined),
    buildReleasePackage: hasFlag(args, "--build-release-package")
      || hasFlag(args, "--buildReleasePackage")
      || hasFlag(args, "--build-and-record-package")
      || hasFlag(args, "--buildAndRecordPackage")
      || hasFlag(args, "--record-package-from-build")
      || hasFlag(args, "--recordPackageFromBuild"),
    action: parseJsonArg(args, ["--action-json", "--actionJson"], undefined),
    evidence: parseJsonArg(args, ["--evidence-json", "--evidenceJson"], undefined),
    releaseApproval: parseJsonArg(args, ["--release-approval-json", "--releaseApprovalJson"], undefined),
    approval: parseJsonArg(args, ["--approval-json", "--approvalJson"], undefined),
    activationDecision: parseJsonArg(args, ["--activation-decision-json", "--activationDecisionJson"], undefined),
    enablementDecision: parseJsonArg(args, ["--enablement-decision-json", "--enablementDecisionJson"], undefined),
    writeCollectionRun: hasFlag(args, "--write-collection-run") || hasFlag(args, "--writeCollectionRun") || hasFlag(args, "--record-collection-run"),
    writeReleaseEvidenceRecords: hasFlag(args, "--write-release-evidence-records") || hasFlag(args, "--writeReleaseEvidenceRecords") || hasFlag(args, "--record-release-evidence-records"),
    note: firstArgValue(args, ["--note", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--approved-by", "--approvedBy"], ""),
    reviewedBy: firstArgValue(args, ["--reviewed-by", "--reviewedBy"], ""),
    deliveredBy: firstArgValue(args, ["--delivered-by", "--deliveredBy"], ""),
    recordedAt: firstArgValue(args, ["--recorded-at", "--recordedAt", "--approved-at", "--approvedAt"], ""),
    reviewedAt: firstArgValue(args, ["--reviewed-at", "--reviewedAt"], ""),
    deliveredAt: firstArgValue(args, ["--delivered-at", "--deliveredAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "")
  }, uiEvidenceFileInputFromArgs(args));
  const manifestFile = releaseEvidenceArtifactManifestFileFromArgs(args);
  if (manifestFile) {
    input.releaseEvidenceArtifactManifestFile = manifestFile;
  }
  const applied = applyArtifactManifestInput(input);
  if (applied.artifactTaskIds?.length) {
    applied.tasks = uniqueStrings([...(applied.tasks || []), ...applied.artifactTaskIds]);
    applied.requiredTaskIds = uniqueStrings([...(applied.requiredTaskIds || []), ...applied.artifactTaskIds]);
  }
  return applied;
}

function validateInput(input = {}, allowWrite = false) {
  const operation = String(input.operation || "record").trim();
  if (!["record", "list-audits"].includes(operation)) {
    return { ok: false, error: "release_workbench_action_operation_invalid" };
  }
  if (!input.workspaceId) return { ok: false, error: "release_workbench_action_workspace_required" };
  if (operation === "record" && !allowWrite) {
    return { ok: false, error: "release_workbench_action_write_not_allowed", requiredFlag: "--allow-write" };
  }
  if (operation === "record" && !input.endpointKey) return { ok: false, error: "release_workbench_action_endpoint_required" };
  return { ok: true };
}

async function runOperation(service, input) {
  const operation = String(input.operation || "record").trim();
  const serviceInput = Object.assign({}, input);
  delete serviceInput.operation;
  if (operation === "list-audits") return service.listActionAudits(serviceInput);
  return await service.recordAction(serviceInput);
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function projectReleaseWorkbenchActionSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const actionRecord = objectOnly(readback.actionRecord);
  const actionAudit = objectOnly(readback.actionAudit);
  const actionSummary = objectOnly(actionAudit.actionSummary || readback.actionSummary);
  const latestAudit = objectOnly(asArray(readback.actionAudits)[0]);
  const writeResult = objectOnly(readback.writeResult);
  const collection = objectOnly(writeResult.collection || readback.collection);
  const collectionSummary = objectOnly(collection.summary || writeResult.summary);
  return Object.assign({}, readback, {
    releaseWorkbenchActionOperation: cleanString(readback.operation || input.operation || "", 80),
    releaseWorkbenchActionStatus: cleanString(
      readback.status
        || readback.error
        || actionRecord.recordStatus
        || actionAudit.status
        || latestAudit.status,
      140
    ),
    releaseWorkbenchActionOk: readback.ok === true,
    releaseWorkbenchActionWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    releaseWorkbenchActionLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    releaseWorkbenchActionProgramId: cleanString(readback.programId || input.programId, 160),
    releaseWorkbenchActionDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    releaseWorkbenchActionDomain: cleanString(readback.domain || input.domain, 120),
    releaseWorkbenchActionSubject: cleanString(readback.subject || input.subject, 120),
    releaseWorkbenchActionHorizon: cleanString(readback.horizon || input.horizon, 80),
    releaseWorkbenchActionEndpointKey: cleanString(
      readback.endpointKey || actionRecord.endpointKey || actionAudit.endpointKey || latestAudit.endpointKey || input.endpointKey,
      140
    ),
    releaseWorkbenchActionActionKey: cleanString(
      readback.actionKey || actionRecord.actionKey || actionAudit.actionKey || latestAudit.actionKey || input.actionKey,
      140
    ),
    releaseWorkbenchActionDuplicate: readback.duplicate === true
      || actionSummary.duplicate === true
      || actionAudit.duplicate === true
      || latestAudit.duplicate === true,
    releaseWorkbenchActionRecordId: cleanString(
      actionRecord.recordId || readback.recordId || actionAudit.recordId || latestAudit.recordId,
      180
    ),
    releaseWorkbenchActionRecordStatus: cleanString(
      actionRecord.recordStatus || readback.recordStatus || actionAudit.recordStatus || latestAudit.recordStatus,
      120
    ),
    releaseWorkbenchActionAuditStatus: cleanString(readback.actionAuditStatus || actionAudit.status || latestAudit.status, 120),
    releaseWorkbenchActionAuditId: cleanString(actionAudit.actionAuditId || latestAudit.actionAuditId, 180),
    releaseWorkbenchActionAuditCount: numberValue(readback.actionAuditCount, asArray(readback.actionAudits).length),
    releaseWorkbenchActionWorkbenchStatus: cleanString(readback.workbenchStatus || actionAudit.workbenchStatus || latestAudit.workbenchStatus, 120),
    releaseWorkbenchActionWriteResultStatus: cleanString(writeResult.status || writeResult.error || collection.status, 140),
    releaseWorkbenchActionWriteResultOk: writeResult.ok === true,
    releaseWorkbenchActionCollectionStatus: cleanString(collection.status, 120),
    releaseWorkbenchActionCollectionRunId: cleanString(
      collectionSummary.collectionRunId || collection.collectionRunId || actionRecord.recordId,
      180
    ),
    releaseWorkbenchActionCollectionRunWritten: collectionSummary.collectionRunWritten === true
      || collection.collectionRunWritten === true,
    releaseWorkbenchActionReleaseEvidenceRecordAttemptedCount: numberValue(collectionSummary.releaseEvidenceRecordAttemptedCount, 0),
    releaseWorkbenchActionReleaseEvidenceRecordWrittenCount: numberValue(collectionSummary.releaseEvidenceRecordWrittenCount, 0),
    releaseWorkbenchActionReleaseEvidenceRecordBlockedCount: numberValue(collectionSummary.releaseEvidenceRecordBlockedCount, 0),
    releaseWorkbenchActionReleaseEvidenceRecordDuplicateCount: numberValue(collectionSummary.releaseEvidenceRecordDuplicateCount, 0),
    releaseWorkbenchActionTaskCount: asArray(input.tasks).length,
    releaseWorkbenchActionRequiredTaskCount: asArray(input.requiredTaskIds).length,
    releaseWorkbenchActionArtifactTaskCount: asArray(input.artifactTaskIds).length,
    releaseWorkbenchActionWriteCollectionRunRequested: input.writeCollectionRun === true,
    releaseWorkbenchActionWriteReleaseEvidenceRecordsRequested: input.writeReleaseEvidenceRecords === true,
    releaseWorkbenchActionBuildReleasePackageRequested: input.buildReleasePackage === true,
    releaseWorkbenchActionConfigChangeApplied: readback.configChangeApplied === true,
    releaseWorkbenchActionRuntimeConfigChange: readback.runtimeConfigChange === true,
    releaseWorkbenchActionRuntimeConfigMutationPerformed: readback.runtimeConfigMutationPerformed === true,
    releaseWorkbenchActionWritefulSchedulingAllowed: readback.writefulSchedulingAllowed === true,
    releaseWorkbenchActionBackgroundSchedulingAllowed: readback.backgroundSchedulingAllowed === true,
    releaseWorkbenchActionBackgroundWorkerAllowed: readback.backgroundWorkerAllowed === true
  });
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_workbench_action_invalid_json",
      detail: String(error && error.message ? error.message : error)
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (input.releaseEvidenceArtifactManifestError) {
    process.stdout.write(formatResult(projectReleaseWorkbenchActionSmokeReadback({
      ok: false,
      error: input.releaseEvidenceArtifactManifestError,
      invalidArtifactManifestEntries: input.invalidArtifactManifestEntries || []
    }, input), pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateInput(input, hasFlag(args, "--allow-write"));
  if (!validation.ok) {
    process.stdout.write(formatResult(projectReleaseWorkbenchActionSmokeReadback(validation, input), pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = projectReleaseWorkbenchActionSmokeReadback(
    Object.assign({ operation: input.operation }, await runOperation(services.learningAutomationReleaseWorkbenchActionService, input)),
    input
  );
  process.stdout.write(formatResult(Object.assign({ operation: input.operation }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_workbench_action_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseWorkbenchActionSmokeReadback,
  releaseEvidenceArtifactManifestFileFromArgs,
  runOperation,
  validateInput
};
