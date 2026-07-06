import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function stageAssessmentStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "checking") return "检查中";
  if (value === "activating") return "生成中";
  if (value === "eligible") return "可激活";
  if (value === "active") return "已激活";
  if (value === "cooldown") return "冷却中";
  if (value === "dormant") return "暂不建议";
  if (value === "failed") return "失败";
  return "未检查";
}

export function stageAssessmentReasonText(result = {}) {
  const reason = clean(result.reason || result.activationReason || result.cycle?.activationReason || result.error);
  const map = {
    enough_recent_practice: "近期练习证据足够，可以生成一次阶段测评。",
    challenge_ready: "学习者信号显示可以尝试挑战。",
    recent_high_pressure_signal: "近期有压力信号，先降低难度或修补前置点。",
    insufficient_recent_practice: "近期普通卡证据不足，建议先继续日常练习。",
    stage_assessment_cooldown_active: "同一能力簇仍在冷却期。",
    stage_assessment_recently_completed: "近期已完成正式测评，暂不需要重复。"
  };
  return map[reason] || reason || "先检查近期轨迹和掌握度摘要。";
}

export function stageAssessmentControlsReasonText(reason = "") {
  const value = clean(reason);
  const map = {
    stage_assessment_not_eligible: "当前还不适合生成正式测评，先继续日常练习。",
    stage_assessment_cooldown_active: "同一能力簇仍在冷却期。",
    stage_assessment_already_active: "已经有一张阶段测评在进行中。",
    insufficient_recent_practice: "近期普通卡证据不足，建议先继续日常练习。",
    recent_high_pressure_signal: "近期有压力信号，先保持低压力练习。",
    controls_not_loaded: "先读取阶段测评控制状态。",
    gateway_not_ready: "Gateway 尚未准备好，暂不能生成正式测评。",
    target_not_ready: "学习目标、图谱或历史摘要尚未就绪。"
  };
  return map[value] || value || "阶段测评由 controls read model 决定是否开放。";
}

export function stageAssessmentAction(controls = {}, key = "") {
  return asArray(controls.actions).find((action) => clean(action.key) === key) || null;
}

export function stageAssessmentRubricPolicy({ controls = {}, context = {}, generated = {} } = {}) {
  const policy = controls.rubricPolicy
    || context.stageCheckpointRubricPolicy
    || generated.rubricPolicy
    || generated.draft?.rubricPolicy
    || generated.published?.rubricPolicy
    || null;
  if (policy && typeof policy === "object") return policy;
  const catalog = asArray(context.rubricCatalog);
  return catalog.find((item) => clean(item.cardRole) === "stage_assessment") || null;
}

export function stageAssessmentRubricPanel(policy = null, escapeHtml = defaultEscapeHtml) {
  if (!policy || typeof policy !== "object") return "";
  const policyId = clean(policy.policyId);
  const dimensions = asArray(policy.rubricDimensions).length
    ? asArray(policy.rubricDimensions)
    : asArray(policy.dimensionIds).map((dimensionId) => ({ dimensionId, label: dimensionId }));
  const evidenceKeys = asArray(policy.evidenceKeys).length
    ? asArray(policy.evidenceKeys).map(clean).filter(Boolean)
    : asArray(policy.evidenceMapping).map((item) => clean(item.evidenceKey)).filter(Boolean);
  const assessment = policy.assessmentPolicy || {};
  const duration = assessment.expectedDurationMinutes || {};
  const durationText = Number(duration.min || 0) && Number(duration.max || 0)
    ? `${Number(duration.min)}-${Number(duration.max)} 分钟`
    : "25-30 分钟";
  const dimensionRows = dimensions.slice(0, 4).map((dimension) => {
    const dimensionId = clean(dimension.dimensionId || dimension);
    return `<span>
        <strong>${escapeHtml(clean(dimension.label) || dimensionId)}</strong>
        <small>${escapeHtml(dimensionId)}</small>
      </span>`;
  }).join("");
  return `<div class="learning-card-generation-stage-rubric" data-stage-assessment-rubric data-stage-assessment-rubric-policy-id="${escapeHtml(policyId)}">
      <div class="learning-card-generation-stage-rubric-head">
        <span>
          <strong>测评规则</strong>
          <small>${escapeHtml(policyId || "formal_assessment")}</small>
        </span>
        <em>${escapeHtml(clean(assessment.completionPolicy) || "formal_assessment")}</em>
      </div>
      <div class="learning-card-generation-stage-rubric-grid">
        <span><small>批改</small><strong>${escapeHtml(String(Number(assessment.evaluationAttempts || 1) || 1))} 次</strong></span>
        <span><small>反思</small><strong>${escapeHtml(String(Number(assessment.reflectionAttempts || 1) || 1))} 次</strong></span>
        <span><small>时长</small><strong>${escapeHtml(durationText)}</strong></span>
      </div>
      <div class="learning-card-generation-stage-rubric-dimensions">
        ${dimensionRows || `<span><strong>维度待读取</strong><small>summary-only</small></span>`}
      </div>
      ${evidenceKeys.length ? `<div class="learning-card-generation-stage-rubric-evidence">证据：${escapeHtml(evidenceKeys.slice(0, 6).join(" · "))}</div>` : ""}
    </div>`;
}

export function stageAssessmentPanel({ context = {}, state = {}, readiness = {}, plan = {}, escapeHtml = defaultEscapeHtml } = {}) {
  const stage = state.stageAssessment || {};
  const controls = stage.controls || context.stageCheckpointControls || {};
  const generated = state.generatedResult || state.dailyLoopPublishResult?.generation || {};
  const controlsSummary = controls.summary || {};
  const controlsReadiness = controls.readiness || {};
  const controlsEvidence = controlsReadiness.evidence || {};
  const activateAction = stageAssessmentAction(controls, "activate_stage_assessment");
  const result = stage.result || stage.eligibility || {};
  const reasonResult = (controlsReadiness.reason || controls.error)
    ? controlsReadiness
    : (result.reason || result.activationReason || result.cycle?.activationReason || result.error)
      ? result
      : stage.eligibility || result;
  const busy = stage.status === "checking" || stage.status === "activating";
  const controlsLoading = stage.controlsStatus === "loading";
  const controlsFailed = stage.controlsStatus === "failed" || controls.ok === false;
  const status = clean(controlsSummary.status || controlsReadiness.activationState || result.activationState || result.cycle?.status || stage.status);
  const readyForControls = Boolean(
    readiness.targetEnabled
    && readiness.workspaceProvisioned
    && readiness.learningGraphReady
    && readiness.historySummaryReady
    && clean(plan.targetNodeId)
  );
  const activationReady = Boolean(controls.ok === true && activateAction?.enabled === true);
  const canActivate = Boolean(activationReady && readiness.gatewayConfigured);
  const activationBlockedReason = clean(
    activateAction?.disabledReason
    || (!readyForControls ? "target_not_ready" : "")
    || (readiness.gatewayConfigured ? "" : "gateway_not_ready")
    || (!controls.ok ? "controls_not_loaded" : "")
  );
  const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
  const cooldownUntil = clean(controlsReadiness.cooldownUntil || result.cooldownUntil || result.cycle?.cooldownUntil);
  const publishedTaskCardId = clean(stage.result?.published?.taskCardId);
  const rubricPolicy = stageAssessmentRubricPolicy({ controls, context, generated });
  return `<section class="learning-card-generation-stage-assessment" data-stage-assessment-panel data-stage-assessment-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-stage-head">
        <span>
          <strong>阶段测评</strong>
          <small>${escapeHtml(stageAssessmentReasonText(reasonResult))}</small>
        </span>
        <em>${escapeHtml(stageAssessmentStatusText(status || stage.status))}</em>
      </div>
      <div class="learning-card-generation-stage-grid">
        <span><small>覆盖节点</small><strong>${escapeHtml(String(coverage.length || 0))}</strong></span>
        <span><small>近期轨迹</small><strong>${escapeHtml(String(Number(controlsSummary.recentTrajectoryCount ?? controlsEvidence.recentTrajectoryCount ?? 0) || 0))}</strong></span>
        <span><small>压力信号</small><strong>${escapeHtml(String(Number(controlsSummary.highPressureSignalCount ?? controlsEvidence.highPressureSignalCount ?? 0) || 0))}</strong></span>
      </div>
      ${cooldownUntil ? `<div class="learning-card-generation-stage-note">冷却至 ${escapeHtml(cooldownUntil.slice(0, 10))}</div>` : ""}
      ${stageAssessmentRubricPanel(rubricPolicy, escapeHtml)}
      <div class="learning-card-generation-stage-controls" data-stage-checkpoint-controls-status="${escapeHtml(stage.controlsStatus || (controls.ok ? "ready" : "idle"))}" data-stage-checkpoint-activate-enabled="${canActivate ? "true" : "false"}">
        <span>${escapeHtml(controlsLoading ? "正在读取 controls read model。" : controlsFailed ? (stage.controlsError || controls.error || "controls 读取失败。") : canActivate ? "Owner 可以显式生成一次正式阶段测评。" : stageAssessmentControlsReasonText(activationBlockedReason || controlsReadiness.reason))}</span>
        <em>${escapeHtml(controls.ok ? "controls" : controlsLoading ? "读取中" : "待检查")}</em>
      </div>
      ${stage.error ? `<div class="learning-error" data-stage-assessment-error>${escapeHtml(stage.error)}</div>` : ""}
      <div class="learning-card-generation-stage-actions">
        <button type="button" data-stage-assessment-check ${busy || controlsLoading || !readyForControls ? "disabled" : ""}>${controlsLoading ? "检查中" : "检查条件"}</button>
        <button type="button" class="primary" data-stage-assessment-activate ${busy || !canActivate ? "disabled" : ""} data-stage-assessment-blocked-reason="${escapeHtml(canActivate ? "" : stageAssessmentControlsReasonText(activationBlockedReason || controlsReadiness.reason))}">${busy ? "生成中" : "生成阶段测评"}</button>
      </div>
      ${publishedTaskCardId ? `<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(publishedTaskCardId)}">打开阶段测评</button>` : ""}
    </section>`;
}
