import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { interactionKey } from "./SubmissionPanel.js";

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => clean(item)) : [];
}

function cardIdForTask(task = {}) {
  return clean(task.taskCardId || task.id);
}

export function dailyRewardCap(task = {}) {
  const policy = task.rewardPolicy || {};
  const value = Number(task.rewardCapCoins || policy.maxCoins || policy.rewardCapCoins || 100);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 100;
}

export function dailyRewardEarned(task = {}) {
  const settlement = task.latestRewardSettlement || task.rewardSettlement || null;
  const amount = Number(settlement?.coinAmount || settlement?.coins || 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function renderExperienceSignalActions(task = {}, state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = cardIdForTask(task);
  if (clean(task.status).toLowerCase() !== "completed") return "";
  const summary = task.experienceSummary && typeof task.experienceSummary === "object" ? task.experienceSummary : {};
  const submitted = state.learningGrowthExperienceSignalSubmitted?.[cardId] || "";
  const busy = state.learningGrowthExperienceSignalBusy?.[cardId] || "";
  const selected = clean(summary.latestSignalType || submitted);
  const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "experience")] || "";
  const targetNodeIds = asArray(task.targetNodeIds || summary.targetNodeIds);
  const targetNodeText = targetNodeIds.join(" ");
  const disabled = !targetNodeIds.length;
  const actions = [
    ["too_easy", "太简单"],
    ["right_level", "正合适"],
    ["too_hard", "有点难"]
  ];
  const note = selected
    ? "难度感受已记录到成长画像输入。"
    : disabled
      ? "这张卡缺少图谱节点绑定，暂时不能写入难度感受。"
      : "选择一项，下一张卡会参考这个信号。";
  return `<div class="learning-growth-experience-actions" data-learning-growth-experience-actions="${escapeHtml(cardId)}" data-learning-growth-experience-mode="active">
      ${actions.map(([type, label]) => {
        const isPending = busy === type;
        const isSelected = selected === type || isPending;
        return `<button type="button" class="${isSelected ? "is-selected" : ""}${isPending ? " is-pending" : ""}" data-learning-growth-experience-signal="${escapeHtml(cardId)}" data-signal-type="${escapeHtml(type)}" data-workspace-id="${escapeHtml(task.workspaceId || "")}" data-target-node-ids="${escapeHtml(targetNodeText)}" aria-current="${isSelected ? "true" : "false"}" ${busy || disabled ? "disabled" : ""}>${escapeHtml(isPending ? "记录中" : label)}</button>`;
      }).join("")}
      <small data-learning-growth-experience-note>${escapeHtml(message || note)}</small>
    </div>`;
}

export function renderTeachingFeedbackSection(task = {}, state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const summary = task.experienceSummary || {};
  const earned = dailyRewardEarned(task);
  const cap = dailyRewardCap(task);
  const completed = clean(task.status).toLowerCase() === "completed";
  if (!completed && !summary.latestAt && !summary.lastCompletionAt) return "";
  return `<section class="learning-growth-teaching-feedback" data-learning-growth-teaching-feedback>
      <strong>${escapeHtml(completed ? "本卡已完成" : "学习反馈已记录")}</strong>
      <p>${escapeHtml(earned ? `已按本次分数结算 ${earned} / ${cap} 金币；这张卡只作为低压力学习证据，不当作正式能力测验。` : `最高 ${cap} 金币，按本次分数比例结算；这张卡不当作正式能力测验。`)}</p>
      ${completed ? `<p class="learning-growth-experience-prompt">${escapeHtml("完成后可以记录难度感受，用来帮助下一张卡调节难度。")}</p>${renderExperienceSignalActions(task, state, options)}` : ""}
    </section>`;
}
