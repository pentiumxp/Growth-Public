import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { selectedProvisionDraft } from "./generationModel.js";
import { cycleSelectionPayload } from "./ProfilePanel.js";

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

function graphOptionsForContext(context = {}) {
  const provisioning = context.targetProvisioning || {};
  return provisioning.graphOptions || context.graphOptions || {};
}

export function ownerAuditItems(ownerAudit = {}, key = "") {
  const bucket = ownerAudit[key] || {};
  return asArray(bucket.items || bucket.profileDeltas || bucket.corrections || bucket.planDrafts);
}

export function ownerCorrectionStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "submitting") return "保存中";
  if (value === "submitted") return "已保存";
  if (value === "failed") return "失败";
  return "可记录";
}

export function ownerReviewActionText(action = "") {
  const value = clean(action).toLowerCase();
  if (value === "mark_needs_repair") return "标记需修补";
  if (value === "mark_misconception") return "标记误解";
  if (value === "mark_stable") return "确认稳定";
  if (value === "mark_mastered") return "确认掌握";
  return "确认观察";
}

export function ownerCorrectionTargetNodeIds(context = {}) {
  const ownerAudit = context.ownerAudit || {};
  const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
  const recommendation = context.nextCardRecommendation || {};
  const plan = context.suggestedPlan || {};
  const values = asArray(firstDelta.targetNodeIds).length
    ? firstDelta.targetNodeIds
    : asArray(recommendation.targetNodeIds).length
      ? recommendation.targetNodeIds
      : asArray(plan.targetNodeIds).length
        ? plan.targetNodeIds
        : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
  return values.map(clean).filter(Boolean).slice(0, 8);
}

export function ownerAuditMetricRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
  const summary = ownerAudit.summary || {};
  const rows = [
    ["计划", summary.planDraftCount, summary.lastPlanAt],
    ["已发布", summary.publishedPlanCount, summary.lastPublishedAt],
    ["画像变化", summary.profileDeltaCount, summary.lastProfileDeltaAt],
    ["纠偏", summary.correctionCount, summary.lastCorrectionAt]
  ];
  return rows.map(([label, value, meta]) => `<span>
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(String(Number(value || 0) || 0))}</strong>
      <em>${escapeHtml(clean(meta) || "无记录")}</em>
    </span>`).join("");
}

export function ownerPlanAuditRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
  const rows = ownerAuditItems(ownerAudit, "planAudit").slice(0, 2);
  if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无计划发布审计。</div>`;
  return rows.map((item) => {
    const selected = item.selectedItem || {};
    const label = clean(item.planDraftId || item.generatedTaskCardId || "计划");
    const detail = clean(selected.reason || item.planSummary || item.status || "summary-only");
    const meta = clean(item.generatedTaskCardId || selected.itemId || item.status || "记录");
    return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </div>`;
  }).join("");
}

export function ownerProfileDeltaRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
  const rows = ownerAuditItems(ownerAudit, "profileDeltaAudit").slice(0, 3);
  if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无画像变化审计。</div>`;
  return rows.map((item) => {
    const firstCapability = asArray(item.changedCapabilities)[0] || {};
    const label = clean(item.profileDeltaId || item.evaluationId || "画像变化");
    const capability = clean(firstCapability.nodeId || firstCapability.targetNodeId || asArray(item.targetNodeIds)[0] || "");
    const after = clean(firstCapability.afterStatus || firstCapability.afterState || firstCapability.status || "");
    const detail = clean(item.summary?.reason || capability || "summary-only");
    return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(after || String(Number(item.changedCapabilityCount || 0) || 0))}</em>
      </div>`;
  }).join("");
}

export function ownerCorrectionRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
  const rows = ownerAuditItems(ownerAudit, "profileCorrections").slice(0, 3);
  if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无 Owner 纠偏记录。</div>`;
  return rows.map((item) => {
    const label = clean(item.correctionId || item.profileDeltaId || "纠偏");
    const detail = clean(item.reason || item.note || asArray(item.targetNodeIds).join(" · ") || "summary-only");
    return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(clean(item.status) || ownerReviewActionText(item.reviewAction))}</em>
      </div>`;
  }).join("");
}

export function ownerCorrectionStatusPanel(correction = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(correction.status);
  const result = correction.result || {};
  const correctionId = clean(result.correction?.correctionId || result.correctionId);
  const error = clean(correction.error);
  if (!status || status === "idle") return "";
  const detail = status === "submitted"
    ? `纠偏已写入证据账本${correctionId ? `：${correctionId}` : "。"}`
    : status === "submitting"
      ? "正在通过 Growth Owner correction service 写入。"
      : error || "纠偏写入失败。";
  return `<div class="learning-card-generation-correction-status" data-owner-correction-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(ownerCorrectionStatusText(status))}</em>
    </div>`;
}

export function ownerAuditPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const ownerAudit = context.ownerAudit || {};
  const correction = state.ownerCorrection || {};
  const draft = clean(state.ownerCorrectionDraft);
  const action = clean(state.ownerCorrectionAction || "confirm_profile_delta");
  const targetNodeIds = ownerCorrectionTargetNodeIds(context);
  const disabled = correction.status === "submitting" || !targetNodeIds.length;
  return `<section class="learning-card-generation-owner-audit" data-card-generation-owner-audit data-owner-audit-available="${ownerAudit.available !== false}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>审计与纠偏</strong>
          <small>计划、画像变化、纠偏记录和下一步证据摘要</small>
        </span>
        <em>${escapeHtml(ownerAudit.ok ? "已连接" : "待证据")}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        ${ownerAuditMetricRows(ownerAudit, escapeHtml)}
      </div>
      <div class="learning-card-generation-owner-columns">
        <div>
          <b>计划审计</b>
          ${ownerPlanAuditRows(ownerAudit, escapeHtml)}
        </div>
        <div>
          <b>画像变化</b>
          ${ownerProfileDeltaRows(ownerAudit, escapeHtml)}
        </div>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>纠偏历史</b>
        ${ownerCorrectionRows(ownerAudit, escapeHtml)}
      </div>
      <form class="learning-card-generation-correction-form" data-card-generation-correction-form>
        <label>
          <span>Owner 纠偏</span>
          <select data-card-generation-correction-action>
            ${["confirm_profile_delta", "mark_needs_repair", "mark_misconception", "mark_stable", "mark_mastered"].map((item) => `<option value="${escapeHtml(item)}"${item === action ? " selected" : ""}>${escapeHtml(ownerReviewActionText(item))}</option>`).join("")}
          </select>
        </label>
        <textarea data-card-generation-correction-note rows="3" maxlength="260" placeholder="只写 summary-only 纠偏说明，不填写原始答案、transcript 或 prompt。">${escapeHtml(draft)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${escapeHtml(targetNodeIds.length ? `节点：${targetNodeIds.join(" · ")}` : "等待可纠偏的图谱节点")}</span>
          <button type="submit" class="primary" ${disabled ? "disabled" : ""}>${correction.status === "submitting" ? "保存中" : "保存纠偏"}</button>
        </div>
        ${ownerCorrectionStatusPanel(correction, escapeHtml)}
      </form>
    </section>`;
}

function dailyLoopScopeFromContext(context = {}, workspaceId = "", selection = {}) {
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const defaults = context.generationDefaults || {};
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  const draft = selectedProvisionDraft(context, selection);
  const targetNodeIds = asArray(recommendation.targetNodeIds).length
    ? asArray(recommendation.targetNodeIds)
    : asArray(plan.targetNodeIds).length
      ? asArray(plan.targetNodeIds)
      : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
  return {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    recipe_id: clean(selection.recipeId || selection.recipe_id || context.selectedRecipeId || "daily_english_v1"),
    domain_pack_id: clean(draft.domainPackId || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || recommendation.domain || plan.domain || context.domain || defaults.domain || "english"),
    subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || recommendation.subject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain || "english"),
    horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
    available_minutes: Number(defaults.availableMinutes || context.availableMinutes || 15) || 15,
    target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1")
  };
}

export function ownerAuditReviewScopeFromContext(context = {}, workspaceId = "", selectedCycle = {}) {
  const scope = dailyLoopScopeFromContext(context, workspaceId, {});
  const selected = cycleSelectionPayload(selectedCycle || {});
  const ownerAudit = context.ownerAudit || {};
  const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
  const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  return Object.assign({}, scope, {
    program_id: firstCleanValue(scope.program_id, firstDelta.programId, latestPlan.programId),
    plan_draft_id: selected.plan_draft_id,
    task_card_id: selected.task_card_id,
    evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    target_node_ids: targetNodeIds
  });
}

export function createOwnerAuditReviewQueryPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  const scope = ownerAuditReviewScopeFromContext(context, workspaceId, selectedCycle);
  return Object.fromEntries(Object.entries(Object.assign({}, scope, {
    limit: 5
  })).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function createOwnerAuditReviewPayload({ context = {}, workspaceId = "", selectedCycle = {}, decision = "accepted", note = "" } = {}) {
  const scope = ownerAuditReviewScopeFromContext(context, workspaceId, selectedCycle);
  const payload = Object.assign({}, scope, {
    decision: clean(decision || "accepted"),
    owner_note: clean(note).slice(0, 360),
    requested_by: "owner",
    reviewed_by: "owner"
  });
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function createOwnerCorrectionPayload({ context = {}, workspaceId = "", draft = {} } = {}) {
  const ownerAudit = context.ownerAudit || {};
  const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
  const planAudit = ownerAudit.planAudit || {};
  const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const targetNodeIds = ownerCorrectionTargetNodeIds(context);
  const payload = {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || firstDelta.programId || latestPlan.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(plan.domain || context.domain || defaults.domain),
    subject: clean(plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
    target_node_ids: targetNodeIds,
    review_action: clean(draft.reviewAction || "confirm_profile_delta"),
    reason: clean(draft.note || draft.reason).slice(0, 260),
    profile_delta_id: clean(draft.profileDeltaId || firstDelta.profileDeltaId),
    task_card_id: clean(draft.taskCardId || firstDelta.taskCardId || latestPlan.generatedTaskCardId || planAudit.generatedTaskCardId),
    evaluation_id: clean(draft.evaluationId || firstDelta.evaluationId),
    source_evidence_ids: asArray(firstDelta.evidenceIds).map(clean).filter(Boolean).slice(0, 12)
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function ownerAuditReviewDecisionText(decision = "") {
  const value = clean(decision).toLowerCase();
  if (value === "needs_follow_up") return "需跟进";
  if (value === "correction_recorded") return "已纠偏";
  if (value === "blocked") return "阻塞";
  return "接受画像";
}

export function ownerAuditReviewStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "submitting") return "记录中";
  if (value === "reviewed" || value === "submitted") return "已记录";
  if (value === "needs_follow_up") return "需跟进";
  if (value === "corrected") return "已纠偏";
  if (value === "blocked") return "已阻塞";
  if (value === "failed") return "失败";
  return "待审核";
}

export function ownerAuditReviewHasAnchor(payload = {}) {
  return [
    payload.plan_draft_id,
    payload.task_card_id,
    payload.evaluation_id,
    payload.profile_delta_id,
    payload.evidence_id,
    payload.correction_id,
    payload.source_id
  ].some((value) => clean(value));
}

export function ownerAuditReviewRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const reviews = asArray(data.reviews).slice(0, 4);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  if (status === "loading") return `<div class="learning-card-generation-owner-empty">正在读取完成周期审核。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-owner-empty">审核记录读取失败：${escapeHtml(clean(holder.error) || "owner_audit_review_failed")}</div>`;
  if (!reviews.length) return `<div class="learning-card-generation-owner-empty">暂无完成周期审核记录。</div>`;
  return reviews.map((review) => {
    const feedback = review.feedbackSummary || {};
    const audit = review.auditSummary || {};
    const recommendation = review.recommendation || {};
    const nextAction = review.nextAction || {};
    const label = firstCleanValue(review.reviewId, review.taskCardId, review.evaluationId, "审核记录");
    const detail = [
      feedback.readyForNextPlan ? "readyForNextPlan" : "",
      feedback.cycleComplete ? "cycleComplete" : "",
      recommendation.strategy ? `strategy:${recommendation.strategy}` : "",
      nextAction.action || review.status
    ].filter(Boolean).join(" · ") || "summary-only review";
    const meta = [
      ownerAuditReviewDecisionText(review.decision),
      Number(audit.passCheckCount || 0) ? `${Number(audit.passCheckCount || 0)} checks` : "",
      review.createdAt || review.updatedAt
    ].filter(Boolean).join(" · ");
    return `<div class="learning-card-generation-owner-row" data-owner-audit-review-row data-owner-audit-review-id="${escapeHtml(clean(review.reviewId))}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta || ownerAuditReviewStatusText(review.status))}</em>
      </div>`;
  }).join("");
}

export function ownerAuditReviewStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const result = holder.actionResult || {};
  const review = result.review || {};
  const reviewId = clean(review.reviewId || result.reviewId);
  const decision = clean(result.decision || review.decision);
  const error = clean(holder.actionError);
  if (!status || status === "idle") return "";
  const detail = status === "reviewed" || status === "submitted"
    ? `完成周期审核已记录${reviewId ? `：${reviewId}` : "。"}`
    : status === "submitting"
      ? "正在通过 Growth Owner audit review service 写入。"
      : error || "完成周期审核未记录。";
  return `<div class="learning-card-generation-correction-status" data-owner-audit-review-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(decision ? ownerAuditReviewDecisionText(decision) : ownerAuditReviewStatusText(status))}</em>
    </div>`;
}

export function ownerAuditReviewPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.ownerAuditReviews || {};
  const note = clean(state.ownerAuditReviewDraft);
  const selectedCycle = state.cycleHistory?.selectedCycle || {};
  const payload = createOwnerAuditReviewQueryPayload({
    context,
    workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
    selectedCycle
  });
  const status = clean(holder.status || "idle");
  const busy = holder.actionStatus === "submitting";
  const hasAnchor = ownerAuditReviewHasAnchor(payload);
  const correctionReady = Boolean(clean(payload.correction_id));
  const selectedLabel = firstCleanValue(
    payload.task_card_id,
    payload.evaluation_id,
    payload.plan_draft_id,
    payload.profile_delta_id,
    payload.evidence_id,
    payload.correction_id
  );
  const reason = clean(holder.error)
    || (hasAnchor
      ? "Owner 对选中的完成周期做一次审核记录；服务端会先校验 profile feedback。"
      : "请先在历史周期里选择一条已完成周期，再记录审核。");
  const decisions = [
    ["accepted", "接受", "接受本次画像更新"],
    ["needs_follow_up", "跟进", "后续生成修补卡"],
    ["correction_recorded", "已纠偏", correctionReady ? "关联已有纠偏记录" : "需要先保存纠偏"],
    ["blocked", "阻塞", "记录依赖缺口"]
  ];
  return `<section class="learning-card-generation-owner-audit" data-owner-audit-review-panel data-owner-audit-review-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>完成周期审核</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(ownerAuditReviewStatusText(busy ? "submitting" : status))}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        <span><small>已记录</small><strong>${escapeHtml(String(Number(holder.data?.count || asArray(holder.data?.reviews).length || 0) || 0))}</strong><em>review rows</em></span>
        <span><small>选中周期</small><strong>${escapeHtml(selectedLabel || "未选择")}</strong><em>${escapeHtml(hasAnchor ? "可审核" : "待选择")}</em></span>
        <span><small>纠偏关联</small><strong>${escapeHtml(correctionReady ? "可用" : "无")}</strong><em>correction</em></span>
        <span><small>下一步</small><strong>${escapeHtml(clean(holder.actionResult?.nextAction?.action || holder.data?.reviews?.[0]?.nextAction?.action || "等待"))}</strong><em>summary-only</em></span>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>审核记录</b>
        ${ownerAuditReviewRows(holder, escapeHtml)}
      </div>
      <form class="learning-card-generation-correction-form" data-owner-audit-review-form>
        <textarea data-owner-audit-review-note rows="2" maxlength="360" placeholder="可选：只写 summary-only Owner 备注，不填写原始答案、transcript 或 prompt。">${escapeHtml(note)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${escapeHtml(selectedLabel ? `周期：${selectedLabel}` : "等待选择历史周期")}</span>
          <button type="button" data-owner-audit-review-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新审核"}</button>
        </div>
        <div class="learning-card-generation-cycle-actions">
          ${decisions.map(([decision, label, title]) => {
            const blockedReason = !hasAnchor
              ? "请先选择一条完成周期。"
              : decision === "correction_recorded" && !correctionReady
                ? "记录已纠偏前，需要先保存 Owner 纠偏。"
                : "";
            const disabled = busy || Boolean(blockedReason);
            return `<button type="button" class="${decision === "accepted" ? "primary" : ""}" data-owner-audit-review-decision="${escapeHtml(decision)}" title="${escapeHtml(title)}" ${disabled ? `disabled aria-disabled="true" data-owner-audit-review-blocked-reason="${escapeHtml(blockedReason || "正在记录审核。")}"` : ""}>${escapeHtml(busy ? "记录中" : label)}</button>`;
          }).join("")}
        </div>
        ${ownerAuditReviewStatusPanel(holder, escapeHtml)}
      </form>
    </section>`;
}
