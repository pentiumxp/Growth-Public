import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function automationClosedLoopActionText(key = "") {
  const value = clean(key);
  const map = {
    run_learning_loop_next: "执行学习闭环下一步",
    prepare_cycle_closure: "准备复核包",
    advance_review: "推进复核链",
    deliver_action_handoff: "投递 Handoff",
    collect_platform_action_evidence: "收集平台证据",
    complete_learner_cycle: "完成一张日常卡",
    refresh_closed_loop_context: "刷新闭环上下文"
  };
  return map[value] || value || "待读取";
}

export function automationClosedLoopStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "ready_for_next_learning_action") return "可生成";
  if (value === "ready_for_cycle_closure") return "可准备";
  if (value === "ready_for_review_advancement") return "可推进";
  if (value === "ready_for_action_handoff_delivery") return "可投递";
  if (value === "ready_for_platform_action_evidence") return "待证据";
  if (value === "learner_cycle_required") return "待完成";
  if (value === "blocked") return "已阻塞";
  if (value === "failed") return "失败";
  if (value === "ready") return "已读取";
  return value || "待读取";
}

export function automationClosedLoopActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  if (!status || status === "idle") return "";
  const result = holder.actionResult || {};
  const detail = status === "running"
    ? "正在执行 action-plan 指向的现有 Growth 服务动作。"
    : status === "executed"
      ? "下一步动作已完成，正在刷新闭环读数。"
      : clean(holder.actionError || result.error) || "闭环下一步执行失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-closed-loop-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(status === "running" ? "执行中" : status === "executed" ? "已执行" : status === "blocked" ? "已阻塞" : "失败")}</em>
    </div>`;
}

export function automationClosedLoopPhaseRows(phases = [], escapeHtml = defaultEscapeHtml) {
  const rows = asArray(phases).slice(0, 5);
  if (!rows.length) return `<div class="learning-card-generation-proposal-empty">暂无阶段读数。</div>`;
  return rows.map((phase = {}) => {
    const key = clean(phase.key);
    const status = clean(phase.status || (phase.ok ? "ready" : "missing"));
    const detail = clean(phase.error || phase.nextAction || phase.policyId || phase.digest?.digestId || phase.handoff?.handoffId || phase.selectorDiscoveryStatus || "summary-only");
    return `<div class="learning-card-generation-proposal-row" data-automation-closed-loop-phase="${escapeHtml(key)}" data-automation-closed-loop-phase-ok="${phase.ok === false ? "false" : "true"}">
        <span>
          <strong>${escapeHtml(phase.label || key || "阶段")}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(status)}</em>
      </div>`;
  }).join("");
}

export function automationClosedLoopActionPlanPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationClosedLoopActionPlan || {};
  const data = holder.data || {};
  const nextAction = data.nextAction || {};
  const summary = data.summary || {};
  const readiness = data.automationReadiness || {};
  const status = clean(holder.status || data.status || "idle");
  const actionKey = clean(nextAction.key || summary.nextAction);
  const busy = clean(holder.actionStatus) === "running";
  const supportedAction = ["run_learning_loop_next", "prepare_cycle_closure", "advance_review", "deliver_action_handoff"].includes(actionKey);
  const blockedReason = status === "loading"
    ? "正在读取闭环下一步。"
    : status === "failed"
      ? clean(holder.error) || "closed_loop_action_plan_failed"
      : !actionKey
        ? "还没有可执行的下一步。"
        : !supportedAction
          ? "当前下一步需要在对应面板或学习卡里完成。"
          : "";
  const canRun = Boolean(!busy && !blockedReason);
  const reason = status === "loading"
    ? "正在读取 operating loop、完成周期、digest、失败策略和 handoff。"
    : status === "failed"
      ? clean(holder.error) || "闭环计划读取失败。"
      : clean(nextAction.reason) || "由 Growth 服务返回一个 Owner 可执行的下一步。";
  return `<section class="learning-card-generation-proposals learning-card-generation-closed-loop-plan" data-automation-closed-loop-action-plan-panel data-automation-closed-loop-action-plan-status="${escapeHtml(status)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环下一步</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-closed-loop-action-plan-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新计划"}</button>
          <button type="button" class="primary${canRun ? "" : " disabled"}" data-automation-closed-loop-action-run data-automation-closed-loop-action-key="${escapeHtml(actionKey)}" ${canRun ? "" : `aria-disabled="true" data-automation-closed-loop-blocked-reason="${escapeHtml(blockedReason)}"`}>${busy ? "执行中" : escapeHtml(automationClosedLoopActionText(actionKey))}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>下一步</small><strong>${escapeHtml(automationClosedLoopActionText(actionKey))}</strong></span>
        <span><small>状态</small><strong>${escapeHtml(automationClosedLoopStatusText(status))}</strong></span>
        <span><small>完成周期</small><strong>${readiness.completedCycleReady ? "就绪" : "待完成"}</strong></span>
        <span><small>Digest</small><strong>${readiness.digestPresent ? (readiness.digestReviewed ? "已复核" : "待复核") : "暂无"}</strong></span>
        <span><small>失败策略</small><strong>${readiness.failurePolicyReady ? "就绪" : "待确认"}</strong></span>
        <span><small>Handoff</small><strong>${readiness.handoffPresent ? (readiness.handoffDelivered ? "已投递" : "待投递") : "暂无"}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationClosedLoopPhaseRows(data.phases, escapeHtml)}
      </div>
      ${automationClosedLoopActionStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationCycleClosureStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "submitting") return "准备中";
  if (value === "prepared") return "已准备";
  if (value === "proposal_ready") return "建议已准备";
  if (value === "digest_pending" || value === "pending") return "Digest 待复核";
  if (value === "reviewed") return "已复核";
  if (value === "delivered") return "已投递";
  if (value === "blocked") return "已阻塞";
  if (value === "failed") return "失败";
  return value || "待准备";
}

export function automationCycleClosureStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const summary = result.summary || {};
  if (!status || status === "idle") return "";
  const detail = status === "prepared"
    ? `复核包已准备：${clean(summary.proposalId) || "proposal"} / ${clean(summary.digestId) || "digest"}。`
    : status === "submitting"
      ? "正在从完成周期准备 proposal 和 digest。"
      : error || clean(result.error) || "闭环复核包准备失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-cycle-closure-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationCycleClosureStatusText(status))}</em>
    </div>`;
}

export function automationCycleClosurePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationCycleClosure || {};
  const result = holder.actionResult || {};
  const summary = result.summary || {};
  const stages = asArray(result.stages);
  const selectedCycle = result.selectedCycle || state.cycleHistory?.selectedCycle || {};
  const selectedCycleId = clean(summary.selectedCycleId || selectedCycle.cycleId || selectedCycle.cycle_id);
  const proposalId = clean(summary.proposalId || result.proposal?.proposalId || result.proposal?.proposal_id);
  const digestId = clean(summary.digestId || result.digest?.digestId || result.digest?.digest_id);
  const busy = clean(holder.actionStatus) === "submitting";
  const status = clean(holder.actionStatus || result.status || "idle");
  const failedStages = stages.filter((stage = {}) => stage.ok === false).map((stage = {}) => clean(stage.name)).filter(Boolean);
  const detail = clean(holder.actionError)
    || clean(result.error)
    || (proposalId || digestId
      ? "已把完成周期转成 Owner 可复核的下一张建议和 dry-run digest。"
      : "默认自动选择最新完成周期；只准备复核包，不发布卡片、不启动 scheduler。");
  return `<section class="learning-card-generation-proposals learning-card-generation-cycle-closure" data-automation-cycle-closure-panel data-automation-cycle-closure-status="${escapeHtml(status)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环复核包</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="primary${busy ? " disabled" : ""}" data-automation-cycle-closure-prepare ${busy ? "disabled" : ""}>${busy ? "准备中" : "准备复核包"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>完成周期</small><strong>${escapeHtml(selectedCycleId || "auto")}</strong></span>
        <span><small>Proposal</small><strong>${escapeHtml(proposalId || "待生成")}</strong></span>
        <span><small>Digest</small><strong>${escapeHtml(digestId || "待生成")}</strong></span>
      </div>
      ${failedStages.length ? `<div class="learning-card-generation-proposal-empty">阻塞阶段：${escapeHtml(failedStages.join(" · "))}</div>` : ""}
      ${automationCycleClosureStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationReviewAdvancementStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "submitting") return "推进中";
  if (value === "advanced") return "已推进";
  if (value === "reviewed") return "已复核";
  if (value === "handoff_ready" || value === "pending_delivery" || value === "not_delivered") return "Handoff 就绪";
  if (value === "execution_blocked" || value === "blocked") return "已阻塞";
  if (value === "published") return "已发布";
  if (value === "failed") return "失败";
  return value || "待推进";
}

export function automationReviewAdvancementStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const summary = result.summary || {};
  if (!status || status === "idle") return "";
  const detail = status === "advanced"
    ? `复核链已推进：${clean(summary.digestId) || "digest"} / ${clean(summary.handoffId) || "handoff"}。`
    : status === "submitting"
      ? "正在复核 digest、校验失败策略并创建 handoff。"
      : error || clean(result.error) || "复核链推进失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-review-advancement-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationReviewAdvancementStatusText(status))}</em>
    </div>`;
}

export function automationReviewAdvancementPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationReviewAdvancement || {};
  const result = holder.actionResult || {};
  const summary = result.summary || {};
  const stages = asArray(result.stages);
  const busy = clean(holder.actionStatus) === "submitting";
  const status = clean(holder.actionStatus || result.status || "idle");
  const digestId = clean(summary.digestId || result.digest?.digestId || result.digest?.digest_id);
  const policyId = clean(summary.policyId || result.failurePolicy?.policyId || result.failurePolicy?.policy_id);
  const handoffId = clean(summary.handoffId || result.handoff?.handoffId || result.handoff?.handoff_id);
  const failedStages = stages.filter((stage = {}) => stage.ok === false).map((stage = {}) => clean(stage.name)).filter(Boolean);
  const detail = clean(holder.actionError)
    || clean(result.error)
    || (handoffId
      ? "已完成 Owner 复核链，等待后续显式投递或执行。"
      : "复核 digest，补齐失败策略并创建 handoff；默认不投递、不执行。");
  return `<section class="learning-card-generation-proposals learning-card-generation-review-advancement" data-automation-review-advancement-panel data-automation-review-advancement-status="${escapeHtml(status)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>复核链推进</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="primary${busy ? " disabled" : ""}" data-automation-review-advancement-advance ${busy ? "disabled" : ""}>${busy ? "推进中" : "推进复核链"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>Digest</small><strong>${escapeHtml(digestId || "auto")}</strong></span>
        <span><small>失败策略</small><strong>${escapeHtml(policyId || "待确认")}</strong></span>
        <span><small>Handoff</small><strong>${escapeHtml(handoffId || "待创建")}</strong></span>
      </div>
      ${failedStages.length ? `<div class="learning-card-generation-proposal-empty">阻塞阶段：${escapeHtml(failedStages.join(" · "))}</div>` : ""}
      ${automationReviewAdvancementStatusPanel(holder, escapeHtml)}
    </section>`;
}

export {
  automationActionHandoffActionStatusPanel,
  automationActionHandoffDigestRows,
  automationActionHandoffPanel,
  automationActionHandoffRows,
  automationActionHandoffStatusText,
  automationDigestActionStatusPanel,
  automationDigestPanel,
  automationDigestRows,
  automationDigestStatusText,
  automationFailurePolicyActionStatusPanel,
  automationFailurePolicyPanel,
  automationFailurePolicyRows,
  automationFailurePolicyStatusText,
  automationProposalPanel,
  automationProposalRows,
  automationProposalScopeFromContext,
  automationProposalStatusPanel,
  automationProposalStatusText,
  createAutomationProposalCreatePayload
} from "./AutomationReviewPanels.js";

export {
  automationSchedulerExecutionActionFromHandoff,
  automationSchedulerExecutionActionStatusPanel,
  automationSchedulerExecutionHandoffRows,
  automationSchedulerExecutionPanel,
  automationSchedulerExecutionRows,
  automationSchedulerExecutionStatusText,
  automationSchedulerRunActionStatusPanel,
  automationSchedulerRunPanel,
  automationSchedulerRunRows,
  automationSchedulerRunStatusText,
  automationSchedulerWorkerTargetActionStatusPanel,
  automationSchedulerWorkerTargetPanel,
  automationSchedulerWorkerTargetRows,
  automationSchedulerWorkerTargetStatusText
} from "./AutomationSchedulerPanels.js";
