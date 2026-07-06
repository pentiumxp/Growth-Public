import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { learningLoopReasonText } from "./LearningLoopStatePanel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function selectedPlanItem(planDraft = {}) {
  if (!planDraft || typeof planDraft !== "object") return {};
  const selectedItemId = clean(planDraft.selectedItemId);
  if (planDraft.selectedItem && clean(planDraft.selectedItem.itemId)) return planDraft.selectedItem;
  return asArray(planDraft.items).find((item) => clean(item.itemId) === selectedItemId) || asArray(planDraft.items)[0] || {};
}

export function operatingLoopRunBlockedReason({ state = {}, context = {} } = {}) {
  if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
  if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
  const data = state.learningLoopState?.data || context.learningLoopState || {};
  const nextAction = data.nextAction || {};
  const action = clean(nextAction.action);
  if (!action) return "还没有可执行的服务端 next action。";
  if (nextAction.enabled === false) return learningLoopReasonText(nextAction.reason);
  if (!["draft_daily_plan", "publish_selected_plan_item", "review_stage_assessment"].includes(action)) {
    return "当前 next action 需要在对应面板单独处理。";
  }
  return "";
}

export function dailyLoopDraftBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
  if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
  if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
  if (!readiness.targetEnabled || context.target?.enabled === false) return "请先在左侧选择凡凡，再生成卡片。";
  if (!readiness.workspaceProvisioned) return "学习者 workspace 尚未开通，暂不能规划卡片。";
  if (!readiness.learningGraphReady || !clean(plan.targetNodeId)) return "学习图谱目标尚未就绪，暂不能规划卡片。";
  if (!readiness.historySummaryReady) return "历史摘要尚未就绪，暂不能规划卡片。";
  if (!(readiness.plannerContextReady ?? true)) return "Planner context 尚未就绪，暂不能规划卡片。";
  if (!(readiness.plannerGatewayConfigured ?? readiness.gatewayConfigured)) return "Planner Gateway 尚未配置，暂不能规划卡片。";
  if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
  return "";
}

export function dailyLoopPublishBlockedReason({ state = {}, context = {}, readiness = {}, draftResult = {} } = {}) {
  const planDraft = draftResult.planDraft || {};
  if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
  if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
  if (!clean(planDraft.planDraftId)) return "请先规划下一张，再发布卡片。";
  if (!clean(planDraft.selectedItemId || selectedPlanItem(planDraft).itemId)) return "计划草稿没有可发布的计划项。";
  if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能发布卡片。";
  if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
  return "";
}

export function dailyLoopAdvanceBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
  const draftBlocked = dailyLoopDraftBlockedReason({ state, context, readiness, plan });
  if (draftBlocked) return draftBlocked;
  if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能生成卡片。";
  return "";
}

export function primaryGenerationBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
  const loopBlocked = operatingLoopRunBlockedReason({ state, context });
  if (loopBlocked) return loopBlocked;
  const data = state.learningLoopState?.data || context.learningLoopState || {};
  const action = clean(data.nextAction?.action);
  if (action === "draft_daily_plan") return dailyLoopAdvanceBlockedReason({ state, context, readiness, plan });
  if (action === "publish_selected_plan_item") {
    if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
    if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能生成卡片。";
    return "";
  }
  if (action === "review_stage_assessment") return "当前下一步是阶段测评，请使用闭环执行或阶段测评面板。";
  return "当前服务端 next action 不会直接生成日常卡。";
}

export function blockedAttributes(reason = "", escapeHtml = defaultEscapeHtml) {
  const value = clean(reason);
  return value ? `disabled data-card-generation-blocked-reason="${escapeHtml(value)}" aria-disabled="true"` : "";
}

export function cardGenerationActionPanel({
  state = {},
  plan = {},
  canAdvance = false,
  canDraft = false,
  canPublish = false,
  advanceClass = "",
  draftClass = "",
  publishClass = "",
  advanceBlockedAttrs = "",
  draftBlockedAttrs = "",
  publishBlockedAttrs = "",
  escapeHtml = defaultEscapeHtml
} = {}) {
  return `<section class="learning-card-generation-action-panel" data-card-generation-action-panel>
      <div class="learning-card-generation-action-head">
        <span>
          <strong>生成操作</strong>
          <small>先确认目标和画像，再生成/规划/发布。</small>
        </span>
        <em>${escapeHtml(canAdvance || canDraft || canPublish ? "可操作" : "待补齐")}</em>
      </div>
      <div class="learning-card-generation-field-list learning-card-generation-action-facts">
        <div><span><strong>图谱目标</strong><small>${escapeHtml(plan.title || plan.targetNodeId || "未选择")}</small></span><em>${escapeHtml(plan.domain || "english")}</em></div>
        <div><span><strong>完成规则</strong><small>提交一次，批改一次，反思最多一次，不设通过线</small></span><em>daily</em></div>
        <div><span><strong>证据要求</strong><small>${escapeHtml(asArray(plan.evidenceRequirements).join(" · ") || "short_answer")}</small></span><em>摘要</em></div>
      </div>
      <div class="learning-card-generation-actions">
        <button type="button" data-card-generation-refresh>刷新状态</button>
        <button type="button" class="${advanceClass}" data-card-generation-advance ${advanceBlockedAttrs} ${state.status === "advancing" ? "disabled" : ""}>${state.status === "advancing" ? "正在生成" : "生成卡片"}</button>
        <button type="button" class="${draftClass}" data-card-generation-draft ${draftBlockedAttrs} ${state.status === "drafting" ? "disabled" : ""}>${state.status === "drafting" ? "正在规划" : "规划下一张"}</button>
        <button type="button" class="${publishClass}" data-card-generation-publish ${publishBlockedAttrs} ${state.status === "publishing" ? "disabled" : ""}>${state.status === "publishing" ? "正在发布" : "发布为卡片"}</button>
      </div>
    </section>`;
}
