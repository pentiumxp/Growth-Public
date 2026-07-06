import { cycleHistoryItemKey } from "../../features/card-generation/CycleDrilldownPanel.js";
import { selectedProvisionDraft } from "../../features/card-generation/generationModel.js";
import { clean } from "../../utils/string.js";

export function cardGenerationState(state = {}) {
  if (!state.cardGeneration || typeof state.cardGeneration !== "object") {
    state.cardGeneration = {};
  }
  return state.cardGeneration;
}

export function reduceCardGenerationActionDraft(state = {}, action = {}) {
  const cardGeneration = cardGenerationState(state);
  if (action.action === "update_owner_correction_note") {
    cardGeneration.ownerCorrectionDraft = clean(action.note);
    return true;
  }
  if (action.action === "update_owner_correction_action") {
    cardGeneration.ownerCorrectionAction = clean(action.reviewAction) || "confirm_profile_delta";
    return true;
  }
  if (action.action === "update_owner_audit_review_note") {
    cardGeneration.ownerAuditReviewDraft = clean(action.note);
    return true;
  }
  if (action.action === "select_domain_pack") {
    const selectedDomainPackId = clean(action.domainPackId);
    const currentDraft = cardGeneration.targetProvisionDraft || {};
    const selection = selectedProvisionDraft(cardGeneration.context || {}, {
      domainPackId: selectedDomainPackId,
      recipeId: currentDraft.recipeId || currentDraft.recipe_id
    });
    cardGeneration.targetProvisionDraft = Object.assign({}, currentDraft, {
      domainPackId: selectedDomainPackId,
      domain: clean(selection.pack?.domain || currentDraft.domain),
      subject: selection.subject || clean(currentDraft.subject),
      status: "idle",
      error: ""
    });
    return true;
  }
  if (action.action === "select_subject") {
    cardGeneration.targetProvisionDraft = Object.assign({}, cardGeneration.targetProvisionDraft || {}, {
      subject: clean(action.subject),
      status: "idle",
      error: ""
    });
    return true;
  }
  return false;
}

export function reduceCardGenerationPreDispatchState(state = {}, action = {}) {
  const cardGeneration = cardGenerationState(state);
  if (action.action !== "select_card_generation_recipe") return false;
  const recipeId = clean(action.recipeId);
  if (!recipeId) return false;
  cardGeneration.targetProvisionDraft = Object.assign({}, cardGeneration.targetProvisionDraft || {}, {
    domainPackId: "",
    domain: "",
    subject: "",
    recipeId,
    status: "loading",
    error: ""
  });
  return true;
}

function cycleHistoryItems(cardGeneration = {}) {
  const holder = cardGeneration.cycleHistory || {};
  if (Array.isArray(holder.data?.cycles)) return holder.data.cycles;
  if (Array.isArray(holder.cycles)) return holder.cycles;
  return [];
}

export function reduceCycleHistorySelection(state = {}, cycleHistoryKey = "") {
  const cardGeneration = cardGenerationState(state);
  const selectedKey = clean(cycleHistoryKey);
  const cycles = cycleHistoryItems(cardGeneration);
  const index = cycles.findIndex((cycle, cycleIndex) => cycleHistoryItemKey(cycle, cycleIndex) === selectedKey);
  const selectedCycle = index >= 0 ? cycles[index] : null;
  cardGeneration.cycleHistory = Object.assign({}, cardGeneration.cycleHistory || {}, {
    selectedCycleKey: selectedCycle ? selectedKey : "",
    selectedCycle,
    error: selectedCycle ? "" : "未找到可选择的历史周期。"
  });
  if (!selectedCycle) {
    cardGeneration.cycleDrilldown = Object.assign({}, cardGeneration.cycleDrilldown || {}, {
      status: "failed",
      error: cardGeneration.cycleHistory.error || "未找到可选择的历史周期。"
    });
  }
  return selectedCycle;
}
