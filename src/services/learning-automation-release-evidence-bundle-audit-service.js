"use strict";

const path = require("node:path");
const {
  DEFAULT_TASK_IDS,
  RELEASE_EVIDENCE_BUNDLE_SCHEMA,
  TASK_DEFINITIONS
} = require("./learning-automation-release-evidence-bundle-service");

const RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA = "growth.learningAutomationReleaseEvidenceBundleAudit.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

const TASK_BY_ID = new Map(TASK_DEFINITIONS.map((task) => [task.taskId, task]));

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 120)).filter(Boolean)));
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

function readBundleFile(readFile, bundleFile) {
  if (!bundleFile) return { ok: true, value: null };
  if (typeof readFile !== "function") {
    return { ok: false, error: "release_evidence_bundle_audit_file_reader_unavailable" };
  }
  try {
    const parsed = JSON.parse(String(readFile(bundleFile, "utf8") || ""));
    return { ok: true, value: parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError
        ? "release_evidence_bundle_audit_file_invalid_json"
        : "release_evidence_bundle_audit_file_unreadable",
      detail: cleanString(error && error.message ? error.message : error, 160)
    };
  }
}

function bundlePayload(input = {}, readFile) {
  const inline = input.bundle
    || input.evidenceBundle
    || input.evidence_bundle
    || input.releaseEvidenceBundle
    || input.release_evidence_bundle
    || null;
  if (inline && typeof inline === "object") return { ok: true, value: inline, bundleFile: "" };
  const bundleFile = cleanString(input.bundleFile || input.bundle_file || input.evidenceBundleFile || input.evidence_bundle_file || input.releaseEvidenceBundleFile || input.release_evidence_bundle_file, 500);
  const fileResult = readBundleFile(readFile, bundleFile);
  return Object.assign({}, fileResult, { bundleFile });
}

function requiredTaskIds(input = {}) {
  const explicit = uniqueStrings(input.requiredTaskIds || input.required_task_ids || input.requiredTasks || input.required_tasks || [])
    .map((value) => cleanString(value, 80).replace(/-/g, "_"))
    .filter(Boolean);
  return explicit.length ? explicit : Array.from(DEFAULT_TASK_IDS);
}

function bundleScope(input = {}, bundle = {}) {
  const scope = objectOnly(bundle.scope);
  const workspaceId = cleanString(input.workspaceId || input.workspace_id || scope.workspaceId || scope.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || scope.learnerId || scope.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id || scope.programId || scope.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || scope.domainPackId || scope.domain_pack_id, 120),
    domain: cleanString(input.domain || scope.domain, 80),
    subject: cleanString(input.subject || scope.subject, 80),
    horizon: cleanString(input.horizon || scope.horizon || "daily_plan", 80),
    bundleFileName: cleanString(input.bundleFile || input.bundle_file || input.evidenceBundleFile || input.evidence_bundle_file || input.releaseEvidenceBundleFile || input.release_evidence_bundle_file, 500)
  };
}

function taskMap(bundle = {}) {
  return new Map(asArray(bundle.tasks).map((task) => [cleanString(task.taskId || task.task_id, 80), task]));
}

function taskPass(task = {}) {
  const status = cleanString(task.status || "", 80).toLowerCase();
  return task.ok === true || status === "pass" || status === "passed";
}

function evidencePass(value = {}) {
  const status = cleanString(value.status || "", 80).toLowerCase();
  return value.ok === true || status === "pass" || status === "passed";
}

function taskEvidenceKey(taskId) {
  const task = TASK_BY_ID.get(taskId);
  return task && task.evidenceKey ? task.evidenceKey : "";
}

function summaryCountsOk(bundle = {}) {
  const tasks = asArray(bundle.tasks);
  const summary = objectOnly(bundle.summary);
  const taskCount = tasks.length;
  const passedCount = tasks.filter(taskPass).length;
  const blockedCount = taskCount - passedCount;
  return {
    taskCount,
    passedCount,
    blockedCount,
    taskCountMatches: Number(summary.taskCount) === taskCount,
    passedCountMatches: Number(summary.passedCount) === passedCount,
    blockedCountMatches: Number(summary.blockedCount) === blockedCount
  };
}

function createLearningAutomationReleaseEvidenceBundleAuditService(options = {}) {
  const readFile = options.readFile || null;

  function evaluate(input = {}) {
    const payload = bundlePayload(input, readFile);
    if (!payload.ok) {
      return {
        ok: false,
        status: "blocked",
        error: payload.error,
        detail: payload.detail || "",
        missingRequired: payload.error === "release_evidence_bundle_audit_file_reader_unavailable"
          ? ["release_evidence_bundle_audit_reader"]
          : []
      };
    }
    if (!payload.value) {
      return {
        ok: false,
        status: "missing",
        error: "release_evidence_bundle_audit_bundle_required",
        missingRequired: ["release_evidence_bundle_file_or_json"]
      };
    }
    const bundle = objectOnly(payload.value);
    const scope = bundleScope(input, bundle);
    if (!scope.workspaceId) {
      return {
        ok: false,
        status: "blocked",
        error: "release_evidence_bundle_audit_workspace_required",
        missingRequired: ["workspace_id"]
      };
    }
    const privacyFindings = scanPrivacyKeys(input).concat(scanPrivacyKeys(bundle)).slice(0, 12);
    const privateValueFindings = scanPrivateValues(bundle).slice(0, 12);
    const requiredTasks = requiredTaskIds(input);
    const tasksById = taskMap(bundle);
    const evidence = objectOnly(bundle.evidence);
    const missingRequiredTasks = requiredTasks.filter((taskId) => !tasksById.has(taskId));
    const unknownRequiredTasks = requiredTasks.filter((taskId) => !TASK_BY_ID.has(taskId));
    const blockedRequiredTasks = requiredTasks
      .filter((taskId) => tasksById.has(taskId) && !taskPass(tasksById.get(taskId)));
    const missingRequiredEvidenceKeys = requiredTasks
      .map((taskId) => taskEvidenceKey(taskId))
      .filter(Boolean)
      .filter((key) => !evidencePass(evidence[key]));
    const counts = summaryCountsOk(bundle);
    const schemaOk = cleanString(bundle.schemaVersion || bundle.schema_version, 120) === RELEASE_EVIDENCE_BUNDLE_SCHEMA;
    const privacyClass = cleanString(bundle.privacyClass || bundle.privacy_class, 80);
    const summaryOnlyOk = bundle.summaryOnly === true && privacyClass === "summary_only";
    const summaryCountsMatch = counts.taskCountMatches && counts.passedCountMatches && counts.blockedCountMatches;
    const pass = schemaOk
      && summaryOnlyOk
      && summaryCountsMatch
      && privacyFindings.length === 0
      && privateValueFindings.length === 0
      && missingRequiredTasks.length === 0
      && unknownRequiredTasks.length === 0
      && blockedRequiredTasks.length === 0
      && missingRequiredEvidenceKeys.length === 0;
    const missingRequired = [];
    if (!schemaOk) missingRequired.push("release_evidence_bundle_schema");
    if (!summaryOnlyOk) missingRequired.push("summary_only_bundle");
    if (!summaryCountsMatch) missingRequired.push("matching_bundle_summary_counts");
    if (privacyFindings.length) missingRequired.push("no_privacy_risk_keys");
    if (privateValueFindings.length) missingRequired.push("no_private_value_leaks");
    if (unknownRequiredTasks.length) missingRequired.push("known_required_tasks");
    if (missingRequiredTasks.length) missingRequired.push("required_bundle_tasks");
    if (blockedRequiredTasks.length) missingRequired.push("passing_required_bundle_tasks");
    if (missingRequiredEvidenceKeys.length) missingRequired.push("passing_required_evidence_keys");
    return {
      ok: pass,
      source: "growth-learning-automation-release-evidence-bundle-audit-service",
      schemaVersion: RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      status: pass ? "pass" : "blocked",
      readyForReleaseEvidence: pass,
      bundle: {
        schemaVersion: cleanString(bundle.schemaVersion || bundle.schema_version, 120),
        privacyClass,
        summaryOnly: bundle.summaryOnly === true,
        createdAt: cleanString(bundle.createdAt || bundle.created_at, 80),
        bundleFilePresent: Boolean(payload.bundleFile),
        bundleFileName: payload.bundleFile ? path.basename(payload.bundleFile) : "",
        taskCount: counts.taskCount,
        passedCount: counts.passedCount,
        blockedCount: counts.blockedCount,
        evidenceKeyCount: Object.keys(evidence).length,
        releaseApprovalKeyCount: Object.keys(objectOnly(bundle.releaseApproval || bundle.release_approval)).length
      },
      audit: {
        requiredTaskCount: requiredTasks.length,
        defaultTaskCoverage: requiredTasks.length === DEFAULT_TASK_IDS.length
          && DEFAULT_TASK_IDS.every((taskId) => requiredTasks.includes(taskId)),
        missingRequiredTasks,
        unknownRequiredTasks,
        blockedRequiredTasks,
        missingRequiredEvidenceKeys,
        summaryCountsMatch,
        taskCountMatches: counts.taskCountMatches,
        passedCountMatches: counts.passedCountMatches,
        blockedCountMatches: counts.blockedCountMatches,
        privacyFindingCount: privacyFindings.length,
        privateValueFindingCount: privateValueFindings.length,
        privacyFindings,
        privateValueFindings
      },
      missingRequired,
      error: pass ? "" : "release_evidence_bundle_audit_failed"
    };
  }

  return {
    evaluate
  };
}

module.exports = {
  RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA,
  createLearningAutomationReleaseEvidenceBundleAuditService,
  requiredTaskIds
};
