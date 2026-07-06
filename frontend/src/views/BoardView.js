import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function boardLaneTitle(id = "", fallback = "") {
  const value = clean(id);
  if (value === "all") return "全部";
  if (value === "today") return "今日";
  if (value === "ready") return "当前";
  if (value === "waiting_ai") return "等待 AI";
  if (value === "evaluation_failed") return "批改失败";
  if (value === "needs_revision") return "待修订";
  if (value === "reflection_required") return "待复盘";
  if (value === "locked_until") return "锁定";
  if (value === "completed_recent") return "最近完成";
  return fallback || value || "任务";
}

export function boardLaneEmptyText(id = "") {
  const value = clean(id);
  if (value === "all") return "暂无成长卡片";
  if (value === "today") return "今日没有待处理任务";
  if (value === "reflection_required") return "没有待复盘卡片";
  if (value === "evaluation_failed") return "没有需处理的批改失败";
  if (value === "completed_recent") return "暂无最近完成卡片";
  return "没有当前任务";
}

export function boardStatusText(card = {}) {
  const nextAction = clean(card.nextAction || card.primaryAction);
  if (nextAction === "submit") return "未提交";
  if (nextAction === "waiting_feedback") return "已提交，等待 AI";
  if (nextAction === "revise") return "需要修订";
  if (nextAction === "spoken_reflection") return "需要复盘";
  if (nextAction === "complete") return "已完成";
  return clean(card.status) || nextAction || "待处理";
}

export function taskRewardCapCoins(task = {}) {
  const policy = task.rewardPolicy || {};
  const value = Number(task.rewardCapCoins || policy.maxCoins || policy.rewardCapCoins || 100);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 100;
}

export function cardRewardText(card = {}) {
  const settlement = card.latestRewardSettlement || card.rewardSettlement || null;
  const coinAmount = Number(settlement?.coinAmount || 0);
  const amount = Number.isFinite(coinAmount) && coinAmount > 0 ? Math.round(coinAmount) : 0;
  const status = clean(settlement?.status);
  if (amount && status === "settled") return `已得 ${amount} 金币`;
  if (amount && (status === "ready" || status === "pending_review")) return `待结算 ${amount} 金币`;
  return `奖励 ${taskRewardCapCoins(card)} 金币`;
}

export function cardOpenTimeText(card = {}) {
  const value = clean(card.openedAt || card.generatedAt || card.availableAt || card.createdAt || card.plannedDate);
  if (!value) return "";
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) {
    const date = new Date(ms);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  const normalized = value.replace("T", " ");
  return normalized.length > 16 ? normalized.slice(0, 16) : normalized;
}

export function isCompletedBoardCard(card = {}) {
  const status = clean(card.status || card.executionStatus || card.laneId || card.nextAction || card.primaryAction).toLowerCase();
  return ["completed", "complete", "done", "settled", "completed_recent"].includes(status);
}

function rewardDecayClass(card = {}) {
  const severity = clean(card.rewardDecay?.severity);
  if (severity === "warning") return " is-reward-warning";
  if (severity === "danger") return " is-reward-danger";
  return "";
}

function renderArtifactCountPill(card = {}, artifacts = 0, escapeHtml = defaultEscapeHtml) {
  const directoryPath = clean(card.artifactDirectoryPath);
  if (!artifacts || !directoryPath) return "";
  return `<button type="button" class="learning-growth-board-artifact-link" data-learning-growth-artifact-link data-directory-path-open data-directory-path="${escapeHtml(directoryPath)}" data-directory-label="${escapeHtml(card.title || "交付目录")}" aria-label="打开交付目录" title="打开交付目录"><span class="learning-growth-board-artifact-icon" aria-hidden="true"></span></button>`;
}

function renderHistoryPill(card = {}, escapeHtml = defaultEscapeHtml) {
  const taskCardId = clean(card.taskCardId || card.id);
  if (!taskCardId) return "";
  return `<button type="button" class="learning-growth-board-history-link" data-learning-open-growth-history="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(card.workspaceId || "")}" aria-label="查看同系列历史卡片" title="查看同系列历史卡片"><span aria-hidden="true"></span></button>`;
}

export function renderBoardCard(card = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(card.taskCardId || card.id);
  const workspaceId = clean(card.workspaceId || options.workspaceId);
  const evaluation = card.latestEvaluation || {};
  const score = Number(evaluation.score);
  const scoreText = Number.isFinite(score) && score > 0 ? `${Math.round(score)} 分` : "";
  const artifacts = Number(card.artifactCount || 0);
  const openTime = isCompletedBoardCard(card) ? "" : cardOpenTimeText(card);
  return `<article class="learning-growth-board-card${rewardDecayClass(card)}" data-learning-executable-task-id="${escapeHtml(taskCardId)}" data-learning-open-growth-task="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(workspaceId)}">
      <div class="learning-growth-board-card-head">
        <button type="button" class="learning-growth-board-card-title" data-learning-open-growth-task="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(workspaceId)}">
          <strong>${escapeHtml(card.title || taskCardId || "学习任务")}</strong>
          <small data-learning-growth-board-card-reward="${escapeHtml(taskCardId)}">${escapeHtml(cardRewardText(card))}</small>
        </button>
        <span>${escapeHtml(boardStatusText(card))}</span>
      </div>
      ${card.instructionPreview ? `<p class="learning-growth-board-card-preview">${escapeHtml(card.instructionPreview)}</p>` : ""}
      <div class="learning-growth-board-card-meta">
        ${card.activityType ? `<small>${escapeHtml(card.activityType)}</small>` : ""}
        ${openTime ? `<small>${escapeHtml(openTime)}</small>` : ""}
        ${scoreText ? `<small>${escapeHtml(scoreText)}</small>` : ""}
        ${renderArtifactCountPill(card, artifacts, escapeHtml)}
        ${renderHistoryPill(card, escapeHtml)}
      </div>
    </article>`;
}

export function boardLaneModels(board = {}, options = {}) {
  const cards = asArray(board.cards);
  const cardById = new Map(cards.map((card) => [clean(card.taskCardId || card.id), card]));
  const laneModels = asArray(board.lanes).map((lane) => {
    const laneCards = asArray(lane.cards)
      .map((id) => cardById.get(clean(id)))
      .filter(Boolean);
    return Object.assign({}, lane, {
      id: clean(lane.id),
      count: Number(lane.count ?? laneCards.length) || laneCards.length,
      laneCards
    });
  });
  if (clean(options.activeGrowthBoardLane) === "all") {
    laneModels.unshift({
      id: "all",
      title: "All",
      cards: cards.map((card) => clean(card.taskCardId || card.id)).filter(Boolean),
      count: cards.length,
      laneCards: cards
    });
  }
  return laneModels;
}

export function activeBoardLaneId(laneModels = [], requestedLane = "") {
  const requested = clean(requestedLane);
  if (laneModels.some((lane) => lane.id === requested)) return requested;
  const visibleLaneModels = laneModels.filter((lane) => lane.count > 0);
  const displayLaneModels = visibleLaneModels.length ? visibleLaneModels : laneModels;
  const fallbackLane = displayLaneModels.find((lane) => lane.count > 0)?.id || displayLaneModels[0]?.id || "";
  return fallbackLane;
}

export function renderLearningGrowthBoard(board = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const laneModels = boardLaneModels(board, options);
  if (!laneModels.length) {
    return `<section class="learning-growth-board"><div class="learning-coin-empty">暂无成长任务。</div></section>`;
  }
  const visibleLaneModels = laneModels.filter((lane) => lane.count > 0);
  const displayLaneModels = visibleLaneModels.length ? visibleLaneModels : laneModels;
  const requestedLane = clean(options.activeGrowthBoardLane);
  const requestedLaneModel = laneModels.find((lane) => lane.id === requestedLane);
  if (requestedLaneModel && !displayLaneModels.some((lane) => lane.id === requestedLane)) {
    displayLaneModels.unshift(requestedLaneModel);
  }
  const activeLaneId = activeBoardLaneId(displayLaneModels, requestedLane);
  return `<section class="learning-growth-board" data-learning-growth-board>
      <div class="learning-growth-board-status-filter" role="tablist" aria-label="成长任务状态">
        ${displayLaneModels.map((lane) => {
          const active = lane.id === activeLaneId;
          return `<button type="button" class="learning-growth-board-status-chip${active ? " active" : ""}" role="tab" aria-selected="${active ? "true" : "false"}" data-learning-growth-board-filter="${escapeHtml(lane.id)}">
            <strong>${escapeHtml(boardLaneTitle(lane.id, lane.title))}</strong>
            <span>${escapeHtml(String(lane.count))}</span>
          </button>`;
        }).join("")}
      </div>
      <div class="learning-growth-board-lanes" data-growth-board-active-lane="${escapeHtml(activeLaneId)}">
        ${displayLaneModels.map((lane) => {
          const active = lane.id === activeLaneId;
          return `<section class="learning-growth-board-lane${active ? " active" : ""}" data-growth-board-lane="${escapeHtml(lane.id)}" data-learning-growth-board-panel="${escapeHtml(lane.id)}"${active ? "" : " hidden"}>
            ${lane.laneCards.length
              ? lane.laneCards.map((card) => renderBoardCard(card, options)).join("")
              : `<div class="learning-growth-board-empty">${escapeHtml(boardLaneEmptyText(lane.id))}</div>`}
          </section>`;
        }).join("")}
      </div>
    </section>`;
}

export function renderBoardView(state = {}, options = {}) {
  const route = state.route || {};
  const board = state.board || state.overview?.board || state.model?.overview?.board || {};
  return renderLearningGrowthBoard(board, {
    activeGrowthBoardLane: options.activeGrowthBoardLane || route.boardLane || state.learningGrowthBoardLane,
    workspaceId: options.currentWorkspaceId || state.currentWorkspaceId || board.workspace_id || board.workspaceId
  });
}
