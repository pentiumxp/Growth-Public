"use strict";

const RELEASE_CLOSURE_SCHEMA = "growth.learningAutomationReleaseClosure.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;

function cleanString(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 160),
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label, 160)
  };
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-closure-service",
    error: cleanString(error) || "learning_automation_release_closure_unavailable"
  }, extra);
}

function publicCollectionRun(run = null) {
  if (!run) return null;
  return {
    collectionRunId: cleanString(run.collectionRunId || run.collection_run_id || run.runId || run.run_id, 160),
    runId: cleanString(run.runId || run.run_id || run.collectionRunId || run.collection_run_id, 160),
    status: cleanString(run.status, 80),
    privacyClass: cleanString(run.privacyClass || run.privacy_class, 80)
  };
}

function publicDecision(decision = null) {
  if (!decision) return null;
  return {
    decisionId: cleanString(decision.decisionId || decision.decision_id, 160),
    collectionRunId: cleanString(decision.collectionRunId || decision.collection_run_id || decision.runId || decision.run_id, 160),
    status: cleanString(decision.status, 80),
    privacyClass: cleanString(decision.privacyClass || decision.privacy_class, 80)
  };
}

function publicAction(action = null) {
  if (!action || typeof action !== "object") return null;
  return {
    key: cleanString(action.key, 120),
    action: cleanString(action.action, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor, 80)
  };
}

function reviewSummary(review = {}) {
  const releaseReview = objectOnly(review.releaseReview);
  const readiness = objectOnly(review.readiness);
  return {
    schemaVersion: cleanString(review.schemaVersion || review.schema_version, 120),
    status: cleanString(review.status, 80),
    readyForReleaseReview: review.readyForReleaseReview === true,
    approvedForReleaseReview: review.approvedForReleaseReview === true,
    collectionRunRequired: review.collectionRunRequired === true,
    collectionRunPresent: review.collectionRunPresent === true,
    decisionPresent: review.decisionPresent === true,
    advisoryOnly: review.advisoryOnly === true,
    privacyClass: cleanString(review.privacyClass || review.privacy_class, 80),
    summaryOnly: review.summaryOnly === true || review.summary_only === true,
    writefulSchedulingAllowed: review.writefulSchedulingAllowed === true,
    runtimeConfigChange: review.runtimeConfigChange === true,
    missingCheckKeys: asArray(releaseReview.missingCheckKeys || readiness.missingCheckKeys).map((key) => cleanString(key, 160)).filter(Boolean),
    blockedCheckKeys: asArray(releaseReview.blockedCheckKeys || readiness.blockedCheckKeys).map((key) => cleanString(key, 160)).filter(Boolean),
    missingEvidenceKeys: asArray(releaseReview.missingEvidenceKeys || readiness.missingEvidenceKeys).map((key) => cleanString(key, 160)).filter(Boolean),
    requiredActionCount: Number(releaseReview.requiredActionCount || readiness.requiredActionCount || 0) || 0,
    nextAction: publicAction(releaseReview.nextAction || readiness.nextAction)
  };
}

function executionGateSummary(gate = {}) {
  return {
    schemaVersion: cleanString(gate.schemaVersion || gate.schema_version, 120),
    status: cleanString(gate.status, 80),
    authorized: gate.authorized === true,
    reason: cleanString(gate.reason || gate.error, 180),
    requiredApprovalKeys: asArray(gate.requiredApprovalKeys || gate.required_approval_keys).map((key) => cleanString(key, 120)).filter(Boolean),
    approvalKeys: asArray(gate.approvalKeys || gate.approval_keys).map((key) => cleanString(key, 120)).filter(Boolean),
    missingApprovalKeys: asArray(gate.missingApprovalKeys || gate.missing_approval_keys).map((key) => cleanString(key, 120)).filter(Boolean),
    writefulSchedulingAllowed: gate.writefulSchedulingAllowed === true,
    runtimeConfigChange: gate.runtimeConfigChange === true,
    privacyClass: cleanString(gate.privacyClass || gate.privacy_class, 80),
    summaryOnly: gate.summaryOnly === true || gate.summary_only === true,
    latestCollectionRun: publicCollectionRun(gate.latestCollectionRun),
    latestDecision: publicDecision(gate.latestDecision)
  };
}

function approvalActions(missingKeys = []) {
  return missingKeys.map((key) => ({
    key: `record_${cleanString(key, 100)}`,
    action: "record_release_approval",
    approvalKey: cleanString(key, 120),
    requiredActor: "owner"
  }));
}

function requiredActionsFor(review, gate) {
  const actions = [];
  const reviewAction = publicAction(review.nextAction);
  if (reviewAction) actions.push(reviewAction);
  approvalActions(gate.missingApprovalKeys).forEach((action) => actions.push(action));
  if (!actions.length && gate.authorized !== true) {
    actions.push({
      key: "resolve_release_authorization_blocker",
      action: "inspect_release_authorization_readback",
      requiredActor: "owner"
    });
  }
  return actions;
}

function closureStatus(review, gate) {
  if (review.status !== "approved" || review.approvedForReleaseReview !== true) {
    if (review.collectionRunRequired) return "collection_run_required";
    if (review.collectionRunPresent && !review.decisionPresent) return "owner_decision_required";
    return review.status || "release_review_incomplete";
  }
  if (gate.authorized === true) return "ready_for_owner_release_activation";
  if (gate.missingApprovalKeys.length) return "approval_required";
  return "authorization_blocked";
}

function createLearningAutomationReleaseClosureService(options = {}) {
  const releaseReviewService = options.releaseReviewService || null;
  const releaseAuthorizationService = options.releaseAuthorizationService || null;

  function summarize(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_closure_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    if (privacyFindings.length) return unavailable("learning_automation_release_closure_privacy_failed", { privacyFindings });
    if (!releaseReviewService || typeof releaseReviewService.review !== "function") {
      return unavailable("learning_automation_release_closure_review_unavailable");
    }
    if (!releaseAuthorizationService || typeof releaseAuthorizationService.authorize !== "function") {
      return unavailable("learning_automation_release_closure_authorization_unavailable");
    }

    const reviewResult = releaseReviewService.review(Object.assign({}, input, scope));
    if (!reviewResult?.ok) {
      return unavailable(reviewResult?.error || "learning_automation_release_closure_review_failed", {
        status: "blocked",
        backendEvidenceComplete: false
      });
    }
    const reviewPrivacyFindings = scanPrivacyKeys(reviewResult).slice(0, 16);
    if (reviewPrivacyFindings.length) {
      return unavailable("learning_automation_release_closure_review_privacy_failed", {
        status: "blocked",
        backendEvidenceComplete: false,
        privacyFindings: reviewPrivacyFindings
      });
    }

    const review = reviewSummary(reviewResult);
    const gateResult = releaseAuthorizationService.authorize(Object.assign({}, input, scope));
    const gate = executionGateSummary(gateResult || {});
    if (gateResult && gateResult.ok === false && gate.reason) {
      gate.status = gate.status || "blocked";
    }
    const gatePrivacyFindings = scanPrivacyKeys(gateResult).slice(0, 16);
    if (gatePrivacyFindings.length) {
      return unavailable("learning_automation_release_closure_authorization_privacy_failed", {
        status: "blocked",
        backendEvidenceComplete: false,
        privacyFindings: gatePrivacyFindings
      });
    }

    const status = closureStatus(review, gate);
    const requiredActions = requiredActionsFor(review, gate);
    const backendEvidenceComplete = review.approvedForReleaseReview === true && gate.authorized === true;
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-closure-service",
      schemaVersion: RELEASE_CLOSURE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      backendEvidenceComplete,
      readyForOwnerReleaseActivation: backendEvidenceComplete,
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      review,
      executionGate: gate,
      latestCollectionRun: gate.latestCollectionRun || publicCollectionRun(reviewResult.latestCollectionRun),
      latestDecision: gate.latestDecision || publicDecision(reviewResult.latestDecision),
      releaseClosure: {
        schemaVersion: "growth.learningAutomationReleaseClosure.summary.v1",
        summaryOnly: true,
        status,
        backendEvidenceComplete,
        readyForOwnerReleaseActivation: backendEvidenceComplete,
        requiredActionCount: requiredActions.length,
        requiredActions,
        nextAction: requiredActions[0] || null,
        missingCheckKeys: review.missingCheckKeys,
        blockedCheckKeys: review.blockedCheckKeys,
        missingEvidenceKeys: review.missingEvidenceKeys,
        missingApprovalKeys: gate.missingApprovalKeys,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false
      }
    });
  }

  return { summarize };
}

module.exports = {
  RELEASE_CLOSURE_SCHEMA,
  createLearningAutomationReleaseClosureService
};
