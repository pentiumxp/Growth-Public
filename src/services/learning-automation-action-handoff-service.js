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
    error: cleanString(error) || "learning_automation_action_handoff_unavailable"
  }, extra);
}

function scopeFrom(input = {}, digest = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id || digest.workspaceId),
    learnerId: cleanString(input.learnerId || input.learner_id || digest.learnerId || input.workspaceId || input.workspace_id),
    programId: cleanString(input.programId || input.program_id || digest.programId),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || digest.domainPackId),
    domain: cleanString(input.domain || digest.domain),
    subject: cleanString(input.subject || digest.subject),
    horizon: cleanString(input.horizon || digest.horizon || "daily_plan") || "daily_plan"
  };
}

function boundedAction(action = {}) {
  return {
    candidateId: cleanString(action.candidateId || action.candidate_id),
    requiredActor: cleanString(action.requiredActor || action.required_actor || "owner") || "owner",
    endpoint: cleanString(action.endpoint),
    proposalId: cleanString(action.proposalId || action.proposal_id),
    planDraftId: cleanString(action.planDraftId || action.plan_draft_id),
    selectedItemId: cleanString(action.selectedItemId || action.selected_item_id),
    targetNodeIds: uniqueStrings(action.targetNodeIds || action.target_node_ids),
    publishRequiresOwnerAction: action.publishRequiresOwnerAction !== false,
    actionType: cleanString(action.actionType || action.action_type || "owner_explicit_publish")
  };
}

function boundedBlocked(item = {}) {
  return {
    candidateId: cleanString(item.candidateId || item.candidate_id),
    proposalId: cleanString(item.proposalId || item.proposal_id),
    planDraftId: cleanString(item.planDraftId || item.plan_draft_id),
    selectedItemId: cleanString(item.selectedItemId || item.selected_item_id),
    decision: cleanString(item.decision),
    reason: boundedText(item.reason, 220),
    missingRequired: uniqueStrings(item.completeness?.missingRequired || item.missingRequired || item.missing_required).slice(0, 12),
    targetNodeIds: uniqueStrings(item.targetNodeIds || item.target_node_ids)
  };
}

function summaryFromDigest(digest = {}, actions = [], blocked = []) {
  const summary = digest.summary || {};
  return {
    schemaVersion: "growth.learningAutomationActionHandoff.summary.v1",
    summaryOnly: true,
    digestId: cleanString(digest.digestId),
    digestStatus: cleanString(digest.status),
    inspected: Number(summary.inspected || asArray(digest.candidates).length || 0) || 0,
    wouldPublish: Number(summary.wouldPublish || actions.length || 0) || 0,
    blocked: Number(summary.blocked || blocked.length || 0) || 0,
    skipped: Number(summary.skipped || 0) || 0,
    requiredActions: actions.length,
    dryRun: true,
    writePlanned: false,
    writesPerformed: false,
    publishPlanned: false
  };
}

function notificationForHandoff(input = {}, digest = {}, actions = [], blocked = []) {
  const digestId = cleanString(digest.digestId || input.digestId || input.digest_id);
  return {
    schemaVersion: "growth.learningAutomationActionHandoff.notification.v1",
    summaryOnly: true,
    eventType: "growth.automation.action_required",
    title: "Growth automation action review",
    summary: boundedText(input.summary || `Automation digest ${digestId || "review"} has ${actions.length} Owner action(s) and ${blocked.length} blocked item(s).`, 600),
    route: {
      pluginRoute: "automation",
      digestId,
      handoffId: cleanString(input.handoffId || input.handoff_id)
    }
  };
}

function deliveryWasAccepted(result = {}) {
  if (!result || result.ok === false) return false;
  const nestedResults = asArray(result.delivery?.results);
  if (nestedResults.length) return nestedResults.some((item) => item?.ok === true);
  if (result.delivery?.ok === false) return false;
  if (result.deliveryStatus === "delivery_failed") return false;
  return true;
}

function deliveryError(result = {}) {
  const nestedResults = asArray(result.delivery?.results);
  const failed = nestedResults.find((item) => item?.ok === false);
  return cleanString(result.error || failed?.error || result.delivery?.error || "delivery_failed");
}

function createLearningAutomationActionHandoffService(options = {}) {
  const repository = options.repository || null;
  const digestService = options.digestService || null;
  const failurePolicyService = options.failurePolicyService || null;
  const eventService = options.eventService || null;

  function listHandoffs(input = {}) {
    if (!repository || typeof repository.listHandoffs !== "function") {
      return unavailable("learning_automation_action_handoff_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_action_handoff_scope_required");
    const handoffs = repository.listHandoffs(Object.assign({}, input, scope));
    return {
      ok: true,
      source: "growth-learning-automation-action-handoff-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: handoffs.length,
      handoffs
    };
  }

  function getHandoff(input = {}) {
    if (!repository || typeof repository.getHandoff !== "function") {
      return unavailable("learning_automation_action_handoff_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const handoffId = cleanString(input.handoffId || input.handoff_id);
    if (!workspaceId || !handoffId) return unavailable("learning_automation_action_handoff_scope_required");
    const handoff = repository.getHandoff({ workspaceId, handoffId });
    if (!handoff) return unavailable("learning_automation_action_handoff_not_found");
    return {
      ok: true,
      source: "growth-learning-automation-action-handoff-service",
      handoff
    };
  }

  function getReviewedDigest(input = {}) {
    if (!digestService || typeof digestService.getDigest !== "function") {
      return unavailable("learning_automation_action_handoff_digest_service_unavailable");
    }
    const digestResult = digestService.getDigest(input);
    if (!digestResult?.ok || !digestResult.digest) {
      return unavailable(digestResult?.error || "learning_automation_action_handoff_digest_not_found");
    }
    if (cleanString(digestResult.digest.status) !== "reviewed") {
      return unavailable("learning_automation_action_handoff_digest_not_reviewed", { digest: digestResult.digest });
    }
    return { ok: true, digest: digestResult.digest };
  }

  function activePolicyReadiness(scope = {}) {
    if (!failurePolicyService || typeof failurePolicyService.evaluateReadiness !== "function") {
      return unavailable("learning_automation_action_handoff_failure_policy_unavailable");
    }
    const readiness = failurePolicyService.evaluateReadiness(scope);
    if (!readiness?.ok) return unavailable(readiness?.error || "learning_automation_action_handoff_failure_policy_failed", { readiness });
    if (readiness.readyForWritefulAutomationPrerequisite !== true) {
      return unavailable("learning_automation_action_handoff_policy_not_ready", { readiness });
    }
    return { ok: true, readiness };
  }

  function createHandoff(input = {}) {
    if (!repository || typeof repository.saveHandoff !== "function") {
      return unavailable("learning_automation_action_handoff_repository_unavailable");
    }
    const digestId = cleanString(input.digestId || input.digest_id);
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId || !digestId) return unavailable("learning_automation_action_handoff_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_action_handoff_privacy_failed", { privacyFindings });

    const digestResult = getReviewedDigest(Object.assign({}, input, { workspaceId, digestId }));
    if (!digestResult.ok) return digestResult;
    const digest = digestResult.digest;
    const scope = scopeFrom(input, digest);
    const policyResult = activePolicyReadiness(scope);
    if (!policyResult.ok) return policyResult;

    const actions = asArray(digest.requiredActions).map(boundedAction).filter((action) => action.endpoint || action.proposalId || action.candidateId);
    const blocked = asArray(digest.blocked).map(boundedBlocked).filter((item) => item.decision || item.proposalId || item.candidateId);
    if (!actions.length && !blocked.length) {
      return unavailable("learning_automation_action_handoff_no_action");
    }

    const policyId = cleanString(policyResult.readiness?.summary?.policyId || policyResult.readiness?.policy?.policyId);
    const notification = notificationForHandoff(input, digest, actions, blocked);
    const saveResult = repository.saveHandoff(Object.assign({}, scope, {
      digestId,
      policyId,
      status: "pending_delivery",
      deliveryStatus: "not_delivered",
      actionSummary: summaryFromDigest(digest, actions, blocked),
      actions,
      blocked,
      policyReadiness: {
        status: cleanString(policyResult.readiness.status),
        readyForWritefulAutomationPrerequisite: true,
        writefulSchedulingAllowed: false,
        policyId
      },
      notification,
      createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_action_handoff_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-action-handoff-service",
      duplicate: Boolean(saveResult.duplicate),
      actionHandoffRequiredBeforeScheduling: true,
      writefulSchedulingAllowed: false,
      handoff: saveResult.handoff,
      readiness: policyResult.readiness
    };
  }

  async function deliverHandoff(input = {}) {
    if (!repository || typeof repository.getHandoff !== "function" || typeof repository.recordDelivery !== "function") {
      return unavailable("learning_automation_action_handoff_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const handoffId = cleanString(input.handoffId || input.handoff_id);
    if (!workspaceId || !handoffId) return unavailable("learning_automation_action_handoff_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_action_handoff_privacy_failed", { privacyFindings });
    const handoff = repository.getHandoff({ workspaceId, handoffId });
    if (!handoff) return unavailable("learning_automation_action_handoff_not_found");
    if (handoff.deliveryStatus === "delivered") {
      return {
        ok: true,
        source: "growth-learning-automation-action-handoff-service",
        duplicate: true,
        deliveryStatus: "delivered",
        handoff
      };
    }
    if (!eventService || typeof eventService.emit !== "function") {
      const recorded = repository.recordDelivery({
        workspaceId,
        handoffId,
        deliveryStatus: "delivery_failed",
        error: "growth_event_service_unavailable",
        deliveredBy: input.requestedBy || input.requested_by
      });
      return Object.assign({
        ok: true,
        source: "growth-learning-automation-action-handoff-service",
        deliveryStatus: "delivery_failed",
        delivery: { ok: false, error: "growth_event_service_unavailable" }
      }, recorded);
    }
    const notification = handoff.notification || {};
    const eventResult = await eventService.emit({
      eventId: handoff.handoffId,
      type: notification.eventType || "growth.automation.action_required",
      workspaceId: handoff.workspaceId,
      status: "open",
      source: "growth-automation-action-handoff",
      summary: notification.summary || handoff.actionSummary?.digestId || handoff.handoffId,
      actionHandoffId: handoff.handoffId,
      digestId: handoff.digestId
    });
    const accepted = deliveryWasAccepted(eventResult);
    const deliveryStatus = accepted ? "delivered" : "delivery_failed";
    const recorded = repository.recordDelivery({
      workspaceId,
      handoffId,
      deliveryStatus,
      error: accepted ? "" : deliveryError(eventResult),
      delivery: {
        ok: accepted,
        status: eventResult?.delivery?.results?.[0]?.status || eventResult?.delivery?.status || 0,
        error: accepted ? "" : deliveryError(eventResult),
        inboxItemId: eventResult?.delivery?.results?.[0]?.inboxItemId || eventResult?.delivery?.response?.inboxItemId || ""
      },
      deliveredBy: input.requestedBy || input.requested_by
    });
    if (!recorded?.ok) return recorded || unavailable("learning_automation_action_handoff_delivery_record_failed");
    return {
      ok: true,
      source: "growth-learning-automation-action-handoff-service",
      deliveryStatus,
      delivery: recorded.handoff.delivery,
      handoff: recorded.handoff
    };
  }

  return {
    createHandoff,
    deliverHandoff,
    getHandoff,
    listHandoffs
  };
}

module.exports = {
  createLearningAutomationActionHandoffService
};
