import { clean } from "../../utils/string.js";
import { interactionKey } from "./SubmissionPanel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cardIdForTask(task = {}) {
  return clean(task.taskCardId || task.id);
}

export function taskCardById(model = {}, taskCardId = "") {
  const wanted = clean(taskCardId);
  if (!wanted) return null;
  const overview = model.overview || {};
  const programs = overview.programs || {};
  const cards = []
    .concat(asArray(programs.taskCards))
    .concat(asArray(programs.executableTasks))
    .concat(asArray(overview.board?.cards));
  return cards.find((card = {}) => cardIdForTask(card) === wanted) || null;
}

export function workspaceIdForTaskCard({
  taskCardId = "",
  explicitWorkspaceId = "",
  model = {},
  state = {},
  getCurrentWorkspaceId = () => ""
} = {}) {
  const card = taskCardById(model, taskCardId);
  return clean(explicitWorkspaceId)
    || clean(card?.workspaceId)
    || clean(state.cardGeneration?.selectedWorkspaceId)
    || clean(state.cardGeneration?.context?.target?.workspaceId)
    || clean(getCurrentWorkspaceId());
}

export function setInteractionMessage(state = {}, taskCardId = "", kind = "", message = "") {
  const key = interactionKey(taskCardId, kind);
  if (!key || key === ":") return state;
  state.learningGrowthInteractionMessages = state.learningGrowthInteractionMessages || {};
  state.learningGrowthInteractionMessages[key] = clean(message);
  return state;
}

export function setSubmissionBusy(state = {}, taskCardId = "", value = false) {
  const id = clean(taskCardId);
  state.learningGrowthSubmissionBusy = state.learningGrowthSubmissionBusy || {};
  state.learningGrowthTeachingCheckBusy = state.learningGrowthTeachingCheckBusy || {};
  state.learningGrowthSubmissionBusy[id] = Boolean(value);
  state.learningGrowthTeachingCheckBusy[id] = Boolean(value);
  return state;
}

export function setReflectionBusy(state = {}, taskCardId = "", value = false) {
  const id = clean(taskCardId);
  state.learningGrowthReflectionBusy = state.learningGrowthReflectionBusy || {};
  state.learningGrowthReflectionBusy[id] = Boolean(value);
  return state;
}

export function setEvaluationBusy(state = {}, taskCardId = "", value = false) {
  const id = clean(taskCardId);
  state.learningGrowthEvaluationBusy = state.learningGrowthEvaluationBusy || {};
  state.learningGrowthEvaluationBusy[id] = Boolean(value);
  return state;
}

export function createSubmissionPayload({ text = "", audio = null } = {}) {
  const cleanText = clean(text);
  if (!cleanText && !audio) return { ok: false, error: "submission_content_required", payload: null };
  const payload = {
    text: cleanText,
    author: "learner",
    stage: "final",
    source: "growth-plugin-card-ui"
  };
  if (audio) payload.audio = audio;
  return { ok: true, error: "", payload };
}

export function createReflectionPayload({ text = "", audio = null } = {}) {
  const cleanText = clean(text);
  if (!cleanText && !audio) return { ok: false, error: "reflection_content_required", payload: null };
  const payload = {
    text: cleanText,
    author: "learner",
    source: "growth-plugin-card-ui"
  };
  if (audio) payload.audio = audio;
  return { ok: true, error: "", payload };
}

export function normalizeExperienceSignalInput(input = {}) {
  const targetNodeIds = Array.isArray(input.targetNodeIds)
    ? input.targetNodeIds.map(clean).filter(Boolean)
    : clean(input.targetNodeIds).split(/\s+/).map(clean).filter(Boolean);
  return {
    taskCardId: clean(input.taskCardId),
    signalType: clean(input.signalType),
    workspaceId: clean(input.workspaceId),
    targetNodeIds
  };
}

export function createExperienceSignalPayload(input = {}) {
  const normalized = normalizeExperienceSignalInput(input);
  if (!normalized.taskCardId || !normalized.signalType) {
    return { ok: false, error: "experience_signal_target_required", payload: null, normalized };
  }
  return {
    ok: true,
    error: "",
    normalized,
    payload: {
      signalType: normalized.signalType,
      targetNodeIds: normalized.targetNodeIds,
      source: "growth-plugin-card-ui"
    }
  };
}

export function applyInteractionCardWriteResult({
  result = {},
  taskCardId = "",
  workspaceId = "",
  model = {},
  viewModel = {},
  resolveWorkspaceId
} = {}) {
  if (!result.card || !model.detailCache || typeof model.detailCache.set !== "function") return null;
  const normalizedCard = typeof viewModel.normalizeCard === "function"
    ? viewModel.normalizeCard(Object.assign({}, result.card, {
      workspaceId: result.card.workspaceId || result.card.workspace_id || workspaceId
    }))
    : Object.assign({}, result.card, {
      workspaceId: result.card.workspaceId || result.card.workspace_id || workspaceId
    });
  const cardId = clean(normalizedCard.taskCardId || normalizedCard.id || taskCardId);
  const resolvedWorkspaceId = typeof resolveWorkspaceId === "function"
    ? resolveWorkspaceId(taskCardId, workspaceId)
    : workspaceId;
  const cacheKey = `${clean(resolvedWorkspaceId)}:${cardId}`;
  model.detailCache.set(cacheKey, normalizedCard);
  return { cacheKey, card: normalizedCard };
}
