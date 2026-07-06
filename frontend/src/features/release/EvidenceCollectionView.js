import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseEvidenceCollectionData(data = {}) {
  const releaseEvidence = data.releaseEvidence || data.evidence || {};
  const evidenceRows = Array.isArray(data.evidence)
    ? data.evidence
    : asArray(releaseEvidence.evidence || data.evidenceRows);
  return { releaseEvidence, evidenceRows };
}

export function releaseEvidenceCollectionRows(data = {}, { statusText, escapeHtml = defaultEscapeHtml } = {}) {
  const { evidenceRows } = releaseEvidenceCollectionData(data);
  const statusLabel = typeof statusText === "function" ? statusText : (status) => clean(status);
  return evidenceRows.slice(0, 4).map((record = {}) => {
    const recordId = clean(record.evidenceRecordId || record.evidence_record_id || record.evidenceId || record.evidence_id || record.id);
    const evidenceKey = clean(record.evidenceKey || record.evidence_key || record.key || record.checkKey || record.check_key);
    const checkKey = clean(record.checkKey || record.check_key);
    const detail = [
      checkKey,
      clean(record.note),
      clean(record.observedAt || record.observed_at || record.updatedAt || record.updated_at)
    ].filter(Boolean).join(" · ") || "摘要证据";
    return `<div class="learning-card-generation-release-row" data-release-evidence-ledger-row data-release-evidence-ledger-kind="evidence" data-release-evidence-ledger-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(evidenceKey || recordId || "release evidence")}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(statusLabel(record.status))}</em>
      </div>`;
  });
}
