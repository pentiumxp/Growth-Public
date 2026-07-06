import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { isFanfanSampleTarget, selectedProvisionDraft } from "./generationModel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function targetProvisionModeText(mode = "") {
  const value = clean(mode).toLowerCase();
  if (value === "sample_default") return "sample";
  if (value === "explicit_provision") return "已开通";
  if (value === "not_provisioned") return "未开通";
  return value || "未确认";
}

export function provisioningReasonText(code = "") {
  const value = clean(code);
  const map = {
    learning_target_not_provisioned: "该学习者还没有开通这个学习目标。",
    learning_domain_pack_options_unavailable: "当前没有可用的知识图谱 domain pack。",
    learning_domain_pack_not_provisioned: "该 domain pack 尚未为这个学习者开通。",
    learning_domain_pack_not_found: "选择的 domain pack 不存在。",
    learning_subject_not_provisioned: "该科目尚未为这个学习者开通。",
    learning_subject_not_found: "选择的科目不在这个 domain pack 中。",
    learning_target_node_not_in_provision: "选择的图谱节点不属于已开通范围。",
    learning_target_workspace_required: "缺少目标学习者 workspace。",
    learning_target_provision_repository_unavailable: "目标开通仓库不可用。"
  };
  return map[value] || value || "目标开通状态来自 Growth provisioning service。";
}

export function provisionStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "加载中";
  if (value === "submitting") return "开通中";
  if (value === "submitted") return "已开通";
  if (value === "failed") return "失败";
  return "待确认";
}

export function targetRows(targets = [], currentWorkspaceId = "", context = {}, escapeHtml = defaultEscapeHtml) {
  const rows = asArray(targets).filter((target) => clean(target.workspaceId));
  if (!rows.length) return `<div class="learning-coin-empty">暂无可选学习者。</div>`;
  const activeWorkspaceId = clean(currentWorkspaceId);
  const contextTarget = context.target || {};
  const provisioning = context.targetProvisioning || {};
  return rows.map((target) => {
    const workspaceId = clean(target.workspaceId);
    const active = activeWorkspaceId ? workspaceId === activeWorkspaceId : Boolean(target.current);
    const contextMatches = clean(contextTarget.workspaceId) === workspaceId;
    const enabled = Boolean(target.targetEnabled || target.enabled || isFanfanSampleTarget(target) || (contextMatches && contextTarget.enabled));
    const mode = contextMatches ? clean(provisioning.mode) : "";
    const status = enabled ? targetProvisionModeText(mode || (isFanfanSampleTarget(target) ? "sample_default" : "explicit_provision")) : "可开通";
    return `<button type="button" class="learning-card-generation-target${active ? " active" : ""}${enabled ? "" : " needs-provision"}"
        data-card-generation-target="${escapeHtml(workspaceId)}">
        <span>
          <strong>${escapeHtml(target.label || workspaceId)}</strong>
          <small>${escapeHtml(workspaceId)}${enabled ? ` · ${status}` : " · 需开通"}</small>
        </span>
        <em>${escapeHtml(status)}</em>
      </button>`;
  }).join("");
}

export function targetRowsWithContext({ targets = [], context = {}, currentWorkspaceId = "", escapeHtml = defaultEscapeHtml } = {}) {
  const rows = asArray(targets).filter((target) => clean(target.workspaceId));
  const contextTarget = context.target || {};
  const contextWorkspaceId = clean(contextTarget.workspaceId);
  if (contextWorkspaceId && !rows.some((target) => clean(target.workspaceId) === contextWorkspaceId)) {
    rows.push({
      workspaceId: contextWorkspaceId,
      learnerId: contextTarget.learnerId,
      displayName: contextTarget.displayName,
      label: contextTarget.displayName || contextWorkspaceId,
      enabled: contextTarget.enabled,
      current: contextWorkspaceId === clean(currentWorkspaceId)
    });
  }
  return targetRows(rows, currentWorkspaceId, context, escapeHtml);
}

export function targetProvisioningPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const provisioning = context.targetProvisioning || {};
  const draft = selectedProvisionDraft(context, state.targetProvisionDraft || {});
  const status = clean(state.targetProvisionDraft?.status || "idle");
  const targetEnabled = provisioning.targetEnabled === true || context.target?.enabled === true;
  const busy = status === "loading" || status === "submitting";
  const packOptions = draft.packs.map((pack) => {
    const id = clean(pack.domainPackId || pack.domain_pack_id);
    const label = clean(pack.title || pack.domain || id);
    return `<option value="${escapeHtml(id)}"${id === draft.domainPackId ? " selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
  const subjectOptions = draft.subjects.map((subject) => `<option value="${escapeHtml(subject)}"${subject === draft.subject ? " selected" : ""}>${escapeHtml(subject)}</option>`).join("");
  const canProvision = Boolean(draft.domainPackId && draft.subject && !busy);
  const statusDetail = clean(state.targetProvisionDraft?.error)
    || (targetEnabled
      ? `${targetProvisionModeText(provisioning.mode)} · ${draft.domainPackId || "domain pack"} · ${draft.subject || "subject"}`
      : provisioningReasonText(provisioning.error || "learning_target_not_provisioned"));
  return `<section class="learning-card-generation-provisioning" data-card-generation-target-provisioning data-target-provisioning-enabled="${targetEnabled ? "true" : "false"}">
      <div class="learning-card-generation-provisioning-head">
        <span>
          <strong>学习目标</strong>
          <small>${escapeHtml(statusDetail)}</small>
        </span>
        <em>${escapeHtml(targetEnabled ? "可规划" : provisionStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-provisioning-grid">
        <label>
          <span>Domain pack</span>
          <select data-card-generation-domain-pack ${busy || !draft.packs.length ? "disabled" : ""}>
            ${packOptions || `<option value="">暂无 domain pack</option>`}
          </select>
        </label>
        <label>
          <span>Subject</span>
          <select data-card-generation-subject ${busy || !draft.subjects.length ? "disabled" : ""}>
            ${subjectOptions || `<option value="">暂无 subject</option>`}
          </select>
        </label>
      </div>
      <div class="learning-card-generation-provisioning-actions">
        <span>${escapeHtml(targetEnabled ? "选择会刷新上下文，规划仍由服务端决定图谱节点。" : "Owner 需要先显式开通该学习者的目标范围。")}</span>
        <button type="button" data-card-generation-apply-target ${busy || !draft.domainPackId ? "disabled" : ""}>应用选择</button>
        <button type="button" class="primary" data-card-generation-provision-target ${canProvision ? "" : "disabled"}>${busy ? "处理中" : targetEnabled ? "更新开通" : "开通目标"}</button>
      </div>
    </section>`;
}
