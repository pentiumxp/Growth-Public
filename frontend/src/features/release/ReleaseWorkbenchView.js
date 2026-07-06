import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseWorkbenchStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "ready" || value === "pass" || value === "ready_for_release_review") return "可记录";
  if (value === "recording") return "记录中";
  if (value === "recorded") return "已记录";
  if (value === "blocked") return "有缺口";
  if (value === "failed") return "失败";
  return value || "待检查";
}

export function releaseWorkbenchActionText(endpointKey = "") {
  const value = clean(endpointKey).toLowerCase();
  if (value === "release_evidence") return "记录证据";
  if (value === "release_approval") return "记录审批";
  if (value === "release_evidence_collection") return "收集证据";
  if (value === "release_decision") return "记录决策";
  if (value === "release_activation") return "记录激活";
  if (value === "runtime_enablement") return "记录启用";
  if (value === "release_package") return "需要包体";
  return "查看";
}

export function releaseWorkbenchActionAuditStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "listed") return "已读取";
  if (value === "recorded") return "已记录";
  if (value === "blocked") return "已阻塞";
  if (value === "failed") return "失败";
  if (value === "loading") return "读取中";
  return releaseWorkbenchStatusText(value);
}

export function releaseWorkbenchSupportedEndpoint(endpointKey = "") {
  return [
    "release_evidence",
    "release_approval",
    "release_evidence_collection",
    "release_decision",
    "release_package",
    "release_activation",
    "runtime_enablement"
  ].includes(clean(endpointKey).toLowerCase());
}

export function releasePackageCandidateFromHolder(holder = {}) {
  const result = holder.packageResult || {};
  const candidate = holder.packageCandidate || result.package || result.releasePackage || result.release_package;
  return candidate && typeof candidate === "object" ? candidate : null;
}

export function releaseWorkbenchActionAuditRows(audits = [], escapeHtml = defaultEscapeHtml) {
  const rows = asArray(audits).slice(0, 5);
  if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无 release action audit。</div>`;
  return rows.map((audit = {}) => {
    const actionAuditId = clean(audit.actionAuditId || audit.action_audit_id);
    const endpointKey = clean(audit.endpointKey || audit.endpoint_key);
    const actionKey = clean(audit.actionKey || audit.action_key);
    const recordId = clean(audit.recordId || audit.record_id);
    const recordStatus = clean(audit.recordStatus || audit.record_status);
    const detail = [
      endpointKey,
      actionKey,
      recordId ? `record:${recordId}` : "",
      recordStatus
    ].filter(Boolean).join(" · ") || "summary-only audit";
    return `<div class="learning-card-generation-release-row" data-release-workbench-action-audit-row data-release-workbench-action-audit-id="${escapeHtml(actionAuditId)}">
        <span>
          <strong>${escapeHtml(actionAuditId || actionKey || endpointKey || "action audit")}</strong>
          <small>${escapeHtml(clean(audit.error) || detail)}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchActionAuditStatusText(audit.status))}</em>
      </div>`;
  }).join("");
}

export function releaseWorkbenchActionAuditsPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.releaseWorkbenchActionAudits || {};
  const data = holder.data || context.releaseWorkbenchActionAudits || {};
  const audits = asArray(data.actionAudits || data.action_audits);
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(data.status || holder.status || "idle");
  const detail = failed
    ? clean(holder.error) || "release_workbench_action_audits_unavailable"
    : loading
      ? "正在读取 release workbench action audit。"
      : `${Number(data.actionAuditCount ?? audits.length ?? 0) || 0} 条 summary-only action audit。`;
  return `<div class="learning-card-generation-release-action-audits" data-release-workbench-action-audits-panel data-release-workbench-action-audits-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>操作审计</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-workbench-action-audits-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Audit</small><strong>${escapeHtml(String(Number(data.actionAuditCount ?? audits.length ?? 0) || 0))}</strong></span>
        <span><small>状态</small><strong>${escapeHtml(releaseWorkbenchActionAuditStatusText(status))}</strong></span>
        <span><small>权限</small><strong>Owner</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseWorkbenchActionAuditRows(audits, escapeHtml)}
      </div>
    </div>`;
}

export function releaseWorkbenchActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const record = result.actionRecord || {};
  if (!status || status === "idle") return "";
  const detail = status === "recorded"
    ? `已写入 ${clean(result.endpointKey || record.endpointKey || "release")} 记录${clean(record.recordId) ? `：${clean(record.recordId)}` : "。"}`
    : status === "recording"
      ? "正在写入 release workbench 摘要记录。"
      : error || "记录失败。";
  return `<div class="learning-card-generation-release-status" data-release-workbench-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
    </div>`;
}

export function releasePackageStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.packageStatus);
  const error = clean(holder.packageError);
  const result = holder.packageResult || {};
  const candidate = releasePackageCandidateFromHolder(holder);
  if (!status || status === "idle") return "";
  const summary = candidate?.summary || result.summary || {};
  const packageId = clean(candidate?.packageId || candidate?.package_id || candidate?.id || summary.packageId || summary.package_id);
  const packageStatus = clean(candidate?.status || summary.status || result.status || status);
  const stepCount = Number(candidate?.stepCount ?? summary.stepCount ?? (Array.isArray(candidate?.steps) ? candidate.steps.length : 0)) || 0;
  const detail = status === "building"
    ? "正在构建 summary-only release package candidate。"
    : status === "ready"
      ? `包候选已构建${packageId ? `：${packageId}` : "。"}${packageStatus ? ` · ${packageStatus}` : ""}${stepCount ? ` · ${stepCount} steps` : ""}`
      : status === "blocked"
        ? `包候选仍阻塞${packageStatus ? `：${packageStatus}` : "。"}${error ? ` · ${error}` : ""}`
        : error || "包候选构建失败。";
  return `<div class="learning-card-generation-release-status" data-release-package-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
    </div>`;
}

export function releasePackageActionRow(action = {}, holder = {}, escapeHtml = defaultEscapeHtml) {
  const endpointKey = clean(action.endpointKey || action.endpoint_key);
  const actionKey = clean(action.key || action.actionKey || action.action_key);
  const buildBusy = holder.packageStatus === "building";
  const recordBusy = holder.actionStatus === "recording";
  const candidate = releasePackageCandidateFromHolder(holder);
  const disabledReason = !candidate
    ? "先构建 summary-only release package candidate，再记录 package。"
    : recordBusy ? "正在记录上一条 release action。" : "";
  return `<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${escapeHtml(endpointKey || "unsupported")}">
      <span>
        <strong>${escapeHtml(clean(action.label) || actionKey || "Record release package")}</strong>
        <small>${escapeHtml(clean(action.source || action.action || "build package candidate before recording"))}</small>
      </span>
      <div class="learning-card-generation-release-row-actions">
        <button type="button"
          data-release-package-build
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${buildBusy || recordBusy ? "disabled" : ""}>${escapeHtml(buildBusy ? "构建中" : "构建包候选")}</button>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${disabledReason ? `data-release-workbench-blocked-reason="${escapeHtml(disabledReason)}"` : ""}
          ${!candidate || buildBusy || recordBusy ? "disabled" : ""}>${escapeHtml(recordBusy ? "记录中" : "记录包")}</button>
      </div>
    </div>`;
}

export function releaseWorkbenchActionRows(actions = [], holder = {}, escapeHtml = defaultEscapeHtml) {
  const busy = holder.actionStatus === "recording";
  if (!actions.length) return `<div class="learning-card-generation-release-empty">暂无需要 Owner 记录的 release action。</div>`;
  return actions.slice(0, 6).map((action) => {
    const endpointKey = clean(action.endpointKey || action.endpoint_key);
    const actionKey = clean(action.key || action.actionKey || action.action_key);
    if (endpointKey === "release_package") return releasePackageActionRow(action, holder, escapeHtml);
    const supported = releaseWorkbenchSupportedEndpoint(endpointKey);
    const disabled = busy || !supported;
    const detail = action.externalActionRequired
      ? "先在 Growth 外确认配置，再记录摘要"
      : clean(action.source || action.action || "release workbench");
    const disabledReason = !supported
      ? "当前界面只支持 evidence、approval、evidence collection、activation 和 runtime enablement。"
      : busy ? "正在记录上一条 release action。" : "";
    return `<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${escapeHtml(endpointKey || "unsupported")}">
        <span>
          <strong>${escapeHtml(clean(action.label) || actionKey || releaseWorkbenchActionText(endpointKey))}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${disabledReason ? `data-release-workbench-blocked-reason="${escapeHtml(disabledReason)}"` : ""}
          ${disabled ? "disabled" : ""}>${escapeHtml(busy && supported ? "记录中" : releaseWorkbenchActionText(endpointKey))}</button>
      </div>`;
  }).join("");
}

export function releaseWorkbenchPanel(context = {}, state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const renderers = options.renderers || {};
  const holder = state.releaseWorkbench || {};
  const data = holder.data || context.releaseWorkbench || {};
  const summary = data.releaseWorkbench || data;
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(summary.status || data.status || holder.status);
  const actions = asArray(summary.ownerActions || summary.owner_actions);
  const inventory = summary.inventory || data.releaseInventory || {};
  const missingEvidenceKeys = asArray(summary.missingEvidenceKeys).length ? summary.missingEvidenceKeys : summary.missingCheckKeys;
  const nextAction = summary.nextAction || actions[0] || {};
  const reason = failed
    ? clean(holder.error) || "release_workbench_unavailable"
    : loading
      ? "正在读取 release readiness、controls、dashboard 和 inventory 摘要。"
      : clean(nextAction.label || nextAction.action || "Owner 可以按缺口记录 release evidence。");
  return `<section class="learning-card-generation-release-workbench" data-release-workbench-panel data-release-workbench-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布工作台</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>待处理</small><strong>${escapeHtml(String(Number(summary.ownerActionCount ?? actions.length ?? 0) || 0))}</strong></span>
        <span><small>证据缺口</small><strong>${escapeHtml(String(asArray(missingEvidenceKeys).length))}</strong></span>
        <span><small>审批缺口</small><strong>${escapeHtml(String(asArray(summary.missingApprovalKeys).length))}</strong></span>
        <span><small>记录缺口</small><strong>${escapeHtml(String(asArray(summary.missingRecordKinds || inventory.missingRecordKinds).length))}</strong></span>
      </div>
      ${renderers.releaseArtifactTemplatePanel?.(context, state, escapeHtml) || ""}
      ${releaseWorkbenchActionAuditsPanel(context, state, escapeHtml)}
      ${renderers.releaseStatusReadbacksPanel?.(context, state, escapeHtml) || ""}
      ${renderers.releaseEvidenceLedgerPanel?.(context, state, escapeHtml) || ""}
      ${renderers.releaseLifecycleRecordsPanel?.(context, state, escapeHtml) || ""}
      <div class="learning-card-generation-release-actions">
        ${releaseWorkbenchActionRows(actions, holder, escapeHtml)}
      </div>
      ${releasePackageStatusPanel(holder, escapeHtml)}
      ${releaseWorkbenchActionStatusPanel(holder, escapeHtml)}
    </section>`;
}
