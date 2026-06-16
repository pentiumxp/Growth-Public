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
    writePackageRecord: booleanFlag(input.writePackageRecord || input.write_package_record || input.recordPackage || input.record_package),
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
  const releaseDashboard = objectOnly(value.releaseDashboard || value.release_dashboard);
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
    requiredActionCount: Number(releaseDashboard.requiredActionCount || releaseControls.requiredActionCount || releaseReview.requiredActionCount || summary.requiredActionCount || 0) || 0,
    nextActionKey: cleanString(
      objectOnly(releaseDashboard.nextAction || releaseDashboard.next_action || releaseControls.nextAction || releaseControls.next_action || releaseReview.nextAction || releaseReview.next_action).key,
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

function dashboardInput(scope, input, options, collectionRun) {
  return controlsInput(scope, input, options, collectionRun);
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
    packageRecordRequested: options.writePackageRecord === true,
    packageRecordWritten: false,
    packageRecordId: "",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function packageArtifactFromInput(input = {}) {
  const direct = input.releasePackage || input.release_package || input.package;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  if (cleanString(input.schemaVersion || input.schema_version, 180) === RELEASE_PACKAGE_SCHEMA) return input;
  return null;
}

function statusFromPackage(releasePackage = {}) {
  const status = cleanString(releasePackage.status || releasePackage.summary?.status || "blocked", 80).toLowerCase();
  return [ "ready_for_release_review", "blocked", "incomplete" ].includes(status) ? status : "blocked";
}

function packageScopeFrom(input = {}, releasePackage = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id || releasePackage.workspaceId || releasePackage.workspace_id, 120),
    learnerId: cleanString(input.learnerId || input.learner_id || releasePackage.learnerId || releasePackage.learner_id || input.workspaceId || input.workspace_id || releasePackage.workspaceId || releasePackage.workspace_id, 120),
    programId: cleanString(input.programId || input.program_id || releasePackage.programId || releasePackage.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || releasePackage.domainPackId || releasePackage.domain_pack_id, 120),
    domain: cleanString(input.domain || releasePackage.domain, 80),
    subject: cleanString(input.subject || releasePackage.subject, 80),
    horizon: cleanString(input.horizon || releasePackage.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function summaryBlock(value = {}, fallback = {}) {
  return objectOnly(value.summary || value.releaseControls || value.release_controls || value.audit || value.releaseReview || value.release_review || fallback);
}

function stepSummaryFromPackage(releasePackage = {}) {
  const steps = asArray(releasePackage.steps).map((step = {}) => ({
    key: cleanString(step.key, 120),
    status: cleanString(step.status || (step.ok === true ? "pass" : "blocked"), 80),
    ok: step.ok === true,
    schemaVersion: cleanString(step.schemaVersion || step.schema_version, 160),
    privacyClass: cleanString(step.privacyClass || step.privacy_class || "summary_only", 80),
    summaryOnly: step.summaryOnly === undefined ? true : step.summaryOnly === true,
    requiredActionCount: Number(step.requiredActionCount || step.required_action_count || 0) || 0,
    nextActionKey: cleanString(step.nextActionKey || step.next_action_key, 120),
    readyForReleaseEvidence: step.readyForReleaseEvidence === true || step.ready_for_release_evidence === true,
    readyForReleaseReview: step.readyForReleaseReview === true || step.ready_for_release_review === true,
    writefulSchedulingAllowed: false
  })).filter((step) => step.key);
  return {
    schemaVersion: "growth.learningAutomationReleasePackage.stepSummary.v1",
    summaryOnly: true,
    stepCount: steps.length,
    passedCount: steps.filter((step) => step.status === "pass").length,
    blockedCount: steps.filter((step) => step.status === "blocked").length,
    steps
  };
}

function artifactSummary(value = {}, fallback = {}) {
  const summary = Object.assign({}, summaryBlock(value, fallback));
  return Object.assign({
    schemaVersion: cleanString(value.schemaVersion || value.schema_version || summary.schemaVersion || summary.schema_version, 160),
    privacyClass: cleanString(value.privacyClass || value.privacy_class || "summary_only", 80),
    summaryOnly: true,
    status: cleanString(value.status || summary.status || (value.ok === true ? "pass" : ""), 80),
    ok: value.ok === true,
    readyForReleaseEvidence: value.readyForReleaseEvidence === true || summary.readyForReleaseEvidence === true,
    readyForReleaseReview: value.readyForReleaseReview === true || summary.readyForReleaseReview === true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  }, summary);
}

function controlsSummaryFromPackage(controls = {}) {
  const releaseControls = objectOnly(controls.releaseControls || controls.release_controls || controls.summary);
  const nextAction = objectOnly(releaseControls.nextAction || releaseControls.next_action);
  return Object.assign(artifactSummary(controls, releaseControls), {
    requiredActionCount: Number(releaseControls.requiredActionCount || releaseControls.required_action_count || 0) || 0,
    nextAction: nextAction.key ? {
      key: cleanString(nextAction.key, 120),
      action: cleanString(nextAction.action, 180),
      requiredActor: cleanString(nextAction.requiredActor || nextAction.required_actor, 80)
    } : null,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  });
}

function dashboardSummaryFromPackage(dashboard = {}) {
  const releaseDashboard = objectOnly(dashboard.releaseDashboard || dashboard.release_dashboard || dashboard.summary);
  const nextAction = objectOnly(releaseDashboard.nextAction || releaseDashboard.next_action);
  return Object.assign(artifactSummary(dashboard, releaseDashboard), {
    readinessStatus: cleanString(releaseDashboard.readinessStatus || releaseDashboard.readiness_status, 120),
    controlsStatus: cleanString(releaseDashboard.controlsStatus || releaseDashboard.controls_status, 120),
    inventoryStatus: cleanString(releaseDashboard.inventoryStatus || releaseDashboard.inventory_status, 120),
    requiredActionCount: Number(releaseDashboard.requiredActionCount || releaseDashboard.required_action_count || 0) || 0,
    nextAction: nextAction.key ? {
      key: cleanString(nextAction.key, 120),
      action: cleanString(nextAction.action, 180),
      requiredActor: cleanString(nextAction.requiredActor || nextAction.required_actor, 80)
    } : null,
    latestCollectionRunId: cleanString(releaseDashboard.latestCollectionRunId || releaseDashboard.latest_collection_run_id, 160),
    readinessEvidencePresentCount: Number(releaseDashboard.readinessEvidencePresentCount || releaseDashboard.readiness_evidence_present_count || 0) || 0,
    readinessEvidenceMissingCount: Number(releaseDashboard.readinessEvidenceMissingCount || releaseDashboard.readiness_evidence_missing_count || 0) || 0,
    readinessEvidenceSourceBundleId: cleanString(releaseDashboard.readinessEvidenceSourceBundleId || releaseDashboard.readiness_evidence_source_bundle_id, 180),
    latestReadinessSnapshotId: cleanString(releaseDashboard.latestReadinessSnapshotId || releaseDashboard.latest_readiness_snapshot_id, 180),
    latestReadinessEvidencePresentCount: Number(releaseDashboard.latestReadinessEvidencePresentCount || releaseDashboard.latest_readiness_evidence_present_count || 0) || 0,
    latestReadinessEvidenceMissingCount: Number(releaseDashboard.latestReadinessEvidenceMissingCount || releaseDashboard.latest_readiness_evidence_missing_count || 0) || 0,
    latestReadinessEvidenceSourceBundleId: cleanString(releaseDashboard.latestReadinessEvidenceSourceBundleId || releaseDashboard.latest_readiness_evidence_source_bundle_id, 180),
    ownerReviewStageSummary: objectOnly(releaseDashboard.ownerReviewStageSummary || releaseDashboard.owner_review_stage_summary),
    latestReadinessOwnerReviewStageSummary: objectOnly(releaseDashboard.latestReadinessOwnerReviewStageSummary || releaseDashboard.latest_readiness_owner_review_stage_summary),
    latestPackageId: cleanString(releaseDashboard.latestPackageId || releaseDashboard.latest_package_id, 160),
    latestDecisionId: cleanString(releaseDashboard.latestDecisionId || releaseDashboard.latest_decision_id, 160),
    latestActivationId: cleanString(releaseDashboard.latestActivationId || releaseDashboard.latest_activation_id, 160),
    latestRuntimeEnablementId: cleanString(releaseDashboard.latestRuntimeEnablementId || releaseDashboard.latest_runtime_enablement_id, 160),
    missingRecordKinds: uniqueStrings(releaseDashboard.missingRecordKinds || releaseDashboard.missing_record_kinds || []),
    blockedRecordKinds: uniqueStrings(releaseDashboard.blockedRecordKinds || releaseDashboard.blocked_record_kinds || []),
    missingCheckKeys: uniqueStrings(releaseDashboard.missingCheckKeys || releaseDashboard.missing_check_keys || []),
    blockedCheckKeys: uniqueStrings(releaseDashboard.blockedCheckKeys || releaseDashboard.blocked_check_keys || []),
    missingEvidenceKeys: uniqueStrings(releaseDashboard.missingEvidenceKeys || releaseDashboard.missing_evidence_keys || []),
    missingApprovalKeys: uniqueStrings(releaseDashboard.missingApprovalKeys || releaseDashboard.missing_approval_keys || []),
    persistedApprovalKeys: uniqueStrings(releaseDashboard.persistedApprovalKeys || releaseDashboard.persisted_approval_keys || []),
    persistedEvidenceKeys: uniqueStrings(releaseDashboard.persistedEvidenceKeys || releaseDashboard.persisted_evidence_keys || []),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  });
}

function collectionRunIdFromPackage(releasePackage = {}) {
  const artifacts = objectOnly(releasePackage.artifacts);
  const collectionRun = objectOnly(artifacts.releaseCollectionRun || artifacts.release_collection_run);
  return collectionRunIdFrom(collectionRun, cleanString(releasePackage.summary?.collectionRunId || releasePackage.summary?.collection_run_id, 160));
}

function packageRecordFromArtifact(input = {}, releasePackage = {}) {
  const artifacts = objectOnly(releasePackage.artifacts);
  const scope = packageScopeFrom(input, releasePackage);
  const collectionRunId = cleanString(
    input.collectionRunId || input.collection_run_id || input.runId || input.run_id || collectionRunIdFromPackage(releasePackage),
    160
  );
  return Object.assign({}, scope, {
    packageId: input.packageId || input.package_id || releasePackage.packageId || releasePackage.package_id || releasePackage.id,
    collectionRunId,
    status: statusFromPackage(releasePackage),
    schemaVersion: cleanString(releasePackage.schemaVersion || releasePackage.schema_version || RELEASE_PACKAGE_SCHEMA, 160) || RELEASE_PACKAGE_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    packageSummary: Object.assign({
      schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
      summaryOnly: true,
      status: statusFromPackage(releasePackage),
      ok: releasePackage.ok === true,
      collectionRunId,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    }, objectOnly(releasePackage.summary)),
    stepSummary: stepSummaryFromPackage(releasePackage),
    releaseEvidenceBundleSummary: artifactSummary(objectOnly(artifacts.releaseEvidenceBundle || artifacts.release_evidence_bundle)),
    releaseEvidenceBundleAuditSummary: artifactSummary(objectOnly(artifacts.releaseEvidenceBundleAudit || artifacts.release_evidence_bundle_audit)),
    releaseReadinessSummary: artifactSummary(objectOnly(artifacts.releaseReadiness || artifacts.release_readiness)),
    releaseCollectionRunSummary: artifactSummary(objectOnly(artifacts.releaseCollectionRun || artifacts.release_collection_run)),
    releaseControlsSummary: controlsSummaryFromPackage(objectOnly(artifacts.releaseControls || artifacts.release_controls)),
    releaseDashboardSummary: dashboardSummaryFromPackage(objectOnly(artifacts.releaseDashboard || artifacts.release_dashboard)),
    releaseReview: artifactSummary(objectOnly(objectOnly(artifacts.releaseReadiness || artifacts.release_readiness).releaseReview || objectOnly(artifacts.releaseReadiness || artifacts.release_readiness).release_review)),
    createdBy: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by || releasePackage.requestedBy || releasePackage.requested_by, 120),
    createdAt: cleanString(input.createdAt || input.created_at || releasePackage.createdAt || releasePackage.created_at, 80),
    updatedAt: cleanString(input.updatedAt || input.updated_at, 80)
  });
}

function createLearningAutomationReleasePackageService(options = {}) {
  const evidenceBundleService = options.evidenceBundleService || null;
  const evidenceBundleAuditService = options.evidenceBundleAuditService || null;
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseCollectionRunService = options.releaseCollectionRunService || null;
  const releaseControlsService = options.releaseControlsService || null;
  const releaseDashboardService = options.releaseDashboardService || null;
  const repository = options.repository || null;
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
    if (optionBag.writePackageRecord && !optionBag.allowWritePackage) {
      return unavailable("release_package_write_not_allowed", scope, {
        requiredFlag: "--allow-write",
        writePackageRecord: true
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
    if (!releaseDashboardService || typeof releaseDashboardService.dashboard !== "function") {
      return unavailable("release_package_dashboard_service_unavailable", scope);
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
    const dashboard = releaseDashboardService.dashboard(dashboardInput(scope, input, optionBag, collectionRun));
    const steps = [
      publicStep("release_evidence_bundle", "Release evidence bundle", bundle || bundleResult, bundleResult.ok === true),
      publicStep("release_evidence_bundle_audit", "Release evidence bundle audit", audit, audit.ok === true),
      publicStep("release_readiness", "Release readiness", readiness, readiness.ok === true),
      publicStep("release_collection_run", "Release collection run", collectionRun, collectionRun.ok === true),
      publicStep("release_controls", "Release controls readback", controls, controls.ok === true),
      publicStep("release_dashboard", "Release dashboard readback", dashboard, dashboard.ok === true)
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
      writePackageRecord: optionBag.writePackageRecord,
      steps,
      summary: buildSummary(status, steps, optionBag, collectionRun),
      artifacts: {
        releaseEvidenceBundle: bundle,
        releaseEvidenceBundleAudit: audit,
        releaseReadiness: readiness,
        releaseCollectionRun: collectionRun,
        releaseControls: controls,
        releaseDashboard: dashboard
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
    const recordResult = optionBag.writePackageRecord
      ? recordPackage(Object.assign({}, input, scope, {
        releasePackage,
        allowWritePackage: true,
        ownerAuthorizedWrite: true
      }))
      : null;
    if (recordResult) {
      releasePackage.summary.packageRecordWritten = recordResult.ok === true;
      releasePackage.summary.packageRecordId = cleanString(recordResult.package?.packageId || recordResult.package?.package_id, 160);
    }
    return {
      ok: releasePackage.ok && (!recordResult || recordResult.ok === true),
      source: "growth-learning-automation-release-package-service",
      package: releasePackage,
      summary: releasePackage.summary,
      packageOk: releasePackage.ok,
      record: recordResult || undefined
    };
  }

  function recordPackage(input = {}) {
    const releasePackage = packageArtifactFromInput(input);
    const scope = packageScopeFrom(input, releasePackage || {});
    if (!scope.workspaceId) return unavailable("release_package_workspace_required", scope);
    if (!repository || typeof repository.savePackage !== "function") {
      return unavailable("release_package_repository_unavailable", scope);
    }
    if (!booleanFlag(input.allowWritePackage || input.allow_write_package || input.allowWrite || input.allow_write || input.ownerAuthorizedWrite || input.owner_authorized_write)) {
      return unavailable("release_package_write_not_allowed", scope, {
        requiredFlag: "--allow-write",
        writePackageRecord: true
      });
    }
    if (!releasePackage) return unavailable("release_package_artifact_required", scope);
    if (cleanString(releasePackage.schemaVersion || releasePackage.schema_version, 180) !== RELEASE_PACKAGE_SCHEMA) {
      return unavailable("release_package_schema_invalid", scope);
    }
    if (releasePackage.summaryOnly !== true || cleanString(releasePackage.privacyClass || releasePackage.privacy_class, 80) !== "summary_only") {
      return unavailable("release_package_privacy_class_required", scope);
    }
    const record = packageRecordFromArtifact(input, releasePackage);
    const privacyFindings = scanPrivacyKeys(record).slice(0, 16);
    const privateValueFindings = scanPrivateValues(record).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("release_package_privacy_failed", scope, {
        privacyFindings,
        privateValueFindings
      });
    }
    const saved = repository.savePackage(record);
    return Object.assign({
      source: "growth-learning-automation-release-package-service"
    }, saved);
  }

  function listPackages(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_package_workspace_required", scope);
    if (!repository || typeof repository.listPackages !== "function") {
      return unavailable("release_package_repository_unavailable", scope);
    }
    const packages = repository.listPackages(input);
    return {
      ok: true,
      source: "growth-learning-automation-release-package-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: packages.length,
      packages
    };
  }

  return {
    buildPackage,
    listPackages,
    recordPackage
  };
}

module.exports = {
  RELEASE_PACKAGE_SCHEMA,
  packageRecordFromArtifact,
  createLearningAutomationReleasePackageService,
  scopeFrom
};
