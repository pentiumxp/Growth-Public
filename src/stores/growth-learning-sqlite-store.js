const path = require("node:path");
const {
  REQUIRED_GROWTH_TABLES,
  cleanString,
  countTable,
  nowIsoValue,
  sqlite,
  tableExists,
  todayKey
} = require("./growth-learning-sqlite/core");
const { createAudioRepository } = require("./growth-learning-sqlite/audio");
const { createLearningCardAuthoringPublisherRepository } = require("./growth-learning-sqlite/card-authoring-publisher");
const { createCardRetirementRepository } = require("./growth-learning-sqlite/card-retirement");
const {
  createEvidenceWriter,
  taskCardByIdOrKanbanId
} = require("./growth-learning-sqlite/evidence-writes");
const { createEvaluationJobRepository } = require("./growth-learning-sqlite/evaluation-jobs");
const { createLearningGraphRepository } = require("./growth-learning-sqlite/graph-repository");
const { createLearningHistorySummaryRepository } = require("./growth-learning-sqlite/history-summary");
const { createMasteryProfileRepository } = require("./growth-learning-sqlite/mastery-profile");
const { createRewardRepository } = require("./growth-learning-sqlite/rewards");
const { createStageAssessmentCycleRepository } = require("./growth-learning-sqlite/stage-assessment-cycles");
const {
  lanesForCards,
  publicCardFromRow,
  summaryForCards,
  visibleSequenceCards
} = require("./growth-learning-sqlite/projection");

function createGrowthLearningSqliteStore({ dbPath, legacyAudioRoots = [] }) {
  const resolvedPath = path.resolve(dbPath || "");

  function open(readOnly = true) {
    const { DatabaseSync } = sqlite();
    return new DatabaseSync(resolvedPath, { open: true, readOnly });
  }

  function withDb(callback) {
    const db = open(true);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  const evidenceWriter = createEvidenceWriter({ open });
  const evaluationJobs = createEvaluationJobRepository({ open });
  const learningGraphRepository = createLearningGraphRepository({ open });
  const learningHistorySummaryRepository = createLearningHistorySummaryRepository({ open });
  const learningCardAuthoringPublisherRepository = createLearningCardAuthoringPublisherRepository({ open });
  const audioRepository = createAudioRepository({ open, resolvedPath, legacyAudioRoots });
  const cardRetirementRepository = createCardRetirementRepository({ open });
  const masteryProfileRepository = createMasteryProfileRepository({ open });
  const rewardRepository = createRewardRepository({ open });
  const stageAssessmentCycleRepository = createStageAssessmentCycleRepository({ open });

  function integrity(filters = {}) {
    return withDb((db) => {
      const missingTables = REQUIRED_GROWTH_TABLES.filter((tableName) => !tableExists(db, tableName));
      const quick = db.prepare("PRAGMA quick_check").get();
      const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all().length;
      const counts = {};
      for (const tableName of REQUIRED_GROWTH_TABLES) counts[tableName] = countTable(db, tableName, filters);
      return {
        ok: missingTables.length === 0 && foreignKeyIssues === 0 && (quick?.quick_check || "") === "ok",
        db_path: resolvedPath,
        quick_check: quick?.quick_check || "",
        foreign_key_issues: foreignKeyIssues,
        missing_tables: missingTables,
        counts
      };
    });
  }

  function board({ workspaceId, limit = 100 } = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_task_cards")) return null;
      const cleanWorkspaceId = cleanString(workspaceId);
      const max = Math.max(1, Math.min(500, Number(limit || 100) || 100));
      const rows = cleanWorkspaceId
        ? db.prepare("SELECT * FROM learning_task_cards WHERE workspace_id = ? ORDER BY planned_date ASC, created_at ASC LIMIT ?").all(cleanWorkspaceId, max)
        : db.prepare("SELECT * FROM learning_task_cards ORDER BY planned_date ASC, created_at ASC LIMIT ?").all(max);
      const context = {
        today: todayKey(),
        nowIso: nowIsoValue()
      };
      const allCards = rows
        .filter((row) => !["cancelled", "canceled", "retired", "superseded"].includes(cleanString(row.status).toLowerCase()))
        .map((row, index) => publicCardFromRow(db, row, context, index));
      const sequence = visibleSequenceCards(allCards);
      const cards = sequence.cards;
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        cards,
        lanes: lanesForCards(cards),
        summary: summaryForCards(cards, allCards, sequence.hiddenCards),
        source: "growth-plugin-sqlite",
        data_ownership: "plugin",
        integrity: integrity({ workspaceId: cleanWorkspaceId })
      };
    });
  }

  function card({ workspaceId, taskCardId } = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_task_cards")) return null;
      const id = cleanString(taskCardId);
      if (!id) return null;
      const cleanWorkspaceId = cleanString(workspaceId);
      const row = taskCardByIdOrKanbanId(db, id, cleanWorkspaceId);
      if (!row) return null;
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        card: publicCardFromRow(db, row, { today: todayKey(), nowIso: nowIsoValue() }),
        source: "growth-plugin-sqlite",
        data_ownership: "plugin"
      };
    });
  }

  return {
    dbPath: resolvedPath,
    cardRetirementRepository,
    learningCardAuthoringPublisherRepository,
    learningGraphRepository,
    learningHistorySummaryRepository,
    masteryProfileRepository,
    stageAssessmentCycleRepository,
    legacyAudioRoots: audioRepository.legacyAudioRoots,
    board,
    card,
    audio: audioRepository.audio,
    backfillAudioBlobs: audioRepository.backfillAudioBlobs,
    claimEvaluationJob: evaluationJobs.claimEvaluationJob,
    clearLearningCoinBalanceForMonthlyExchange: rewardRepository.clearLearningCoinBalanceForMonthlyExchange,
    completeEvaluationJob: evaluationJobs.completeEvaluationJob,
    evaluationJobContext: evaluationJobs.evaluationJobContext,
    failEvaluationJob: evaluationJobs.failEvaluationJob,
    learningCoinBalance: rewardRepository.learningCoinBalance,
    listEvaluationJobs: evaluationJobs.listEvaluationJobs,
    recordEvaluation: evaluationJobs.recordEvaluation,
    settleEvaluationReward: rewardRepository.settleEvaluationReward,
    submitEvidence: evidenceWriter.submitEvidence,
    submitReflection: evidenceWriter.submitReflection,
    integrity
  };
}

module.exports = {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
};
