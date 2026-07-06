import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import {
  interactionKey,
  renderAudioEvidence,
  renderRecorderControls
} from "./SubmissionPanel.js";

function cardIdForTask(task = {}) {
  return clean(task.taskCardId || task.id);
}

export function renderReflectionStatus(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const reflection = task.latestReflection || null;
  if (!reflection) return "";
  const submittedAt = reflection.submittedAt ? ` · ${escapeHtml(reflection.submittedAt)}` : "";
  return `<div class="todo-learning-growth-reflection-status" data-learning-growth-reflection-status>
      <strong>反思已提交${submittedAt}</strong>
      <p>${escapeHtml(reflection.summary || "反思已经作为学习证据保存，不会触发第二次批改。")}</p>
      ${renderAudioEvidence(reflection.audio, "反思录音", options)}
    </div>`;
}

export function renderReflectionForm(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = cardIdForTask(task);
  const state = options.state || {};
  const draft = state.learningGrowthReflectionDrafts?.[cardId] || {};
  const busy = Boolean(state.learningGrowthReflectionBusy?.[cardId]);
  const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "reflection")] || "";
  return `<form class="todo-learning-growth-reflection learning-native-growth-submission-form" data-learning-growth-reflection-form="${escapeHtml(cardId)}" data-workspace-id="${escapeHtml(options.workspaceId || task.workspaceId || "")}">
      <strong>反思一次</strong>
      <p>可以用一句话或一段录音说清楚：哪里做得好、哪里下次继续练。反思只保存学习证据，不影响本卡分数。</p>
      <textarea class="input learning-native-growth-submission-input" rows="3" maxlength="2000" data-learning-growth-reflection-text="${escapeHtml(cardId)}" placeholder="写下反思，或者只提交录音。">${escapeHtml(draft.text || "")}</textarea>
      ${renderRecorderControls(task, "reflection", options)}
      ${message ? `<p class="learning-native-growth-submission-state">${escapeHtml(message)}</p>` : ""}
      <div class="learning-growth-teaching-actions"><button type="submit" ${busy ? "disabled" : ""}>${busy ? "提交中" : "提交反思"}</button></div>
    </form>`;
}

export function renderReflectionPanel(task = {}, options = {}) {
  if (!task.latestEvaluation) return "";
  return task.latestReflection
    ? renderReflectionStatus(task, options)
    : renderReflectionForm(task, options);
}
