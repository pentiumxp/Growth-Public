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

export function referenceObjectTypeText(objectType = "") {
  const value = clean(objectType);
  const map = {
    program: "学习项目",
    task_card: "卡片",
    submission: "提交",
    evaluation: "批改",
    reflection: "反思",
    mastery_profile: "画像",
    learning_graph_plan: "图谱计划",
    plan_draft: "计划草稿",
    profile_feedback: "画像闭环"
  };
  return map[value] || value || "引用";
}

export function referenceChainStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "ready") return "已读取";
  if (value === "failed") return "读取失败";
  if (value === "partial") return "部分可读";
  return "待读取";
}

export function addReferenceRequest(items, objectType, objectId, label = "", reason = "") {
  const type = clean(objectType);
  const id = clean(objectId);
  if (!type || !id) return;
  const key = `${type}:${id}`;
  if (items.some((item) => item.key === key)) return;
  items.push({
    key,
    objectType: type,
    objectId: id,
    label: clean(label) || referenceObjectTypeText(type),
    reason: clean(reason) || "owner_loop"
  });
}

export function createReferenceChainRequests({ context = {}, state = {}, workspaceId = "" } = {}) {
  const requests = [];
  const target = context.target || {};
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const draftResult = state.dailyLoopDraftResult || {};
  const publishResult = state.dailyLoopPublishResult || {};
  const generated = state.generatedResult || publishResult.generation || {};
  const planDraft = draftResult.planDraft || publishResult.planDraft || generated.planDraft || {};
  const published = generated.published || publishResult.published || {};
  const learningGraphPlan = generated.learningGraphPlan || publishResult.learningGraphPlan || draftResult.learningGraphPlan || {};
  const selectedCycle = state.cycleHistory?.selectedCycle || {};
  const selectors = selectedCycle.selectors || {};
  const auditTimeline = asArray(state.cycleDrilldown?.audit?.timeline);
  const learnerId = firstCleanValue(target.learnerId, workspaceId, context.workspaceId);
  addReferenceRequest(requests, "mastery_profile", learnerId, "学习画像", "profile_basis");
  addReferenceRequest(requests, "program", firstCleanValue(context.programId, plan.programId, defaults.programId, planDraft.programId), "学习项目", "scope");
  addReferenceRequest(requests, "learning_graph_plan", firstCleanValue(learningGraphPlan.learningGraphPlanId, generated.learningGraphPlanId, publishResult.learningGraphPlanId, plan.learningGraphPlanId), "图谱计划", "graph_plan");
  addReferenceRequest(requests, "plan_draft", firstCleanValue(planDraft.planDraftId, selectors.planDraftId, selectedCycle.planDraftId), "计划草稿", "plan_draft");
  const taskCardId = firstCleanValue(published.taskCardId, generated.taskCardId, publishResult.taskCardId, selectors.taskCardId, selectedCycle.taskCardId);
  const evaluationId = firstCleanValue(selectors.evaluationId, selectedCycle.evaluationId);
  addReferenceRequest(requests, "task_card", taskCardId, "学习卡片", "published_card");
  addReferenceRequest(requests, "evaluation", evaluationId, "批改证据", "cycle_audit");
  const feedbackTaskCardId = firstCleanValue(selectors.taskCardId, selectedCycle.taskCardId, taskCardId);
  addReferenceRequest(requests, "profile_feedback", feedbackTaskCardId ? `task_card:${feedbackTaskCardId}` : evaluationId ? `evaluation:${evaluationId}` : "", "画像闭环", "profile_feedback");
  for (const entry of auditTimeline) {
    addReferenceRequest(requests, "task_card", firstCleanValue(entry.taskCardId), "审计卡片", "cycle_timeline");
    addReferenceRequest(requests, "evaluation", firstCleanValue(entry.evaluationId), "审计批改", "cycle_timeline");
    if (requests.length >= 8) break;
  }
  return requests.slice(0, 8);
}

export function referenceChainRow(item = {}, escapeHtml = defaultEscapeHtml) {
  const display = item.display || {};
  const summary = item.summary || {};
  const ok = item.ok !== false;
  const title = clean(display.title || summary.title || item.label || referenceObjectTypeText(item.objectType));
  const detail = clean(display.subtitle || summary.subtitle || item.error || item.reason || item.referenceId || "summary-only");
  return `<div class="learning-card-generation-reference-row" data-reference-object-type="${escapeHtml(clean(item.objectType))}" data-reference-object-id="${escapeHtml(clean(item.objectId))}" data-reference-ok="${ok ? "true" : "false"}">
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
      <em>${escapeHtml(ok ? referenceObjectTypeText(item.objectType) : "不可读")}</em>
    </div>`;
}

export function referenceChainPanel(context = {}, state = {}, workspaceId = "", escapeHtml = defaultEscapeHtml) {
  const holder = state.referenceChain || {};
  const objectTypes = holder.objectTypes || context.referenceObjectTypes || {};
  const summaries = asArray(holder.summaries || context.referenceSummaries);
  const requests = asArray(holder.requests).length ? asArray(holder.requests) : createReferenceChainRequests({ context, state, workspaceId });
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(holder.status || (summaries.length ? "ready" : "idle"));
  const typeCount = Number(objectTypes.referenceContractObjectTypeCount || asArray(objectTypes.objectTypes).length || 0) || 0;
  const rows = summaries.length
    ? summaries.slice(0, 8).map((item) => referenceChainRow(item, escapeHtml)).join("")
    : requests.length
      ? requests.slice(0, 8).map((item) => referenceChainRow(Object.assign({}, item, { ok: holder.status !== "failed", display: { title: item.label, subtitle: item.objectId } }), escapeHtml)).join("")
      : `<div class="learning-card-generation-reference-empty">等待计划、卡片或审计记录形成后显示引用。</div>`;
  const detail = failed
    ? clean(holder.error) || "reference_chain_failed"
    : loading
      ? "正在读取 Growth Reference Contract summary。"
      : `${typeCount || 8} 类 summary-only 引用，当前链路 ${summaries.length || requests.length} 项。`;
  return `<section class="learning-card-generation-reference-chain" data-reference-chain-panel data-reference-chain-status="${escapeHtml(status)}">
      <div class="learning-card-generation-reference-head">
        <span>
          <strong>闭环引用</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-reference-chain-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "读取中" : "刷新引用")}</button>
      </div>
      <div class="learning-card-generation-reference-grid">
        <span><small>对象类型</small><strong>${escapeHtml(String(typeCount || 8))}</strong></span>
        <span><small>当前引用</small><strong>${escapeHtml(String(summaries.length || requests.length || 0))}</strong></span>
        <span><small>隐私</small><strong>summary-only</strong></span>
      </div>
      <div class="learning-card-generation-reference-list">
        ${rows}
      </div>
    </section>`;
}
