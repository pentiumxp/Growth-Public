import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { releaseControlsReadbackData, releaseControlsReadbackRow } from "./ReleaseControlsView.js";
import { releaseDashboardReadbackData, releaseDashboardReadbackRow } from "./ReleaseDashboardView.js";
import { releaseInventoryReadbackData, releaseInventoryReadbackRow } from "./ReleaseInventoryView.js";
import { releaseReadinessReadbackData, releaseReadinessReadbackRows } from "./ReleaseReadinessView.js";
import { releaseWorkbenchStatusText } from "./ReleaseWorkbenchView.js";

const releaseStatusRows = Object.freeze([
  releaseControlsReadbackRow,
  releaseDashboardReadbackRow,
  releaseInventoryReadbackRow,
  ...releaseReadinessReadbackRows
]);

export function releaseStatusReadbackDataForKey(data = {}, key = "") {
  if (key === "controls") return releaseControlsReadbackData(data);
  if (key === "dashboard") return releaseDashboardReadbackData(data);
  if (key === "inventory") return releaseInventoryReadbackData(data);
  if (releaseReadinessReadbackRows.some(([rowKey]) => rowKey === key)) {
    return releaseReadinessReadbackData(data, key);
  }
  const value = data[key] || {};
  return value;
}

export function releaseStatusReadbackStatus(readback = {}, key = "") {
  const item = releaseStatusReadbackDataForKey(readback, key);
  return clean(
    item.status
      || item.releaseStatus
      || item.releaseReviewStatus
      || item.releaseAuthorizationStatus
      || item.releaseClosureStatus
      || item.releasePreflightStatus
      || item.releaseActivationStatus
      || item.runtimeEnablementStatus
      || readback[key]?.status
      || "idle"
  );
}

export function releaseStatusReadbackDetail(readback = {}, key = "") {
  const item = releaseStatusReadbackDataForKey(readback, key);
  const nextAction = item.nextAction || item.next_action || {};
  const latestId = item.latestPreflightReportId || item.latest_preflight_report_id
    || item.latestPackageId || item.latest_package_id
    || item.latestCollectionRunId || item.latest_collection_run_id
    || item.latestDecisionId || item.latest_decision_id;
  return clean(nextAction.label || nextAction.key || nextAction.action || item.reason || item.blockingReason || latestId || "summary-only");
}

export function releaseStatusReadbackRows(data = {}, escapeHtml = defaultEscapeHtml) {
  return releaseStatusRows.map(([key, label]) => {
    const status = releaseStatusReadbackStatus(data, key);
    return `<div class="learning-card-generation-release-row" data-release-status-readback-row data-release-status-readback-key="${escapeHtml(key)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(releaseStatusReadbackDetail(data, key))}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>`;
  }).join("");
}

export function releaseStatusReadbacksPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.releaseStatusReadbacks || {};
  const data = holder.data || context.releaseStatusReadbacks || {};
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
  const detail = failed
    ? clean(holder.error) || "release_status_readbacks_unavailable"
    : loading
      ? "正在读取 release controls、dashboard、review 和 activation 摘要。"
      : "只读汇总 release controls、dashboard、review、closure、preflight 和 runtime 状态。";
  return `<div class="learning-card-generation-release-status-readbacks" data-release-status-readbacks-panel data-release-status-readbacks-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布总览</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-status-readbacks-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseStatusReadbackRows(data, escapeHtml)}
      </div>
    </div>`;
}
