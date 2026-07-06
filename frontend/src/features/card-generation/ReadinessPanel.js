import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { provisioningReasonText, targetProvisionModeText } from "./TargetSelector.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function readinessRows(context = {}, escapeHtml = defaultEscapeHtml) {
  const readiness = context.readiness || {};
  const graph = context.graph || {};
  const provisioning = context.targetProvisioning || {};
  const targetMeta = provisioning.targetEnabled
    ? `${targetProvisionModeText(provisioning.mode)} · ${provisioning.selectedSubject || provisioning.selectedDomain || "默认目标"}`
    : provisioningReasonText(provisioning.error || "learning_target_not_provisioned");
  const rows = [
    ["学习目标", readiness.targetEnabled, targetMeta],
    ["学习图谱", readiness.learningGraphReady, `${Number(graph.nodeCount || 0)} 节点 / ${Number(graph.edgeCount || 0)} 关系`],
    ["历史摘要", readiness.historySummaryReady, "只读取卡片、评价、反思和掌握度摘要"],
    ["Planner context", readiness.plannerContextReady ?? readiness.learningGraphReady, "图谱、画像和近期信号摘要"],
    ["Planner Gateway", readiness.plannerGatewayConfigured ?? readiness.gatewayConfigured, "只通过 Gateway 起草学习计划"],
    ["Gateway authoring", readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured, "SSE / JSON 输出进入 draft 校验"],
    ["Gateway evaluation", readiness.evaluationGatewayConfigured, "批改 draft 先校验再写入画像"]
  ];
  return rows.map(([label, ok, meta]) => `<div class="learning-card-generation-readiness-row" data-ready="${ok ? "true" : "false"}">
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta)}</small></span>
      <em>${ok ? "通过" : "待处理"}</em>
    </div>`).join("");
}

export function recipeOptions(context = {}, escapeHtml = defaultEscapeHtml) {
  const selected = clean(context.selectedRecipeId || "daily_english_v1");
  return asArray(context.recipes).map((recipe) => {
    const id = clean(recipe.id);
    const active = id === selected;
    const duration = recipe.durationMinutes
      ? `${recipe.durationMinutes.min || 10}-${recipe.durationMinutes.max || 15} 分钟`
      : "10-15 分钟";
    return `<div class="learning-card-generation-recipe${active ? " active" : ""}" data-card-generation-recipe="${escapeHtml(id)}">
        <strong>${escapeHtml(recipe.label || id)}</strong>
        <small>${escapeHtml(`${duration} · 低压力`)}</small>
      </div>`;
  }).join("");
}

export function historyFacts(context = {}, escapeHtml = defaultEscapeHtml) {
  const learner = context.historySummary?.learnerSummary || {};
  const profile = context.learningProfile?.summary || {};
  const rows = [
    ["近期卡片", learner.recentCardCount],
    ["已完成", learner.completedRecentCardCount],
    ["画像点", profile.masteryStateCount ?? context.historySummary?.masteryStateCount],
    ["轨迹", profile.recentTrajectoryCount ?? context.historySummary?.recentTrajectoryCount]
  ];
  return rows.map(([label, value]) => `<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(Number(value || 0) || 0))}</strong></span>`).join("");
}
