import { dispatchCardGenerationAction } from "./actionDispatcher.js";
import {
  cardGenerationState,
  reduceCardGenerationActionDraft,
  reduceCardGenerationPreDispatchState,
  reduceCycleHistorySelection
} from "../state/reducers/generationReducer.js";
import { clean } from "../utils/string.js";

const ROOT_FAILURE_TARGET = "cardGeneration";
const ACTION_SLOT_TARGETS = new Set([
  "automationActionHandoffs",
  "automationClosedLoopActionPlan",
  "automationCycleClosure",
  "automationDigests",
  "automationFailurePolicies",
  "automationProposals",
  "automationReviewAdvancement",
  "automationSchedulerExecutions",
  "automationSchedulerRuns",
  "automationSchedulerWorkerTargets",
  "ownerAuditReviews",
  "operatingLoop",
  "recommendationLifecycle",
  "releaseLifecycleRecords",
  "releaseWorkbench"
]);
const PACKAGE_SLOT_ACTIONS = new Set(["build_release_package"]);
const STAGE_CONTROLS_ACTIONS = new Set(["refresh_stage_checkpoint_controls"]);
const CYCLE_HISTORY_CASCADE_ACTIONS = Object.freeze([
  "refresh_cycle_drilldown",
  "refresh_reference_chain",
  "refresh_owner_audit_reviews",
  "refresh_profile_feedback",
  "refresh_automation_closed_loop_action_plan"
]);

function errorMessageFrom(result = {}) {
  return clean(result.error || result.reason || result.action?.blockedReason) || "action_failed";
}

function patchNestedTarget(cardGeneration = {}, target = "", patch = {}) {
  const key = clean(target);
  if (!key || key === ROOT_FAILURE_TARGET) {
    Object.assign(cardGeneration, patch);
    return cardGeneration;
  }
  cardGeneration[key] = Object.assign({}, cardGeneration[key] || {}, patch);
  return cardGeneration[key];
}

export function cardGenerationFailurePatch(target = "", result = {}) {
  const status = result.status === "blocked" ? "blocked" : "failed";
  const message = errorMessageFrom(result);
  const key = clean(target);
  const actionName = clean(result.action?.action);
  if (key === ROOT_FAILURE_TARGET) {
    return {
      status,
      error: message,
      progressStep: status === "failed" ? "failed" : "",
      progressMessage: status === "failed" ? "操作失败。" : ""
    };
  }
  if (key === "releaseWorkbench" && PACKAGE_SLOT_ACTIONS.has(actionName)) {
    return {
      packageStatus: status,
      packageError: message
    };
  }
  if (key === "stageAssessment" && STAGE_CONTROLS_ACTIONS.has(actionName)) {
    return {
      controlsStatus: status,
      controlsError: message,
      status: status === "failed" ? "failed" : "idle",
      error: message
    };
  }
  if (ACTION_SLOT_TARGETS.has(key)) {
    return {
      actionStatus: status,
      actionError: message
    };
  }
  return {
    status,
    error: message
  };
}

export function applyCardGenerationFailure(state = {}, result = {}) {
  const cardGeneration = cardGenerationState(state);
  const target = clean(result.failureTarget) || ROOT_FAILURE_TARGET;
  const patch = cardGenerationFailurePatch(target, result);
  if (target === ROOT_FAILURE_TARGET && result.status === "blocked") {
    patch.status = cardGeneration.context ? "ready" : "idle";
    patch.progressStep = "";
    patch.progressMessage = "";
  }
  patchNestedTarget(cardGeneration, target, patch);
  cardGeneration.lastAction = {
    status: result.status || "failed",
    action: clean(result.action?.action),
    target,
    handler: clean(result.handler),
    reason: errorMessageFrom(result)
  };
  return { target, patch, state };
}

export function applyCardGenerationActionDraft(state = {}, action = {}) {
  return reduceCardGenerationActionDraft(state, action);
}

export function applyCardGenerationPreDispatchState(state = {}, action = {}) {
  return reduceCardGenerationPreDispatchState(state, action);
}

export function selectCycleHistoryState(state = {}, cycleHistoryKey = "") {
  return reduceCycleHistorySelection(state, cycleHistoryKey);
}

export function cycleHistoryCascadeActions(action = {}) {
  return CYCLE_HISTORY_CASCADE_ACTIONS.map((actionName) => ({
    feature: "card_generation",
    action: actionName,
    preventDefault: true,
    sourceAction: clean(action.action) || "select_cycle_history",
    cycleHistoryKey: clean(action.cycleHistoryKey),
    options: { silent: true }
  }));
}

async function dispatchCycleHistoryCascade(action = {}, handlers = {}, options = {}) {
  const settled = await Promise.allSettled(cycleHistoryCascadeActions(action).map((cascadeAction) => (
    dispatchCardGenerationAction(cascadeAction, handlers, options)
  )));
  return settled.map((item) => (item.status === "fulfilled" ? item.value : {
    status: "failed",
    error: item.reason?.message || String(item.reason || "cycle_history_cascade_failed")
  }));
}

export function applyCardGenerationHandled(state = {}, result = {}) {
  const cardGeneration = cardGenerationState(state);
  cardGeneration.lastAction = {
    status: "handled",
    action: clean(result.action?.action),
    target: clean(result.failureTarget) || ROOT_FAILURE_TARGET,
    handler: clean(result.handler)
  };
  return state;
}

export function createCardGenerationController({ state = {}, handlers = {}, render } = {}) {
  async function handleCardGenerationAction(action = {}) {
    if (action.action === "select_cycle_history") {
      const selectedCycle = selectCycleHistoryState(state, action.cycleHistoryKey);
      if (typeof render === "function") render(state);
      if (!selectedCycle) {
        return {
          status: "handled",
          action,
          handler: "localCycleHistorySelection",
          failureTarget: "cycleHistory",
          value: { ok: false, selectedCycle: null }
        };
      }
      const cascade = await dispatchCycleHistoryCascade(action, handlers, {
        onBlocked(event) {
          applyCardGenerationFailure(state, event);
        },
        onUnhandled(event) {
          applyCardGenerationFailure(state, event);
        },
        onError(event) {
          applyCardGenerationFailure(state, event);
        }
      });
      applyCardGenerationHandled(state, {
        status: "handled",
        action,
        handler: "localCycleHistorySelection",
        failureTarget: "cycleHistory"
      });
      if (typeof render === "function") render(state);
      return {
        status: "handled",
        action,
        handler: "localCycleHistorySelection",
        failureTarget: "cycleHistory",
        value: { ok: true, selectedCycle, cascade }
      };
    }
    if (applyCardGenerationActionDraft(state, action)) {
      if (typeof render === "function") render(state);
      return {
        status: "handled",
        action,
        handler: "localDraftState",
        failureTarget: ROOT_FAILURE_TARGET,
        value: { ok: true, localOnly: true }
      };
    }
    const preDispatchChanged = applyCardGenerationPreDispatchState(state, action);
    if (preDispatchChanged && typeof render === "function") render(state);
    const result = await dispatchCardGenerationAction(action, handlers, {
      onBlocked(event) {
        applyCardGenerationFailure(state, event);
      },
      onUnhandled(event) {
        applyCardGenerationFailure(state, event);
      },
      onError(event) {
        applyCardGenerationFailure(state, event);
      }
    });
    if (result.status === "handled") {
      applyCardGenerationHandled(state, result);
    }
    if (result.status !== "ignored" && typeof render === "function") {
      render(state);
    }
    return result;
  }

  return {
    state,
    handleCardGenerationAction
  };
}
