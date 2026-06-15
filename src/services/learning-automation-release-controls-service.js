"use strict";

const RELEASE_CONTROLS_SCHEMA = "growth.learningAutomationReleaseControls.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;

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

function unique(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 160)).filter(Boolean)));
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
    source: "growth-learning-automation-release-controls-service",
    error: cleanString(error) || "learning_automation_release_controls_unavailable",
    schemaVersion: RELEASE_CONTROLS_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    advisoryOnly: true,
    recordOnly: true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  }, extra);
}

function publicAction(action = null) {
  if (!action || typeof action !== "object") return null;
  return {
    key: cleanString(action.key, 140),
    action: cleanString(action.action, 180),
    requiredActor: cleanString(action.requiredActor || action.required_actor, 80),
    approvalKey: cleanString(action.approvalKey || action.approval_key, 140)
  };
}

function actionCandidates(result = {}) {
  return asArray(objectOnly(result.runtimeEnablement).requiredActions)
    .concat(asArray(objectOnly(result.activationPreflight).requiredActions))
    .concat(asArray(objectOnly(result.releaseClosure).requiredActions))
    .concat(asArray(objectOnly(result.releaseReview).requiredActions))
    .concat(objectOnly(result.runtimeEnablement).nextAction ? [objectOnly(result.runtimeEnablement).nextAction] : [])
    .concat(objectOnly(result.activationPreflight).nextAction ? [objectOnly(result.activationPreflight).nextAction] : [])
    .concat(objectOnly(result.releaseClosure).nextAction ? [objectOnly(result.releaseClosure).nextAction] : [])
    .concat(objectOnly(result.releaseReview).nextAction ? [objectOnly(result.releaseReview).nextAction] : [])
    .map(publicAction)
    .filter(Boolean)
    .filter((action, index, actions) => actions.findIndex((item) => item.key === action.key) === index);
}

function step(key, result, extra = {}) {
  const value = objectOnly(result);
  return Object.assign({
    key,
    ok: value.ok !== false,
    status: cleanString(value.status || value.error || "unknown", 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    privacyClass: cleanString(value.privacyClass || value.privacy_class, 80),
    summaryOnly: value.summaryOnly === true || value.summary_only === true,
    requiredActionCount: asArray(extra.requiredActions).length,
    nextAction: extra.nextAction || null,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  }, extra);
}

function statusFrom(parts) {
  const runtime = objectOnly(parts.runtime);
  const activation = objectOnly(parts.activation);
  const closure = objectOnly(parts.closure);
  const review = objectOnly(parts.review);
  const readiness = objectOnly(parts.readiness);

  if (!runtime.ok || !activation.ok || !closure.ok || !review.ok || !readiness.ok) return "blocked";
  if (readiness.readyForReleaseReview !== true) return "release_evidence_required";
  if (review.approvedForReleaseReview !== true) return "release_review_required";
  if (closure.backendEvidenceComplete !== true) return "release_closure_required";
  if (activation.status === "approval_required") return "release_approval_required";
  if (activation.status !== "ready_for_owner_config_enablement" && activation.status !== "already_enabled") {
    return "release_activation_required";
  }
  if (runtime.status === "verified_enabled") return "runtime_verified";
  if (runtime.status === "ready_for_manual_runtime_config_enablement") return "manual_runtime_config_required";
  if (runtime.status === "partial_config") return "manual_runtime_config_partial";
  if (runtime.status === "activation_record_required") return "activation_record_required";
  if (runtime.status === "activation_record_invalid") return "activation_record_invalid";
  return "release_controls_required";
}

function actionSourceForStatus(status, parts) {
  if (status === "release_evidence_required") return [parts.readiness, parts.review];
  if (status === "release_review_required") return [parts.review];
  if (status === "release_closure_required") return [parts.closure, parts.review];
  if (status === "release_approval_required" || status === "release_activation_required") return [parts.activation, parts.closure];
  if (status === "runtime_verified" || status === "manual_runtime_config_required" || status === "manual_runtime_config_partial"
    || status === "activation_record_required" || status === "activation_record_invalid") {
    return [parts.runtime];
  }
  return [parts.runtime, parts.activation, parts.closure, parts.review];
}

function collectActions(parts, status) {
  return actionSourceForStatus(status, parts)
    .flatMap(actionCandidates)
    .filter((action, index, actions) => actions.findIndex((item) => item.key === action.key) === index);
}

function collectMissing(parts) {
  const reviewSummary = objectOnly(parts.review.releaseReview);
  const closureSummary = objectOnly(parts.closure.releaseClosure);
  return {
    missingCheckKeys: unique(asArray(reviewSummary.missingCheckKeys).concat(asArray(closureSummary.missingCheckKeys))),
    blockedCheckKeys: unique(asArray(reviewSummary.blockedCheckKeys).concat(asArray(closureSummary.blockedCheckKeys))),
    missingEvidenceKeys: unique(asArray(reviewSummary.missingEvidenceKeys).concat(asArray(closureSummary.missingEvidenceKeys))),
    missingApprovalKeys: unique(asArray(parts.closure.missingApprovalKeys)
      .concat(asArray(closureSummary.missingApprovalKeys))
      .concat(asArray(parts.activation.missingApprovalKeys)))
  };
}

function createLearningAutomationReleaseControlsService(options = {}) {
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseReviewService = options.releaseReviewService || null;
  const releaseClosureService = options.releaseClosureService || null;
  const releaseActivationService = options.releaseActivationService || null;
  const runtimeEnablementService = options.runtimeEnablementService || null;

  function summarize(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_controls_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    if (privacyFindings.length) return unavailable("learning_automation_release_controls_privacy_failed", { privacyFindings });
    if (!releaseReadinessService || typeof releaseReadinessService.evaluateReadiness !== "function") {
      return unavailable("learning_automation_release_controls_readiness_unavailable");
    }
    if (!releaseReviewService || typeof releaseReviewService.review !== "function") {
      return unavailable("learning_automation_release_controls_review_unavailable");
    }
    if (!releaseClosureService || typeof releaseClosureService.summarize !== "function") {
      return unavailable("learning_automation_release_controls_closure_unavailable");
    }
    if (!releaseActivationService || typeof releaseActivationService.preflight !== "function") {
      return unavailable("learning_automation_release_controls_activation_unavailable");
    }
    if (!runtimeEnablementService || typeof runtimeEnablementService.evaluate !== "function") {
      return unavailable("learning_automation_release_controls_runtime_unavailable");
    }

    const request = Object.assign({}, input, scope);
    const readiness = releaseReadinessService.evaluateReadiness(request);
    const review = releaseReviewService.review(request);
    const closure = releaseClosureService.summarize(request);
    const activation = releaseActivationService.preflight(request);
    const runtime = runtimeEnablementService.evaluate(request);
    const dependencyPrivacyFindings = scanPrivacyKeys({ readiness, review, closure, activation, runtime }).slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_controls_dependency_privacy_failed", { privacyFindings: dependencyPrivacyFindings });
    }

    const parts = {
      readiness: objectOnly(readiness),
      review: objectOnly(review),
      closure: objectOnly(closure),
      activation: objectOnly(activation),
      runtime: objectOnly(runtime)
    };
    const missing = collectMissing(parts);
    const status = statusFrom(parts);
    const requiredActions = collectActions(parts, status);
    const steps = [
      step("release_readiness", readiness, {
        ready: parts.readiness.readyForReleaseReview === true,
        requiredActions: actionCandidates(parts.readiness),
        nextAction: objectOnly(parts.readiness.releaseReview).nextAction || null
      }),
      step("release_review", review, {
        ready: parts.review.approvedForReleaseReview === true,
        latestCollectionRunId: cleanString(objectOnly(parts.review.latestCollectionRun).collectionRunId || objectOnly(parts.review.latestCollectionRun).runId, 160),
        latestDecisionId: cleanString(objectOnly(parts.review.latestDecision).decisionId, 160),
        requiredActions: actionCandidates(parts.review),
        nextAction: objectOnly(parts.review.releaseReview).nextAction || null
      }),
      step("release_closure", closure, {
        ready: parts.closure.backendEvidenceComplete === true,
        backendEvidenceComplete: parts.closure.backendEvidenceComplete === true,
        requiredActions: actionCandidates(parts.closure),
        nextAction: objectOnly(parts.closure.releaseClosure).nextAction || null
      }),
      step("release_activation", activation, {
        ready: parts.activation.preflightPassed === true,
        requestedActivationGates: asArray(parts.activation.requestedActivationGates),
        requiredActions: actionCandidates(parts.activation),
        nextAction: objectOnly(parts.activation.activationPreflight).nextAction || null
      }),
      step("runtime_enablement", runtime, {
        ready: parts.runtime.runtimeConfigVerified === true,
        requestedActivationGates: asArray(parts.runtime.requestedActivationGates),
        requiredActions: actionCandidates(parts.runtime),
        nextAction: objectOnly(parts.runtime.runtimeEnablement).nextAction || null
      })
    ];

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-controls-service",
      schemaVersion: RELEASE_CONTROLS_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      advisoryOnly: true,
      recordOnly: true,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      releaseControls: {
        schemaVersion: "growth.learningAutomationReleaseControls.summary.v1",
        summaryOnly: true,
        status,
        requiredActionCount: requiredActions.length,
        requiredActions,
        nextAction: requiredActions[0] || null,
        missingCheckKeys: missing.missingCheckKeys,
        blockedCheckKeys: missing.blockedCheckKeys,
        missingEvidenceKeys: missing.missingEvidenceKeys,
        missingApprovalKeys: missing.missingApprovalKeys,
        configChangeApplied: false,
        runtimeConfigChange: false,
        runtimeConfigMutationPerformed: false,
        writefulSchedulingAllowed: false,
        backgroundSchedulingAllowed: false,
        backgroundWorkerAllowed: false
      },
      steps
    });
  }

  return { summarize };
}

module.exports = {
  RELEASE_CONTROLS_SCHEMA,
  createLearningAutomationReleaseControlsService
};
