"use strict";

const path = require("node:path");
const { RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA } = require("./learning-automation-release-evidence-bundle-audit-service");
const { RELEASE_EVIDENCE_BUNDLE_SCHEMA } = require("./learning-automation-release-evidence-bundle-service");

const RELEASE_COLLECTION_RUN_SCHEMA = "growth.learningAutomationReleaseCollectionRun.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueSorted(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 120)).filter(Boolean))).sort();
}

function scanPrivacyKeys(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function scanPrivateValues(value, pathName = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(pathName);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateValues(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    scanPrivateValues(child, `${pathName}.${key}`, findings);
  }
  return findings;
}

function artifactFromInput(input = {}, names = []) {
  for (const name of names) {
    const value = input[name];
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return null;
}

function fileNameFromInput(input = {}, names = []) {
  for (const name of names) {
    const value = cleanString(input[name], 500);
    if (value) return path.basename(value);
  }
  return "";
}

function scopeFrom(input = {}, bundle = {}, audit = {}, readiness = {}) {
  const bundleScope = objectOnly(bundle.scope);
  const workspaceId = cleanString(
    input.workspaceId || input.workspace_id
      || bundleScope.workspaceId || bundleScope.workspace_id
      || audit.workspaceId || audit.workspace_id
      || readiness.workspaceId || readiness.workspace_id,
    120
  );
  return {
    workspaceId,
    learnerId: cleanString(
      input.learnerId || input.learner_id
        || bundleScope.learnerId || bundleScope.learner_id
        || audit.learnerId || audit.learner_id
        || readiness.learnerId || readiness.learner_id
        || workspaceId,
      120
    ),
    programId: cleanString(input.programId || input.program_id || bundleScope.programId || bundleScope.program_id || audit.programId || audit.program_id || readiness.programId || readiness.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || bundleScope.domainPackId || bundleScope.domain_pack_id || audit.domainPackId || audit.domain_pack_id || readiness.domainPackId || readiness.domain_pack_id, 120),
    domain: cleanString(input.domain || bundleScope.domain || audit.domain || readiness.domain, 80),
    subject: cleanString(input.subject || bundleScope.subject || audit.subject || readiness.subject, 80),
    horizon: cleanString(input.horizon || bundleScope.horizon || audit.horizon || readiness.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function statusOf(value = {}) {
  return cleanString(value.status || value.summary?.status || "", 80).toLowerCase();
}

function isPassStatus(value = {}) {
  const status = statusOf(value);
  return value.ok === true || status === "pass" || status === "passed";
}

function bundleTaskSummary(bundle = {}) {
  return asArray(bundle.tasks).map((task = {}) => ({
    taskId: cleanString(task.taskId || task.task_id, 80),
    status: cleanString(task.status || (task.ok === true ? "pass" : "blocked"), 80),
    evidenceKey: cleanString(task.evidenceKey || task.evidence_key || task.outputKey || task.output_key, 120),
    commandName: cleanString(task.commandName || task.command_name, 160)
  })).filter((task) => task.taskId);
}

function bundleSummary(bundle = {}, fileName = "") {
  const summary = objectOnly(bundle.summary);
  const tasks = bundleTaskSummary(bundle);
  return {
    schemaVersion: cleanString(bundle.schemaVersion || bundle.schema_version, 120),
    privacyClass: cleanString(bundle.privacyClass || bundle.privacy_class, 80),
    summaryOnly: bundle.summaryOnly === true,
    createdAt: cleanString(bundle.createdAt || bundle.created_at, 80),
    artifactFileName: cleanString(fileName, 220),
    taskCount: Number(summary.taskCount || tasks.length || 0) || 0,
    passedCount: Number(summary.passedCount || tasks.filter(isPassStatus).length || 0) || 0,
    blockedCount: Number(summary.blockedCount || tasks.filter((task) => !isPassStatus(task)).length || 0) || 0,
    evidenceKeys: uniqueSorted(Object.keys(objectOnly(bundle.evidence))),
    releaseApprovalKeys: uniqueSorted(Object.keys(objectOnly(bundle.releaseApproval || bundle.release_approval))),
    tasks
  };
}

function auditSummary(audit = {}, fileName = "") {
  const auditBlock = objectOnly(audit.audit);
  const bundleBlock = objectOnly(audit.bundle);
  return {
    schemaVersion: cleanString(audit.schemaVersion || audit.schema_version, 120),
    privacyClass: cleanString(audit.privacyClass || audit.privacy_class, 80),
    summaryOnly: audit.summaryOnly === true,
    artifactFileName: cleanString(fileName, 220),
    status: cleanString(audit.status || "", 80),
    readyForReleaseEvidence: audit.readyForReleaseEvidence === true,
    defaultTaskCoverage: auditBlock.defaultTaskCoverage === true,
    requiredTaskCount: Number(auditBlock.requiredTaskCount || 0) || 0,
    taskCount: Number(bundleBlock.taskCount || 0) || 0,
    passedCount: Number(bundleBlock.passedCount || 0) || 0,
    blockedCount: Number(bundleBlock.blockedCount || 0) || 0,
    missingRequiredTasks: uniqueSorted(auditBlock.missingRequiredTasks),
    unknownRequiredTasks: uniqueSorted(auditBlock.unknownRequiredTasks),
    blockedRequiredTasks: uniqueSorted(auditBlock.blockedRequiredTasks),
    missingRequiredEvidenceKeys: uniqueSorted(auditBlock.missingRequiredEvidenceKeys),
    missingRequired: uniqueSorted(audit.missingRequired)
  };
}

function readinessSummary(readiness = {}, fileName = "") {
  const summary = objectOnly(readiness.summary);
  const releaseReview = objectOnly(readiness.releaseReview || readiness.release_review);
  const checks = asArray(readiness.checks);
  const missingChecks = checks.filter((check) => cleanString(check.status).toLowerCase() === "missing");
  const blockedChecks = checks.filter((check) => cleanString(check.status).toLowerCase() === "blocked");
  const passedChecks = checks.filter((check) => cleanString(check.status).toLowerCase() === "pass");
  return {
    schemaVersion: cleanString(summary.schemaVersion || summary.schema_version || "growth.learningAutomationReleaseReadiness.summary.v1", 140),
    summaryOnly: summary.summaryOnly === true,
    artifactFileName: cleanString(fileName, 220),
    status: cleanString(readiness.status || summary.status || "", 80),
    readyForReleaseReview: summary.readyForReleaseReview === true,
    writefulSchedulingAllowed: false,
    checkCount: checks.length,
    passedCheckCount: passedChecks.length,
    missingCheckCount: missingChecks.length,
    blockedCheckCount: blockedChecks.length,
    missingCheckKeys: uniqueSorted(releaseReview.missingCheckKeys || missingChecks.map((check) => check.key)),
    blockedCheckKeys: uniqueSorted(releaseReview.blockedCheckKeys || blockedChecks.map((check) => check.key)),
    missingEvidenceKeys: uniqueSorted(releaseReview.missingEvidenceKeys),
    requiredActionCount: Number(releaseReview.requiredActionCount || asArray(releaseReview.requiredActions).length || 0) || 0,
    nextActionKey: cleanString(objectOnly(releaseReview.nextAction).key, 120),
    persistedApprovalKeys: uniqueSorted(releaseReview.persistedApprovalKeys)
  };
}

function evidenceSummary(bundle = {}, readiness = {}) {
  return {
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.evidenceSummary.v1",
    summaryOnly: true,
    bundleEvidenceKeys: uniqueSorted(Object.keys(objectOnly(bundle.evidence))),
    readinessExternalEvidenceKeys: uniqueSorted(objectOnly(readiness.evidence).externalEvidenceKeys),
    releaseApprovalKeys: uniqueSorted(Object.keys(objectOnly(bundle.releaseApproval || bundle.release_approval)))
  };
}

function releaseReviewSummary(readiness = {}) {
  const releaseReview = objectOnly(readiness.releaseReview || readiness.release_review);
  const nextAction = objectOnly(releaseReview.nextAction);
  return {
    schemaVersion: cleanString(releaseReview.schemaVersion || releaseReview.schema_version || "growth.learningAutomationReleaseCollectionRun.releaseReviewSummary.v1", 160),
    summaryOnly: true,
    advisoryOnly: releaseReview.advisoryOnly !== false,
    writefulSchedulingAllowed: false,
    missingCheckKeys: uniqueSorted(releaseReview.missingCheckKeys),
    blockedCheckKeys: uniqueSorted(releaseReview.blockedCheckKeys),
    missingEvidenceKeys: uniqueSorted(releaseReview.missingEvidenceKeys),
    requiredActionCount: Number(releaseReview.requiredActionCount || asArray(releaseReview.requiredActions).length || 0) || 0,
    nextAction: nextAction.key ? {
      key: cleanString(nextAction.key, 120),
      label: cleanString(nextAction.label, 160),
      requiredActor: cleanString(nextAction.requiredActor || nextAction.required_actor, 80)
    } : null,
    persistedApprovalKeys: uniqueSorted(releaseReview.persistedApprovalKeys)
  };
}

function deriveStatus(audit = {}, readiness = {}) {
  const auditPass = audit.readyForReleaseEvidence === true && isPassStatus(audit);
  const readinessStatus = statusOf(readiness);
  const ready = readiness.summary?.readyForReleaseReview === true || readinessStatus === "ready_for_release_review";
  if (auditPass && ready) return "ready_for_release_review";
  if (!auditPass || readinessStatus === "blocked") return "blocked";
  return "incomplete";
}

function validationErrors(scope, bundle, audit, readiness) {
  const errors = [];
  if (!scope.workspaceId) errors.push("workspace_id");
  if (!bundle) errors.push("release_evidence_bundle");
  if (!audit) errors.push("release_evidence_bundle_audit");
  if (!readiness) errors.push("release_readiness");
  if (bundle && cleanString(bundle.schemaVersion || bundle.schema_version, 120) !== RELEASE_EVIDENCE_BUNDLE_SCHEMA) {
    errors.push("release_evidence_bundle_schema");
  }
  if (bundle && (bundle.summaryOnly !== true || cleanString(bundle.privacyClass || bundle.privacy_class, 80) !== "summary_only")) {
    errors.push("summary_only_release_evidence_bundle");
  }
  if (audit && cleanString(audit.schemaVersion || audit.schema_version, 120) !== RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA) {
    errors.push("release_evidence_bundle_audit_schema");
  }
  if (audit && (audit.summaryOnly !== true || cleanString(audit.privacyClass || audit.privacy_class, 80) !== "summary_only")) {
    errors.push("summary_only_release_evidence_bundle_audit");
  }
  if (readiness && objectOnly(readiness.evidence).summaryOnly !== true) {
    errors.push("summary_only_release_readiness_evidence");
  }
  if (readiness && objectOnly(readiness.summary).writefulSchedulingAllowed === true) {
    errors.push("release_readiness_must_remain_no_write");
  }
  return errors;
}

function createLearningAutomationReleaseCollectionRunService(options = {}) {
  const repository = options.repository || null;

  function evaluateRun(input = {}) {
    const bundle = artifactFromInput(input, ["releaseEvidenceBundle", "release_evidence_bundle", "evidenceBundle", "evidence_bundle", "bundle"]);
    const audit = artifactFromInput(input, ["releaseEvidenceBundleAudit", "release_evidence_bundle_audit", "evidenceBundleAudit", "evidence_bundle_audit", "audit"]);
    const readiness = artifactFromInput(input, ["releaseReadiness", "release_readiness", "readiness"]);
    const scope = scopeFrom(input, objectOnly(bundle), objectOnly(audit), objectOnly(readiness));
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(bundle, "$.releaseEvidenceBundle")
      .concat(scanPrivateValues(audit, "$.releaseEvidenceBundleAudit"))
      .concat(scanPrivateValues(readiness, "$.releaseReadiness"))
      .slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_collection_run_privacy_failed",
        privacyFindings,
        privateValueFindings
      };
    }
    const missingRequired = validationErrors(scope, bundle, audit, readiness);
    if (missingRequired.length) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_collection_run_invalid",
        missingRequired,
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId
      };
    }
    const bundleFileName = fileNameFromInput(input, ["bundleFile", "bundle_file", "releaseEvidenceBundleFile", "release_evidence_bundle_file", "evidenceBundleFile", "evidence_bundle_file"]);
    const auditFileName = fileNameFromInput(input, ["auditFile", "audit_file", "releaseEvidenceBundleAuditFile", "release_evidence_bundle_audit_file", "evidenceBundleAuditFile", "evidence_bundle_audit_file"]);
    const readinessFileName = fileNameFromInput(input, ["readinessFile", "readiness_file", "releaseReadinessFile", "release_readiness_file"]);
    const bundleBlock = bundleSummary(bundle, bundleFileName);
    const auditBlock = auditSummary(audit, auditFileName);
    const readinessBlock = readinessSummary(readiness, readinessFileName);
    const status = deriveStatus(audit, readiness);
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-collection-run-service",
      schemaVersion: RELEASE_COLLECTION_RUN_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      readyForReleaseReview: status === "ready_for_release_review",
      writefulSchedulingAllowed: false,
      bundleSummary: bundleBlock,
      auditSummary: auditBlock,
      readinessSummary: readinessBlock,
      evidenceSummary: evidenceSummary(bundle, readiness),
      releaseReview: releaseReviewSummary(readiness),
      summary: {
        schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
        summaryOnly: true,
        status,
        readyForReleaseEvidence: audit.readyForReleaseEvidence === true,
        readyForReleaseReview: status === "ready_for_release_review",
        writefulSchedulingAllowed: false,
        bundleTaskCount: bundleBlock.taskCount,
        bundlePassedCount: bundleBlock.passedCount,
        bundleBlockedCount: bundleBlock.blockedCount,
        auditStatus: auditBlock.status,
        readinessStatus: readinessBlock.status,
        missingCheckCount: readinessBlock.missingCheckCount,
        blockedCheckCount: readinessBlock.blockedCheckCount,
        requiredActionCount: readinessBlock.requiredActionCount,
        artifactFileNames: {
          bundle: bundleFileName,
          audit: auditFileName,
          readiness: readinessFileName
        }
      },
      createdBy: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by, 120),
      createdAt: cleanString(input.createdAt || input.created_at, 80)
    });
  }

  function recordRun(input = {}) {
    if (!repository || typeof repository.saveRun !== "function") {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_collection_run_repository_unavailable"
      };
    }
    const evaluated = evaluateRun(input);
    if (!evaluated.ok) return evaluated;
    const saveResult = repository.saveRun(evaluated);
    if (!saveResult?.ok) return saveResult || { ok: false, error: "learning_automation_release_collection_run_save_failed" };
    return {
      ok: true,
      source: "growth-learning-automation-release-collection-run-service",
      duplicate: Boolean(saveResult.duplicate),
      run: saveResult.run,
      evaluated
    };
  }

  function listRuns(input = {}) {
    if (!repository || typeof repository.listRuns !== "function") {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_collection_run_repository_unavailable"
      };
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_collection_run_scope_required"
      };
    }
    const runs = repository.listRuns(Object.assign({}, input, scope));
    return {
      ok: true,
      source: "growth-learning-automation-release-collection-run-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: runs.length,
      runs
    };
  }

  return {
    evaluateRun,
    listRuns,
    recordRun
  };
}

module.exports = {
  RELEASE_COLLECTION_RUN_SCHEMA,
  createLearningAutomationReleaseCollectionRunService
};
