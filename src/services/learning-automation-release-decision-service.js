"use strict";

const path = require("node:path");

const RELEASE_DECISION_SCHEMA = "growth.learningAutomationReleaseDecision.v1";
const RELEASE_COLLECTION_RUN_SCHEMA = "growth.learningAutomationReleaseCollectionRun.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

function cleanString(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 160)).filter(Boolean))).sort();
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
  for (const [key, child] of Object.entries(value)) scanPrivateValues(child, `${pathName}.${key}`, findings);
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

function decisionStatusFrom(input = {}) {
  const raw = cleanString(input.status || input.decisionStatus || input.decision_status || input.decision || "needs_evidence", 80).toLowerCase();
  if ([ "approved", "approve", "approved_for_release", "release_approved", "owner_approved" ].includes(raw)) return "approved";
  if ([ "blocked", "block", "reject", "rejected" ].includes(raw)) return "blocked";
  if ([ "needs_evidence", "needs-more-evidence", "needs_more_evidence", "incomplete", "needs_review" ].includes(raw)) return "needs_evidence";
  return raw;
}

function scopeFrom(input = {}, collectionRun = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id || collectionRun.workspaceId || collectionRun.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || collectionRun.learnerId || collectionRun.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id || collectionRun.programId || collectionRun.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || collectionRun.domainPackId || collectionRun.domain_pack_id, 160),
    domain: cleanString(input.domain || collectionRun.domain, 120),
    subject: cleanString(input.subject || collectionRun.subject, 120),
    horizon: cleanString(input.horizon || collectionRun.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function collectionRunIdFrom(input = {}, collectionRun = {}) {
  return cleanString(
    input.collectionRunId
    || input.collection_run_id
    || input.runId
    || input.run_id
    || collectionRun.runId
    || collectionRun.run_id
    || collectionRun.collectionRunId
    || collectionRun.collection_run_id,
    160
  );
}

function collectionRunVersion(collectionRun = {}) {
  return cleanString(collectionRun.schemaVersion || collectionRun.schema_version || collectionRun.runVersion || collectionRun.run_version, 160);
}

function collectionRunSummary(collectionRun = {}, fileName = "") {
  const summary = objectOnly(collectionRun.summary);
  const readinessSummary = objectOnly(collectionRun.readinessSummary || collectionRun.readiness_summary);
  const releaseReview = objectOnly(collectionRun.releaseReview || collectionRun.release_review);
  return {
    schemaVersion: cleanString(collectionRunVersion(collectionRun) || RELEASE_COLLECTION_RUN_SCHEMA, 160),
    summaryOnly: collectionRun.summaryOnly === undefined ? true : collectionRun.summaryOnly === true,
    privacyClass: cleanString(collectionRun.privacyClass || collectionRun.privacy_class || "summary_only", 80),
    collectionRunId: collectionRunIdFrom({}, collectionRun),
    status: cleanString(collectionRun.status, 80),
    artifactFileName: cleanString(fileName, 220),
    readyForReleaseReview: collectionRun.readyForReleaseReview === true || summary.readyForReleaseReview === true || collectionRun.status === "ready_for_release_review",
    readyForReleaseEvidence: summary.readyForReleaseEvidence === true,
    writefulSchedulingAllowed: false,
    bundleTaskCount: Number(summary.bundleTaskCount || objectOnly(collectionRun.bundleSummary || collectionRun.bundle_summary).taskCount || 0) || 0,
    bundlePassedCount: Number(summary.bundlePassedCount || objectOnly(collectionRun.bundleSummary || collectionRun.bundle_summary).passedCount || 0) || 0,
    bundleBlockedCount: Number(summary.bundleBlockedCount || objectOnly(collectionRun.bundleSummary || collectionRun.bundle_summary).blockedCount || 0) || 0,
    missingCheckCount: Number(summary.missingCheckCount || readinessSummary.missingCheckCount || 0) || 0,
    blockedCheckCount: Number(summary.blockedCheckCount || readinessSummary.blockedCheckCount || 0) || 0,
    requiredActionCount: Number(summary.requiredActionCount || releaseReview.requiredActionCount || 0) || 0,
    missingCheckKeys: uniqueSorted(releaseReview.missingCheckKeys || readinessSummary.missingCheckKeys),
    blockedCheckKeys: uniqueSorted(releaseReview.blockedCheckKeys || readinessSummary.blockedCheckKeys),
    missingEvidenceKeys: uniqueSorted(releaseReview.missingEvidenceKeys || readinessSummary.missingEvidenceKeys),
    persistedApprovalKeys: uniqueSorted(releaseReview.persistedApprovalKeys || readinessSummary.persistedApprovalKeys)
  };
}

function releaseReviewSummary(collectionRun = {}) {
  const releaseReview = objectOnly(collectionRun.releaseReview || collectionRun.release_review);
  const nextAction = objectOnly(releaseReview.nextAction);
  return {
    schemaVersion: cleanString(releaseReview.schemaVersion || releaseReview.schema_version || "growth.learningAutomationReleaseDecision.releaseReviewSummary.v1", 160),
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

function decisionSummary(input = {}, status = "needs_evidence", collectionSummary = {}) {
  const requested = objectOnly(input.decisionSummary || input.decision_summary || input.releaseDecision || input.release_decision);
  return Object.assign({}, requested, {
    schemaVersion: cleanString(requested.schemaVersion || requested.schema_version || RELEASE_DECISION_SCHEMA, 160),
    summaryOnly: true,
    status,
    approved: status === "approved",
    blocked: status === "blocked",
    needsEvidence: status === "needs_evidence",
    approvedForReleaseReview: status === "approved",
    collectionRunReadyForReleaseReview: collectionSummary.readyForReleaseReview === true,
    advisoryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    schedulingEnabled: false
  });
}

function evidenceSummary(status = "needs_evidence", collectionSummary = {}) {
  return {
    schemaVersion: "growth.learningAutomationReleaseDecision.evidenceSummary.v1",
    summaryOnly: true,
    status,
    collectionRunId: collectionSummary.collectionRunId,
    collectionRunReadyForReleaseReview: collectionSummary.readyForReleaseReview === true,
    approvedRequiresReadyCollectionRun: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  };
}

function validationErrors(scope, collectionRun, collectionRunId, status) {
  const errors = [];
  if (!scope.workspaceId) errors.push("workspace_id");
  if (!collectionRunId) errors.push("collection_run_id");
  if (![ "approved", "blocked", "needs_evidence" ].includes(status)) errors.push("decision_status");
  if (collectionRun) {
    const version = collectionRunVersion(collectionRun);
    if (version && version !== RELEASE_COLLECTION_RUN_SCHEMA) errors.push("release_collection_run_schema");
    const privacyClass = cleanString(collectionRun.privacyClass || collectionRun.privacy_class || "summary_only", 80);
    if (privacyClass !== "summary_only") errors.push("summary_only_release_collection_run");
    if (collectionRun.summaryOnly !== undefined && collectionRun.summaryOnly !== true) errors.push("summary_only_release_collection_run");
  }
  if (status === "approved") {
    if (!collectionRun) errors.push("approved_decision_requires_collection_run");
    const runStatus = cleanString(collectionRun?.status, 80);
    const summary = objectOnly(collectionRun?.summary);
    if (!(runStatus === "ready_for_release_review" || collectionRun?.readyForReleaseReview === true || summary.readyForReleaseReview === true)) {
      errors.push("approved_decision_requires_ready_collection_run");
    }
  }
  return errors;
}

function createLearningAutomationReleaseDecisionService(options = {}) {
  const repository = options.repository || null;

  function evaluateDecision(input = {}) {
    const collectionRun = artifactFromInput(input, [
      "releaseCollectionRun",
      "release_collection_run",
      "collectionRun",
      "collection_run",
      "run"
    ]);
    const scope = scopeFrom(input, objectOnly(collectionRun));
    const status = decisionStatusFrom(input);
    const collectionRunId = collectionRunIdFrom(input, objectOnly(collectionRun));
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(collectionRun, "$.releaseCollectionRun").slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_decision_privacy_failed",
        privacyFindings,
        privateValueFindings
      };
    }
    const missingRequired = validationErrors(scope, collectionRun, collectionRunId, status);
    if (missingRequired.length) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_decision_invalid",
        missingRequired,
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId,
        collectionRunId
      };
    }
    const fileName = fileNameFromInput(input, [
      "releaseCollectionRunFile",
      "release_collection_run_file",
      "collectionRunFile",
      "collection_run_file",
      "runFile",
      "run_file"
    ]);
    const collectionSummary = collectionRunSummary(Object.assign({}, objectOnly(collectionRun), { runId: collectionRunId }), fileName);
    const releaseReview = releaseReviewSummary(objectOnly(collectionRun));
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-decision-service",
      schemaVersion: RELEASE_DECISION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      collectionRunId,
      status,
      releaseDecisionStatus: status,
      approvedForReleaseReview: status === "approved",
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      collectionRunSummary: collectionSummary,
      releaseReview,
      decision: decisionSummary(input, status, collectionSummary),
      evidenceSummary: evidenceSummary(status, collectionSummary),
      note: cleanString(input.note || input.reason || input.summary, 720),
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      decidedBy: cleanString(input.decidedBy || input.decided_by || input.requestedBy || input.requested_by, 120),
      decidedAt: cleanString(input.decidedAt || input.decided_at, 80),
      createdAt: cleanString(input.createdAt || input.created_at, 80)
    });
  }

  function recordDecision(input = {}) {
    if (!repository || typeof repository.saveDecision !== "function") {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_decision_repository_unavailable"
      };
    }
    const evaluated = evaluateDecision(input);
    if (!evaluated.ok) return evaluated;
    const saveResult = repository.saveDecision(evaluated);
    if (!saveResult?.ok) return saveResult || { ok: false, error: "learning_automation_release_decision_save_failed" };
    return {
      ok: true,
      source: "growth-learning-automation-release-decision-service",
      duplicate: Boolean(saveResult.duplicate),
      writefulSchedulingAllowed: false,
      decision: saveResult.decision,
      evaluated
    };
  }

  function listDecisions(input = {}) {
    if (!repository || typeof repository.listDecisions !== "function") {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_decision_repository_unavailable"
      };
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) {
      return {
        ok: false,
        status: "blocked",
        error: "learning_automation_release_decision_scope_required"
      };
    }
    const decisions = repository.listDecisions(Object.assign({}, input, scope, {
      status: decisionStatusFrom(input) === "needs_evidence" && !input.status && !input.decisionStatus && !input.decision_status && !input.decision ? cleanString(input.status, 80) : decisionStatusFrom(input)
    }));
    return {
      ok: true,
      source: "growth-learning-automation-release-decision-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: decisions.length,
      writefulSchedulingAllowed: false,
      decisions
    };
  }

  return {
    evaluateDecision,
    listDecisions,
    recordDecision
  };
}

module.exports = {
  RELEASE_DECISION_SCHEMA,
  createLearningAutomationReleaseDecisionService
};
