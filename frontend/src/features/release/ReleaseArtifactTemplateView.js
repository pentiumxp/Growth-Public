import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import { releaseWorkbenchStatusText } from "./ReleaseWorkbenchView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseArtifactTemplateStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "artifact_manifest_required") return "需补证据";
  if (value === "release_evidence_actions_required") return "需执行";
  if (value === "release_evidence_ready_for_review") return "可复核";
  if (value === "no_artifact_manifest_required") return "无需 manifest";
  return releaseWorkbenchStatusText(value);
}

export function releaseArtifactTemplateData(context = {}, state = {}) {
  const holder = state.releaseArtifactTemplate || {};
  const data = holder.data || context.releaseArtifactTemplate || {};
  const template = data.releaseArtifactTemplate || data || {};
  return { holder, data, template };
}

export function releaseArtifactSlotRows(slots = [], escapeHtml = defaultEscapeHtml) {
  const rows = asArray(slots).slice(0, 4);
  if (!rows.length) return `<div class="learning-card-generation-release-empty">当前没有中心视觉/UI artifact slot。</div>`;
  return rows.map((slot = {}) => {
    const label = clean(slot.uiGate || slot.evidenceKey || slot.taskId || "artifact");
    const detail = clean(slot.source || slot.checkKey || slot.manifestField || slot.manifestKey || "summary-only");
    return `<div class="learning-card-generation-release-row" data-release-artifact-slot data-release-artifact-task-id="${escapeHtml(clean(slot.taskId))}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(slot.required === false ? "可选" : "必需")}</em>
      </div>`;
  }).join("");
}

export function releaseChecklistRows(checklist = {}, escapeHtml = defaultEscapeHtml) {
  const rows = asArray(checklist.items).slice(0, 6);
  if (!rows.length) return `<div class="learning-card-generation-release-empty">证据清单暂时没有阻塞项。</div>`;
  return rows.map((item = {}) => {
    const key = clean(item.key || item.taskId || item.evidenceKey || item.checkKey || "checklist");
    const label = clean(item.label || item.title || item.evidenceKey || item.checkKey || key);
    const detail = clean(item.commandName || item.routePath || item.kind || item.status || "summary-only");
    return `<div class="learning-card-generation-release-row" data-release-artifact-checklist-item data-release-artifact-checklist-key="${escapeHtml(key)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(clean(item.status || item.kind || "待补齐"))}</em>
      </div>`;
  }).join("");
}

export function releaseActionPlanRows(actionPlan = {}, escapeHtml = defaultEscapeHtml) {
  const rows = asArray(actionPlan.actions).slice(0, 5);
  if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无额外行动计划。</div>`;
  return rows.map((action = {}) => {
    const key = clean(action.key || action.action || "action");
    const label = clean(action.label || action.action || key);
    const route = action.route || action.followupRoute || {};
    const detail = clean(route.path || action.directCollectionRoutePath || action.readyPhase || action.status || "Owner action plan");
    const ready = action.readyToSubmit === true;
    return `<div class="learning-card-generation-release-row" data-release-artifact-action-plan data-release-artifact-action-key="${escapeHtml(key)}" data-release-artifact-action-ready="${ready ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(ready ? "可提交" : "待前置")}</em>
      </div>`;
  }).join("");
}

export function releaseArtifactTemplatePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const { holder, data, template } = releaseArtifactTemplateData(context, state);
  const checklist = template.releaseEvidenceChecklist || {};
  const actionPlan = template.releaseEvidenceActionPlan || {};
  const loading = holder.status === "loading";
  const failed = holder.status === "failed";
  const status = failed ? "failed" : loading ? "loading" : clean(template.status || data.status || holder.status);
  const nextAction = actionPlan.nextSubmittableAction || actionPlan.nextAction || template.nextAction || {};
  const detail = failed
    ? clean(holder.error) || "release_artifact_template_unavailable"
    : loading
      ? "正在读取中心视觉/UI 证据模板。"
      : clean(nextAction.label || nextAction.action || nextAction.key || "按证据清单补齐 release evidence。");
  return `<div class="learning-card-generation-release-artifact-template" data-release-artifact-template-panel data-release-artifact-template-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>证据清单</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-artifact-template-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Artifact slots</small><strong>${escapeHtml(String(Number(template.artifactSlotCount ?? asArray(template.artifactSlots).length ?? 0) || 0))}</strong></span>
        <span><small>Checklist</small><strong>${escapeHtml(String(Number(checklist.itemCount ?? asArray(checklist.items).length ?? 0) || 0))}</strong></span>
        <span><small>可提交</small><strong>${escapeHtml(String(Number(actionPlan.submittableActionCount ?? 0) || 0))}</strong></span>
        <span><small>阶段</small><strong>${escapeHtml(clean(actionPlan.readyPhase || status || "idle"))}</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseArtifactSlotRows(template.artifactSlots, escapeHtml)}
        ${releaseChecklistRows(checklist, escapeHtml)}
        ${releaseActionPlanRows(actionPlan, escapeHtml)}
      </div>
      <div class="learning-card-generation-release-status" data-release-artifact-template-readback="${escapeHtml(status || "idle")}">
        <span>${escapeHtml(`Manifest ${template.readyForManifestInput ? "已准备" : "待中心视觉/UI artifact"} · ${clean(template.manifestSchemaVersion || template.artifactManifestTemplate?.schemaVersion || "summary-only")}`)}</span>
        <em>${escapeHtml(releaseArtifactTemplateStatusText(status))}</em>
      </div>
    </div>`;
}
