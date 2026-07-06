import { clean } from "../../utils/string.js";
import { interactionKey } from "./SubmissionPanel.js";
import { createAudioRecorderController } from "./AudioRecorderController.js";
import {
  applyInteractionCardWriteResult,
  createExperienceSignalPayload,
  createReflectionPayload,
  createSubmissionPayload,
  setEvaluationBusy,
  setInteractionMessage,
  setReflectionBusy,
  setSubmissionBusy,
  workspaceIdForTaskCard as resolveWorkspaceIdForTaskCard
} from "./interactionActions.js";

function cssEscape(root = {}, value = "") {
  if (root.CSS && typeof root.CSS.escape === "function") return root.CSS.escape(String(value || ""));
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function browserBlobReader(root = globalThis) {
  return function readBlobAsBase64(blob) {
    return new Promise((resolve, reject) => {
      const FileReaderCtor = root.FileReader || globalThis.FileReader;
      if (!FileReaderCtor) {
        reject(new Error("audio_blob_reader_unavailable"));
        return;
      }
      const reader = new FileReaderCtor();
      reader.onerror = () => reject(reader.error || new Error("audio_read_failed"));
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
      };
      reader.readAsDataURL(blob);
    });
  };
}

export function submissionTextForCard(taskCardId = "", form = {}, state = {}, root = {}) {
  const id = clean(taskCardId);
  const draft = state.learningGrowthTeachingDrafts?.[id] || state.learningGrowthSubmissionDrafts?.[id] || {};
  const escapedId = cssEscape(root, id);
  const submissionInput = form.querySelector?.(`[data-learning-growth-teaching-draft="${escapedId}"][data-field="submissionText"]`);
  const legacyQuickInput = form.querySelector?.(`[data-learning-growth-teaching-draft="${escapedId}"][data-field="quickCheckText"]`);
  return clean(submissionInput?.value || draft.submissionText || legacyQuickInput?.value || draft.quickCheckText);
}

export function reflectionTextForCard(taskCardId = "", form = {}, state = {}, root = {}) {
  const id = clean(taskCardId);
  const escapedId = cssEscape(root, id);
  const input = form.querySelector?.(`[data-learning-growth-reflection-text="${escapedId}"]`);
  return clean(input?.value || state.learningGrowthReflectionDrafts?.[id]?.text);
}

export function createCardInteractionController({
  root = globalThis,
  state = {},
  model = {},
  viewModel = {},
  api = {},
  render,
  refreshCard,
  getCurrentWorkspaceId = () => "",
  audioController = null,
  readBlobAsBase64
} = {}) {
  state.learningGrowthInteractionMessages = state.learningGrowthInteractionMessages || {};
  state.learningGrowthRecordings = state.learningGrowthRecordings || {};
  state.learningGrowthTeachingDrafts = state.learningGrowthTeachingDrafts || {};
  state.learningGrowthReflectionDrafts = state.learningGrowthReflectionDrafts || {};

  function renderState() {
    if (typeof render === "function") render(state);
  }

  function workspaceIdForTaskCard(taskCardId = "", explicitWorkspaceId = "") {
    return resolveWorkspaceIdForTaskCard({
      taskCardId,
      explicitWorkspaceId,
      model,
      state,
      getCurrentWorkspaceId
    });
  }

  function setMessage(taskCardId = "", kind = "", message = "") {
    setInteractionMessage(state, taskCardId, kind, message);
  }

  const audio = audioController || createAudioRecorderController({
    root,
    state,
    render,
    readBlobAsBase64: readBlobAsBase64 || browserBlobReader(root)
  });

  function mergeCardFromWriteResult(result = {}, taskCardId = "", workspaceId = "") {
    return applyInteractionCardWriteResult({
      result,
      taskCardId,
      workspaceId,
      model,
      viewModel,
      resolveWorkspaceId: workspaceIdForTaskCard
    });
  }

  async function refreshCardIfAvailable(taskCardId = "", workspaceId = "") {
    if (typeof refreshCard === "function") {
      await refreshCard(taskCardId, workspaceId);
    }
  }

  async function refreshEvaluation(taskCardId = "", workspaceId = "") {
    const cardId = clean(taskCardId);
    if (!cardId) return null;
    const targetWorkspaceId = workspaceIdForTaskCard(cardId, workspaceId);
    setEvaluationBusy(state, cardId, true);
    setMessage(cardId, "evaluation", "正在请求一次批改处理。");
    renderState();
    try {
      await api.processGrowthEvaluations?.(targetWorkspaceId, 3);
      setMessage(cardId, "evaluation", "批改状态已刷新。");
    } catch (error) {
      setMessage(cardId, "evaluation", `批改暂未完成：${error?.message || String(error)}`);
    } finally {
      setEvaluationBusy(state, cardId, false);
    }
    await refreshCardIfAvailable(cardId, targetWorkspaceId);
    return { taskCardId: cardId, workspaceId: targetWorkspaceId };
  }

  async function retryEvaluation(taskCardId = "", workspaceId = "") {
    const cardId = clean(taskCardId);
    if (!cardId) return null;
    const targetWorkspaceId = workspaceIdForTaskCard(cardId, workspaceId);
    setEvaluationBusy(state, cardId, true);
    setMessage(cardId, "evaluation", "正在重新加入批改队列。");
    renderState();
    try {
      await api.retryGrowthEvaluation?.({
        task_card_id: cardId,
        reason: "owner_retry_from_growth_ui"
      }, targetWorkspaceId);
      setMessage(cardId, "evaluation", "已重新加入批改队列，正在刷新批改状态。");
    } catch (error) {
      setMessage(cardId, "evaluation", `重新批改失败：${error?.message || String(error)}`);
      return null;
    } finally {
      setEvaluationBusy(state, cardId, false);
      renderState();
    }
    return refreshEvaluation(cardId, targetWorkspaceId);
  }

  async function submitEvidence(form = {}) {
    const cardId = clean(form.dataset?.learningGrowthSubmissionForm || form.dataset?.learningGrowthTeachingCheckForm);
    if (!cardId) return null;
    const workspaceId = workspaceIdForTaskCard(cardId, form.dataset?.workspaceId);
    const recording = state.learningGrowthRecordings?.[interactionKey(cardId, "submission")] || {};
    const audioPayload = await audio.audioPayloadFromRecording(recording, "submission");
    const payloadResult = createSubmissionPayload({
      text: submissionTextForCard(cardId, form, state, root),
      audio: audioPayload
    });
    if (!payloadResult.ok) {
      setMessage(cardId, "submission", "请先写一点作答，或录一段作答音频。");
      renderState();
      return null;
    }
    setSubmissionBusy(state, cardId, true);
    setMessage(cardId, "submission", "正在提交作答。");
    renderState();
    try {
      const result = await api.submitGrowthCardEvidence?.(cardId, payloadResult.payload, workspaceId);
      mergeCardFromWriteResult(result || {}, cardId, workspaceId);
      setMessage(cardId, "submission", "作答已提交，正在刷新批改。");
      await refreshEvaluation(cardId, workspaceId);
      audio.clearRecording(cardId, "submission");
      return result || null;
    } catch (error) {
      setMessage(cardId, "submission", error?.message || String(error));
      renderState();
      return null;
    } finally {
      setSubmissionBusy(state, cardId, false);
      renderState();
    }
  }

  async function submitReflection(form = {}) {
    const cardId = clean(form.dataset?.learningGrowthReflectionForm);
    if (!cardId) return null;
    const workspaceId = workspaceIdForTaskCard(cardId, form.dataset?.workspaceId);
    const recording = state.learningGrowthRecordings?.[interactionKey(cardId, "reflection")] || {};
    const audioPayload = await audio.audioPayloadFromRecording(recording, "reflection");
    const payloadResult = createReflectionPayload({
      text: reflectionTextForCard(cardId, form, state, root),
      audio: audioPayload
    });
    if (!payloadResult.ok) {
      setMessage(cardId, "reflection", "请先写一句反思，或录一段反思音频。");
      renderState();
      return null;
    }
    setReflectionBusy(state, cardId, true);
    setMessage(cardId, "reflection", "正在提交反思。");
    renderState();
    try {
      const result = await api.submitGrowthCardReflection?.(cardId, payloadResult.payload, workspaceId);
      mergeCardFromWriteResult(result || {}, cardId, workspaceId);
      audio.clearRecording(cardId, "reflection");
      delete state.learningGrowthReflectionDrafts[cardId];
      setMessage(cardId, "reflection", "反思已提交。");
      await refreshCardIfAvailable(cardId, workspaceId);
      return result || null;
    } catch (error) {
      setMessage(cardId, "reflection", error?.message || String(error));
      renderState();
      return null;
    } finally {
      setReflectionBusy(state, cardId, false);
      renderState();
    }
  }

  async function submitExperienceSignal(input = {}) {
    const payloadResult = createExperienceSignalPayload(input);
    const normalized = payloadResult.normalized || {};
    if (!payloadResult.ok) return null;
    const cardId = normalized.taskCardId;
    const workspaceId = workspaceIdForTaskCard(cardId, normalized.workspaceId);
    state.learningGrowthExperienceSignalBusy = state.learningGrowthExperienceSignalBusy || {};
    state.learningGrowthExperienceSignalSubmitted = state.learningGrowthExperienceSignalSubmitted || {};
    state.learningGrowthExperienceSignalBusy[cardId] = normalized.signalType;
    setMessage(cardId, "experience", "正在记录难度感受。");
    renderState();
    try {
      const result = await api.submitGrowthExperienceSignal?.(cardId, payloadResult.payload, workspaceId);
      state.learningGrowthExperienceSignalSubmitted[cardId] = normalized.signalType;
      setMessage(cardId, "experience", "难度感受已记录。");
      await refreshCardIfAvailable(cardId, workspaceId);
      return result || null;
    } catch (error) {
      setMessage(cardId, "experience", error?.message || String(error));
      renderState();
      return null;
    } finally {
      state.learningGrowthExperienceSignalBusy[cardId] = "";
      renderState();
    }
  }

  return Object.assign({}, audio, {
    mergeCardFromWriteResult,
    refreshEvaluation,
    retryEvaluation,
    setMessage,
    submitEvidence,
    submitExperienceSignal,
    submitReflection,
    workspaceIdForTaskCard
  });
}
