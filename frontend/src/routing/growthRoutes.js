import { clean, normalizedToken } from "../utils/string.js";

export function routeCardId(card = {}) {
  return clean(card.taskCardId || card.id);
}

export function routeText(card = {}) {
  return [
    card.status,
    card.laneId,
    card.nextAction,
    card.primaryAction,
    card.cardRole,
    card.taskCardType,
    card.activityType,
    card.taskModel?.taskCardType,
    card.taskModel?.activityType,
    card.title
  ].map(clean).join(" ").toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1)
      .map(([key]) => key);
  }
  if (clean(value)) return clean(value).split(/[\s,|]+/);
  return [];
}

function addExplicitCapabilities(target, value) {
  asArray(value).forEach((item) => {
    const token = normalizedToken(item);
    if (!token) return;
    if (token === "submit_work" || token === "submit" || token === "can_submit" || token === "can_revise") target.add("submit_work");
    if (token === "review" || token === "reflect" || token === "reflection" || token === "can_reflect") target.add("review");
    if (token === "stage_assessment" || token === "formal_assessment" || token === "assessment") target.add("stage_assessment");
    if (token === "rewards" || token === "coins" || token === "learning_coins") target.add("rewards");
  });
}

export function cardCapabilities(card = {}) {
  const capabilities = new Set();
  addExplicitCapabilities(capabilities, card.routeCapabilities);
  addExplicitCapabilities(capabilities, card.actionCapabilities);
  addExplicitCapabilities(capabilities, card.availableActions);
  addExplicitCapabilities(capabilities, card.capabilities);

  const actions = card.actions && typeof card.actions === "object" ? card.actions : {};
  const laneId = normalizedToken(card.laneId);
  const nextAction = normalizedToken(card.nextAction);
  const primaryAction = normalizedToken(card.primaryAction || actions.primaryAction);
  const cardRole = normalizedToken(card.cardRole || card.card_role || card.learningGrowthCardRole);
  const taskCardType = normalizedToken(card.taskCardType || card.task_card_type || card.taskModel?.taskCardType);
  const completionMode = normalizedToken(card.completionPolicy?.mode || card.completion_policy?.mode || card.taskModel?.completionPolicy?.mode);

  if (actions.canSubmit === true || nextAction === "submit" || nextAction === "revise" || primaryAction === "submit" || primaryAction === "revise") {
    capabilities.add("submit_work");
  }
  if (actions.canReflect === true || nextAction === "spoken_reflection" || primaryAction === "reflect" || laneId === "reflection_required") {
    capabilities.add("review");
  }
  if (
    cardRole === "stage_assessment"
    || completionMode === "formal_assessment"
    || laneId === "stage_assessment"
    || taskCardType === "assessment"
    || clean(card.stageAssessmentCycleId || card.stage_assessment_cycle_id)
    || (card.stageAssessment && typeof card.stageAssessment === "object")
  ) {
    capabilities.add("stage_assessment");
  }
  return capabilities;
}

export function hasRouteCapability(card, route) {
  return cardCapabilities(card).has(route);
}

export const ROUTE_CONTRACT = Object.freeze({
  today_tasks: {
    label: "今日任务",
    target: "board_lane",
    laneId: "today",
    emptyTitle: "今日没有待处理任务",
    emptyBody: "看板已切到「今日」；如果没有卡片，表示当前没有今日计划任务。"
  },
  cards: {
    label: "成长卡片",
    target: "board_all",
    laneId: "all",
    emptyTitle: "暂无成长卡片",
    emptyBody: "已进入全部卡片列表；有卡片后会在这里按状态展示。"
  },
  submit_work: {
    label: "提交作业",
    target: "card_with_capability",
    emptyTitle: "暂无可提交作业",
    emptyBody: "当前没有处于提交或修订状态的成长卡片。"
  },
  review: {
    label: "复盘",
    target: "reflection_card_or_owner_analysis",
    emptyTitle: "暂无需复盘卡片",
    emptyBody: "当前没有处于复盘状态的卡片；完成批改后会出现一次反思入口。"
  },
  stage_assessment: {
    label: "阶段测评",
    target: "formal_assessment_card_or_owner_generation",
    emptyTitle: "暂无已激活的阶段测评",
    emptyBody: "阶段测评需要先由 Owner 在生成页检查并激活；激活后会打开正式测评卡。"
  },
  rewards: {
    label: "奖励/通宝",
    target: "owner_rewards",
    emptyTitle: "奖励由 Owner 管理",
    emptyBody: "当前执行者看板不提供奖励管理页；可通过卡片和金币流水查看学习奖励结果。"
  }
});

export function uniqueTaskCards(model = {}) {
  return [
    ...((Array.isArray(model.overview?.board?.cards) ? model.overview.board.cards : [])),
    ...((Array.isArray(model.overview?.programs?.taskCards) ? model.overview.programs.taskCards : [])),
    ...((Array.isArray(model.overview?.programs?.executableTasks) ? model.overview.programs.executableTasks : []))
  ].filter((card, index, list) => {
    const id = routeCardId(card);
    return id && list.findIndex((item) => routeCardId(item) === id) === index;
  });
}

export function firstTaskCardForRoute(route, model = {}) {
  const cards = uniqueTaskCards(model);
  if (route === "submit_work" || route === "review" || route === "stage_assessment") {
    return cards.find((card) => hasRouteCapability(card, route)) || null;
  }
  return null;
}
