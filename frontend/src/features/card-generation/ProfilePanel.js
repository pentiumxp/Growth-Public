import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstCleanValue(...values) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function firstCleanArray(...values) {
  for (const value of values) {
    const cleaned = asArray(value).map(clean).filter(Boolean);
    if (cleaned.length) return Array.from(new Set(cleaned)).slice(0, 12);
  }
  return [];
}

export function cycleSelectionPayload(cycle = {}) {
  const selectors = cycle.selectors || {};
  const targetNodeIds = firstCleanArray(
    selectors.targetNodeIds,
    cycle.targetNodeIds,
    cycle.nodeIds
  );
  return {
    plan_draft_id: firstCleanValue(selectors.planDraftId, cycle.planDraftId),
    task_card_id: firstCleanValue(selectors.taskCardId, cycle.taskCardId),
    evaluation_id: firstCleanValue(selectors.evaluationId, cycle.evaluationId),
    profile_delta_id: firstCleanValue(selectors.profileDeltaId, cycle.profileDeltaId),
    evidence_id: firstCleanValue(selectors.evidenceId, cycle.evidenceId),
    correction_id: firstCleanValue(selectors.correctionId, cycle.correctionId),
    source_id: firstCleanValue(selectors.sourceId, cycle.sourceId, selectors.evaluationId, cycle.evaluationId),
    target_node_ids: targetNodeIds
  };
}

export function learningLoopActionText(action = "") {
  const value = clean(action).toLowerCase();
  if (value === "draft_daily_plan") return "起草日常计划";
  if (value === "publish_selected_plan_item") return "发布已选计划";
  if (value === "review_stage_assessment") return "检查阶段测评";
  if (value === "complete_active_stage_assessment") return "完成阶段测评";
  if (value === "complete_cycle_audit") return "补齐审计";
  if (value === "provision_learning_target") return "开通学习目标";
  if (value === "import_or_select_learning_graph") return "选择学习图谱";
  if (value === "configure_planner_gateway") return "配置 Planner";
  if (value === "refresh_learning_context") return "刷新学习上下文";
  if (value === "owner_review") return "Owner 检查";
  return value || "等待状态";
}

export function profileItemRows(items = [], emptyText = "暂无记录", escapeHtml = defaultEscapeHtml) {
  const rows = asArray(items).slice(0, 3);
  if (!rows.length) return `<div class="learning-card-generation-profile-empty">${escapeHtml(emptyText)}</div>`;
  return rows.map((item) => {
    const label = clean(item.nodeId || item.targetNodeId || item.strategy || item.signalType || "记录");
    const meta = clean(item.summary || item.performanceSummary || item.reason || item.status || "");
    const score = Number(item.score || 0) || 0;
    const badge = clean(item.signalType || item.strategy || item.status || (score ? `${score}` : ""));
    return `<div class="learning-card-generation-profile-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(meta || "summary-only")}</small>
        </span>
        <em>${escapeHtml(badge || "摘要")}</em>
      </div>`;
  }).join("");
}

export function recommendationSourceText(recommendation = {}) {
  const recommendationMode = clean(recommendation.recommendationMode);
  const selectionMode = clean(recommendation.selectionMode);
  if (recommendationMode === "trajectory") return "评价轨迹";
  if (recommendationMode === "profile_strategy") return "画像策略";
  if (selectionMode === "recommendation") return "推荐";
  if (selectionMode === "strategy") return "画像策略";
  if (selectionMode === "graph_suggestion") return "图谱建议";
  if (selectionMode === "explicit") return "Owner 指定";
  return "策略";
}

export function recommendationLifecycleStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "accepted") return "已生成";
  if (value === "superseded") return "已替换";
  if (value === "skipped") return "已跳过";
  if (value === "expired") return "已过期";
  if (value === "pending") return "待生成";
  return value || "记录";
}

export function recommendationLifecycleActionStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "submitting") return "记录中";
  if (value === "reviewed") return "已记录";
  if (value === "failed") return "失败";
  return value || "待操作";
}

export function recommendationLifecycleActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const recommendation = result.recommendation || {};
  if (!status || status === "idle") return "";
  const detail = status === "reviewed"
    ? `推荐已记录为 ${recommendationLifecycleStatusText(recommendation.status)}。`
    : status === "submitting"
      ? "正在通过 Growth recommendation lifecycle service 写入。"
      : error || "推荐状态写入失败。";
  return `<div class="learning-card-generation-lifecycle-status" data-recommendation-lifecycle-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(recommendationLifecycleActionStatusText(status))}</em>
    </div>`;
}

export function recommendationLifecyclePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const rows = asArray(context.recommendationLifecycle).slice(0, 4);
  const holder = state.recommendationLifecycle || {};
  const busy = holder.actionStatus === "submitting";
  if (!rows.length) {
    return `<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
        <div class="learning-card-generation-lifecycle-head">
          <span>
            <strong>推荐闭环</strong>
            <small>等待生成和评价后形成记录</small>
          </span>
          <em>暂无</em>
        </div>
      </div>`;
  }
  const renderedRows = rows.map((item) => {
    const targets = asArray(item.targetNodeIds).map(clean).filter(Boolean);
    const label = clean(targets[0] || item.strategy || item.trajectoryId || item.sourceTaskCardId || item.taskCardId || "推荐");
    const status = clean(item.status);
    const canReview = status === "pending";
    const trajectoryId = clean(item.trajectoryId || item.id);
    const sourceTaskCardId = clean(item.sourceTaskCardId || item.taskCardId || item.source_task_card_id || item.task_card_id);
    const sourceEvaluationId = clean(item.sourceEvaluationId || item.evaluationId || item.source_evaluation_id || item.evaluation_id);
    const resultId = clean(item.generatedTaskCardId || item.supersededByTrajectoryId || item.sourceEvaluationId || item.sourceTaskCardId || item.taskCardId);
    const detail = clean(item.reason) || resultId || "summary-only";
    const meta = [
      clean(item.strategy),
      resultId
    ].filter(Boolean).join(" · ");
    return `<div class="learning-card-generation-lifecycle-row" data-recommendation-lifecycle-status="${escapeHtml(status)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(recommendationLifecycleStatusText(status))}</em>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        ${canReview ? `<div class="learning-card-generation-lifecycle-actions">
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${escapeHtml(trajectoryId)}"
            data-recommendation-lifecycle-source-task-card-id="${escapeHtml(sourceTaskCardId)}"
            data-recommendation-lifecycle-source-evaluation-id="${escapeHtml(sourceEvaluationId)}"
            data-recommendation-lifecycle-status="skipped"
            ${busy ? "disabled" : ""}>${busy ? "记录中" : "跳过"}</button>
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${escapeHtml(trajectoryId)}"
            data-recommendation-lifecycle-source-task-card-id="${escapeHtml(sourceTaskCardId)}"
            data-recommendation-lifecycle-source-evaluation-id="${escapeHtml(sourceEvaluationId)}"
            data-recommendation-lifecycle-status="expired"
            ${busy ? "disabled" : ""}>过期</button>
        </div>` : ""}
      </div>`;
  }).join("");
  return `<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
      <div class="learning-card-generation-lifecycle-head">
        <span>
          <strong>推荐闭环</strong>
          <small>待生成 / 已生成 / 已替换 摘要</small>
        </span>
        <em>${escapeHtml(String(rows.length))}</em>
      </div>
      ${renderedRows}
      ${recommendationLifecycleActionStatusPanel(holder, escapeHtml)}
    </div>`;
}

export function nextCardRecommendationPanel(context = {}, fallbackStrategy = {}, escapeHtml = defaultEscapeHtml) {
  const recommendation = context.nextCardRecommendation || {};
  const strategy = recommendation.ok !== false && clean(recommendation.strategy)
    ? recommendation
    : fallbackStrategy || {};
  const targetNodeIds = asArray(recommendation.targetNodeIds).length
    ? asArray(recommendation.targetNodeIds)
    : asArray(strategy.targetNodeIds);
  const targetLabel = clean(recommendation.targetNodeId || targetNodeIds[0] || context.suggestedPlan?.targetNodeId || "未选择");
  const strategyLabel = clean(strategy.strategy || "stabilize");
  const role = clean(strategy.cardRole || context.suggestedPlan?.cardRole || "practice");
  const difficulty = clean(strategy.difficultyBand || context.suggestedPlan?.difficultyBand || "foundation");
  const reason = clean(strategy.reason || context.suggestedPlan?.strategyReason)
    || "根据当前图谱目标生成一张日常英语练习卡。";
  return `<div class="learning-card-generation-recommendation" data-card-generation-recommendation data-recommendation-mode="${escapeHtml(clean(recommendation.recommendationMode || recommendation.selectionMode || ""))}">
      <div class="learning-card-generation-recommendation-head">
        <span>
          <strong>下一张建议</strong>
          <small>${escapeHtml(recommendationSourceText(recommendation))}</small>
        </span>
        <em>${escapeHtml(strategyLabel)}</em>
      </div>
      <div class="learning-card-generation-recommendation-grid">
        <span><small>目标</small><strong>${escapeHtml(targetLabel)}</strong></span>
        <span><small>角色</small><strong>${escapeHtml(role)}</strong></span>
        <span><small>难度</small><strong>${escapeHtml(difficulty)}</strong></span>
      </div>
      <p>${escapeHtml(reason)}</p>
    </div>`;
}

export function learningProfilePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const profile = context.learningProfile || {};
  const strategy = profile.nextCardStrategy || context.nextCardStrategy || {};
  const summary = profile.summary || {};
  const profileReady = profile.ok !== false && profile.available !== false;
  return `<section class="learning-card-generation-profile" data-card-generation-profile>
      <div class="learning-card-generation-profile-head">
        <span>
          <strong>学习画像</strong>
          <small>${profileReady ? "掌握度、信号和轨迹摘要" : "等待评价后形成画像"}</small>
        </span>
        <em>${escapeHtml(clean(strategy.strategy) || "stabilize")}</em>
      </div>
      <div class="learning-card-generation-profile-metrics">
        <span><small>弱点</small><strong>${escapeHtml(String(Number(summary.weaknessCount || 0) || 0))}</strong></span>
        <span><small>强项</small><strong>${escapeHtml(String(Number(summary.strengthCount || 0) || 0))}</strong></span>
        <span><small>信号</small><strong>${escapeHtml(String(Number(summary.recentExperienceSignalCount || 0) || 0))}</strong></span>
      </div>
      <div class="learning-card-generation-profile-columns">
        <div>
          <b>需要加强</b>
          ${profileItemRows(profile.weaknesses, "暂无明显弱点", escapeHtml)}
        </div>
        <div>
          <b>近期轨迹</b>
          ${profileItemRows(profile.recentTrajectory, "暂无轨迹", escapeHtml)}
        </div>
      </div>
      ${recommendationLifecyclePanel(context, state, escapeHtml)}
      ${nextCardRecommendationPanel(context, strategy, escapeHtml)}
    </section>`;
}

export function profileFeedbackStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "failed") return "读取失败";
  if (value === "pass" || value === "ready" || value === "ready_for_next_plan") return "可进入下一轮";
  if (value === "blocked") return "待补齐";
  if (value === "missing") return "无完成周期";
  return value || "待读取";
}

export function profileFeedbackNextActionText(action = "") {
  const value = clean(action).toLowerCase();
  if (value === "draft_daily_plan") return "起草下一张";
  if (value === "owner_review") return "Owner 审核";
  if (value === "produce_completed_daily_cycle") return "完成一轮练习";
  if (value === "complete_cycle_audit") return "补齐审计";
  return learningLoopActionText(value);
}

export function profileFeedbackSummaryRows(data = {}, escapeHtml = defaultEscapeHtml) {
  const summary = data.summary || {};
  const evidence = data.evidence || {};
  const profile = data.profile || {};
  const profileDelta = data.profileDelta || {};
  const recommendation = data.recommendation || {};
  const loopState = data.loopState || {};
  const reward = loopState.reward || {};
  const ownerReview = data.ownerReviewSignal || data.ownerReview || {};
  const rows = [
    {
      key: "evidence",
      title: "证据",
      detail: `${Number(summary.evidenceCount ?? evidence.count ?? 0) || 0} 条 summary-only evidence`,
      meta: asArray(summary.evidenceSourceTypes || evidence.sourceTypes).slice(0, 3).join(" · ") || "daily"
    },
    {
      key: "profile_delta",
      title: "画像变化",
      detail: `${Number(summary.profileDeltaCount ?? profileDelta.count ?? 0) || 0} 条 delta`,
      meta: clean(summary.latestProfileDeltaId || profileDelta.latestProfileDeltaId || "profile")
    },
    {
      key: "reward",
      title: "成长币",
      detail: `${Number(summary.totalRewardCoins ?? reward.totalRewardCoins ?? 0) || 0} coins`,
      meta: `${Number(summary.rewardSettlementCount ?? reward.rewardSettlementCount ?? 0) || 0} settlements`
    },
    {
      key: "recommendation",
      title: "下一推荐",
      detail: profileFeedbackNextActionText(summary.nextAction || loopState.nextAction?.action),
      meta: clean(summary.recommendationStrategy || recommendation.strategy || recommendation.targetNodeId || "strategy")
    },
    {
      key: "owner_review",
      title: "Owner 审核",
      detail: clean(ownerReview.latestDecision || ownerReview.summary?.latestDecision || ownerReview.status || "未审核"),
      meta: `${Number(ownerReview.reviewCount || ownerReview.summary?.reviewCount || 0) || 0} reviews`
    },
    {
      key: "profile",
      title: "画像状态",
      detail: `${Number(summary.profileEvidenceCount ?? profile.evidenceCount ?? 0) || 0} evidence`,
      meta: `${Number(summary.profileWeaknessCount ?? profile.weaknessCount ?? 0) || 0} weak`
    }
  ];
  return rows.map((row) => `<div class="learning-card-generation-profile-feedback-row" data-profile-feedback-row="${escapeHtml(row.key)}">
      <span>
        <strong>${escapeHtml(row.title)}</strong>
        <small>${escapeHtml(row.detail)}</small>
      </span>
      <em>${escapeHtml(row.meta)}</em>
    </div>`).join("");
}

export function profileFeedbackPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.profileFeedback || {};
  const data = holder.data || context.profileFeedback || {};
  const summary = data.summary || {};
  const status = holder.status === "loading"
    ? "loading"
    : holder.status === "failed"
      ? "failed"
      : clean(data.status || holder.status || "idle");
  const loading = status === "loading";
  const failed = status === "failed" || data.ok === false;
  const missingRequired = asArray(summary.missingRequired || data.missingRequired);
  const selectedCycle = state.cycleHistory?.selectedCycle || {};
  const selected = cycleSelectionPayload(selectedCycle);
  const selectedLabel = firstCleanValue(
    selected.task_card_id,
    selected.evaluation_id,
    selected.profile_delta_id,
    data.selectedCycle?.cycleId,
    data.target?.taskCardId
  );
  const detail = failed
    ? clean(holder.error || data.error || "profile_feedback_unavailable")
    : loading
      ? "正在读取完成周期的证据、画像变化、奖励和下一推荐。"
      : data.ok
        ? "本轮练习反馈来自 Growth profile-feedback service。"
        : "选择一个已完成周期，或让服务只读选择最新 completed cycle。";
  const ready = Boolean(summary.readyForNextPlan || data.readyForNextPlan);
  return `<section class="learning-card-generation-profile-feedback" data-profile-feedback-panel data-profile-feedback-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-profile-feedback-head">
        <span>
          <strong>画像反馈</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(profileFeedbackStatusText(failed ? "failed" : ready ? "pass" : status))}</em>
      </div>
      <div class="learning-card-generation-profile-feedback-grid">
        <span><small>完成周期</small><strong>${escapeHtml(selectedLabel || clean(data.selectedCycle?.cycleId) || "自动选择")}</strong></span>
        <span><small>证据</small><strong>${escapeHtml(String(Number(summary.evidenceCount || 0) || 0))}</strong></span>
        <span><small>画像变化</small><strong>${escapeHtml(String(Number(summary.profileDeltaCount || 0) || 0))}</strong></span>
        <span><small>下一步</small><strong>${escapeHtml(profileFeedbackNextActionText(summary.nextAction || data.loopState?.nextAction?.action))}</strong></span>
      </div>
      <div class="learning-card-generation-profile-feedback-actions">
        <span>${escapeHtml(missingRequired.length ? `待补齐：${missingRequired.slice(0, 4).join(" · ")}` : ready ? "已具备进入下一轮计划的 summary-only 证据。" : "还没有完成周期反馈。")}</span>
        <button type="button" data-profile-feedback-refresh ${loading ? "disabled" : ""}>${loading ? "读取中" : "刷新反馈"}</button>
      </div>
      <div class="learning-card-generation-profile-feedback-list">
        ${profileFeedbackSummaryRows(data, escapeHtml)}
      </div>
    </section>`;
}
