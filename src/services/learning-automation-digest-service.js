"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const raw = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(raw.map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    error: cleanString(error) || "learning_automation_digest_unavailable"
  }, extra);
}

function candidateId(candidate = {}) {
  return [
    cleanString(candidate.proposalId),
    cleanString(candidate.planDraftId),
    cleanString(candidate.selectedItemId)
  ].filter(Boolean).join(":");
}

function boundedCandidate(candidate = {}) {
  const action = candidate.publishAction || {};
  return {
    candidateId: candidateId(candidate),
    proposalId: cleanString(candidate.proposalId),
    planDraftId: cleanString(candidate.planDraftId),
    selectedItemId: cleanString(candidate.selectedItemId),
    decision: cleanString(candidate.decision),
    reason: boundedText(candidate.reason, 220),
    targetNodeIds: uniqueStrings(candidate.targetNodeIds),
    safeToPublish: Boolean(candidate.safeToPublish),
    wouldPublish: Boolean(candidate.wouldPublish),
    completeness: {
      complete: Boolean(candidate.completeness?.complete),
      readyForAutomation: Boolean(candidate.completeness?.readyForAutomation),
      missingRequired: uniqueStrings(candidate.completeness?.missingRequired).slice(0, 12)
    },
    targetProvisioning: {
      mode: cleanString(candidate.targetProvisioning?.mode),
      selectedDomainPackId: cleanString(candidate.targetProvisioning?.selectedDomainPackId),
      selectedDomain: cleanString(candidate.targetProvisioning?.selectedDomain),
      selectedSubject: cleanString(candidate.targetProvisioning?.selectedSubject),
      selectedTargetNodeIds: uniqueStrings(candidate.targetProvisioning?.selectedTargetNodeIds)
    },
    publishAction: action.endpoint ? {
      requiredActor: cleanString(action.requiredActor || "owner"),
      endpoint: cleanString(action.endpoint),
      proposalId: cleanString(action.proposalId),
      planDraftId: cleanString(action.planDraftId),
      selectedItemId: cleanString(action.selectedItemId),
      targetNodeIds: uniqueStrings(action.targetNodeIds)
    } : null,
    dryRun: true,
    writePlanned: false,
    writesPerformed: false,
    publishPlanned: false,
    publishRequiresOwnerAction: Boolean(action.endpoint)
  };
}

function summarizeCandidates(candidates = []) {
  const bounded = asArray(candidates).map(boundedCandidate);
  const wouldPublish = bounded.filter((item) => item.decision === "would_publish" || item.wouldPublish);
  const blocked = bounded.filter((item) => String(item.decision || "").startsWith("blocked"));
  const skipped = bounded.filter((item) => String(item.decision || "").startsWith("skipped"));
  const requiredActions = wouldPublish
    .filter((item) => item.publishAction)
    .map((item) => Object.assign({}, item.publishAction, {
      candidateId: item.candidateId,
      publishRequiresOwnerAction: true
    }));
  return {
    candidates: bounded,
    blocked,
    requiredActions,
    summary: {
      inspected: bounded.length,
      wouldPublish: wouldPublish.length,
      blocked: blocked.length,
      skipped: skipped.length,
      requiredActions: requiredActions.length
    }
  };
}

function nonWritefulDryRun(result = {}) {
  return Boolean(
    result.dryRun === true
    && result.writePlanned === false
    && result.writesPerformed === false
    && result.publishPlanned === false
  );
}

function sourcePolicy(input = {}, dryRun = {}) {
  return {
    schemaVersion: "growth.learningAutomationDigest.sourcePolicy.v1",
    summaryOnly: true,
    dryRunSource: cleanString(dryRun.source),
    targetWorkspaceId: cleanString(input.workspaceId || input.workspace_id),
    learnerId: cleanString(input.learnerId || input.learner_id),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    horizon: cleanString(input.horizon || "daily_plan"),
    limit: Number(input.limit || dryRun.count || 0) || 0,
    requestedBy: cleanString(input.requestedBy || input.requested_by)
  };
}

function createLearningAutomationDigestService(options = {}) {
  const repository = options.repository || null;
  const schedulerService = options.schedulerService || null;

  function createDigest(input = {}) {
    if (!repository || typeof repository.saveDigest !== "function") {
      return unavailable("learning_automation_digest_repository_unavailable");
    }
    if (!schedulerService || typeof schedulerService.dryRun !== "function") {
      return unavailable("learning_automation_digest_scheduler_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    if (!workspaceId) return unavailable("learning_automation_digest_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_digest_privacy_failed", { privacyFindings });

    const dryRun = schedulerService.dryRun(input);
    if (!dryRun?.ok) {
      return unavailable(dryRun?.error || "learning_automation_digest_dry_run_failed", {
        stage: "scheduler_dry_run",
        dryRun: dryRun || null
      });
    }
    if (!nonWritefulDryRun(dryRun)) {
      return unavailable("learning_automation_digest_non_readonly", {
        stage: "scheduler_dry_run",
        dryRunFlags: {
          dryRun: dryRun.dryRun,
          writePlanned: dryRun.writePlanned,
          writesPerformed: dryRun.writesPerformed,
          publishPlanned: dryRun.publishPlanned
        }
      });
    }
    const summarized = summarizeCandidates(dryRun.candidates);
    const saveResult = repository.saveDigest({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id || dryRun.programId,
      domainPackId: input.domainPackId || input.domain_pack_id,
      domain: input.domain,
      subject: input.subject,
      horizon: input.horizon || "daily_plan",
      status: "pending",
      sourcePolicy: sourcePolicy(input, dryRun),
      summary: Object.assign({}, summarized.summary, {
        dryRun: true,
        writePlanned: false,
        writesPerformed: false,
        publishPlanned: false
      }),
      candidates: summarized.candidates,
      blocked: summarized.blocked,
      requiredActions: summarized.requiredActions,
      createdBy: input.requestedBy || input.requested_by,
      privacyClass: "summary_only"
    });
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_digest_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-digest-service",
      duplicate: Boolean(saveResult.duplicate),
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false,
      publishRequiresOwnerAction: summarized.requiredActions.length > 0,
      digest: saveResult.digest
    };
  }

  function listDigests(input = {}) {
    if (!repository || typeof repository.listDigests !== "function") {
      return unavailable("learning_automation_digest_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return unavailable("learning_automation_digest_scope_required");
    const digests = repository.listDigests(input);
    return {
      ok: true,
      source: "growth-learning-automation-digest-service",
      workspaceId,
      learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
      count: digests.length,
      digests
    };
  }

  function getDigest(input = {}) {
    if (!repository || typeof repository.getDigest !== "function") {
      return unavailable("learning_automation_digest_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const digestId = cleanString(input.digestId || input.digest_id);
    if (!workspaceId || !digestId) return unavailable("learning_automation_digest_scope_required");
    const digest = repository.getDigest({ workspaceId, digestId });
    if (!digest) return unavailable("learning_automation_digest_not_found");
    return {
      ok: true,
      source: "growth-learning-automation-digest-service",
      workspaceId,
      digest
    };
  }

  function reviewDigest(input = {}) {
    if (!repository || typeof repository.reviewDigest !== "function") {
      return unavailable("learning_automation_digest_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const digestId = cleanString(input.digestId || input.digest_id);
    if (!workspaceId || !digestId) return unavailable("learning_automation_digest_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_digest_privacy_failed", { privacyFindings });
    const result = repository.reviewDigest(Object.assign({}, input, { workspaceId, digestId }));
    if (!result?.ok) return result || unavailable("learning_automation_digest_review_failed");
    return {
      ok: true,
      source: "growth-learning-automation-digest-service",
      duplicate: Boolean(result.duplicate),
      digest: result.digest
    };
  }

  return {
    createDigest,
    getDigest,
    listDigests,
    reviewDigest
  };
}

module.exports = {
  createLearningAutomationDigestService
};
