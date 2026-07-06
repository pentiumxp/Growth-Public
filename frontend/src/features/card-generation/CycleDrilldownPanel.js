import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { selectedPlanItem } from "./ActionPanel.js";
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

function ownerAuditItems(ownerAudit = {}, key = "") {
  const bucket = ownerAudit[key] || {};
  return asArray(bucket.items || bucket.profileDeltas || bucket.corrections || bucket.planDrafts);
}

export function cycleHistoryItemKey(cycle = {}, index = 0) {
  const selectors = cycle.selectors || {};
  return [
    selectors.taskCardId || cycle.taskCardId,
    selectors.evaluationId || cycle.evaluationId,
    selectors.profileDeltaId || cycle.profileDeltaId,
    selectors.planDraftId || cycle.planDraftId,
    selectors.correctionId || cycle.correctionId,
    index
  ].map(clean).filter(Boolean).join(":") || `cycle:${index}`;
}

export function createCycleAuditQueryPayload({ context = {}, workspaceId = "", draftResult = {}, publishResult = {}, generatedResult = {}, selectedCycle = {} } = {}) {
  const ownerAudit = context.ownerAudit || {};
  const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
  const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
  const firstCorrection = ownerAuditItems(ownerAudit, "profileCorrections")[0] || {};
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const defaults = context.generationDefaults || {};
  const planDraft = publishResult.planDraft || draftResult.planDraft || {};
  const generation = publishResult.generation || generatedResult || {};
  const published = generation.published || {};
  const selectedItem = selectedPlanItem(planDraft);
  const selectedCyclePayload = cycleSelectionPayload(selectedCycle || {});
  const targetNodeIds = firstCleanArray(
    selectedCyclePayload.target_node_ids,
    firstDelta.targetNodeIds,
    firstCorrection.targetNodeIds,
    selectedItem.targetNodeIds,
    planDraft.targetNodeIds,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  const payload = {
    workspace_id: firstCleanValue(workspaceId, context.target?.workspaceId),
    learner_id: firstCleanValue(context.target?.learnerId, workspaceId),
    program_id: firstCleanValue(context.programId, firstDelta.programId, latestPlan.programId, plan.programId, defaults.programId),
    plan_draft_id: firstCleanValue(selectedCyclePayload.plan_draft_id, planDraft.planDraftId, latestPlan.planDraftId),
    task_card_id: firstCleanValue(selectedCyclePayload.task_card_id, published.taskCardId, generation.taskCardId, generatedResult.taskCardId, planDraft.generatedTaskCardId, latestPlan.generatedTaskCardId, firstDelta.taskCardId, firstCorrection.taskCardId),
    evaluation_id: firstCleanValue(selectedCyclePayload.evaluation_id, firstDelta.evaluationId, firstCorrection.evaluationId),
    profile_delta_id: firstCleanValue(selectedCyclePayload.profile_delta_id, firstDelta.profileDeltaId, firstCorrection.profileDeltaId),
    evidence_id: firstCleanValue(selectedCyclePayload.evidence_id, firstCleanArray(firstDelta.evidenceIds, firstCorrection.evidenceIds)[0]),
    correction_id: firstCleanValue(selectedCyclePayload.correction_id, firstCorrection.correctionId),
    source_id: firstCleanValue(selectedCyclePayload.source_id, firstDelta.evaluationId, firstCorrection.evaluationId),
    target_node_ids: targetNodeIds,
    limit: 20
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function createCycleHistoryQueryPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  const selected = cycleSelectionPayload(selectedCycle || {});
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    context.nextCardRecommendation?.targetNodeIds,
    plan.targetNodeIds,
    [context.nextCardRecommendation?.targetNodeId || plan.targetNodeId]
  );
  const payload = {
    workspace_id: firstCleanValue(workspaceId, context.target?.workspaceId),
    learner_id: firstCleanValue(context.target?.learnerId, workspaceId),
    program_id: firstCleanValue(context.programId, plan.programId, defaults.programId),
    domain_pack_id: firstCleanValue(provisioning.selectedDomainPackId, graphOptions.selectedDomainPackId, context.domainPackId, plan.domainPackId, defaults.domainPackId),
    domain: firstCleanValue(provisioning.selectedDomain, graphOptions.selectedDomain, plan.domain, context.domain, defaults.domain),
    subject: firstCleanValue(provisioning.selectedSubject, graphOptions.selectedSubject, plan.subject, context.subject, defaults.subject, plan.domain, context.domain),
    plan_draft_id: selected.plan_draft_id,
    task_card_id: selected.task_card_id,
    evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    target_node_ids: targetNodeIds,
    include_completeness: "false",
    limit: 8
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function cycleAuditHasAnchor(payload = {}) {
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

export function cycleDrilldownStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "ready") return "已读取";
  if (value === "failed") return "失败";
  return "待读取";
}

export function cycleTimelineTypeText(type = "") {
  const value = clean(type).toLowerCase();
  if (value === "plan") return "计划";
  if (value === "plan_publish_attempt") return "发布尝试";
  if (value === "evidence") return "评价证据";
  if (value === "profile_delta") return "画像变化";
  if (value === "correction") return "Owner 纠偏";
  return value || "记录";
}

export function cycleFindingText(code = "") {
  const value = clean(code);
  const map = {
    plan_publication: "计划发布",
    publish_attempt_visibility: "发布尝试可见",
    evaluation_evidence: "评价证据",
    profile_delta_audit: "画像变化审计",
    partial_failures: "下游审计服务",
    privacy_projection: "隐私投影",
    owner_correction_optional: "Owner 纠偏",
    next_recommendation_optional: "下一张建议"
  };
  return map[value] || value || "检查项";
}

export function cycleDrilldownTimelineRows(timeline = [], escapeHtml = defaultEscapeHtml) {
  const rows = asArray(timeline).slice(0, 6);
  if (!rows.length) return `<div class="learning-card-generation-cycle-empty">暂无单卡 timeline。完成提交和批改后再刷新。</div>`;
  return rows.map((entry) => {
    const label = cycleTimelineTypeText(entry.type);
    const id = clean(entry.id || entry.planDraftId || entry.taskCardId || entry.evaluationId || entry.profileDeltaId || entry.correctionId);
    const detail = clean(entry.summary || entry.error || entry.status || entry.at || "summary-only");
    const meta = clean(entry.status || entry.at || "记录");
    return `<div class="learning-card-generation-cycle-row" data-cycle-timeline-type="${escapeHtml(clean(entry.type))}">
        <span>
          <strong>${escapeHtml(label)}${id ? ` · ${escapeHtml(id)}` : ""}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </div>`;
  }).join("");
}

export function cycleDrilldownFindingRows(findings = [], escapeHtml = defaultEscapeHtml) {
  const rows = asArray(findings).slice(0, 8);
  if (!rows.length) return `<div class="learning-card-generation-cycle-empty">暂无完整性检查结果。</div>`;
  return rows.map((item) => {
    const ok = item.ok !== false;
    return `<div class="learning-card-generation-cycle-finding" data-cycle-finding-ok="${ok ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(cycleFindingText(item.code))}</strong>
          <small>${escapeHtml(item.remediation || item.code || "summary-only")}</small>
        </span>
        <em>${escapeHtml(ok ? "通过" : "待补齐")}</em>
      </div>`;
  }).join("");
}

export function cycleHistoryRows(cycleHistory = {}, selectedCycleKey = "", escapeHtml = defaultEscapeHtml) {
  const cycles = asArray(cycleHistory.data?.cycles || cycleHistory.cycles).slice(0, 6);
  const status = clean(cycleHistory.status || (cycleHistory.data ? "ready" : "idle"));
  if (status === "loading") return `<div class="learning-card-generation-cycle-empty">正在读取历史周期。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-cycle-empty">历史周期读取失败：${escapeHtml(clean(cycleHistory.error) || "cycle_history_failed")}</div>`;
  if (!cycles.length) return `<div class="learning-card-generation-cycle-empty">暂无可选择的历史周期。</div>`;
  return cycles.map((cycle, index) => {
    const key = cycleHistoryItemKey(cycle, index);
    const selectors = cycle.selectors || {};
    const counts = cycle.counts || {};
    const selected = key === selectedCycleKey;
    const title = firstCleanValue(selectors.taskCardId, cycle.taskCardId, selectors.evaluationId, cycle.evaluationId, `cycle ${index + 1}`);
    const detail = firstCleanValue(
      cycle.summary,
      selectors.planDraftId,
      selectors.profileDeltaId,
      selectors.correctionId,
      "summary-only history"
    );
    const meta = [
      Number(counts.evidence || 0) ? `${Number(counts.evidence || 0)} evidence` : "",
      Number(counts.profileDeltas || 0) ? `${Number(counts.profileDeltas || 0)} delta` : "",
      Number(counts.corrections || 0) ? `${Number(counts.corrections || 0)} correction` : ""
    ].filter(Boolean).join(" · ") || clean(cycle.updatedAt || cycle.createdAt || "history");
    return `<button type="button" class="learning-card-generation-cycle-history-row" data-card-generation-cycle-history-select data-cycle-history-key="${escapeHtml(key)}" data-cycle-history-selected="${selected ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </button>`;
  }).join("");
}

export function cycleDrilldownPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const drilldown = state.cycleDrilldown || {};
  const cycleHistory = state.cycleHistory || {};
  const selectedCycleKey = clean(cycleHistory.selectedCycleKey);
  const payload = createCycleAuditQueryPayload({
    context,
    workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
    draftResult: state.dailyLoopDraftResult || {},
    publishResult: state.dailyLoopPublishResult || {},
    generatedResult: state.generatedResult || {},
    selectedCycle: cycleHistory.selectedCycle || {}
  });
  const status = clean(drilldown.status || "idle");
  const audit = drilldown.audit || {};
  const completeness = drilldown.completeness || {};
  const summary = audit.summary || completeness.cycleAudit?.summary || {};
  const completenessSummary = completeness.summary || {};
  const missingRequired = asArray(completenessSummary.missingRequired);
  const timeline = asArray(audit.timeline).length ? audit.timeline : completeness.cycleAudit?.timeline;
  const anchor = firstCleanValue(payload.task_card_id, payload.evaluation_id, payload.plan_draft_id, payload.profile_delta_id, payload.evidence_id, payload.correction_id);
  const hasAnchor = cycleAuditHasAnchor(payload);
  const loading = status === "loading";
  const disabled = loading || !hasAnchor;
  const completenessLabel = completeness.complete === true
    ? "完整"
    : completeness.ok === true
      ? "待补齐"
      : "未确认";
  const reason = clean(drilldown.error)
    || (loading ? "正在读取 Growth 单卡审计和完整性检查。"
      : hasAnchor ? "读取某张卡从计划、评价到画像变化的 summary-only 证据。"
        : "等待已发布卡片或评价证据后读取。");
  return `<section class="learning-card-generation-cycle-drilldown" data-card-generation-cycle-drilldown data-cycle-drilldown-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-cycle-head">
        <span>
          <strong>单卡闭环审计</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(cycleDrilldownStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-cycle-grid">
        <span><small>卡片</small><strong>${escapeHtml(anchor || "等待卡片")}</strong></span>
        <span><small>计划</small><strong>${escapeHtml(String(Number(summary.planDraftCount || 0) || 0))}</strong></span>
        <span><small>评价</small><strong>${escapeHtml(String(Number(summary.evidenceCount || 0) || 0))}</strong></span>
        <span><small>缺口</small><strong>${escapeHtml(String(missingRequired.length))}</strong></span>
      </div>
      <div class="learning-card-generation-cycle-actions">
        <span>${escapeHtml(completeness.readyForAutomation ? "审计完整，可作为后续自动化证据" : `完整性：${completenessLabel}`)}</span>
        <button type="button" class="primary" data-card-generation-cycle-audit-refresh ${disabled ? `disabled aria-disabled="true" data-card-generation-blocked-reason="${escapeHtml(hasAnchor ? "正在读取审计，请稍候。" : "还没有可读取的单卡 cycle anchor。")}"` : ""}>${loading ? "读取中" : "读取单卡审计"}</button>
      </div>
      <div class="learning-card-generation-cycle-history" data-card-generation-cycle-history data-cycle-history-status="${escapeHtml(cycleHistory.status || "idle")}">
        <div class="learning-card-generation-cycle-history-head">
          <span>历史周期</span>
          <button type="button" data-card-generation-cycle-history-refresh ${cycleHistory.status === "loading" ? "disabled" : ""}>${cycleHistory.status === "loading" ? "读取中" : "刷新历史"}</button>
        </div>
        <div class="learning-card-generation-cycle-history-list">
          ${cycleHistoryRows(cycleHistory, selectedCycleKey, escapeHtml)}
        </div>
      </div>
      <div class="learning-card-generation-cycle-columns">
        <div>
          <b>Timeline</b>
          ${cycleDrilldownTimelineRows(timeline, escapeHtml)}
        </div>
        <div>
          <b>Completeness</b>
          ${cycleDrilldownFindingRows(completeness.findings, escapeHtml)}
        </div>
      </div>
    </section>`;
}
