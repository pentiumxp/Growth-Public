"use strict";

const RELEASE_PACKAGE_SCHEMA = "growth.learningAutomationReleasePackage.v1";
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

function booleanFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function nowIso(now) {
  const value = typeof now === "function" ? now() : new Date();
  if (value instanceof Date) return value.toISOString();
  return cleanString(value, 80) || new Date().toISOString();
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 120)).filter(Boolean)));
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

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function packageOptions(input = {}) {
  return {
    writeCollectionRun: booleanFlag(input.writeCollectionRun || input.write_collection_run || input.writeCollectionRunRecord || input.write_collection_run_record),
    allowWritePackage: booleanFlag(input.allowWritePackage || input.allow_write_package || input.allowWrite || input.allow_write),
    activationGates: uniqueStrings(input.activationGates || input.activation_gates || []),
    requiredApprovalKeys: uniqueStrings(input.requiredApprovalKeys || input.required_approval_keys || []),
    activationRecordLimit: Number(input.activationRecordLimit || input.activation_record_limit || 20) || 20,
    runtimeEnablementRecordLimit: Number(input.runtimeEnablementRecordLimit || input.runtime_enablement_record_limit || 20) || 20
  };
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-package-service",
    schemaVersion: RELEASE_PACKAGE_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error, 180) || "learning_automation_release_package_unavailable",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  }, extra);
}

function statusOf(value = {}) {
  return cleanString(value.status || value.summary?.status || "", 80).toLowerCase();
}

function stepStatusFor(key, value = {}, resultOk = false) {
  if (!value || typeof value !== "object") return "blocked";
  if (key === "release_evidence_bundle") return resultOk ? "pass" : "blocked";
  if (key === "release_evidence_bundle_audit") return value.readyForReleaseEvidence === true ? "pass" : (statusOf(value) || "blocked");
  if (key === "release_readiness") return value.summary?.readyForReleaseReview === true ? "pass" : (statusOf(value) || "incomplete");
  if (key === "release_collection_run") return value.readyForReleaseReview === true ? "pass" : (statusOf(value) || "incomplete");
  return statusOf(value) || (value.ok === true ? "pass" : "blocked");
}

function publicStep(key, label, value = {}, resultOk = false) {
  const status = stepStatusFor(key, value, resultOk);
  const summary = objectOnly(value.summary);
  const releaseControls = objectOnly(value.releaseControls || value.release_controls);
  const releaseReview = objectOnly(value.releaseReview || value.release_review);
  return {
    key,
    label,
    status,
    ok: status === "pass",
    source: cleanString(value.source, 160),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    privacyClass: cleanString(value.privacyClass || value.privacy_class || "summary_only", 80),
    summaryOnly: value.summaryOnly === undefined ? true : value.summaryOnly === true,
    error: cleanString(value.error, 180),
    requiredActionCount: Number(releaseControls.requiredActionCount || releaseReview.requiredActionCount || summary.requiredActionCount || 0) || 0,
    nextActionKey: cleanString(
      objectOnly(releaseControls.nextAction || releaseControls.next_action || releaseReview.nextAction || releaseReview.next_action).key,
      120
    ),
    readyForReleaseEvidence: value.readyForReleaseEvidence === true,
    readyForReleaseReview: value.readyForReleaseReview === true || summary.readyForReleaseReview === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true
  };
}

function bundleArtifact(bundleResult = {}) {
  return bundleResult.bundle && typeof bundleResult.bundle === "object" ? bundleResult.bundle : null;
}

function collectionRunArtifact(collectionResult = {}) {
  return objectOnly(collectionResult.run || collectionResult.evaluated || collectionResult);
}

function collectionRunIdFrom(value = {}, fallback = "") {
  return cleanString(value.runId || value.run_id || value.collectionRunId || value.collection_run_id || fallback, 160);
}

function readinessInput(scope, input, bundle, audit) {
  const evidence = Object.assign({}, objectOnly(bundle.evidence), objectOnly(input.evidence || input.evidence_summary), {
    releaseEvidenceBundleAudit: audit
  });
  return Object.assign({}, input, scope, {
    evidence,
    releaseApproval: Object.assign({}, objectOnly(bundle.releaseApproval || bundle.release_approval), objectOnly(input.releaseApproval || input.release_approval || input.approvals)),
    createdAt: cleanString(input.createdAt || input.created_at, 80),
    requestedBy: cleanString(input.requestedBy || input.requested_by, 120)
  });
}

function controlsInput(scope, input, options, collectionRun) {
  return Object.assign({}, input, scope, {
    collectionRunId: collectionRunIdFrom(collectionRun, cleanString(input.collectionRunId || input.collection_run_id, 160)),
    activationGates: options.activationGates,
    requiredApprovalKeys: options.requiredApprovalKeys,
    activationRecordLimit: options.activationRecordLimit,
    runtimeEnablementRecordLimit: options.runtimeEnablementRecordLimit
  });
}

function derivePackageStatus(steps = [], collectionRun = {}) {
  if (collectionRun.readyForReleaseReview === true) return "ready_for_release_review";
  if (steps.some((step) => step.status === "blocked")) return "blocked";
  return "incomplete";
}

function buildSummary(status, steps, options, collectionRun) {
  const passedCount = steps.filter((step) => step.status === "pass").length;
  const blockedCount = steps.filter((step) => step.status === "blocked").length;
  return {
    schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
    summaryOnly: true,
    status,
    stepCount: steps.length,
    passedCount,
    blockedCount,
    incompleteCount: steps.length - passedCount - blockedCount,
    readyForReleaseReview: collectionRun.readyForReleaseReview === true,
    collectionRunId: collectionRunIdFrom(collectionRun),
    collectionRunWritten: options.writeCollectionRun && collectionRunIdFrom(collectionRun) ? true : false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function createLearningAutomationReleasePackageService(options = {}) {
  const evidenceBundleService = options.evidenceBundleService || null;
  const evidenceBundleAuditService = options.evidenceBundleAuditService || null;
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseCollectionRunService = options.releaseCollectionRunService || null;
  const releaseControlsService = options.releaseControlsService || null;
  const now = options.now || (() => new Date());

  function buildPackage(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_package_workspace_required", scope);
    const optionBag = packageOptions(input);
    if (optionBag.writeCollectionRun && !optionBag.allowWritePackage) {
      return unavailable("release_package_write_not_allowed", scope, {
        requiredFlag: "--allow-write",
        writeCollectionRun: true
      });
    }
    const inputPrivacyFindings = scanPrivacyKeys(input).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("release_package_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }
    if (!evidenceBundleService || typeof evidenceBundleService.buildBundle !== "function") {
      return unavailable("release_package_bundle_service_unavailable", scope);
    }
    if (!evidenceBundleAuditService || typeof evidenceBundleAuditService.evaluate !== "function") {
      return unavailable("release_package_bundle_audit_service_unavailable", scope);
    }
    if (!releaseReadinessService || typeof releaseReadinessService.evaluateReadiness !== "function") {
      return unavailable("release_package_readiness_service_unavailable", scope);
    }
    if (!releaseCollectionRunService || typeof releaseCollectionRunService.evaluateRun !== "function") {
      return unavailable("release_package_collection_run_service_unavailable", scope);
    }
    if (optionBag.writeCollectionRun && typeof releaseCollectionRunService.recordRun !== "function") {
      return unavailable("release_package_collection_run_record_unavailable", scope);
    }
    if (!releaseControlsService || typeof releaseControlsService.summarize !== "function") {
      return unavailable("release_package_controls_service_unavailable", scope);
    }

    const createdAt = cleanString(input.createdAt || input.created_at, 80) || nowIso(now);
    const bundleResult = evidenceBundleService.buildBundle(Object.assign({}, input, scope, { createdAt }));
    const bundle = bundleArtifact(bundleResult);
    const audit = bundle
      ? evidenceBundleAuditService.evaluate(Object.assign({}, input, scope, {
        bundle,
        requiredTaskIds: input.requiredTaskIds || input.required_task_ids || input.requiredTasks || input.required_tasks
      }))
      : unavailable("release_package_bundle_missing", scope);
    const readiness = bundle
      ? releaseReadinessService.evaluateReadiness(readinessInput(scope, input, bundle, audit))
      : unavailable("release_package_readiness_skipped", scope);
    const collectionInput = bundle
      ? Object.assign({}, input, scope, {
        releaseEvidenceBundle: bundle,
        releaseEvidenceBundleAudit: audit,
        releaseReadiness: readiness,
        createdBy: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by, 120),
        createdAt
      })
      : {};
    const collectionResult = bundle
      ? optionBag.writeCollectionRun
        ? releaseCollectionRunService.recordRun(collectionInput)
        : releaseCollectionRunService.evaluateRun(collectionInput)
      : unavailable("release_package_collection_run_skipped", scope);
    const collectionRun = collectionRunArtifact(collectionResult);
    const controls = releaseControlsService.summarize(controlsInput(scope, input, optionBag, collectionRun));
    const steps = [
      publicStep("release_evidence_bundle", "Release evidence bundle", bundle || bundleResult, bundleResult.ok === true),
      publicStep("release_evidence_bundle_audit", "Release evidence bundle audit", audit, audit.ok === true),
      publicStep("release_readiness", "Release readiness", readiness, readiness.ok === true),
      publicStep("release_collection_run", "Release collection run", collectionRun, collectionRun.ok === true),
      publicStep("release_controls", "Release controls readback", controls, controls.ok === true)
    ];
    const status = derivePackageStatus(steps, collectionRun);
    const releasePackage = Object.assign({}, scope, {
      ok: status === "ready_for_release_review",
      source: "growth-learning-automation-release-package-service",
      schemaVersion: RELEASE_PACKAGE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      createdAt,
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      schedulerPermissionGranted: false,
      writeCollectionRun: optionBag.writeCollectionRun,
      steps,
      summary: buildSummary(status, steps, optionBag, collectionRun),
      artifacts: {
        releaseEvidenceBundle: bundle,
        releaseEvidenceBundleAudit: audit,
        releaseReadiness: readiness,
        releaseCollectionRun: collectionRun,
        releaseControls: controls
      }
    });
    const privacyFindings = scanPrivacyKeys(releasePackage).slice(0, 16);
    const privateValueFindings = scanPrivateValues(releasePackage).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("release_package_privacy_failed", scope, {
        privacyFindings,
        privateValueFindings
      });
    }
    return {
      ok: releasePackage.ok,
      source: "growth-learning-automation-release-package-service",
      package: releasePackage,
      summary: releasePackage.summary
    };
  }

  return {
    buildPackage
  };
}

module.exports = {
  RELEASE_PACKAGE_SCHEMA,
  createLearningAutomationReleasePackageService,
  scopeFrom
};
