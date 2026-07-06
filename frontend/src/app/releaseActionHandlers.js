import {
  createReleaseArtifactTemplateQueryPayload,
  createReleaseEvidenceLedgerQueryPayload,
  createReleaseLifecycleRecordPayload,
  createReleaseLifecycleRecordsQueryPayload,
  createReleasePackageBuildPayload,
  createReleaseStatusReadbackQueryPayload,
  createReleaseWorkbenchActionPayload,
  createReleaseWorkbenchActionAuditQueryPayload
} from "../features/card-generation/releasePayloads.js";
import { clean } from "../utils/string.js";
import {
  findReleaseWorkbenchAction,
  releasePackageCandidate
} from "./actionHandlerUtils.js";

export function createReleaseActionHandlers({
  api = {},
  render,
  state = {},
  runReadback,
  runActionSlot,
  releaseActionContext,
  refreshReleaseWorkbench
} = {}) {
  return {
    refreshReleaseArtifactTemplate(action = {}) {
      return runReadback({
        slot: "releaseArtifactTemplate",
        contextKey: "releaseArtifactTemplate",
        createPayload: createReleaseArtifactTemplateQueryPayload,
        fetchResult: ({ targetWorkspaceId, context }) => api.fetchGrowthReleaseArtifactTemplate(targetWorkspaceId, context),
        options: action.options || {}
      });
    },
    refreshReleaseWorkbenchActionAudits(action = {}) {
      return runReadback({
        slot: "releaseWorkbenchActionAudits",
        contextKey: "releaseWorkbenchActionAudits",
        createPayload: createReleaseWorkbenchActionAuditQueryPayload,
        fetchResult: ({ payload, targetWorkspaceId }) => api.fetchGrowthReleaseWorkbenchActionAudits(payload, targetWorkspaceId),
        options: action.options || {}
      });
    },
    refreshReleaseStatusReadbacks(action = {}) {
      return runReadback({
        slot: "releaseStatusReadbacks",
        contextKey: "releaseStatusReadbacks",
        createPayload: createReleaseStatusReadbackQueryPayload,
        fetchResult: ({ payload, targetWorkspaceId }) => api.fetchGrowthReleaseStatusReadbacks(payload, targetWorkspaceId),
        options: action.options || {}
      });
    },
    refreshReleaseEvidenceLedger(action = {}) {
      return runReadback({
        slot: "releaseEvidenceLedger",
        contextKey: "releaseEvidenceLedger",
        createPayload: createReleaseEvidenceLedgerQueryPayload,
        fetchResult: ({ payload, targetWorkspaceId }) => api.fetchGrowthReleaseEvidenceLedger(payload, targetWorkspaceId),
        options: action.options || {}
      });
    },
    refreshReleaseLifecycleRecords(action = {}) {
      return runReadback({
        slot: "releaseLifecycleRecords",
        contextKey: "releaseLifecycleRecords",
        actionSlots: true,
        createPayload: createReleaseLifecycleRecordsQueryPayload,
        fetchResult: ({ payload, targetWorkspaceId }) => api.fetchGrowthReleaseLifecycleRecords(payload, targetWorkspaceId),
        options: action.options || {}
      });
    },
    async recordReleaseLifecycleRecordFromUi(button = {}) {
      const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
      const recordKind = clean(button.dataset?.releaseLifecycleRecord);
      const previous = cardGeneration.releaseLifecycleRecords || {};
      cardGeneration.releaseLifecycleRecords = Object.assign({}, previous, {
        actionStatus: "recording",
        actionResult: previous.actionResult || null,
        actionError: ""
      });
      if (typeof render === "function") render(state);
      try {
        const payload = createReleaseLifecycleRecordPayload({ context, workspaceId: targetWorkspaceId, recordKind });
        let result;
        if (recordKind === "preflight") {
          result = await api.recordGrowthReleasePreflightReport(payload, targetWorkspaceId);
        } else if (recordKind === "activation") {
          result = await api.recordGrowthReleaseActivation(payload, targetWorkspaceId);
        } else if (recordKind === "runtime") {
          result = await api.recordGrowthRuntimeEnablement(payload, targetWorkspaceId);
        } else {
          throw new Error("release_lifecycle_record_kind_unsupported");
        }
        cardGeneration.releaseLifecycleRecords = Object.assign({}, cardGeneration.releaseLifecycleRecords, {
          actionStatus: "recorded",
          actionResult: result,
          actionError: ""
        });
        await refreshReleaseWorkbench(targetWorkspaceId, context);
        if (typeof render === "function") render(state);
        return result;
      } catch (error) {
        cardGeneration.releaseLifecycleRecords = Object.assign({}, cardGeneration.releaseLifecycleRecords, {
          actionStatus: "failed",
          actionError: error?.message || String(error)
        });
        if (typeof render === "function") render(state);
        return null;
      }
    },
    async buildReleasePackageFromUi(button = {}) {
      const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
      const action = findReleaseWorkbenchAction(
        cardGeneration,
        button.dataset?.releaseWorkbenchEndpointKey,
        button.dataset?.releaseWorkbenchActionKey
      );
      if (!action) throw new Error("release_workbench_action_not_found");
      const previous = cardGeneration.releaseWorkbench || {};
      cardGeneration.releaseWorkbench = Object.assign({}, previous, {
        packageStatus: "building",
        packageResult: previous.packageResult || null,
        packageCandidate: previous.packageCandidate || null,
        packageError: ""
      });
      if (typeof render === "function") render(state);
      try {
        const payload = createReleasePackageBuildPayload({ context, workspaceId: targetWorkspaceId, action });
        const result = await api.buildGrowthReleasePackage(payload, targetWorkspaceId);
        const candidate = result?.package || result?.releasePackage || result?.release_package || null;
        const packageStatus = candidate ? result?.ok === false ? "blocked" : "ready" : "blocked";
        cardGeneration.releaseWorkbench = Object.assign({}, cardGeneration.releaseWorkbench, {
          packageStatus,
          packageResult: result,
          packageCandidate: candidate,
          packageError: result?.ok === false ? clean(result.error) || "release_package_candidate_blocked" : ""
        });
        if (typeof render === "function") render(state);
        return result;
      } catch (error) {
        cardGeneration.releaseWorkbench = Object.assign({}, cardGeneration.releaseWorkbench, {
          packageStatus: "failed",
          packageError: error?.message || String(error)
        });
        if (typeof render === "function") render(state);
        return null;
      }
    },
    async recordReleaseWorkbenchActionFromUi(button = {}) {
      const blockedReason = clean(button.dataset?.releaseWorkbenchBlockedReason);
      const { cardGeneration, context, targetWorkspaceId } = releaseActionContext();
      if (blockedReason) {
        cardGeneration.releaseWorkbench = Object.assign({}, cardGeneration.releaseWorkbench || {}, {
          actionStatus: "failed",
          actionError: blockedReason
        });
        if (typeof render === "function") render(state);
        return null;
      }
      const action = findReleaseWorkbenchAction(
        cardGeneration,
        button.dataset?.releaseWorkbenchEndpointKey,
        button.dataset?.releaseWorkbenchActionKey
      );
      if (!action) throw new Error("release_workbench_action_not_found");
      const previous = cardGeneration.releaseWorkbench || {};
      cardGeneration.releaseWorkbench = Object.assign({}, previous, {
        actionStatus: "recording",
        actionResult: previous.actionResult || null,
        actionError: ""
      });
      if (typeof render === "function") render(state);
      try {
        const releasePackage = clean(button.dataset?.releaseWorkbenchEndpointKey) === "release_package"
          ? releasePackageCandidate(cardGeneration.releaseWorkbench)
          : null;
        const payload = createReleaseWorkbenchActionPayload({ context, workspaceId: targetWorkspaceId, action, releasePackage });
        const result = await api.recordGrowthReleaseWorkbenchAction(payload, targetWorkspaceId);
        cardGeneration.releaseWorkbench = Object.assign({}, cardGeneration.releaseWorkbench, {
          actionStatus: "recorded",
          actionResult: result,
          actionError: ""
        });
        await refreshReleaseWorkbench(targetWorkspaceId, context);
        if (typeof render === "function") render(state);
        return result;
      } catch (error) {
        cardGeneration.releaseWorkbench = Object.assign({}, cardGeneration.releaseWorkbench, {
          actionStatus: "failed",
          actionError: error?.message || String(error)
        });
        if (typeof render === "function") render(state);
        return null;
      }
    }
  };
}
