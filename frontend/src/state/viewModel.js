import { clean } from "../utils/string.js";

export function boardMetrics(board = {}) {
  const cards = Array.isArray(board.cards) ? board.cards : [];
  const summary = board.summary || {};
  const completed = Number(
    summary.completed ?? cards.filter((card) => /complete|completed|done/i.test(clean(card.status || card.nextAction))).length
  );
  const active = Number(summary.active ?? cards.length - completed);
  const totalEarnedCoins = cards.reduce((sum, card) => (
    sum + (Number(card.latestRewardSettlement?.coinAmount || 0) || 0)
  ), 0);
  return {
    totalCards: Number(summary.total ?? cards.length) || cards.length,
    activeTasks: Number.isFinite(active) ? active : 0,
    completedTasks: Number.isFinite(completed) ? completed : 0,
    totalEarnedCoins,
    sevenDayCoins: 0,
    thirtyDayCoins: 0
  };
}

export function createGrowthViewModel({
  getWorkspaceId = () => "",
  learnerLabel = () => "Owner"
} = {}) {
  function normalizeCard(card = {}) {
    const id = clean(card.taskCardId || card.id);
    return Object.assign({}, card, {
      id,
      taskCardId: id,
      workspaceId: clean(card.workspaceId || getWorkspaceId()),
      title: clean(card.title) || id || "学习任务",
      status: clean(card.status || card.nextAction || card.primaryAction || "published"),
      nextAction: clean(card.nextAction || card.primaryAction || "submit"),
      nativeState: Object.assign({}, card.nativeState || {}, {
        nextAction: clean(card.nextAction || card.primaryAction || "submit")
      }),
      rewardPolicy: Object.assign({ maxCoins: Number(card.rewardCapCoins || 100) || 100 }, card.rewardPolicy || {}),
      taskModel: Object.assign({}, card.taskModel || {}, {
        learnerInstruction: clean(card.learnerInstruction || card.instruction || card.instructionPreview),
        goalSummary: clean(card.goalSummary || card.instructionPreview)
      })
    });
  }

  function normalizeBoard(board = {}) {
    const cards = (Array.isArray(board.cards) ? board.cards : []).map(normalizeCard);
    const cardIds = new Set(cards.map((card) => card.taskCardId));
    const lanes = (Array.isArray(board.lanes) ? board.lanes : [])
      .map((lane) => {
        const ids = (Array.isArray(lane.cards) ? lane.cards : []).map(clean).filter((id) => cardIds.has(id));
        return Object.assign({}, lane, {
          id: clean(lane.id || lane.title || "active"),
          title: clean(lane.title || lane.id || "Active"),
          cards: ids,
          count: Number(lane.count ?? ids.length) || ids.length
        });
      })
      .filter((lane) => lane.cards.length || lane.count);
    return Object.assign({}, board, {
      cards,
      lanes,
      summary: Object.assign({}, board.summary || {}, boardMetrics({ cards, summary: board.summary || {} }))
    });
  }

  function makeOverview(status = {}, board = {}) {
    const normalizedBoard = normalizeBoard(board);
    const metrics = boardMetrics(normalizedBoard);
    const taskCards = normalizedBoard.cards;
    const workspaceId = getWorkspaceId();
    return {
      ok: true,
      source: board.source || status.source || "growth-plugin",
      learner: {
        id: workspaceId || "owner",
        workspaceId: workspaceId || "owner",
        displayName: learnerLabel()
      },
      module: {
        title: "成长",
        status: status.stage || "plugin_sqlite"
      },
      metrics,
      coins: {
        balances: {
          availableCoins: metrics.totalEarnedCoins,
          earnedCoins: metrics.totalEarnedCoins
        },
        growth: {
          totalEarnedCoins: metrics.totalEarnedCoins,
          sevenDayCoins: metrics.sevenDayCoins,
          thirtyDayCoins: metrics.thirtyDayCoins
        },
        rewards: [],
        ledger: [],
        redemptions: []
      },
      board: normalizedBoard,
      programs: {
        taskCards,
        executableTasks: taskCards,
        rewardSettlements: taskCards
          .map((card) => card.latestRewardSettlement)
          .filter(Boolean),
        interactionSessions: [],
        launchOperations: {
          counts: {
            completedTasks: metrics.completedTasks,
            pendingRewardSettlements: 0,
            pendingParentReviews: 0,
            pendingPlanReviews: 0
          }
        }
      },
      launchOperations: {
        counts: {
          completedTasks: metrics.completedTasks,
          pendingRewardSettlements: 0,
          pendingParentReviews: 0,
          pendingPlanReviews: 0
        }
      },
      platformCapabilities: [],
      capabilities: [],
      nextModules: []
    };
  }

  return {
    makeOverview,
    normalizeBoard,
    normalizeCard
  };
}
