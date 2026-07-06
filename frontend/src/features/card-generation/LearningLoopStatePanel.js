import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { learningLoopActionText } from "./ProfilePanel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function learningLoopStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "failed") return "读取失败";
  if (value === "ready_to_draft") return "可起草";
  if (value === "ready_to_publish") return "可发布";
  if (value === "stage_checkpoint_ready") return "测评就绪";
  if (value === "stage_checkpoint_active") return "测评进行中";
  if (value === "audit_incomplete") return "补审计";
  if (value === "blocked") return "阻塞";
  if (value === "needs_owner_review") return "需检查";
  return value || "未读取";
}

export function learningLoopReasonText(reason = "") {
  const value = clean(reason);
  const map = {
    daily_plan_ready: "可以根据当前画像起草一张低压力日常卡。",
    validated_plan_ready: "已有验证过的计划项，可以由 Owner 明确发布。",
    stage_checkpoint_ready: "近期证据满足阶段测评检查条件。",
    stage_checkpoint_active: "已有正式阶段测评卡进行中，先完成这张卡再生成下一步。",
    cycle_audit_incomplete: "上一轮学习证据还没有补齐审计闭环。",
    target_not_enabled: "当前学习目标还未开通。",
    learning_graph_not_ready: "学习图谱目标尚未就绪。",
    planner_context_not_ready: "学习上下文还未就绪。",
    planner_gateway_not_ready: "Planner Gateway 尚未配置。",
    no_safe_automatic_action: "没有安全的自动下一步，需要 Owner 检查。"
  };
  if (value.startsWith("next_strategy:")) return `下一张策略：${value.slice("next_strategy:".length)}`;
  return map[value] || value || "状态来自 Growth learning-loop state，只包含 summary-only 证据。";
}

export function learningLoopStatePanel(state = {}, context = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.learningLoopState || {};
  const data = holder.data || context.learningLoopState || {};
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(data.status || holder.status);
  const nextAction = data.nextAction || {};
  const profile = data.profile || {};
  const audit = data.audit || {};
  const stage = data.stageAssessment || {};
  const summary = data.summary || {};
  const action = learningLoopActionText(nextAction.action);
  const activeStageTaskCardId = clean(stage.generatedTaskCardId || nextAction.taskCardId);
  const reason = failed
    ? clean(holder.error) || "learning_loop_state_unavailable"
    : loading
      ? "正在读取 daily-loop preview、画像、审计和阶段测评摘要。"
      : learningLoopReasonText(nextAction.reason);
  return `<section class="learning-card-generation-loop-state" data-learning-loop-state-panel data-learning-loop-state-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-loop-head">
        <span>
          <strong>学习闭环</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(learningLoopStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-loop-grid">
        <span><small>下一步</small><strong>${escapeHtml(action)}</strong></span>
        <span><small>弱点</small><strong>${escapeHtml(String(Number(summary.weaknessCount ?? profile.weaknessCount ?? 0) || 0))}</strong></span>
        <span><small>审计缺口</small><strong>${escapeHtml(String(asArray(summary.missingRequired || audit.missingRequired).length))}</strong></span>
        <span><small>阶段测评</small><strong>${escapeHtml(stage.eligible ? "可检查" : learningLoopStatusText(stage.status || "dormant"))}</strong></span>
      </div>
      ${clean(stage.status) === "active" && activeStageTaskCardId ? `<div class="learning-card-generation-loop-action">
        <span>阶段测评进行中</span>
        <button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(activeStageTaskCardId)}">打开阶段测评</button>
      </div>` : ""}
    </section>`;
}
