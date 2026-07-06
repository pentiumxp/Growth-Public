import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import {
  automationActionHandoffPanel,
  automationClosedLoopActionPlanPanel,
  automationCycleClosurePanel,
  automationDigestPanel,
  automationFailurePolicyPanel,
  automationProposalPanel,
  automationReviewAdvancementPanel,
  automationSchedulerExecutionPanel,
  automationSchedulerRunPanel,
  automationSchedulerWorkerTargetPanel
} from "./AutomationPanels.js";
import {
  learningProfilePanel,
  profileFeedbackPanel,
  profileFeedbackStatusText
} from "./ProfilePanel.js";
import { cycleDrilldownPanel } from "./CycleDrilldownPanel.js";
import {
  ownerAuditPanel,
  ownerAuditReviewPanel
} from "./OwnerAuditPanel.js";
import { referenceChainPanel } from "./ReferenceChainPanel.js";
import { stageAssessmentPanel } from "./StageAssessmentPanel.js";
import {
  releaseWorkbenchPanel,
  releaseWorkbenchStatusText
} from "../release/ReleaseWorkbenchView.js";

function renderOptional(renderer, ...args) {
  return typeof renderer === "function" ? renderer(...args) : "";
}

export function cardGenerationDisclosure({
  key = "",
  title = "",
  subtitle = "",
  status = "",
  body = "",
  open = false,
  escapeHtml = defaultEscapeHtml
} = {}) {
  return `<details class="learning-card-generation-disclosure" data-card-generation-disclosure="${escapeHtml(clean(key))}" ${open ? "open" : ""}>
      <summary>
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(subtitle)}</small>
        </span>
        <em>${escapeHtml(status)}</em>
      </summary>
      <div class="learning-card-generation-disclosure-body">
        ${body}
      </div>
    </details>`;
}

export function cardGenerationSecondaryReadbacks(context = {}, state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const workspaceId = options.workspaceId || "";
  const renderers = options.renderers || {};
  const profileStatus = clean(state.profileFeedback?.status || context.profileFeedback?.status || "画像");
  const actionPlanStatus = clean(state.automationClosedLoopActionPlan?.status || context.automationClosedLoopActionPlan?.status || "闭环");
  const releaseStatus = clean(state.releaseWorkbench?.status || context.releaseWorkbench?.status || "发布");
  const renderProfile = renderers.learningProfilePanel || learningProfilePanel;
  const renderProfileFeedback = renderers.profileFeedbackPanel || profileFeedbackPanel;
  const renderReferenceChain = renderers.referenceChainPanel || referenceChainPanel;
  const renderCycleDrilldown = renderers.cycleDrilldownPanel || cycleDrilldownPanel;
  const renderOwnerAudit = renderers.ownerAuditPanel || ownerAuditPanel;
  const renderOwnerAuditReview = renderers.ownerAuditReviewPanel || ownerAuditReviewPanel;
  const renderAutomationActionPlan = renderers.automationClosedLoopActionPlanPanel || automationClosedLoopActionPlanPanel;
  const renderAutomationCycleClosure = renderers.automationCycleClosurePanel || automationCycleClosurePanel;
  const renderAutomationReviewAdvancement = renderers.automationReviewAdvancementPanel || automationReviewAdvancementPanel;
  const renderAutomationProposal = renderers.automationProposalPanel || automationProposalPanel;
  const renderAutomationDigest = renderers.automationDigestPanel || automationDigestPanel;
  const renderAutomationFailurePolicy = renderers.automationFailurePolicyPanel || automationFailurePolicyPanel;
  const renderAutomationActionHandoff = renderers.automationActionHandoffPanel || automationActionHandoffPanel;
  const renderAutomationSchedulerExecution = renderers.automationSchedulerExecutionPanel || automationSchedulerExecutionPanel;
  const renderAutomationSchedulerRun = renderers.automationSchedulerRunPanel || automationSchedulerRunPanel;
  const renderAutomationSchedulerWorkerTarget = renderers.automationSchedulerWorkerTargetPanel || automationSchedulerWorkerTargetPanel;
  const renderStageAssessment = renderers.stageAssessmentPanel || ((profileContext, profileState, htmlEscape) => stageAssessmentPanel({
    context: profileContext,
    state: profileState,
    readiness: profileContext.readiness || {},
    plan: profileContext.suggestedPlan || {},
    escapeHtml: htmlEscape
  }));
  const renderReleaseWorkbench = renderers.releaseWorkbenchPanel || ((releaseContext, releaseState, htmlEscape) => releaseWorkbenchPanel(releaseContext, releaseState, {
    escapeHtml: htmlEscape
  }));
  return `<section class="learning-card-generation-secondary-readbacks" data-card-generation-secondary-readbacks>
      ${cardGenerationDisclosure({
        key: "profile",
        title: "画像与证据",
        subtitle: "能力画像、画像反馈、引用链、周期审计和 Owner 复核。",
        status: profileFeedbackStatusText(profileStatus),
        body: [
          renderProfile(context, state, escapeHtml),
          renderProfileFeedback(context, state, escapeHtml),
          renderReferenceChain(context, state, workspaceId, escapeHtml),
          renderOwnerAudit(context, state, escapeHtml),
          renderCycleDrilldown(context, state, escapeHtml),
          renderOwnerAuditReview(context, state, escapeHtml)
        ].join(""),
        escapeHtml
      })}
      ${cardGenerationDisclosure({
        key: "automation",
        title: "闭环与自动化",
        subtitle: "下一步建议、运行历史、阶段考核、提案、摘要、失败策略、交付和调度。",
        status: releaseWorkbenchStatusText(actionPlanStatus),
        body: [
          renderAutomationActionPlan(context, state, escapeHtml),
          renderOptional(renderers.operatingLoopPanel, context, state, escapeHtml),
          renderStageAssessment(context, state, escapeHtml),
          renderAutomationCycleClosure(context, state, escapeHtml),
          renderAutomationReviewAdvancement(context, state, escapeHtml),
          renderAutomationProposal(context, state, escapeHtml),
          renderAutomationDigest(context, state, escapeHtml),
          renderAutomationFailurePolicy(context, state, escapeHtml),
          renderAutomationActionHandoff(context, state, escapeHtml),
          renderAutomationSchedulerExecution(context, state, escapeHtml),
          renderAutomationSchedulerRun(context, state, escapeHtml),
          renderAutomationSchedulerWorkerTarget(context, state, escapeHtml)
        ].join(""),
        escapeHtml
      })}
      ${cardGenerationDisclosure({
        key: "release",
        title: "发布与审计",
        subtitle: "发布工作台、证据记录和 release closure 操作。",
        status: releaseWorkbenchStatusText(releaseStatus),
        body: renderReleaseWorkbench(context, state, escapeHtml),
        escapeHtml
      })}
    </section>`;
}
