import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { cycleAuditHasAnchor } from "./CycleDrilldownPanel.js";
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

export function automationProposalScopeFromContext(context = {}, workspaceId = "") {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  return {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(provisioning.selectedDomain || graphOptions.selectedDomain || plan.domain || context.domain || defaults.domain),
    subject: clean(provisioning.selectedSubject || graphOptions.selectedSubject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
    horizon: clean(context.horizon || defaults.horizon || "daily_plan")
  };
}

export function createAutomationProposalCreatePayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const recommendation = context.nextCardRecommendation || {};
  const scope = automationProposalScopeFromContext(context, workspaceId);
  const selected = cycleSelectionPayload(selectedCycle || {});
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  const payload = Object.assign({}, scope, {
    available_minutes: firstCleanValue(defaults.availableMinutes, context.availableMinutes, 15),
    low_pressure: true,
    requested_by: "owner",
    source_plan_draft_id: selected.plan_draft_id,
    source_task_card_id: selected.task_card_id,
    source_evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    source_target_node_ids: selected.target_node_ids,
    target_node_ids: targetNodeIds
  });
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return clean(value);
  }));
}

export function automationProposalStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "proposed") return "待复核";
  if (value === "accepted") return "已接受";
  if (value === "skipped") return "已跳过";
  if (value === "expired") return "已过期";
  if (value === "superseded") return "已替代";
  if (value === "publishing") return "发布中";
  if (value === "published") return "已发布";
  if (value === "created") return "已生成";
  if (value === "blocked") return "已阻塞";
  if (value === "failed") return "失败";
  return value || "待建议";
}

export function automationProposalStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const proposal = result.proposal || {};
  if (!status || status === "idle") return "";
  const execution = proposal.execution || {};
  const detail = status === "published"
    ? `建议已发布${clean(execution.generatedTaskCardId) ? `：${clean(execution.generatedTaskCardId)}` : "。"}`
    : status === "created"
      ? `已生成自动化建议${clean(proposal.proposalId || proposal.proposal_id) ? `：${clean(proposal.proposalId || proposal.proposal_id)}` : "。"}`
      : status === "reviewed"
        ? `建议已记录为 ${automationProposalStatusText(proposal.status)}。`
        : status === "submitting"
          ? "正在通过 Growth automation proposal service 写入。"
          : error || "建议操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-proposal-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationProposalStatusText(status))}</em>
    </div>`;
}

export function automationProposalRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const proposals = asArray(data.proposals).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取自动化建议。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">自动化建议读取失败：${escapeHtml(clean(holder.error) || "automation_proposals_failed")}</div>`;
  if (!proposals.length) return `<div class="learning-card-generation-proposal-empty">暂无可复核的自动化建议。完成一张卡并生成 proposal 后会显示在这里。</div>`;
  return proposals.map((proposal) => {
    const proposalId = clean(proposal.proposalId || proposal.proposal_id);
    const execution = proposal.execution || {};
    const executionStatus = clean(execution.status);
    const isProposed = clean(proposal.status) === "proposed";
    const isAccepted = clean(proposal.status) === "accepted";
    const canPublish = isAccepted && executionStatus !== "published";
    const targetNodes = asArray(proposal.targetNodeIds || proposal.target_node_ids).map(clean).filter(Boolean);
    const title = clean(proposal.proposalSummary || proposalId || "下一张建议");
    const detail = clean(proposal.rationale?.plan?.reason || proposal.rationale?.plan?.selectedItemId || proposal.planDraftId || "summary-only proposal");
    const meta = [clean(proposal.status), executionStatus, clean(proposal.planDraftId)].filter(Boolean).join(" · ") || "proposal";
    return `<div class="learning-card-generation-proposal-row" data-automation-proposal-row data-automation-proposal-id="${escapeHtml(proposalId)}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
          <small>${escapeHtml(targetNodes.join(" · ") || "bounded graph target")}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
        <div class="learning-card-generation-proposal-actions">
          ${["accepted", "skipped", "expired", "superseded"].map((decision) => {
            const blockedReason = busy
              ? "建议操作正在写入。"
              : !isProposed
                ? "只有待复核建议可以记录决策。"
                : "";
            const label = decision === "accepted" ? "接受" : decision === "skipped" ? "跳过" : decision === "expired" ? "过期" : "替代";
            return `<button type="button" class="${blockedReason ? "disabled" : ""}" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="${escapeHtml(decision)}" ${blockedReason ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(blockedReason)}"` : ""}>${escapeHtml(label)}</button>`;
          }).join("")}
          <button type="button" class="primary${busy || !canPublish ? " disabled" : ""}" data-automation-proposal-publish data-automation-proposal-id="${escapeHtml(proposalId)}" ${busy || !canPublish ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(busy ? "建议操作正在写入。" : executionStatus === "published" ? "建议已经发布。" : "只有已接受且未发布的建议可以发布。")}"` : ""}>${busy && canPublish ? "发布中" : executionStatus === "published" ? "已发布" : "发布"}</button>
        </div>
      </div>`;
  }).join("");
}

export function automationProposalPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationProposals || {};
  const data = holder.data || {};
  const proposals = asArray(data.proposals);
  const proposedCount = proposals.filter((item) => clean(item.status) === "proposed").length;
  const acceptedCount = proposals.filter((item) => clean(item.status) === "accepted").length;
  const publishedCount = proposals.filter((item) => clean(item.execution?.status) === "published").length;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const selectedCycle = state.cycleHistory?.selectedCycle || {};
  const createPayload = createAutomationProposalCreatePayload({
    context,
    workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
    selectedCycle
  });
  const hasSelectedSource = cycleAuditHasAnchor({
    plan_draft_id: createPayload.source_plan_draft_id,
    task_card_id: createPayload.source_task_card_id,
    evaluation_id: createPayload.source_evaluation_id,
    profile_delta_id: createPayload.profile_delta_id,
    evidence_id: createPayload.evidence_id,
    correction_id: createPayload.correction_id,
    source_id: createPayload.source_id
  });
  const busy = holder.actionStatus === "submitting";
  const reason = status === "loading"
    ? "正在读取 Owner 可复核的下一张建议。"
    : status === "failed"
      ? clean(holder.error) || "automation_proposals_failed"
      : proposedCount
        ? "Owner 需要复核 AI 建议后再发布。"
        : hasSelectedSource
          ? "可从选中的完整周期生成下一张建议。"
          : "没有待复核建议；请选择一个完整历史周期后生成 proposal。";
  return `<section class="learning-card-generation-proposals" data-automation-proposal-panel data-automation-proposal-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化建议</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="${busy || !hasSelectedSource ? "disabled" : ""}" data-automation-proposal-create ${busy || !hasSelectedSource ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(hasSelectedSource ? "建议操作正在写入。" : "请先在历史周期里选择一个完整周期。")}"` : ""}>${busy && hasSelectedSource ? "生成中" : "生成建议"}</button>
          <button type="button" data-automation-proposal-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新建议"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(proposedCount))}</strong></span>
        <span><small>已接受</small><strong>${escapeHtml(String(acceptedCount))}</strong></span>
        <span><small>已发布</small><strong>${escapeHtml(String(publishedCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationProposalRows(holder, escapeHtml)}
      </div>
      ${automationProposalStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationDigestStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "pending") return "待复核";
  if (value === "reviewed") return "已复核";
  if (value === "archived") return "已归档";
  if (value === "superseded") return "已替代";
  if (value === "created") return "已生成";
  if (value === "failed") return "失败";
  return value || "待摘要";
}

export function automationDigestActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const digest = result.digest || {};
  if (!status || status === "idle") return "";
  const detail = status === "created"
    ? "Digest 已生成，等待 Owner 复核。"
    : status === "reviewed"
      ? `Digest 已记录为 ${automationDigestStatusText(digest.status)}。`
      : status === "submitting"
        ? "正在通过 Growth automation digest service 写入。"
        : error || "Digest 操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-digest-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationDigestStatusText(status))}</em>
    </div>`;
}

export function automationDigestRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const digests = asArray(data.digests).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取自动化 digest。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">自动化 digest 读取失败：${escapeHtml(clean(holder.error) || "automation_digests_failed")}</div>`;
  if (!digests.length) return `<div class="learning-card-generation-proposal-empty">暂无自动化 digest。生成并接受 proposal 后，后端 dry-run digest 会显示在这里。</div>`;
  return digests.map((digest) => {
    const digestId = clean(digest.digestId || digest.digest_id);
    const digestStatus = clean(digest.status);
    const canReview = digestStatus === "pending";
    const summary = digest.summary || {};
    const requiredActions = asArray(digest.requiredActions || digest.required_actions);
    const blocked = asArray(digest.blocked);
    const candidates = asArray(digest.candidates);
    const firstAction = requiredActions[0] || {};
    const firstBlocked = blocked[0] || {};
    const title = clean(digestId || "自动化 digest");
    const detail = clean(firstAction.proposalId || firstAction.proposal_id || firstBlocked.reason || firstBlocked.decision || digest.createdAt || digest.created_at || "summary-only digest");
    const counts = [
      `would ${Number(summary.wouldPublish || summary.would_publish || 0) || 0}`,
      `blocked ${Number(summary.blocked || 0) || 0}`,
      `skipped ${Number(summary.skipped || 0) || 0}`,
      `actions ${Number(summary.requiredActions || summary.required_actions || requiredActions.length || 0) || 0}`
    ].join(" · ");
    const target = clean(digest.subject || digest.domain || digest.domainPackId || digest.domain_pack_id || "bounded scope");
    return `<div class="learning-card-generation-proposal-row" data-automation-digest-row data-automation-digest-id="${escapeHtml(digestId)}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
          <small>${escapeHtml(`${target} · ${counts}`)}</small>
          ${candidates.length ? `<small>${escapeHtml(`候选 ${candidates.length} · 手动发布，不自动执行`)}</small>` : ""}
        </span>
        <em>${escapeHtml(digestStatus || "digest")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="reviewed" ${busy || !canReview ? "disabled" : ""}>复核</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="archived" ${busy || !canReview ? "disabled" : ""}>归档</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="superseded" ${busy || !canReview ? "disabled" : ""}>替代</button>
        </div>
      </div>`;
  }).join("");
}

export function automationDigestPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationDigests || {};
  const data = holder.data || {};
  const digests = asArray(data.digests);
  const pendingCount = digests.filter((item) => clean(item.status) === "pending").length;
  const reviewedCount = digests.filter((item) => clean(item.status) === "reviewed").length;
  const requiredActionCount = digests.reduce((total, item = {}) => total + asArray(item.requiredActions || item.required_actions).length, 0);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  const reason = status === "loading"
    ? "正在读取自动化 digest。"
    : status === "failed"
      ? clean(holder.error) || "automation_digests_failed"
      : pendingCount
        ? "Owner 可以复核 digest，但不会自动发布或通知。"
        : "暂无待复核 digest；可以从当前 dry-run 摘要生成一条待复核 digest。";
  return `<section class="learning-card-generation-proposals learning-card-generation-digests" data-automation-digest-panel data-automation-digest-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化 Digest</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-digest-create ${busy ? "disabled" : ""}>${busy ? "生成中" : "生成 Digest"}</button>
          <button type="button" data-automation-digest-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Digest"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(pendingCount))}</strong></span>
        <span><small>已复核</small><strong>${escapeHtml(String(reviewedCount))}</strong></span>
        <span><small>手动动作</small><strong>${escapeHtml(String(requiredActionCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationDigestRows(holder, escapeHtml)}
      </div>
      ${automationDigestActionStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationFailurePolicyStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "draft") return "草稿";
  if (value === "active") return "已激活";
  if (value === "archived") return "已归档";
  if (value === "superseded") return "已替代";
  if (value === "created") return "已创建";
  if (value === "reviewed") return "已复核";
  if (value === "failed") return "失败";
  if (value === "failure_policy_ready") return "策略已就绪";
  if (value === "missing_active_failure_policy") return "缺少激活策略";
  return value || "待策略";
}

export function automationFailurePolicyActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const policy = result.policy || {};
  if (!status || status === "idle") return "";
  const detail = status === "created"
    ? `失败策略已创建：${clean(policy.policyId || policy.policy_id) || "failure policy"}。`
    : status === "reviewed"
      ? `失败策略已记录为 ${automationFailurePolicyStatusText(policy.status)}。`
      : status === "submitting"
        ? "正在通过 Growth failure policy service 写入。"
        : error || "失败策略操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-failure-policy-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationFailurePolicyStatusText(status))}</em>
    </div>`;
}

export function automationFailurePolicyRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const policies = asArray(data.policies).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 failure policy。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Failure policy 读取失败：${escapeHtml(clean(holder.error) || "automation_failure_policies_failed")}</div>`;
  if (!policies.length) return `<div class="learning-card-generation-proposal-empty">暂无 failure policy。创建并激活后，action handoff 才有失败可见性前置条件。</div>`;
  return policies.map((policy) => {
    const policyId = clean(policy.policyId || policy.policy_id);
    const policyStatus = clean(policy.status);
    const canReview = policyId && policyStatus === "draft";
    const failurePolicy = policy.failurePolicy || policy.failure_policy || {};
    const rollbackPolicy = policy.rollbackPolicy || policy.rollback_policy || {};
    const visibleFailure = failurePolicy.visibleFailureRequired !== false;
    const retryRequiresOwner = failurePolicy.retryRequiresOwner !== false;
    const transactional = rollbackPolicy.transactionalPublishRequired !== false;
    const meta = [
      visibleFailure ? "visible failure" : "hidden failure blocked",
      retryRequiresOwner ? "Owner retry" : "retry policy disabled",
      transactional ? "transactional publish" : "transaction not proven"
    ].join(" · ");
    return `<div class="learning-card-generation-proposal-row" data-automation-failure-policy-row data-automation-failure-policy-id="${escapeHtml(policyId)}">
        <span>
          <strong>${escapeHtml(policyId || "failure policy")}</strong>
          <small>${escapeHtml(meta)}</small>
          <small>激活策略只满足监督自动化前置条件，不开启调度。</small>
        </span>
        <em>${escapeHtml(automationFailurePolicyStatusText(policyStatus))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="active" ${busy || !canReview ? "disabled" : ""}>激活</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="archived" ${busy || !canReview ? "disabled" : ""}>归档</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="superseded" ${busy || !canReview ? "disabled" : ""}>替代</button>
        </div>
      </div>`;
  }).join("");
}

export function automationFailurePolicyPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationFailurePolicies || {};
  const data = holder.data || {};
  const policies = asArray(data.policies);
  const readiness = data.readiness || {};
  const activeCount = policies.filter((item) => clean(item.status) === "active").length;
  const draftCount = policies.filter((item) => clean(item.status) === "draft").length;
  const ready = readiness.readyForWritefulAutomationPrerequisite === true;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  const reason = status === "loading"
    ? "正在读取 failure policy。"
    : status === "failed"
      ? clean(holder.error) || "automation_failure_policies_failed"
      : ready
        ? "失败可见性和 Owner retry 策略已激活；调度仍保持关闭。"
        : "需要创建并激活 failure policy，才能进入 action handoff / scheduler 前置检查。";
  return `<section class="learning-card-generation-proposals learning-card-generation-failure-policies" data-automation-failure-policy-panel data-automation-failure-policy-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>失败策略</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-failure-policy-create ${busy ? "disabled" : ""}>${busy ? "创建中" : "创建策略"}</button>
          <button type="button" data-automation-failure-policy-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新策略"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>就绪</small><strong>${escapeHtml(ready ? "1" : "0")}</strong></span>
        <span><small>草稿</small><strong>${escapeHtml(String(draftCount))}</strong></span>
        <span><small>激活</small><strong>${escapeHtml(String(activeCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationFailurePolicyRows(holder, escapeHtml)}
      </div>
      ${automationFailurePolicyActionStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationActionHandoffStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "pending_delivery") return "待投递";
  if (value === "not_delivered") return "未投递";
  if (value === "delivered") return "已投递";
  if (value === "delivery_failed") return "投递失败";
  if (value === "delivery_pending") return "投递待定";
  if (value === "created") return "已创建";
  if (value === "failed") return "失败";
  return value || "待处理";
}

export function automationActionHandoffActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const handoff = result.handoff || {};
  if (!status || status === "idle") return "";
  const resultStatus = clean(result.deliveryStatus || handoff.deliveryStatus || handoff.delivery_status || handoff.status);
  const detail = status === "created"
    ? `Handoff 已创建：${clean(handoff.handoffId || handoff.handoff_id) || "action handoff"}。`
    : status === "delivered"
      ? `Handoff 投递状态：${automationActionHandoffStatusText(resultStatus)}。`
      : status === "submitting"
        ? "正在通过 Growth action handoff service 写入。"
        : error || "Handoff 操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-action-handoff-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationActionHandoffStatusText(status))}</em>
    </div>`;
}

export function automationActionHandoffRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const handoffs = asArray(data.handoffs).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 action handoff。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Action handoff 读取失败：${escapeHtml(clean(holder.error) || "automation_action_handoffs_failed")}</div>`;
  if (!handoffs.length) return `<div class="learning-card-generation-proposal-empty">暂无 action handoff。复核 digest 后，可以创建平台提醒元数据。</div>`;
  return handoffs.map((handoff) => {
    const handoffId = clean(handoff.handoffId || handoff.handoff_id);
    const digestId = clean(handoff.digestId || handoff.digest_id);
    const deliveryStatus = clean(handoff.deliveryStatus || handoff.delivery_status || handoff.status);
    const actionSummary = handoff.actionSummary || handoff.action_summary || {};
    const actions = asArray(handoff.actions);
    const blocked = asArray(handoff.blocked);
    const actionCount = Number(actionSummary.requiredActions || actionSummary.required_actions || actions.length || 0) || 0;
    const blockedCount = Number(actionSummary.blocked || blocked.length || 0) || 0;
    const canDeliver = handoffId && deliveryStatus !== "delivered";
    return `<div class="learning-card-generation-proposal-row" data-automation-action-handoff-row data-automation-action-handoff-id="${escapeHtml(handoffId)}">
        <span>
          <strong>${escapeHtml(handoffId || "action handoff")}</strong>
          <small>${escapeHtml(`digest ${digestId || "unknown"} · actions ${actionCount} · blocked ${blockedCount}`)}</small>
          <small>投递只创建平台 action metadata，不发布卡片、不调度。</small>
        </span>
        <em>${escapeHtml(automationActionHandoffStatusText(deliveryStatus))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-deliver data-automation-action-handoff-id="${escapeHtml(handoffId)}" ${busy || !canDeliver ? "disabled" : ""}>投递</button>
        </div>
      </div>`;
  }).join("");
}

export function automationActionHandoffDigestRows(digestsHolder = {}, handoffsHolder = {}, escapeHtml = defaultEscapeHtml) {
  const digests = asArray(digestsHolder.data?.digests).filter((digest) => clean(digest.status) === "reviewed").slice(0, 4);
  const handoffs = asArray(handoffsHolder.data?.handoffs);
  const existingDigestIds = new Set(handoffs.map((handoff) => clean(handoff.digestId || handoff.digest_id)).filter(Boolean));
  const busy = handoffsHolder.actionStatus === "submitting";
  if (!digests.length) return `<div class="learning-card-generation-proposal-empty">没有可创建 handoff 的已复核 digest。</div>`;
  return digests.map((digest) => {
    const digestId = clean(digest.digestId || digest.digest_id);
    const summary = digest.summary || {};
    const alreadyCreated = existingDigestIds.has(digestId);
    const actionCount = Number(summary.requiredActions || summary.required_actions || asArray(digest.requiredActions || digest.required_actions).length || 0) || 0;
    return `<div class="learning-card-generation-proposal-row" data-automation-action-handoff-digest-row data-automation-digest-id="${escapeHtml(digestId)}">
        <span>
          <strong>${escapeHtml(digestId || "reviewed digest")}</strong>
          <small>${escapeHtml(`已复核 digest · required actions ${actionCount}`)}</small>
        </span>
        <em>${escapeHtml(alreadyCreated ? "已建 handoff" : "可创建")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-create data-automation-digest-id="${escapeHtml(digestId)}" ${busy || alreadyCreated || !digestId ? "disabled" : ""}>创建 Handoff</button>
        </div>
      </div>`;
  }).join("");
}

export function automationActionHandoffPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationActionHandoffs || {};
  const data = holder.data || {};
  const handoffs = asArray(data.handoffs);
  const pendingDelivery = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status || item.status) !== "delivered").length;
  const delivered = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status || item.status) === "delivered").length;
  const failed = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status) === "delivery_failed").length;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const reason = status === "loading"
    ? "正在读取 action handoff。"
    : status === "failed"
      ? clean(holder.error) || "automation_action_handoffs_failed"
      : pendingDelivery
        ? "Owner 可以投递平台 action metadata；仍不会发布或调度。"
        : "从已复核 digest 创建 handoff，作为平台提醒前的 Growth 记录。";
  return `<section class="learning-card-generation-proposals learning-card-generation-action-handoffs" data-automation-action-handoff-panel data-automation-action-handoff-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>行动 Handoff</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-action-handoff-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Handoff"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待投递</small><strong>${escapeHtml(String(pendingDelivery))}</strong></span>
        <span><small>已投递</small><strong>${escapeHtml(String(delivered))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationActionHandoffDigestRows(state.automationDigests || {}, holder, escapeHtml)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationActionHandoffRows(holder, escapeHtml)}
      </div>
      ${automationActionHandoffActionStatusPanel(holder, escapeHtml)}
    </section>`;
}
