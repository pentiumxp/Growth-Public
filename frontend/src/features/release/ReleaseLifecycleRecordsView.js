import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { releaseWorkbenchStatusText } from "./ReleaseWorkbenchView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseLifecycleRecordsStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "ready") return "已读取";
  if (value === "loading") return "读取中";
  if (value === "recording") return "记录中";
  if (value === "recorded") return "已记录";
  if (value === "failed") return "失败";
  if (value === "blocked") return "已阻塞";
  return releaseWorkbenchStatusText(value);
}

export function releaseLifecycleRecordId(kind = "", record = {}) {
  const value = clean(kind);
  if (value === "preflight") return clean(record.preflightReportId || record.preflight_report_id || record.reportId || record.report_id);
  if (value === "activation") return clean(record.activationId || record.activation_id);
  if (value === "runtime") return clean(record.enablementId || record.enablement_id);
  return clean(record.id);
}

export function releaseLifecycleRecordDetail(kind = "", record = {}) {
  const value = clean(kind);
  if (value === "preflight") {
    const preflight = record.releasePreflight || record.release_preflight || record.summary || {};
    return clean(preflight.nextAction?.label || preflight.next_action?.label || record.collectionRunId || record.collection_run_id || record.createdAt || record.created_at || "summary-only preflight");
  }
  if (value === "activation") {
    const gates = asArray(record.requestedActivationGates || record.requested_activation_gates || record.activationGates || record.activation_gates)
      .map((item) => clean(typeof item === "string" ? item : item?.key))
      .filter(Boolean)
      .join(", ");
    return clean(gates || record.note || record.recordedAt || record.recorded_at || "summary-only activation");
  }
  if (value === "runtime") {
    const configKeys = asArray(record.requiredConfigKeys || record.required_config_keys)
      .map(clean)
      .filter(Boolean)
      .join(", ");
    return clean(configKeys || record.note || record.recordedAt || record.recorded_at || "summary-only runtime enablement");
  }
  return clean(record.status || "summary-only");
}

export function releaseLifecycleRecordRows(kind = "", rows = [], escapeHtml = defaultEscapeHtml) {
  const records = asArray(rows).slice(0, 3);
  if (!records.length) {
    const label = kind === "preflight" ? "Preflight" : kind === "activation" ? "Activation" : "Runtime";
    return `<div class="learning-card-generation-release-empty">${escapeHtml(label)} 暂无记录。</div>`;
  }
  return records.map((record = {}) => {
    const recordId = releaseLifecycleRecordId(kind, record);
    const status = clean(record.status || "listed");
    return `<div class="learning-card-generation-release-row" data-release-lifecycle-record-row data-release-lifecycle-record-kind="${escapeHtml(kind)}" data-release-lifecycle-record-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(recordId || kind || "release record")}</strong>
          <small>${escapeHtml(releaseLifecycleRecordDetail(kind, record))}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>`;
  }).join("");
}

export function releaseLifecycleActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const report = result.report || {};
  const activation = result.activation || {};
  const enablement = result.enablement || {};
  const recordId = clean(report.preflightReportId || activation.activationId || enablement.enablementId);
  if (!status || status === "idle") return "";
  const detail = status === "recorded"
    ? `发布记录已写入${recordId ? `：${recordId}` : "。"}`
    : status === "recording"
      ? "正在通过 Growth release lifecycle service 写入摘要记录。"
      : error || clean(result.error) || "发布记录写入失败。";
  return `<div class="learning-card-generation-release-status" data-release-lifecycle-record-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseLifecycleRecordsStatusText(status))}</em>
    </div>`;
}

export function releaseLifecycleRecordsData(data = {}) {
  return {
    preflightReports: asArray(data.preflightReports?.reports || data.preflight_reports?.reports || data.reports),
    activations: asArray(data.activations?.activations || data.releaseActivations?.activations || data.release_activations?.activations),
    runtimeEnablements: asArray(data.runtimeEnablements?.enablements || data.runtime_enablements?.enablements || data.enablements)
  };
}

export function releaseLifecycleRecordsPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.releaseLifecycleRecords || {};
  const data = holder.data || context.releaseLifecycleRecords || {};
  const { preflightReports, activations, runtimeEnablements } = releaseLifecycleRecordsData(data);
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const busy = holder.actionStatus === "recording";
  const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
  const detail = failed
    ? clean(holder.error) || "release_lifecycle_records_unavailable"
    : loading
      ? "正在读取 preflight、activation 和 runtime 记录。"
      : "显式记录发布前检查、激活审计和运行启用审计。";
  return `<div class="learning-card-generation-release-lifecycle-records" data-release-lifecycle-records-panel data-release-lifecycle-records-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布记录</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-lifecycle-records-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Preflight</small><strong>${escapeHtml(String(preflightReports.length))}</strong></span>
        <span><small>Activation</small><strong>${escapeHtml(String(activations.length))}</strong></span>
        <span><small>Runtime</small><strong>${escapeHtml(String(runtimeEnablements.length))}</strong></span>
        <span><small>权限</small><strong>Owner</strong></span>
      </div>
      <div class="learning-card-generation-release-row" data-release-lifecycle-record-controls>
        <span>
          <strong>显式 Owner 记录</strong>
          <small>记录摘要审计；runtime config 仍需在 Growth 外手动处理。</small>
        </span>
        <div class="learning-card-generation-release-row-actions">
          <button type="button" data-release-lifecycle-record="preflight" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Preflight")}</button>
          <button type="button" data-release-lifecycle-record="activation" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Activation")}</button>
          <button type="button" data-release-lifecycle-record="runtime" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Runtime")}</button>
        </div>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseLifecycleRecordRows("preflight", preflightReports, escapeHtml)}
        ${releaseLifecycleRecordRows("activation", activations, escapeHtml)}
        ${releaseLifecycleRecordRows("runtime", runtimeEnablements, escapeHtml)}
      </div>
      ${releaseLifecycleActionStatusPanel(holder, escapeHtml)}
    </div>`;
}
