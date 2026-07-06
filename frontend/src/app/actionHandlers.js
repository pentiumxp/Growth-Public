import {
  createAutomationActionHandoffDeliverPayload,
  createAutomationActionHandoffPayload,
  createAutomationCycleClosurePayload,
  createAutomationDigestCreatePayload,
  createAutomationDigestReviewPayload,
  createAutomationFailurePolicyCreatePayload,
  createAutomationFailurePolicyReviewPayload,
  createAutomationReviewAdvancementPayload,
  createAutomationProposalCreatePayload,
  createAutomationProposalDecisionPayload,
  createAutomationProposalPublishPayload,
  createAutomationSchedulerExecutionPayload,
  createAutomationSchedulerRunPayload,
  createAutomationSchedulerWorkerTargetPayload,
  createAutomationSchedulerWorkerTargetReviewPayload,
  createOperatingLoopAdvancePayload,
  createRecommendationLifecycleDecisionPayload
} from "../features/card-generation/automationPayloads.js";
import { clean } from "../utils/string.js";
import {
  applyContextReadback,
  automationDataItems,
  cardGenerationState,
  contextFor,
  findById,
  findRecommendationLifecycleItem,
  readbackFailedPatch,
  readbackLoadingPatch,
  readbackReadyPatch,
  selectedWorkspaceId
} from "./actionHandlerUtils.js";
import { createReleaseActionHandlers } from "./releaseActionHandlers.js";

export function createReadbackActionHandlers({
  state = {},
  api = {},
  render,
  getCurrentWorkspaceId = () => "",
  isOwner = () => true,
  payloadBuilders = {},
  refreshers = {}
} = {}) {
  async function runReadback({
    slot,
    contextKey,
    actionSlots = false,
    createPayload,
    fetchResult,
    statusFromResult,
    options = {}
  } = {}) {
    const cardGeneration = cardGenerationState(state);
    const context = contextFor(state);
    if (!isOwner() || !context) return null;
    const targetWorkspaceId = selectedWorkspaceId(state, getCurrentWorkspaceId());
    const previous = cardGeneration[slot] || {};
    cardGeneration[slot] = readbackLoadingPatch(previous, actionSlots);
    if (!options.silent && typeof render === "function") render(state);
    try {
      const payload = typeof createPayload === "function"
        ? createPayload({ context, workspaceId: targetWorkspaceId, state: cardGeneration })
        : null;
      const result = await fetchResult({ payload, targetWorkspaceId, context });
      const status = typeof statusFromResult === "function" ? statusFromResult(result).status : "ready";
      const error = typeof statusFromResult === "function" ? statusFromResult(result).error : "";
      cardGeneration[slot] = readbackReadyPatch(result, previous, actionSlots, status, error);
      applyContextReadback(cardGeneration, context, contextKey, result);
      if (!options.silent && typeof render === "function") render(state);
      return result;
    } catch (error) {
      cardGeneration[slot] = readbackFailedPatch(error, previous, actionSlots);
      if (!options.silent && typeof render === "function") render(state);
      return null;
    }
  }

  async function refreshReleaseWorkbench(targetWorkspaceId, context) {
    if (typeof refreshers.refreshReleaseWorkbench === "function") {
      await refreshers.refreshReleaseWorkbench(targetWorkspaceId, context);
    }
  }

  async function refreshAutomationStack(targetWorkspaceId, context) {
    if (typeof refreshers.refreshAutomationStack === "function") {
      await refreshers.refreshAutomationStack(targetWorkspaceId, context);
    }
  }

  async function refreshRecommendationLifecycle(targetWorkspaceId, context) {
    if (typeof refreshers.refreshRecommendationLifecycle === "function") {
      await refreshers.refreshRecommendationLifecycle(targetWorkspaceId, context);
    }
  }

  async function refreshOwnerCycleDrilldown(options = {}) {
    if (typeof refreshers.refreshOwnerCycleDrilldown === "function") {
      await refreshers.refreshOwnerCycleDrilldown(options);
    }
  }

  async function refreshOperatingLoopRuns(targetWorkspaceId, context, options = {}) {
    if (typeof refreshers.refreshOperatingLoopRuns === "function") {
      await refreshers.refreshOperatingLoopRuns(targetWorkspaceId, context, options);
    }
  }

  async function refreshProfileFeedback(targetWorkspaceId, context, options = {}) {
    if (typeof refreshers.refreshProfileFeedback === "function") {
      await refreshers.refreshProfileFeedback(targetWorkspaceId, context, options);
    }
  }

  async function refreshAutomationActionHandoffs(targetWorkspaceId, context, options = {}) {
    if (typeof refreshers.refreshAutomationActionHandoffs === "function") {
      await refreshers.refreshAutomationActionHandoffs(targetWorkspaceId, context, options);
    }
  }

  async function refreshAutomationClosedLoopActionPlan(targetWorkspaceId, context, options = {}) {
    if (typeof refreshers.refreshAutomationClosedLoopActionPlan === "function") {
      await refreshers.refreshAutomationClosedLoopActionPlan(targetWorkspaceId, context, options);
    }
  }

  function findAutomationActionHandoff(cardGeneration = {}, handoffId = "") {
    return findById(
      automationDataItems(cardGeneration, "automationActionHandoffs", "handoffs"),
      handoffId,
      ["handoffId", "handoff_id"]
    );
  }

  async function invokeClosedLoopDelegate(actionKey = "", env = {}) {
    const delegates = {
      run_learning_loop_next: refreshers.advanceOperatingLoopFromUi || refreshers.advanceOperatingLoop,
      prepare_cycle_closure: refreshers.prepareAutomationCycleClosureFromUi || refreshers.prepareAutomationCycleClosure,
      advance_review: refreshers.advanceAutomationReviewFromUi || refreshers.advanceAutomationReview
    };
    const delegate = delegates[actionKey];
    if (typeof delegate !== "function") {
      throw new Error(`${actionKey || "automation_closed_loop_action"}_handler_unavailable`);
    }
    return delegate(env);
  }

  async function deliverClosedLoopActionHandoff(handoffId = "", { cardGeneration, context, targetWorkspaceId } = {}) {
    let handoff = findAutomationActionHandoff(cardGeneration, handoffId);
    if (!handoff) {
      await refreshAutomationActionHandoffs(targetWorkspaceId, context, { silent: true });
      handoff = findAutomationActionHandoff(cardGeneration, handoffId);
    }
    if (!handoff) throw new Error("automation_action_handoff_id_required");
    const payload = createAutomationActionHandoffDeliverPayload({ context, workspaceId: targetWorkspaceId, handoff });
    return api.deliverGrowthAutomationActionHandoff(handoffId, payload, targetWorkspaceId);
  }

  async function runPostPublishRefresh(targetWorkspaceId, cardGeneration) {
    if (typeof refreshers.clearDetailCache === "function") {
      refreshers.clearDetailCache();
    }
    if (typeof refreshers.loadCurrentWorkspace === "function") {
      try {
        await refreshers.loadCurrentWorkspace();
      } catch (refreshError) {
        cardGeneration.automationProposals = Object.assign({}, cardGeneration.automationProposals || {}, {
          actionError: `建议已处理，但刷新列表失败：${refreshError?.message || String(refreshError)}`
        });
      }
    }
    if (typeof refreshers.refreshCardGenerationContextAfterPublish === "function") {
      await refreshers.refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "建议已处理，但" });
    }
    await refreshAutomationStack(targetWorkspaceId, cardGeneration.context || contextFor(state));
    await refreshOwnerCycleDrilldown({ silent: true });
  }

  async function runPostOperatingLoopRefresh(targetWorkspaceId, cardGeneration) {
    if (typeof refreshers.clearDetailCache === "function") {
      refreshers.clearDetailCache();
    }
    if (typeof refreshers.loadCurrentWorkspace === "function") {
      try {
        await refreshers.loadCurrentWorkspace();
      } catch (refreshError) {
        cardGeneration.error = `闭环已执行，但刷新列表失败：${refreshError?.message || String(refreshError)}`;
      }
    }
    if (typeof refreshers.refreshCardGenerationContextAfterPublish === "function") {
      await refreshers.refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "闭环已执行，但" });
    }
    const refreshedContext = cardGeneration.context || contextFor(state);
    await refreshOperatingLoopRuns(targetWorkspaceId, refreshedContext, { silent: true });
    await refreshOwnerCycleDrilldown({ silent: true });
    await refreshProfileFeedback(targetWorkspaceId, refreshedContext, { silent: true });
  }

  function releaseActionContext() {
    const cardGeneration = cardGenerationState(state);
    const context = contextFor(state);
    if (!context) throw new Error("card_generation_context_required");
    const targetWorkspaceId = selectedWorkspaceId(state, getCurrentWorkspaceId());
    return { cardGeneration, context, targetWorkspaceId };
  }

  async function runActionSlot({ slot, submittingStatus = "submitting", successStatus = "ready", actionErrorFromResult, action, afterSuccess, afterFailure } = {}) {
    const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
    const previous = cardGeneration[slot] || {};
    cardGeneration[slot] = Object.assign({}, previous, {
      actionStatus: submittingStatus,
      actionResult: previous.actionResult || null,
      actionError: ""
    });
    if (typeof render === "function") render(state);
    try {
      const result = await action({ cardGeneration, context, targetWorkspaceId });
      const nextStatus = typeof successStatus === "function" ? successStatus(result) : successStatus;
      const nextError = typeof actionErrorFromResult === "function" ? actionErrorFromResult(result) : "";
      cardGeneration[slot] = Object.assign({}, cardGeneration[slot], {
        actionStatus: nextStatus,
        actionResult: result,
        actionError: nextError
      });
      if (typeof afterSuccess === "function") await afterSuccess({ cardGeneration, context, targetWorkspaceId, result });
      if (typeof render === "function") render(state);
      return result;
    } catch (error) {
      cardGeneration[slot] = Object.assign({}, cardGeneration[slot], {
        actionStatus: "failed",
        actionError: error?.message || String(error)
      });
      if (typeof afterFailure === "function") await afterFailure({ cardGeneration, context, targetWorkspaceId, error });
      if (typeof render === "function") render(state);
      return null;
    }
  }

  const releaseHandlers = createReleaseActionHandlers({
    api,
    render,
    state,
    runReadback,
    runActionSlot,
    releaseActionContext,
    refreshReleaseWorkbench
  });

  const handlers = {
    ...releaseHandlers,
    refreshProfileFeedback(action = {}) {
      const createPayload = payloadBuilders.createProfileFeedbackQueryPayload;
      return runReadback({
        slot: "profileFeedback",
        contextKey: "profileFeedback",
        createPayload({ context, workspaceId, state: cardGeneration }) {
          if (typeof createPayload !== "function") {
            throw new Error("profile_feedback_payload_builder_unavailable");
          }
          return createPayload({
            context,
            workspaceId,
            selectedCycle: cardGeneration.cycleHistory?.selectedCycle || {}
          });
        },
        fetchResult: ({ payload, targetWorkspaceId }) => api.fetchGrowthProfileFeedback(payload, targetWorkspaceId),
        statusFromResult(result = {}) {
          if (result.ok === false) {
            return {
              status: clean(result.status || "blocked"),
              error: clean(result.error || "profile_feedback_blocked")
            };
          }
          return { status: "ready", error: "" };
        },
        options: action.options || {}
      });
    },
    async advanceOperatingLoopFromUi() {
      const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
      const previous = cardGeneration.operatingLoop || {};
      cardGeneration.status = "advancing";
      cardGeneration.error = "";
      cardGeneration.progressStep = "context";
      cardGeneration.progressMessage = "正在通过服务端闭环 Facade 执行当前 next action。";
      cardGeneration.operatingLoop = Object.assign({}, previous, {
        actionStatus: "running",
        actionResult: previous.actionResult || null,
        actionError: ""
      });
      if (typeof render === "function") render(state);
      if (typeof refreshers.scheduleCardGenerationProgress === "function") {
        refreshers.scheduleCardGenerationProgress("advance");
      }
      try {
        const payload = createOperatingLoopAdvancePayload({ context, workspaceId: targetWorkspaceId, state: cardGeneration });
        const result = await api.advanceLearningOperatingLoop(payload, targetWorkspaceId);
        if (typeof refreshers.clearCardGenerationProgressTimers === "function") {
          refreshers.clearCardGenerationProgressTimers();
        }
        const actionResult = result.actionResult || {};
        const summary = result.summary || {};
        const taskCardId = clean(summary.taskCardId || actionResult.taskCardId);
        const planDraftId = clean(summary.planDraftId || actionResult.planDraftId);
        const selectedItemId = clean(actionResult.selectedItemId || actionResult.selected_item_id);
        cardGeneration.status = result.ok ? "published" : "failed";
        cardGeneration.operatingLoop = Object.assign({}, cardGeneration.operatingLoop || {}, {
          actionStatus: result.ok ? "executed" : clean(result.status || "failed"),
          actionResult: result,
          actionError: result.ok ? "" : clean(result.error || "operating_loop_advance_failed")
        });
        if (planDraftId || taskCardId) {
          cardGeneration.dailyLoopPublishResult = {
            ok: result.ok === true,
            operation: "operating_loop_advance",
            planDraft: {
              planDraftId,
              selectedItemId,
              generatedTaskCardId: taskCardId
            },
            generation: taskCardId ? { published: { taskCardId } } : null,
            publishAttempt: {
              status: result.status || (result.ok ? "executed" : "failed"),
              error: result.error || ""
            }
          };
          cardGeneration.generatedResult = taskCardId ? { published: { taskCardId } } : cardGeneration.generatedResult;
        }
        cardGeneration.progressStep = "done";
        cardGeneration.progressMessage = result.ok ? "闭环执行完成，正在刷新状态。" : "闭环执行未完成，请查看错误。";
        await runPostOperatingLoopRefresh(targetWorkspaceId, cardGeneration);
        if (typeof render === "function") render(state);
        return result;
      } catch (error) {
        if (typeof refreshers.clearCardGenerationProgressTimers === "function") {
          refreshers.clearCardGenerationProgressTimers();
        }
        cardGeneration.status = "failed";
        cardGeneration.error = error?.message || String(error);
        cardGeneration.progressStep = "failed";
        cardGeneration.progressMessage = "闭环执行失败。";
        cardGeneration.operatingLoop = Object.assign({}, cardGeneration.operatingLoop || previous, {
          actionStatus: "failed",
          actionError: error?.message || String(error)
        });
        if (typeof render === "function") render(state);
        return null;
      }
    },
    prepareAutomationCycleClosureFromUi() {
      return runActionSlot({
        slot: "automationCycleClosure",
        successStatus(result = {}) {
          return result.ok ? "prepared" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_cycle_closure_prepare_failed");
        },
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const payload = createAutomationCycleClosurePayload({
            context,
            workspaceId: targetWorkspaceId,
            selectedCycle: cardGeneration.cycleHistory?.selectedCycle || {}
          });
          return api.prepareGrowthAutomationCycleClosure(payload, targetWorkspaceId);
        },
        async afterSuccess({ targetWorkspaceId, context }) {
          await refreshAutomationStack(targetWorkspaceId, context);
          await refreshOwnerCycleDrilldown({ silent: true });
        }
      });
    },
    advanceAutomationReviewFromUi() {
      return runActionSlot({
        slot: "automationReviewAdvancement",
        successStatus(result = {}) {
          return result.ok ? "advanced" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_review_advancement_failed");
        },
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const payload = createAutomationReviewAdvancementPayload({
            context,
            workspaceId: targetWorkspaceId,
            selectedCycle: cardGeneration.cycleHistory?.selectedCycle || {}
          });
          return api.advanceGrowthAutomationReview(payload, targetWorkspaceId);
        },
        async afterSuccess({ targetWorkspaceId, context }) {
          await refreshAutomationStack(targetWorkspaceId, context);
          await refreshReleaseWorkbench(targetWorkspaceId, context);
          await refreshOwnerCycleDrilldown({ silent: true });
        }
      });
    },
    async runAutomationClosedLoopActionPlanFromUi(button = {}) {
      const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
      const holder = cardGeneration.automationClosedLoopActionPlan || {};
      const data = holder.data || {};
      const nextAction = data.nextAction || {};
      const actionKey = clean(button.dataset?.automationClosedLoopActionKey || nextAction.key || data.summary?.nextAction);
      const blockedReason = clean(button.dataset?.automationClosedLoopBlockedReason);
      if (blockedReason) {
        cardGeneration.automationClosedLoopActionPlan = Object.assign({}, holder, {
          actionStatus: "blocked",
          actionError: blockedReason
        });
        if (typeof render === "function") render(state);
        return null;
      }
      cardGeneration.automationClosedLoopActionPlan = Object.assign({}, holder, {
        actionStatus: "running",
        actionResult: holder.actionResult || null,
        actionError: ""
      });
      if (typeof render === "function") render(state);
      try {
        if (actionKey === "deliver_action_handoff") {
          const handoffId = clean(nextAction.body?.handoff_id || nextAction.body?.handoffId);
          if (!handoffId) throw new Error("automation_action_handoff_id_required");
          await deliverClosedLoopActionHandoff(handoffId, { cardGeneration, context, targetWorkspaceId });
        } else if (actionKey === "run_learning_loop_next" && typeof handlers.advanceOperatingLoopFromUi === "function") {
          await handlers.advanceOperatingLoopFromUi();
        } else if (actionKey === "prepare_cycle_closure" && typeof handlers.prepareAutomationCycleClosureFromUi === "function") {
          await handlers.prepareAutomationCycleClosureFromUi();
        } else if (actionKey === "advance_review" && typeof handlers.advanceAutomationReviewFromUi === "function") {
          await handlers.advanceAutomationReviewFromUi();
        } else if (["run_learning_loop_next", "prepare_cycle_closure", "advance_review"].includes(actionKey)) {
          await invokeClosedLoopDelegate(actionKey, { cardGeneration, context, targetWorkspaceId, state });
        } else {
          throw new Error("automation_closed_loop_action_not_supported_in_owner_panel");
        }
        await refreshAutomationClosedLoopActionPlan(targetWorkspaceId, context, { silent: true });
        cardGeneration.automationClosedLoopActionPlan = Object.assign({}, cardGeneration.automationClosedLoopActionPlan || {}, {
          actionStatus: "executed",
          actionResult: { ok: true, actionKey },
          actionError: ""
        });
        if (typeof render === "function") render(state);
        return cardGeneration.automationClosedLoopActionPlan.actionResult;
      } catch (error) {
        cardGeneration.automationClosedLoopActionPlan = Object.assign({}, cardGeneration.automationClosedLoopActionPlan || holder, {
          actionStatus: "failed",
          actionError: error?.message || String(error)
        });
        if (typeof render === "function") render(state);
        return null;
      }
    },
    reviewAutomationProposalFromUi(button = {}) {
      return runActionSlot({
        slot: "automationProposals",
        successStatus: "reviewed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const proposalId = clean(button.dataset?.automationProposalId);
          const status = clean(button.dataset?.automationProposalStatus);
          const proposal = findById(automationDataItems(cardGeneration, "automationProposals", "proposals"), proposalId, ["proposalId", "proposal_id"]);
          if (!proposal) throw new Error("automation_proposal_not_found");
          const payload = createAutomationProposalDecisionPayload({ context, workspaceId: targetWorkspaceId, proposal, status });
          return api.reviewGrowthAutomationProposal(proposalId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    createAutomationProposalFromUi() {
      return runActionSlot({
        slot: "automationProposals",
        successStatus(result = {}) {
          return result.ok ? "created" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_proposal_create_failed");
        },
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const payload = createAutomationProposalCreatePayload({
            context,
            workspaceId: targetWorkspaceId,
            selectedCycle: cardGeneration.cycleHistory?.selectedCycle || {}
          });
          return api.createGrowthAutomationProposal(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    publishAutomationProposalFromUi(button = {}) {
      return runActionSlot({
        slot: "automationProposals",
        successStatus(result = {}) {
          return result.ok ? "published" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_proposal_publish_failed");
        },
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const proposalId = clean(button.dataset?.automationProposalId);
          const proposal = findById(automationDataItems(cardGeneration, "automationProposals", "proposals"), proposalId, ["proposalId", "proposal_id"]);
          if (!proposal) throw new Error("automation_proposal_not_found");
          const payload = createAutomationProposalPublishPayload({ context, workspaceId: targetWorkspaceId, proposal });
          return api.publishGrowthAutomationProposal(proposalId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ cardGeneration, targetWorkspaceId }) => runPostPublishRefresh(targetWorkspaceId, cardGeneration)
      });
    },
    reviewAutomationDigestFromUi(button = {}) {
      return runActionSlot({
        slot: "automationDigests",
        successStatus: "reviewed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const digestId = clean(button.dataset?.automationDigestId);
          const status = clean(button.dataset?.automationDigestStatus);
          const digest = findById(automationDataItems(cardGeneration, "automationDigests", "digests"), digestId, ["digestId", "digest_id"]);
          if (!digest) throw new Error("automation_digest_not_found");
          const payload = createAutomationDigestReviewPayload({ context, workspaceId: targetWorkspaceId, digest, status });
          return api.reviewGrowthAutomationDigest(digestId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    createAutomationDigestFromUi() {
      return runActionSlot({
        slot: "automationDigests",
        successStatus(result = {}) {
          return result.ok ? "created" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_digest_create_failed");
        },
        async action({ context, targetWorkspaceId }) {
          const payload = createAutomationDigestCreatePayload({ context, workspaceId: targetWorkspaceId });
          return api.createGrowthAutomationDigest(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    reviewAutomationFailurePolicyFromUi(button = {}) {
      return runActionSlot({
        slot: "automationFailurePolicies",
        successStatus: "reviewed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const policyId = clean(button.dataset?.automationFailurePolicyId);
          const status = clean(button.dataset?.automationFailurePolicyStatus);
          const policy = findById(automationDataItems(cardGeneration, "automationFailurePolicies", "policies"), policyId, ["policyId", "policy_id"]);
          if (!policy) throw new Error("automation_failure_policy_not_found");
          const payload = createAutomationFailurePolicyReviewPayload({ context, workspaceId: targetWorkspaceId, policy, status });
          return api.reviewGrowthAutomationFailurePolicy(policyId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    createAutomationFailurePolicyFromUi() {
      return runActionSlot({
        slot: "automationFailurePolicies",
        successStatus(result = {}) {
          return result.ok ? "created" : "failed";
        },
        actionErrorFromResult(result = {}) {
          return result.ok ? "" : clean(result.error || "automation_failure_policy_create_failed");
        },
        async action({ context, targetWorkspaceId }) {
          const payload = createAutomationFailurePolicyCreatePayload({ context, workspaceId: targetWorkspaceId });
          return api.createGrowthAutomationFailurePolicy(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    createAutomationActionHandoffFromUi(button = {}) {
      return runActionSlot({
        slot: "automationActionHandoffs",
        successStatus: "created",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const digestId = clean(button.dataset?.automationDigestId);
          const digest = findById(automationDataItems(cardGeneration, "automationDigests", "digests"), digestId, ["digestId", "digest_id"]);
          if (!digest) throw new Error("automation_digest_not_found");
          const payload = createAutomationActionHandoffPayload({ context, workspaceId: targetWorkspaceId, digest });
          return api.createGrowthAutomationActionHandoff(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    deliverAutomationActionHandoffFromUi(button = {}) {
      return runActionSlot({
        slot: "automationActionHandoffs",
        successStatus: "delivered",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const handoffId = clean(button.dataset?.automationActionHandoffId);
          const handoff = findById(automationDataItems(cardGeneration, "automationActionHandoffs", "handoffs"), handoffId, ["handoffId", "handoff_id"]);
          if (!handoff) throw new Error("automation_action_handoff_not_found");
          const payload = createAutomationActionHandoffDeliverPayload({ context, workspaceId: targetWorkspaceId, handoff });
          return api.deliverGrowthAutomationActionHandoff(handoffId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    executeAutomationSchedulerOnceFromUi(button = {}) {
      return runActionSlot({
        slot: "automationSchedulerExecutions",
        successStatus: "executed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const handoffId = clean(button.dataset?.automationActionHandoffId);
          const handoff = findById(automationDataItems(cardGeneration, "automationActionHandoffs", "handoffs"), handoffId, ["handoffId", "handoff_id"]);
          if (!handoff) throw new Error("automation_action_handoff_not_found");
          const payload = createAutomationSchedulerExecutionPayload({ context, workspaceId: targetWorkspaceId, handoff });
          return api.executeGrowthAutomationSchedulerOnce(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context),
        afterFailure: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    runAutomationSchedulerOnceFromUi() {
      return runActionSlot({
        slot: "automationSchedulerRuns",
        successStatus: "ran",
        async action({ context, targetWorkspaceId }) {
          const payload = createAutomationSchedulerRunPayload({ context, workspaceId: targetWorkspaceId });
          return api.runGrowthAutomationSchedulerOnce(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context),
        afterFailure: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    createAutomationSchedulerWorkerTargetFromUi() {
      return runActionSlot({
        slot: "automationSchedulerWorkerTargets",
        successStatus: "created",
        async action({ context, targetWorkspaceId }) {
          const payload = createAutomationSchedulerWorkerTargetPayload({ context, workspaceId: targetWorkspaceId });
          return api.createGrowthAutomationSchedulerWorkerTarget(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context),
        afterFailure: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    reviewAutomationSchedulerWorkerTargetFromUi(button = {}) {
      return runActionSlot({
        slot: "automationSchedulerWorkerTargets",
        successStatus: "reviewed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const targetId = clean(button.dataset?.automationSchedulerWorkerTargetId);
          const status = clean(button.dataset?.automationSchedulerWorkerTargetStatus);
          const target = findById(
            automationDataItems(cardGeneration, "automationSchedulerWorkerTargets", "targets"),
            targetId,
            ["targetId", "target_id", "workerTargetId", "worker_target_id"]
          );
          if (!target) throw new Error("automation_scheduler_worker_target_not_found");
          const payload = createAutomationSchedulerWorkerTargetReviewPayload({ context, workspaceId: targetWorkspaceId, target, status });
          return api.reviewGrowthAutomationSchedulerWorkerTarget(targetId, payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshAutomationStack(targetWorkspaceId, context)
      });
    },
    reviewRecommendationLifecycleFromUi(button = {}) {
      return runActionSlot({
        slot: "recommendationLifecycle",
        successStatus: "reviewed",
        async action({ cardGeneration, context, targetWorkspaceId }) {
          const status = clean(button.dataset?.recommendationLifecycleStatus);
          const recommendation = findRecommendationLifecycleItem(cardGeneration, button);
          const payload = createRecommendationLifecycleDecisionPayload({ context, workspaceId: targetWorkspaceId, recommendation, status });
          return api.reviewGrowthRecommendationLifecycle(payload, targetWorkspaceId);
        },
        afterSuccess: ({ targetWorkspaceId, context }) => refreshRecommendationLifecycle(targetWorkspaceId, context)
      });
    }
  };
  return handlers;
}
