import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { releaseEvidenceCollectionData, releaseEvidenceCollectionRows } from "./EvidenceCollectionView.js";
import { releaseApprovalLedgerData, releaseApprovalLedgerRows } from "./ReleaseEvidencePanel.js";
import { releaseWorkbenchStatusText } from "./ReleaseWorkbenchView.js";

export function releaseEvidenceLedgerStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "ready") return "已读取";
  if (value === "loading") return "读取中";
  if (value === "failed") return "失败";
  if (value === "pass") return "通过";
  if (value === "approved") return "已批准";
  if (value === "revoked") return "已撤销";
  if (value === "expired") return "已过期";
  return releaseWorkbenchStatusText(value);
}

export function releaseEvidenceLedgerData(data = {}) {
  const { releaseEvidence, evidenceRows } = releaseEvidenceCollectionData(data);
  const { releaseApprovals, approvalRows } = releaseApprovalLedgerData(data);
  return { releaseEvidence, releaseApprovals, evidenceRows, approvalRows };
}

export function releaseEvidenceLedgerRows(data = {}, escapeHtml = defaultEscapeHtml) {
  const options = { statusText: releaseEvidenceLedgerStatusText, escapeHtml };
  const rows = [
    ...releaseEvidenceCollectionRows(data, options),
    ...releaseApprovalLedgerRows(data, options)
  ];
  if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无发布证据或审批记录。</div>`;
  return rows.join("");
}

export function releaseEvidenceLedgerPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.releaseEvidenceLedger || {};
  const data = holder.data || context.releaseEvidenceLedger || {};
  const { releaseEvidence, releaseApprovals, evidenceRows, approvalRows } = releaseEvidenceLedgerData(data);
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
  const evidenceCount = Number(data.evidenceCount ?? releaseEvidence.count ?? evidenceRows.length ?? 0) || 0;
  const approvalCount = Number(data.approvalCount ?? releaseApprovals.count ?? approvalRows.length ?? 0) || 0;
  const passCount = evidenceRows.filter((row) => clean(row.status).toLowerCase() === "pass").length;
  const approvedCount = approvalRows.filter((row) => clean(row.status).toLowerCase() === "approved").length;
  const detail = failed
    ? clean(holder.error) || "release_evidence_ledger_unavailable"
    : loading
      ? "正在读取已保存的发布证据和审批记录。"
      : "只读账本；写入仍通过工作台动作和服务校验。";
  return `<div class="learning-card-generation-release-evidence-ledger" data-release-evidence-ledger-panel data-release-evidence-ledger-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>证据账本</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-evidence-ledger-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>证据</small><strong>${escapeHtml(String(evidenceCount))}</strong></span>
        <span><small>通过</small><strong>${escapeHtml(String(passCount))}</strong></span>
        <span><small>审批</small><strong>${escapeHtml(String(approvalCount))}</strong></span>
        <span><small>已批</small><strong>${escapeHtml(String(approvedCount))}</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseEvidenceLedgerRows(data, escapeHtml)}
      </div>
    </div>`;
}
