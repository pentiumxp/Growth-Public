"use strict";

const path = require("node:path");

const UI_EVIDENCE_SCHEMA = "growth.learningAutomationUiEvidence.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;

const UI_GATE_SPECS = Object.freeze({
  ownerDailyUiEvidence: {
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    label: "Owner daily UI product/visual evidence",
    requiredCoverage: ["owner_daily_generation", "daily_loop_preview", "target_context"]
  },
  ownerAuditUiEvidence: {
    evidenceKey: "ownerAuditUiEvidence",
    checkKey: "owner_audit_ui_evidence",
    uiGate: "owner_audit",
    label: "Owner audit/correction UI evidence",
    requiredCoverage: ["cycle_history", "cycle_audit", "owner_correction"]
  },
  proposalReviewUiEvidence: {
    evidenceKey: "proposalReviewUiEvidence",
    checkKey: "proposal_review_ui_evidence",
    uiGate: "proposal_review",
    label: "Proposal review UI evidence",
    requiredCoverage: ["proposal_list", "owner_decision", "status_readback"]
  },
  automationDigestUiEvidence: {
    evidenceKey: "automationDigestUiEvidence",
    checkKey: "automation_digest_ui_evidence",
    uiGate: "automation_digest",
    label: "Automation digest UI evidence",
    requiredCoverage: ["digest_list", "required_action", "review_state"]
  },
  automationActionHandoffUiEvidence: {
    evidenceKey: "automationActionHandoffUiEvidence",
    checkKey: "automation_action_handoff_ui_evidence",
    uiGate: "automation_action_handoff",
    label: "Automation action handoff UI evidence",
    requiredCoverage: ["handoff_list", "delivery_status", "action_inbox_boundary"]
  },
  schedulerExecutionUiEvidence: {
    evidenceKey: "schedulerExecutionUiEvidence",
    checkKey: "scheduler_execution_ui_evidence",
    uiGate: "scheduler_execution",
    label: "Scheduler execution UI evidence",
    requiredCoverage: ["execution_history", "disabled_state", "owner_execute_action"]
  },
  schedulerRunUiEvidence: {
    evidenceKey: "schedulerRunUiEvidence",
    checkKey: "scheduler_run_ui_evidence",
    uiGate: "scheduler_run",
    label: "Scheduler run UI evidence",
    requiredCoverage: ["run_history", "default_disabled", "partial_failure_state"]
  },
  schedulerWorkerTargetUiEvidence: {
    evidenceKey: "schedulerWorkerTargetUiEvidence",
    checkKey: "scheduler_worker_target_ui_evidence",
    uiGate: "scheduler_worker_target",
    label: "Scheduler worker target UI evidence",
    requiredCoverage: ["target_list", "owner_review_state", "enabled_disabled_state"]
  }
});

const UI_GATE_ALIASES = new Map();
for (const spec of Object.values(UI_GATE_SPECS)) {
  UI_GATE_ALIASES.set(spec.evidenceKey, spec.evidenceKey);
  UI_GATE_ALIASES.set(spec.checkKey, spec.evidenceKey);
  UI_GATE_ALIASES.set(spec.uiGate, spec.evidenceKey);
  UI_GATE_ALIASES.set(spec.uiGate.replace(/_/g, "-"), spec.evidenceKey);
  UI_GATE_ALIASES.set(spec.evidenceKey.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`), spec.evidenceKey);
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values = [], max = 120) {
  return Array.from(new Set(values.map((value) => cleanString(value, max)).filter(Boolean)));
}

function scanPrivacy(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
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

function redactPrivateValues(value) {
  if (typeof value === "string") {
    return PRIVATE_VALUE_PATTERN.test(value) ? "[private_value_redacted]" : value;
  }
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactPrivateValues);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactPrivateValues(child)]));
}

function canonicalEvidenceKey(value) {
  const key = cleanString(value, 160);
  return UI_GATE_ALIASES.get(key) || "";
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  const evidenceKey = canonicalEvidenceKey(input.evidenceKey || input.evidence_key || input.checkKey || input.check_key || input.uiGate || input.ui_gate);
  const spec = UI_GATE_SPECS[evidenceKey] || null;
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    evidenceKey,
    checkKey: spec ? spec.checkKey : "",
    uiGate: spec ? spec.uiGate : ""
  };
}

function readEvidenceFile(readFile, evidenceFile) {
  if (!evidenceFile) return { ok: true, value: null };
  if (typeof readFile !== "function") {
    return { ok: false, error: "ui_evidence_file_reader_unavailable" };
  }
  try {
    const text = readFile(evidenceFile, "utf8");
    return { ok: true, value: JSON.parse(String(text || "")) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError ? "ui_evidence_file_invalid_json" : "ui_evidence_file_unreadable",
      detail: cleanString(error && error.message ? error.message : error, 160)
    };
  }
}

function evidencePayload(input = {}, readFile) {
  const inline = input.evidence || input.uiEvidence || input.ui_evidence || null;
  if (inline && typeof inline === "object") return { ok: true, value: inline, evidenceFile: "" };
  const evidenceFile = cleanString(input.evidenceFile || input.evidence_file || input.uiEvidenceFile || input.ui_evidence_file, 500);
  const fileResult = readEvidenceFile(readFile, evidenceFile);
  return Object.assign({}, fileResult, { evidenceFile });
}

function nestedEvidence(value = {}) {
  const uiEvidence = objectOnly(value.uiEvidence || value.ui_evidence);
  const evidence = objectOnly(value.evidence);
  const result = objectOnly(value.result);
  if (Object.keys(uiEvidence).length) return uiEvidence;
  if (Object.keys(result).length) return result;
  if (Object.keys(evidence).length && !evidence.uiEvidence) return evidence;
  if (evidence.uiEvidence && typeof evidence.uiEvidence === "object") return evidence.uiEvidence;
  return objectOnly(value);
}

function booleanLikePass(value = {}) {
  const status = cleanString(value.status || value.result || value.state, 80).toLowerCase();
  return value.ok === true
    || value.passed === true
    || value.pass === true
    || status === "pass"
    || status === "passed"
    || status === "ok";
}

function screenshotName(value = {}) {
  const raw = cleanString(
    value.screenshotPath
      || value.screenshot_path
      || value.screenshot
      || value.screenshotFile
      || value.screenshot_file
      || value.screenshotArtifactName
      || value.screenshot_artifact_name
      || objectOnly(value.artifacts).screenshotPath
      || objectOnly(value.artifacts).screenshot_path
      || objectOnly(value.artifact).screenshotPath
      || objectOnly(value.artifact).screenshot_path,
    500
  );
  return raw ? path.basename(raw) : "";
}

function hasScreenshot(value = {}) {
  return Boolean(
    screenshotName(value)
      || value.screenshotPresent === true
      || value.screenshot_present === true
      || Number(value.screenshotBytes || value.screenshot_bytes || 0) > 0
  );
}

function assertions(value = {}) {
  const direct = asArray(value.assertions);
  const results = asArray(value.results);
  const checks = asArray(value.checks);
  return direct.length ? direct : results.length ? results : checks;
}

function failedAssertions(value = {}) {
  const explicit = [
    ...asArray(value.failedAssertions || value.failed_assertions),
    ...asArray(value.failures),
    ...asArray(value.failed)
  ];
  const derived = assertions(value).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const status = cleanString(item.status || item.result || item.state, 80).toLowerCase();
    return item.ok === false || item.pass === false || ["fail", "failed", "error", "blocked"].includes(status);
  });
  return explicit.concat(derived);
}

function declaredEvidenceKey(value = {}) {
  return canonicalEvidenceKey(value.evidenceKey || value.evidence_key || value.checkKey || value.check_key || value.uiGate || value.ui_gate);
}

function coverageId(item) {
  if (typeof item === "string") return cleanString(item, 120);
  if (!item || typeof item !== "object") return "";
  const status = cleanString(item.status || item.result || item.state, 80).toLowerCase();
  if (item.ok === false || item.pass === false || ["fail", "failed", "blocked", "missing"].includes(status)) return "";
  return cleanString(item.id || item.key || item.name || item.coverageId || item.coverage_id, 120);
}

function coverageIds(value = {}) {
  return uniqueStrings([
    ...asArray(value.coverage),
    ...asArray(value.coverageIds || value.coverage_ids),
    ...asArray(value.capabilities),
    ...asArray(value.features),
    ...asArray(value.screens)
  ].map(coverageId));
}

function domEvidencePresent(value = {}) {
  return value.domEvidencePresent === true
    || value.dom_evidence_present === true
    || value.uiReadbackPresent === true
    || value.ui_readback_present === true
    || asArray(value.domAssertions || value.dom_assertions).length > 0;
}

function publicUiEvidence(value = {}, spec = {}, evidenceFile = "") {
  const failures = failedAssertions(value);
  const coverage = coverageIds(value);
  const requiredCoverage = asArray(spec.requiredCoverage);
  const missingCoverage = requiredCoverage.filter((item) => !coverage.includes(item));
  return {
    source: cleanString(value.source || "growth-ui-evidence-harness", 120),
    evidenceKey: spec.evidenceKey,
    checkKey: spec.checkKey,
    uiGate: spec.uiGate,
    status: booleanLikePass(value) && failures.length === 0 ? "pass" : "blocked",
    checkedAt: cleanString(value.checkedAt || value.checked_at || value.createdAt || value.created_at || value.timestamp, 80),
    clientVersion: cleanString(value.clientVersion || value.client_version, 120),
    route: cleanString(value.route || value.path || value.screenRoute || value.screen_route, 180),
    screen: cleanString(value.screen || value.view || value.surface, 120),
    screenshotPresent: hasScreenshot(value),
    domEvidencePresent: domEvidencePresent(value),
    screenshotArtifactName: screenshotName(value),
    evidenceFilePresent: Boolean(evidenceFile),
    evidenceFileName: evidenceFile ? path.basename(evidenceFile) : "",
    coverage,
    requiredCoverage,
    missingCoverage,
    assertionCount: assertions(value).length,
    failedAssertionCount: failures.length
  };
}

function createLearningAutomationUiEvidenceService(options = {}) {
  const readFile = options.readFile || null;

  function evaluate(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, error: "ui_evidence_workspace_required" };
    }
    if (!scope.evidenceKey || !UI_GATE_SPECS[scope.evidenceKey]) {
      return {
        ok: false,
        error: "ui_evidence_key_invalid",
        allowedEvidenceKeys: Object.keys(UI_GATE_SPECS)
      };
    }
    const privacyFindings = scanPrivacy(input).slice(0, 8);
    const scopePrivateValueFindings = scanPrivateValues(scope).slice(0, 8);
    if (privacyFindings.length || scopePrivateValueFindings.length) {
      return {
        ok: false,
        error: "ui_evidence_privacy_failed",
        privacyFindings,
        privateValueFindings: scopePrivateValueFindings
      };
    }
    const payload = evidencePayload(input, readFile);
    if (!payload.ok) {
      return {
        ok: false,
        status: "blocked",
        error: payload.error,
        detail: payload.detail || "",
        missingRequired: payload.error === "ui_evidence_file_reader_unavailable" ? ["ui_evidence_reader"] : []
      };
    }
    if (!payload.value) {
      return {
        ok: false,
        status: "missing",
        error: "ui_evidence_missing",
        missingRequired: ["ui_evidence_file_or_json"]
      };
    }
    const evidence = nestedEvidence(payload.value);
    const nestedPrivacyFindings = scanPrivacy(evidence).slice(0, 8);
    if (nestedPrivacyFindings.length) {
      return {
        ok: false,
        status: "blocked",
        error: "ui_evidence_privacy_failed",
        privacyFindings: nestedPrivacyFindings
      };
    }
    const spec = UI_GATE_SPECS[scope.evidenceKey];
    const artifactEvidenceKey = declaredEvidenceKey(evidence);
    const projected = publicUiEvidence(evidence, spec, payload.evidenceFile);
    const projectionPrivateValueFindings = scanPrivateValues(projected).slice(0, 8);
    const publicProjected = redactPrivateValues(projected);
    const gateOk = artifactEvidenceKey === scope.evidenceKey;
    const coverageOk = projected.missingCoverage.length === 0;
    const visualOrDomOk = projected.screenshotPresent || projected.domEvidencePresent;
    const privateValueOk = projectionPrivateValueFindings.length === 0;
    const pass = projected.status === "pass" && gateOk && coverageOk && visualOrDomOk && privateValueOk;
    const missingRequired = [];
    if (!gateOk) missingRequired.push("matching_ui_gate");
    if (!coverageOk) missingRequired.push("required_ui_coverage");
    if (!visualOrDomOk) missingRequired.push("visual_or_dom_evidence");
    if (!privateValueOk) missingRequired.push("no_private_value_leaks");
    if (projected.status !== "pass") missingRequired.push("passing_ui_assertions");
    return {
      ok: pass,
      source: "growth-learning-automation-ui-evidence-service",
      schemaVersion: UI_EVIDENCE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      evidenceKey: spec.evidenceKey,
      checkKey: spec.checkKey,
      uiGate: spec.uiGate,
      label: spec.label,
      status: pass ? "pass" : "blocked",
      readyForReleaseEvidence: pass,
      uiEvidence: publicProjected,
      missingRequired,
      privateValueFindings: projectionPrivateValueFindings,
      uiEvidenceBoundary: {
        summaryOnly: true,
        growthReadsOnlyEvidenceArtifacts: true,
        growthRunsNoVisualTooling: true,
        homeAiOwnsVisualHarness: true,
        noLearnerStateMutation: true,
        noModelCalls: true
      },
      error: pass ? "" : "ui_evidence_incomplete"
    };
  }

  return {
    evaluate
  };
}

module.exports = {
  UI_EVIDENCE_SCHEMA,
  UI_GATE_SPECS,
  createLearningAutomationUiEvidenceService,
  publicScope
};
