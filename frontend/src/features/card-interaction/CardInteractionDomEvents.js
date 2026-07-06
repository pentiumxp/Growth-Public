import { clean } from "../../utils/string.js";

export const cardInteractionInputSelectors = [
  "[data-learning-growth-teaching-draft]",
  "[data-learning-growth-reflection-text]"
];

export const cardInteractionClickSelectors = [
  "[data-learning-growth-record-toggle]",
  "[data-learning-growth-record-clear]",
  "[data-learning-growth-evaluation-refresh]",
  "[data-learning-growth-evaluation-retry]",
  "[data-learning-growth-experience-signal]"
];

export const cardInteractionSubmitSelectors = [
  "[data-learning-growth-submission-form]",
  "[data-learning-growth-reflection-form]"
];

export const cardInteractionErrorSelectors = [
  "[data-learning-growth-record-playback]",
  "[data-learning-growth-saved-audio]"
];

export function selectorForCardInteractionEventType(eventType = "") {
  if (eventType === "click") return cardInteractionClickSelectors.join(", ");
  if (eventType === "input") return cardInteractionInputSelectors.join(", ");
  if (eventType === "submit") return cardInteractionSubmitSelectors.join(", ");
  if (eventType === "error") return cardInteractionErrorSelectors.join(", ");
  return "";
}

export function cardInteractionElementFromEvent(event = {}, selector = "") {
  if (!selector) return null;
  const target = event.target || null;
  if (!target) return null;
  if (typeof target.closest === "function") return target.closest(selector);
  if (typeof target.matches === "function" && target.matches(selector)) return target;
  return null;
}

export function cardInteractionActionFromDomEvent(event = {}) {
  const selector = selectorForCardInteractionEventType(event.type);
  const element = cardInteractionElementFromEvent(event, selector);
  if (!element || !element.dataset) return null;
  const dataset = element.dataset;
  const value = "value" in element ? element.value : "";

  if (event.type === "input" && dataset.learningGrowthTeachingDraft) {
    return {
      type: "teachingDraftInput",
      taskCardId: clean(dataset.learningGrowthTeachingDraft),
      field: clean(dataset.field),
      value,
      preventDefault: false
    };
  }
  if (event.type === "input" && dataset.learningGrowthReflectionText) {
    return {
      type: "reflectionDraftInput",
      taskCardId: clean(dataset.learningGrowthReflectionText),
      value,
      preventDefault: false
    };
  }
  if (event.type === "click" && dataset.learningGrowthRecordToggle) {
    return {
      type: "recordToggle",
      taskCardId: clean(dataset.learningGrowthRecordToggle),
      kind: clean(dataset.recordKind) || "submission",
      preventDefault: true
    };
  }
  if (event.type === "click" && dataset.learningGrowthRecordClear) {
    return {
      type: "recordClear",
      taskCardId: clean(dataset.learningGrowthRecordClear),
      kind: clean(dataset.recordKind) || "submission",
      preventDefault: true
    };
  }
  if (event.type === "click" && dataset.learningGrowthEvaluationRefresh) {
    return {
      type: "evaluationRefresh",
      taskCardId: clean(dataset.learningGrowthEvaluationRefresh),
      preventDefault: true
    };
  }
  if (event.type === "click" && dataset.learningGrowthEvaluationRetry) {
    return {
      type: "evaluationRetry",
      taskCardId: clean(dataset.learningGrowthEvaluationRetry),
      workspaceId: clean(dataset.workspaceId),
      preventDefault: true
    };
  }
  if (event.type === "click" && dataset.learningGrowthExperienceSignal) {
    return {
      type: "experienceSignal",
      taskCardId: clean(dataset.learningGrowthExperienceSignal),
      signalType: clean(dataset.signalType),
      workspaceId: clean(dataset.workspaceId),
      targetNodeIds: clean(dataset.targetNodeIds).split(/\s+/).filter(Boolean),
      preventDefault: true
    };
  }
  if (event.type === "submit" && dataset.learningGrowthSubmissionForm) {
    return {
      type: "submitEvidence",
      taskCardId: clean(dataset.learningGrowthSubmissionForm),
      element,
      preventDefault: true
    };
  }
  if (event.type === "submit" && dataset.learningGrowthReflectionForm) {
    return {
      type: "submitReflection",
      taskCardId: clean(dataset.learningGrowthReflectionForm),
      element,
      preventDefault: true
    };
  }
  if (event.type === "error" && dataset.learningGrowthRecordPlayback) {
    return {
      type: "recordPlaybackError",
      taskCardId: clean(dataset.learningGrowthRecordPlayback),
      kind: clean(dataset.recordKind) || "submission",
      preventDefault: false
    };
  }
  if (event.type === "error" && dataset.learningGrowthSavedAudio) {
    return {
      type: "savedAudioPlaybackError",
      element,
      preventDefault: false
    };
  }
  return null;
}

function renderState(render, state) {
  if (typeof render === "function") render(state);
}

function setControllerMessage(controller = {}, taskCardId = "", kind = "", error = null) {
  if (typeof controller.setMessage === "function") {
    controller.setMessage(taskCardId, kind, error?.message || String(error || ""));
  }
}

export async function applyCardInteractionDomAction(action = {}, {
  state = {},
  controller = {},
  render
} = {}) {
  if (!action || !action.type) return null;
  if (action.type === "teachingDraftInput") {
    if (!action.taskCardId || !action.field) return null;
    state.learningGrowthTeachingDrafts = state.learningGrowthTeachingDrafts || {};
    state.learningGrowthTeachingDrafts[action.taskCardId] = Object.assign(
      {},
      state.learningGrowthTeachingDrafts[action.taskCardId] || {},
      { [action.field]: action.value }
    );
    return action;
  }
  if (action.type === "reflectionDraftInput") {
    if (!action.taskCardId) return null;
    state.learningGrowthReflectionDrafts = state.learningGrowthReflectionDrafts || {};
    state.learningGrowthReflectionDrafts[action.taskCardId] = Object.assign(
      {},
      state.learningGrowthReflectionDrafts[action.taskCardId] || {},
      { text: action.value }
    );
    return action;
  }
  if (action.type === "recordToggle") {
    controller.toggleRecording?.(action.taskCardId, action.kind);
    return action;
  }
  if (action.type === "recordClear") {
    controller.clearRecording?.(action.taskCardId, action.kind);
    renderState(render, state);
    return action;
  }
  if (action.type === "recordPlaybackError") {
    controller.handleRecordingPlaybackError?.(action.taskCardId, action.kind);
    return action;
  }
  if (action.type === "savedAudioPlaybackError") {
    const holder = action.element?.closest?.("[data-learning-growth-audio-evidence]");
    const message = holder?.querySelector?.("[data-learning-growth-audio-error]");
    if (message) message.hidden = false;
    return action;
  }
  if (action.type === "submitEvidence") {
    try {
      await controller.submitEvidence?.(action.element);
    } catch (error) {
      setControllerMessage(controller, action.taskCardId, "submission", error);
      renderState(render, state);
    }
    return action;
  }
  if (action.type === "evaluationRefresh") {
    try {
      await controller.refreshEvaluation?.(action.taskCardId);
    } catch (error) {
      setControllerMessage(controller, action.taskCardId, "evaluation", error);
      renderState(render, state);
    }
    return action;
  }
  if (action.type === "evaluationRetry") {
    try {
      await controller.retryEvaluation?.(action.taskCardId, action.workspaceId);
    } catch (error) {
      setControllerMessage(controller, action.taskCardId, "evaluation", error);
      renderState(render, state);
    }
    return action;
  }
  if (action.type === "submitReflection") {
    try {
      await controller.submitReflection?.(action.element);
    } catch (error) {
      setControllerMessage(controller, action.taskCardId, "reflection", error);
      renderState(render, state);
    }
    return action;
  }
  if (action.type === "experienceSignal") {
    try {
      await controller.submitExperienceSignal?.({
        taskCardId: action.taskCardId,
        signalType: action.signalType,
        workspaceId: action.workspaceId,
        targetNodeIds: action.targetNodeIds
      });
    } catch (error) {
      setControllerMessage(controller, action.taskCardId, "experience", error);
      renderState(render, state);
    }
    return action;
  }
  return null;
}

export function bindCardInteractionDomEvents({
  root = null,
  state = {},
  controller = {},
  render,
  dispatch
} = {}) {
  if (!root || typeof root.addEventListener !== "function") return () => {};
  const eventTypes = ["input", "click", "submit", "error"];
  const listeners = eventTypes.map((eventType) => {
    const listener = (event) => {
      const action = cardInteractionActionFromDomEvent(event);
      if (!action) return;
      if (action.preventDefault && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      const handler = typeof dispatch === "function"
        ? dispatch(action, event)
        : applyCardInteractionDomAction(action, { state, controller, render });
      if (handler && typeof handler.catch === "function") {
        return handler.catch((error) => {
          setControllerMessage(controller, action.taskCardId, "interaction", error);
          renderState(render, state);
        });
      }
      return handler;
    };
    root.addEventListener(eventType, listener, eventType === "error" ? true : undefined);
    return [eventType, listener];
  });
  return () => {
    if (typeof root.removeEventListener !== "function") return;
    listeners.forEach(([eventType, listener]) => {
      root.removeEventListener(eventType, listener, eventType === "error" ? true : undefined);
    });
  };
}
