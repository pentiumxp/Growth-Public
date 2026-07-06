import {
  boardStatusText,
  cardOpenTimeText,
  cardRewardText
} from "./BoardView.js";
import {
  isTeachingCardDetail,
  renderTeachingCardDetailView
} from "./TeachingCardDetailView.js";
import {
  isNativeGrowthTaskDetail,
  renderNativeGrowthTaskDetail
} from "./ProgramExecutionView.js";
import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function taskId(task = {}) {
  return clean(task.taskCardId || task.id || task.cardId);
}

function boardCards(state = {}) {
  return asArray(state.board?.cards || state.overview?.board?.cards || state.model?.overview?.board?.cards);
}

function programTaskCards(state = {}) {
  const programs = state.overview?.programs || state.model?.overview?.programs || state.programs || {};
  return asArray(programs.taskCards || programs.tasks || programs.cards);
}

function detailCards(state = {}) {
  const details = state.cardDetails || state.overview?.cardDetails || state.model?.overview?.cardDetails || {};
  return Object.values(details).filter(Boolean);
}

function programDetailData(state = {}) {
  return state.overview?.programs || state.model?.overview?.programs || state.programs || {};
}

export function selectedCardDetailId(state = {}, options = {}) {
  return clean(
    options.selectedGrowthTaskCardId
    || state.selectedLearningTaskCardId
    || state.route?.selectedTaskCardId
    || state.learningGrowthRouteState?.cardId
  );
}

export function findCardDetailTask(state = {}, taskCardId = "") {
  const id = clean(taskCardId);
  if (!id) return null;
  return boardCards(state)
    .concat(programTaskCards(state))
    .concat(detailCards(state))
    .find((task) => taskId(task) === id) || null;
}

export function cardDetailGoalText(task = {}) {
  const model = task.taskModel || task.learningTaskModel || {};
  return clean(
    task.goalSummary
    || model.goalSummary
    || asArray(task.acceptance || model.acceptance)[0]
    || task.learnerInstruction
    || task.instruction
    || model.learnerInstruction
    || task.instructionPreview
    || task.summary
    || task.description
  );
}

export function cardDetailMetaItems(task = {}) {
  return [
    task.activityType,
    task.skillId,
    task.domain,
    task.plannedMinutes ? `${task.plannedMinutes} min` : "",
    cardOpenTimeText(task) ? `开放 ${cardOpenTimeText(task)}` : ""
  ].map(clean).filter(Boolean);
}

export function renderCardDetailFallback(taskCardId = "", escapeHtml = defaultEscapeHtml) {
  return `<div class="learning-growth-view learning-growth-task-focus" data-learning-product="fanfan-growth" data-learning-growth-task-focus="${escapeHtml(taskCardId)}">
      <div class="learning-coin-empty">这张任务卡已更新或不在当前状态里。</div>
    </div>`;
}

export function renderCardDetailSummary(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const id = taskId(task);
  const metaItems = cardDetailMetaItems(task);
  const evaluation = task.latestEvaluation || {};
  const score = Number(evaluation.score);
  const scoreText = Number.isFinite(score) && score > 0 ? `${Math.round(score)} 分` : "";
  const goal = cardDetailGoalText(task);
  return `<section class="learning-growth-answer-card learning-growth-card-detail-shell" data-learning-growth-answer-card data-learning-executable-task-id="${escapeHtml(id)}">
      <div class="learning-growth-card-detail-hero">
        <div class="learning-growth-answer-card-head learning-growth-card-detail-head">
          <div>
            <span>学习卡</span>
            <h3>${escapeHtml(task.title || id || "学习任务")}</h3>
          </div>
          <div class="learning-growth-answer-card-status learning-growth-card-detail-actions">
            <strong>${escapeHtml(boardStatusText(task))}</strong>
            <button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button>
          </div>
        </div>
        ${metaItems.length ? `<div class="learning-growth-answer-card-meta learning-growth-card-detail-meta">${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      </div>
      <section class="learning-coin-panel learning-growth-card-detail-summary" data-learning-growth-card-detail-summary>
        <div class="learning-section-heading">
          <h3>任务摘要</h3>
          <span>${escapeHtml(cardRewardText(task))}</span>
        </div>
        <p class="learning-growth-muted">${escapeHtml(goal || "暂无目标摘要。")}</p>
        <div class="learning-settings-task-detail-grid">
          <span><small>状态</small><strong>${escapeHtml(boardStatusText(task))}</strong></span>
          <span><small>奖励</small><strong>${escapeHtml(cardRewardText(task))}</strong></span>
          <span><small>评分</small><strong>${escapeHtml(scoreText || "未评分")}</strong></span>
        </div>
      </section>
    </section>`;
}

export function renderCardDetailView(state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = selectedCardDetailId(state, options);
  const task = findCardDetailTask(state, taskCardId);
  if (!task) return renderCardDetailFallback(taskCardId, escapeHtml);
  const customRenderer = options.renderers?.cardDetailView || options.renderers?.cardDetail;
  const detail = typeof customRenderer === "function"
    ? customRenderer(task, options)
    : isTeachingCardDetail(task)
      ? renderTeachingCardDetailView(task, options)
      : isNativeGrowthTaskDetail(task)
        ? renderNativeGrowthTaskDetail(task, programDetailData(state), options)
    : renderCardDetailSummary(task, options);
  return `<div class="learning-growth-view learning-growth-task-focus" data-learning-product="fanfan-growth" data-learning-growth-task-focus="${escapeHtml(taskCardId)}">
      ${detail}
    </div>`;
}
