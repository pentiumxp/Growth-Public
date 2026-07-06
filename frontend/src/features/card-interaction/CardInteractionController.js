import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import {
  interactionKey,
  renderEvaluationPanel,
  renderRecorderControls,
  renderSubmissionStatus
} from "./SubmissionPanel.js";
import { renderReflectionPanel } from "./ReflectionPanel.js";
import { renderTeachingFeedbackSection } from "./ExperienceSignalPanel.js";

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => clean(item)).slice(0, 8) : [];
}

function cardIdForTask(task = {}) {
  return clean(task.taskCardId || task.id);
}

export function quickCheckFlow(task = {}, options = {}) {
  const flow = options.flow || task.flow || task.teachingFlow || {};
  return flow.quickCheck || flow.check || task.quickCheck || {};
}

export function submissionDraftText(task = {}, state = {}) {
  const cardId = cardIdForTask(task);
  const draft = state.learningGrowthSubmissionDrafts?.[cardId]
    || state.learningGrowthTeachingDrafts?.[cardId]
    || {};
  return clean(draft.submissionText || draft.text || draft.value);
}

export function submissionRequirementHtml(validation = null, options = {}) {
  if (!validation) return "";
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const ok = Boolean(validation.ok);
  const text = clean(validation.message)
    || (ok ? "已达到提交要求。" : "请补充作答内容后再提交。");
  return `<p class="todo-learning-growth-submit-requirement ${ok ? "is-ready" : "is-short"}">${escapeHtml(text)}</p>`;
}

export function renderQuickCheckSubmissionForm(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const state = options.state || {};
  const cardId = cardIdForTask(task);
  const flow = quickCheckFlow(task, options);
  const hasSubmission = Boolean(task.latestSubmission);
  const completed = clean(task.status).toLowerCase() === "completed";
  const busy = Boolean(state.learningGrowthSubmissionBusy?.[cardId]);
  const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "submission")] || "";
  const criteria = asArray(flow.completionCriteria);
  const instruction = clean(flow.instruction || task.instruction || "提交你的作答。");
  const draftText = submissionDraftText(task, state);
  const workspaceId = clean(options.workspaceId || task.workspaceId);

  return `<form class="learning-growth-teaching-check-form learning-native-growth-submission-form" data-learning-growth-teaching-check-form="${escapeHtml(cardId)}" data-learning-growth-submission-form="${escapeHtml(cardId)}" data-workspace-id="${escapeHtml(workspaceId)}">
      <h4>提交作答</h4>
      <p>${escapeHtml(instruction)}</p>
      ${criteria.length ? `<ul>${criteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${hasSubmission ? "" : `<textarea class="input learning-native-growth-submission-input" rows="4" maxlength="4000" data-learning-growth-teaching-draft="${escapeHtml(cardId)}" data-field="submissionText" placeholder="写下你的作答。">${escapeHtml(draftText)}</textarea>`}
      ${hasSubmission ? "" : renderRecorderControls(task, "submission", options)}
      ${message ? `<p class="learning-native-growth-submission-state">${escapeHtml(message)}</p>` : ""}
      ${submissionRequirementHtml(options.validation, options)}
      ${hasSubmission || completed ? "" : `<div class="learning-growth-teaching-actions"><button type="submit" ${busy ? "disabled" : ""}>${busy ? "提交中" : "提交作答"}</button></div>`}
    </form>`;
}

export function renderCardInteractionPanel(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = cardIdForTask(task);
  return `<section class="learning-growth-teaching-section learning-growth-daily-submit-panel" data-learning-growth-teaching-section="submit" data-learning-growth-card-interaction="${escapeHtml(cardId)}">
      ${renderQuickCheckSubmissionForm(task, options)}
      ${renderSubmissionStatus(task, options)}
      ${renderEvaluationPanel(task, options)}
      ${renderReflectionPanel(task, options)}
      ${renderTeachingFeedbackSection(task, options.state || {}, options)}
    </section>`;
}
