import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import {
  blockedAttributes,
  cardGenerationActionPanel,
  dailyLoopDraftBlockedReason,
  dailyLoopPublishBlockedReason,
  primaryGenerationBlockedReason,
  selectedPlanItem
} from "./ActionPanel.js";
import { learningLoopStatePanel } from "./LearningLoopStatePanel.js";
import { progressPanel, statusText } from "./ProgressPanel.js";
import {
  historyFacts,
  readinessRows,
  recipeOptions
} from "./ReadinessPanel.js";
import { cardGenerationDisclosure, cardGenerationSecondaryReadbacks } from "./SecondaryReadbacksPanel.js";
import {
  targetProvisioningPanel,
  targetRowsWithContext
} from "./TargetSelector.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function errorPanel(state = {}, escapeHtml = defaultEscapeHtml) {
  const error = clean(state.error);
  if (!error) return "";
  return `<div class="learning-error" data-card-generation-error>${escapeHtml(error)}</div>`;
}

export function structuredPreview(context = {}, escapeHtml = defaultEscapeHtml) {
  const plan = context.suggestedPlan || {};
  const policy = context.completionPolicy || {};
  const provisioning = context.targetProvisioning || {};
  const preview = {
    learningGraphPlan: plan.targetNodeId || "",
    targetProvisioning: {
      mode: provisioning.mode || "",
      domainPackId: provisioning.selectedDomainPackId || "",
      subject: provisioning.selectedSubject || ""
    },
    learnerSummary: "summary_only",
    learningProfile: "mastery_trajectory_projection",
    recentSignals: "bounded_experience_signals",
    cardSchema: "growth.learningCard.v1",
    completionPolicy: policy.mode || "daily_score_once"
  };
  return escapeHtml(JSON.stringify(preview, null, 2));
}

export function generatedCardPreview(result = {}, escapeHtml = defaultEscapeHtml) {
  const draft = result.draft || {};
  const published = result.published || {};
  if (!draft.title && !published.taskCardId) {
    return `<div class="learning-coin-empty">生成成功后会在这里显示卡片预览。</div>`;
  }
  const flow = draft.teachingFlow || {};
  const steps = [
    ["微课", flow.microLesson?.instruction || flow.learningTarget],
    ["例题", flow.workedExample?.instruction],
    ["练习", flow.guidedPractice?.instruction || flow.quickCheck?.instruction]
  ].filter((item) => clean(item[1]));
  return `<article class="learning-card-generation-preview-card">
      <div class="learning-card-generation-preview-head">
        <span>
          <strong>${escapeHtml(draft.title || published.taskCardId || "新卡片")}</strong>
          <small>${escapeHtml(flow.learningTarget || "日常英语练习")}</small>
        </span>
        <em>已发布</em>
      </div>
      <div class="learning-card-generation-preview-meta">
        <b>一次批改</b><b>反思最多一次</b><b>无通过线</b>
      </div>
      <div class="learning-card-generation-flow">
        ${steps.map((step, index) => `<span><em>${index + 1}</em><strong>${escapeHtml(step[0])}</strong><small>${escapeHtml(step[1])}</small></span>`).join("")}
      </div>
      ${published.taskCardId ? `<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(published.taskCardId)}">打开卡片</button>` : ""}
    </article>`;
}

export function dailyLoopPlanPreview({ draftResult = {}, publishResult = {} } = {}, escapeHtml = defaultEscapeHtml) {
  const planDraft = publishResult.planDraft || draftResult.planDraft || {};
  const publishAttempt = publishResult.publishAttempt || planDraft.publishAttempt || {};
  const generation = publishResult.generation || {};
  const item = selectedPlanItem(planDraft);
  if (!clean(planDraft.planDraftId)) {
    return `<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview>
        <div class="learning-card-generation-plan-head">
          <span>
            <strong>下一张计划</strong>
            <small>先规划，再由 Owner 明确发布。</small>
          </span>
          <em>未规划</em>
        </div>
        <div class="learning-coin-empty">点击“规划下一张”后会显示 plan draft 和候选计划项。</div>
      </section>`;
  }
  const itemTargetNodeIds = asArray(item.targetNodeIds).map(clean).filter(Boolean);
  const draftTargetNodeIds = asArray(planDraft.targetNodeIds).map(clean).filter(Boolean);
  const targets = itemTargetNodeIds.length ? itemTargetNodeIds : draftTargetNodeIds;
  const evidence = asArray(item.evidenceRequirements).map(clean).filter(Boolean);
  const publishedTaskCardId = clean(generation.published?.taskCardId || planDraft.generatedTaskCardId);
  const attemptStatus = clean(publishAttempt.status || (publishedTaskCardId ? "published" : planDraft.status));
  return `<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview data-plan-draft-id="${escapeHtml(planDraft.planDraftId)}">
      <div class="learning-card-generation-plan-head">
        <span>
          <strong>下一张计划</strong>
          <small>${escapeHtml(planDraft.planSummary || item.reason || "summary-only plan draft")}</small>
        </span>
        <em>${escapeHtml(attemptStatus || "drafted")}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>Plan draft</small><strong>${escapeHtml(planDraft.planDraftId)}</strong></span>
        <span><small>候选项</small><strong>${escapeHtml(String(Number(planDraft.itemCount || asArray(planDraft.items).length || 0) || 0))}</strong></span>
        <span><small>已发布</small><strong>${escapeHtml(publishedTaskCardId || "未发布")}</strong></span>
      </div>
      <div class="learning-card-generation-plan-row">
        <span>
          <strong>${escapeHtml(clean(item.itemId || planDraft.selectedItemId || "默认计划项"))}</strong>
          <small>${escapeHtml(item.reason || "根据学习闭环选择一张低压力日常卡。")}</small>
        </span>
        <em>${escapeHtml(clean(item.cardRole || "practice"))}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>节点</small><strong>${escapeHtml(targets.join(" · ") || "未指定")}</strong></span>
        <span><small>难度</small><strong>${escapeHtml(clean(item.difficultyBand || "foundation"))}</strong></span>
        <span><small>证据</small><strong>${escapeHtml(evidence.join(" · ") || "short_answer")}</strong></span>
      </div>
      ${publishAttempt.error ? `<div class="learning-card-generation-plan-attempt">${escapeHtml(`发布尝试失败：${publishAttempt.error}`)}</div>` : ""}
    </section>`;
}

export function ownerCardGenerationActionState({ state = {}, context = {} } = {}) {
  const readiness = context.readiness || {};
  const plan = context.suggestedPlan || {};
  const busy = ["generating", "drafting", "publishing", "advancing"].includes(state.status);
  const draftResult = state.dailyLoopDraftResult || {};
  const draftBlockedReason = busy ? "" : dailyLoopDraftBlockedReason({ state, context, readiness, plan });
  const publishBlockedReason = busy ? "" : dailyLoopPublishBlockedReason({ state, context, readiness, draftResult });
  const advanceBlockedReason = busy ? "" : primaryGenerationBlockedReason({ state, context, readiness, plan });
  const canDraft = Boolean(!busy && !draftBlockedReason);
  const canPublish = Boolean(!busy && !publishBlockedReason);
  const canAdvance = Boolean(!busy && !advanceBlockedReason);
  return {
    busy,
    canAdvance,
    canDraft,
    canPublish,
    advanceClass: `primary${canAdvance ? "" : " disabled"}`,
    draftClass: `${canDraft ? "" : "disabled"}`,
    publishClass: `primary${canPublish ? "" : " disabled"}`,
    advanceBlockedReason,
    draftBlockedReason,
    publishBlockedReason
  };
}

export function renderOwnerCardGenerationPanel(options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const state = options.state?.cardGeneration || {};
  const context = state.context || options.context || {};
  const readiness = context.readiness || {};
  const plan = context.suggestedPlan || {};
  const generated = state.generatedResult || {};
  const loading = state.status === "loading_context";
  const actionState = ownerCardGenerationActionState({ state, context });
  const draftResult = state.dailyLoopDraftResult || {};
  const publishResult = state.dailyLoopPublishResult || {};
  return `<section class="learning-card-generation-manager" data-card-generation-manager data-card-generation-status="${escapeHtml(state.status || "idle")}" aria-busy="${actionState.busy ? "true" : "false"}">
      <section class="learning-coin-panel learning-card-generation-intro">
        <div class="learning-section-heading">
          <h3>卡片生成</h3>
          <span>${escapeHtml(statusText(state.status))}</span>
        </div>
        <div class="learning-card-generation-kpis">
          ${historyFacts(context, escapeHtml)}
        </div>
        ${errorPanel(state, escapeHtml)}
      </section>
      ${progressPanel(state, escapeHtml)}

      <div class="learning-card-generation-layout">
        <section class="learning-coin-panel learning-card-generation-side">
          <div class="learning-section-heading">
            <h3>学习者</h3>
            <span>Owner</span>
          </div>
          <div class="learning-card-generation-target-list">
            ${targetRowsWithContext({ targets: options.viewTargets, context, currentWorkspaceId: options.workspaceId, escapeHtml })}
          </div>
        </section>

        <section class="learning-coin-panel learning-card-generation-main">
          <div class="learning-section-heading">
            <h3>生成设置</h3>
            <span>结构化输入</span>
          </div>
          ${loading ? `<div class="learning-growth-muted">正在加载生成上下文...</div>` : ""}
          <div class="learning-card-generation-recipes">
            ${recipeOptions(context, escapeHtml)}
          </div>
          <div class="learning-card-generation-readiness">
            ${readinessRows(context, escapeHtml)}
          </div>
          ${targetProvisioningPanel(context, state, escapeHtml)}
          ${cardGenerationActionPanel({
            state,
            plan,
            canAdvance: actionState.canAdvance,
            canDraft: actionState.canDraft,
            canPublish: actionState.canPublish,
            advanceClass: actionState.advanceClass,
            draftClass: actionState.draftClass,
            publishClass: actionState.publishClass,
            advanceBlockedAttrs: blockedAttributes(actionState.advanceBlockedReason, escapeHtml),
            draftBlockedAttrs: blockedAttributes(actionState.draftBlockedReason, escapeHtml),
            publishBlockedAttrs: blockedAttributes(actionState.publishBlockedReason, escapeHtml),
            escapeHtml
          })}
          ${learningLoopStatePanel(state, context, escapeHtml)}
          ${cardGenerationSecondaryReadbacks(context, state, {
            escapeHtml,
            workspaceId: options.workspaceId,
            renderers: options.renderers || {}
          })}
        </section>

        <section class="learning-coin-panel learning-card-generation-preview">
          <div class="learning-section-heading">
            <h3>规划与发布</h3>
            <span>${generated.published?.taskCardId ? "已发布" : "等待生成"}</span>
          </div>
          ${dailyLoopPlanPreview({ draftResult, publishResult }, escapeHtml)}
          ${generatedCardPreview(generated, escapeHtml)}
          ${cardGenerationDisclosure({
            key: "structured-preview",
            title: "结构化输入",
            subtitle: "给 Owner 审计的摘要，不作为主流程阅读负担。",
            status: "摘要",
            body: `<pre class="learning-card-generation-structured">${structuredPreview(context, escapeHtml)}</pre>
              <div class="learning-card-generation-audit">
                <span>teachingFlow contract <em></em></span>
                <span>graph binding <em></em></span>
                <span>privacy scan <em></em></span>
                <span>SQLite transaction <em></em></span>
              </div>`,
            escapeHtml
          })}
        </section>
      </div>
    </section>`;
}
