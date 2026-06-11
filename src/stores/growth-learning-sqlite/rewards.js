"use strict";

const {
  cleanString,
  insertDynamic,
  numberValue,
  parseJson,
  tableColumns,
  tableExists,
  upsertDynamic
} = require("./core");
const {
  stableLearningCoinLedgerEntryId,
  stableRewardSettlementId,
  stableSessionId
} = require("./identifiers");
const { publicRewardSettlement } = require("./projection");

function markTaskCardCompleted(db, taskCard = {}, input = {}) {
  if (!tableExists(db, "learning_task_cards")) return null;
  const taskCardId = cleanString(taskCard.id || input.taskCardId);
  if (!taskCardId) return null;
  const now = cleanString(input.completedAt || input.now) || new Date().toISOString();
  const columns = tableColumns(db, "learning_task_cards");
  const values = [];
  const updates = [];
  if (columns.includes("status")) {
    updates.push("status = ?");
    values.push("completed");
  }
  if (columns.includes("updated_at")) {
    updates.push("updated_at = ?");
    values.push(now);
  }
  if (columns.includes("raw_json")) {
    const raw = parseJson(taskCard.raw_json, {}) || {};
    const nextRaw = Object.assign({}, raw, {
      completedAt: raw.completedAt || raw.completed_at || now,
      rewardState: "settled"
    });
    updates.push("raw_json = ?");
    values.push(JSON.stringify(nextRaw));
  }
  if (!updates.length) return null;
  values.push(taskCardId);
  db.prepare(`UPDATE learning_task_cards SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(taskCardId) || null;
}

function ensureLearningCoinLedgerTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_coin_ledger_entries (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      amount_delta INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'learning_coin',
      entry_type TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_coin_ledger_idempotency
      ON learning_coin_ledger_entries(workspace_id, idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_learning_coin_ledger_workspace
      ON learning_coin_ledger_entries(workspace_id, created_at);
  `);
}

function learningCoinBalanceFromDb(db, input = {}) {
  const workspaceId = cleanString(input.workspaceId);
  if (!workspaceId) return { ok: false, error: "workspace_id_required" };
  const settledRewardCoins = tableExists(db, "learning_reward_settlements")
    ? Number(db.prepare(`
        SELECT COALESCE(SUM(coin_amount), 0) AS amount
        FROM learning_reward_settlements
        WHERE workspace_id = ? AND status = 'settled'
      `).get(workspaceId)?.amount || 0)
    : 0;
  ensureLearningCoinLedgerTable(db);
  const adjustmentCoins = Number(db.prepare(`
      SELECT COALESCE(SUM(amount_delta), 0) AS amount
      FROM learning_coin_ledger_entries
      WHERE workspace_id = ?
    `).get(workspaceId)?.amount || 0);
  return {
    ok: true,
    workspace_id: workspaceId,
    currency: "learning_coin",
    settled_reward_coins: settledRewardCoins,
    adjustment_coins: adjustmentCoins,
    available_coins: Math.max(0, settledRewardCoins + adjustmentCoins),
    source: "growth-plugin-sqlite"
  };
}

function createRewardRepository({ open }) {
  function settleEvaluationReward(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_reward_settlements")) {
        return { ok: false, available: false, error: "reward_settlement_table_missing" };
      }
      const evaluation = input.evaluation || {};
      const taskCard = input.taskCard || {};
      const submission = input.submission || {};
      const evaluationId = cleanString(evaluation.evaluationId || input.evaluationId);
      if (!evaluationId) return { ok: false, error: "growth_evaluation_id_required" };
      const existing = tableColumns(db, "learning_reward_settlements").includes("evaluation_id")
        ? db.prepare("SELECT * FROM learning_reward_settlements WHERE evaluation_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(evaluationId)
        : db.prepare("SELECT * FROM learning_reward_settlements WHERE id = ?").get(stableRewardSettlementId(evaluationId));
      if (existing) return { ok: true, duplicate: true, settlement: publicRewardSettlement(existing) };

      const now = cleanString(input.settledAt || input.now) || new Date().toISOString();
      const score = Math.max(0, Math.min(100, numberValue(evaluation.score)));
      const rewardCapCoins = Math.max(0, Math.round(numberValue(taskCard.reward_cap_coins || taskCard.configured_reward_coins || taskCard.default_reward_coins || 100)));
      const coinAmount = Math.max(0, Math.round((rewardCapCoins * score) / 100));
      const settlementId = stableRewardSettlementId(evaluationId);
      const idempotencyKey = `growth-plugin:evaluation:${evaluationId}:learning-coin`;
      const status = "settled";
      const reason = "growth_coin_settled_by_daily_score";
      const raw = {
        source: "growth-plugin",
        currency: "learning_coin",
        tongbaoExchange: {
          status: "not_requested",
          policy: "admin_monthly_exchange_only"
        },
        evaluationStatus: cleanString(evaluation.status),
        score,
        rewardCapCoins,
        passed: Boolean(evaluation.passed),
        completionPolicy: "daily_score_once"
      };
      const ledgerEntry = {
        currency: "learning_coin",
        amountDelta: coinAmount,
        sourceType: "growth-plugin-evaluation",
        sourceId: evaluationId,
        idempotencyKey
      };
      const values = {
        id: settlementId,
        learner_id: cleanString(taskCard.learner_id || submission.learner_id || input.workspaceId),
        workspace_id: cleanString(taskCard.workspace_id || submission.workspace_id || input.workspaceId),
        program_id: cleanString(taskCard.program_id || submission.program_id),
        task_card_id: cleanString(taskCard.id || submission.task_card_id || input.taskCardId),
        session_id: cleanString(submission.session_id) || stableSessionId(cleanString(submission.id || input.submissionId || evaluationId)),
        evaluation_id: evaluationId,
        status,
        coin_amount: coinAmount,
        reason,
        source_type: "growth-plugin-evaluation",
        source_id: evaluationId,
        idempotency_key: idempotencyKey,
        review_request_id: "",
        ledger_entry_json: JSON.stringify(ledgerEntry),
        raw_json: JSON.stringify(raw),
        created_at: now,
        updated_at: now,
        settled_at: now
      };
      db.exec("BEGIN IMMEDIATE");
      try {
        upsertDynamic(db, "learning_reward_settlements", values);
        markTaskCardCompleted(db, taskCard, { taskCardId: values.task_card_id, completedAt: now });
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      const row = tableColumns(db, "learning_reward_settlements").includes("evaluation_id")
        ? db.prepare("SELECT * FROM learning_reward_settlements WHERE evaluation_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(evaluationId)
        : db.prepare("SELECT * FROM learning_reward_settlements WHERE id = ?").get(settlementId);
      return { ok: true, settlement: publicRewardSettlement(row || values), source: "growth-plugin-sqlite" };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
  }

  function learningCoinBalance(input = {}) {
    const db = open(false);
    try {
      return learningCoinBalanceFromDb(db, input);
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
  }

  function clearLearningCoinBalanceForMonthlyExchange(input = {}) {
    const db = open(false);
    try {
      const workspaceId = cleanString(input.workspaceId);
      const idempotencyKey = cleanString(input.idempotencyKey);
      const write = Boolean(input.write);
      if (!workspaceId) return { ok: false, error: "workspace_id_required" };
      if (write && !idempotencyKey) return { ok: false, error: "idempotency_key_required" };
      ensureLearningCoinLedgerTable(db);
      if (idempotencyKey) {
        const existing = db.prepare(`
          SELECT * FROM learning_coin_ledger_entries
          WHERE workspace_id = ? AND idempotency_key = ?
          LIMIT 1
        `).get(workspaceId, idempotencyKey);
        if (existing) {
          return {
            ok: true,
            duplicate: true,
            mode: "write",
            workspace_id: workspaceId,
            currency: "learning_coin",
            cleared_coins: Math.abs(Math.min(0, Number(existing.amount_delta || 0))),
            ledger_entry: {
              id: existing.id,
              amountDelta: Number(existing.amount_delta || 0),
              entryType: existing.entry_type,
              sourceType: existing.source_type,
              sourceId: existing.source_id,
              idempotencyKey: existing.idempotency_key,
              period: existing.period,
              createdAt: existing.created_at
            },
            balance_after: learningCoinBalanceFromDb(db, { workspaceId }),
            source: "growth-plugin-sqlite"
          };
        }
      }

      const before = learningCoinBalanceFromDb(db, { workspaceId });
      if (!before.ok) return before;
      const amount = Math.max(0, Math.round(Number(input.amount || before.available_coins || 0)));
      if (amount > before.available_coins) {
        return {
          ok: false,
          error: "learning_coin_balance_insufficient",
          workspace_id: workspaceId,
          requested_coins: amount,
          balance: before
        };
      }
      const period = cleanString(input.period);
      const sourceId = cleanString(input.sourceId || input.exchangeId || idempotencyKey) || `monthly:${period || "unspecified"}`;
      const now = cleanString(input.createdAt || input.now) || new Date().toISOString();
      const ledgerEntry = {
        id: stableLearningCoinLedgerEntryId(idempotencyKey || `${workspaceId}:${sourceId}:${amount}:${now}`),
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || workspaceId),
        amount_delta: -amount,
        currency: "learning_coin",
        entry_type: "monthly_exchange_clear",
        source_type: "growth-plugin-monthly-exchange",
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        reason: cleanString(input.reason || "monthly_growth_coin_exchange_clear").slice(0, 180),
        period,
        metadata_json: JSON.stringify({
          source: "growth-plugin",
          policy: "admin_monthly_exchange_only",
          tongbaoExchange: {
            status: "platform_exchange_required",
            sourceId
          },
          balanceBefore: before.available_coins,
          clearedCoins: amount
        }),
        created_at: now
      };
      if (!write) {
        return {
          ok: true,
          mode: "dry_run",
          workspace_id: workspaceId,
          currency: "learning_coin",
          clearable_coins: amount,
          balance_before: before,
          source: "growth-plugin-sqlite"
        };
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        insertDynamic(db, "learning_coin_ledger_entries", ledgerEntry);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return {
        ok: true,
        mode: "write",
        workspace_id: workspaceId,
        currency: "learning_coin",
        cleared_coins: amount,
        ledger_entry: {
          id: ledgerEntry.id,
          amountDelta: ledgerEntry.amount_delta,
          entryType: ledgerEntry.entry_type,
          sourceType: ledgerEntry.source_type,
          sourceId: ledgerEntry.source_id,
          idempotencyKey: ledgerEntry.idempotency_key,
          period: ledgerEntry.period,
          createdAt: ledgerEntry.created_at
        },
        balance_before: before,
        balance_after: learningCoinBalanceFromDb(db, { workspaceId }),
        source: "growth-plugin-sqlite"
      };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
  }

  return {
    clearLearningCoinBalanceForMonthlyExchange,
    learningCoinBalance,
    settleEvaluationReward
  };
}

module.exports = {
  createRewardRepository,
  ensureLearningCoinLedgerTable,
  learningCoinBalanceFromDb,
  markTaskCardCompleted
};
