import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseApprovalLedgerData(data = {}) {
  const releaseApprovals = data.releaseApprovals || data.approvals || {};
  const approvalRows = Array.isArray(data.approvals)
    ? data.approvals
    : asArray(releaseApprovals.approvals || data.approvalRows);
  return { releaseApprovals, approvalRows };
}

export function releaseApprovalLedgerRows(data = {}, { statusText, escapeHtml = defaultEscapeHtml } = {}) {
  const { approvalRows } = releaseApprovalLedgerData(data);
  const statusLabel = typeof statusText === "function" ? statusText : (status) => clean(status);
  return approvalRows.slice(0, 4).map((record = {}) => {
    const recordId = clean(record.approvalId || record.approval_id || record.id);
    const approvalKey = clean(record.approvalKey || record.approval_key || record.configGate || record.config_gate);
    const detail = [
      clean(record.approvedBy || record.approved_by),
      clean(record.note),
      clean(record.approvedAt || record.approved_at || record.updatedAt || record.updated_at)
    ].filter(Boolean).join(" · ") || "摘要审批";
    return `<div class="learning-card-generation-release-row" data-release-evidence-ledger-row data-release-evidence-ledger-kind="approval" data-release-evidence-ledger-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(approvalKey || recordId || "release approval")}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(statusLabel(record.status))}</em>
      </div>`;
  });
}
