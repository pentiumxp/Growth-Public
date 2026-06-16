"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|idempotency.*key|ledger.*entry)/i;
const PRIVATE_VALUE_PATTERN = /\b(Bearer\s+|sk-[A-Za-z0-9_-]{8,}|xox[baprs]-|gh[pousr]_[A-Za-z0-9_]{8,}|AIza[A-Za-z0-9_-]{8,}|\/Users\/|C:\\Users\\|access-key\.txt|Authorization:)/i;

function cleanString(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map((item) => cleanString(item, 160)).filter(Boolean)));
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function scanPrivacy(value, path = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(path);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function publicSettlement(settlement = {}) {
  return {
    rewardSettlementId: cleanString(settlement.rewardSettlementId || settlement.id),
    workspaceId: cleanString(settlement.workspaceId || settlement.workspace_id),
    learnerId: cleanString(settlement.learnerId || settlement.learner_id),
    programId: cleanString(settlement.programId || settlement.program_id),
    taskCardId: cleanString(settlement.taskCardId || settlement.task_card_id),
    evaluationId: cleanString(settlement.evaluationId || settlement.evaluation_id),
    status: cleanString(settlement.status),
    coinAmount: number(settlement.coinAmount || settlement.coin_amount),
    currency: cleanString(settlement.currency || "learning_coin", 40) || "learning_coin",
    reason: cleanString(settlement.reason, 180),
    sourceType: cleanString(settlement.sourceType || settlement.source_type, 120),
    sourceId: cleanString(settlement.sourceId || settlement.source_id, 140),
    settledAt: cleanString(settlement.settledAt || settlement.settled_at, 80),
    createdAt: cleanString(settlement.createdAt || settlement.created_at, 80)
  };
}

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
    programId: cleanString(input.programId || input.program_id),
    taskCardIds: uniqueStrings(input.taskCardIds || input.task_card_ids || input.taskCardId || input.task_card_id).slice(0, 20),
    evaluationIds: uniqueStrings(input.evaluationIds || input.evaluation_ids || input.evaluationId || input.evaluation_id).slice(0, 20),
    rewardSettlementIds: uniqueStrings(input.rewardSettlementIds || input.reward_settlement_ids || input.rewardSettlementId || input.reward_settlement_id).slice(0, 20),
    status: cleanString(input.status, 80),
    limit: Math.max(1, Math.min(50, Number(input.limit || 12) || 12))
  };
}

function createLearningRewardAuditService(options = {}) {
  const repository = options.repository || null;

  function listRewardAudit(input = {}) {
    const privacyFindings = scanPrivacy(input).slice(0, 16);
    if (privacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-reward-audit-service",
        error: "learning_reward_audit_privacy_failed",
        privacyFindings
      };
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) {
      return {
        ok: false,
        source: "growth-learning-reward-audit-service",
        error: "learning_reward_audit_workspace_required"
      };
    }
    if (!repository || typeof repository.listRewardSettlements !== "function") {
      return {
        ok: false,
        source: "growth-learning-reward-audit-service",
        error: "learning_reward_audit_repository_unavailable",
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId
      };
    }
    let rows = [];
    try {
      rows = repository.listRewardSettlements(scope);
    } catch (err) {
      return {
        ok: false,
        source: "growth-learning-reward-audit-service",
        error: cleanString(err.message || err) || "learning_reward_audit_query_failed",
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId
      };
    }
    const settlements = asArray(rows).map(publicSettlement)
      .filter((item) => item.rewardSettlementId || item.evaluationId || item.taskCardId)
      .slice(0, scope.limit);
    const settled = settlements.filter((item) => item.status === "settled");
    const totalCoinAmount = settled.reduce((sum, item) => sum + number(item.coinAmount), 0);
    return {
      ok: true,
      source: "growth-learning-reward-audit-service",
      schemaVersion: "growth.learningRewardAudit.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      taskCardIds: scope.taskCardIds,
      evaluationIds: scope.evaluationIds,
      count: settlements.length,
      rewardSettlements: settlements,
      summary: {
        rewardSettlementCount: settlements.length,
        settledCount: settled.length,
        totalCoinAmount,
        currency: "learning_coin",
        latestRewardSettlementId: cleanString(settlements[0]?.rewardSettlementId)
      }
    };
  }

  return {
    listRewardAudit
  };
}

module.exports = {
  createLearningRewardAuditService,
  scanPrivacy
};
