import { clean } from "../../utils/string.js";

export const FANFAN_SAMPLE_WORKSPACE_IDS = Object.freeze(["weixin_stephen", "weixin_fanfan"]);

export function isFanfanSampleTarget(target = {}) {
  const text = [
    target.workspaceId,
    target.growthWorkspaceId,
    target.learnerId,
    target.displayName,
    target.label
  ].map(clean).join(" ").toLowerCase();
  return /\bfan[\s_-]*fan\b/.test(text) || text.includes("fanfan") || text.includes("凡凡");
}

export function isCardGenerationTarget(target = {}) {
  if (target?.enabled === true || target?.targetEnabled === true) return true;
  return isFanfanSampleTarget(target);
}

export function targetForWorkspace(viewTargets = [], workspaceId = "") {
  return (Array.isArray(viewTargets) ? viewTargets : []).find((target) => clean(target.workspaceId) === clean(workspaceId)) || null;
}

export function preferredCardGenerationWorkspaceId(viewTargets = [], sampleWorkspaceIds = FANFAN_SAMPLE_WORKSPACE_IDS) {
  const target = (Array.isArray(viewTargets) ? viewTargets : []).find(isCardGenerationTarget);
  return clean(target?.workspaceId || sampleWorkspaceIds[0]);
}

export function currentWorkspaceSupportsCardGeneration({ viewTargets = [], currentWorkspaceId = "" } = {}) {
  const target = targetForWorkspace(viewTargets, currentWorkspaceId);
  return Boolean(target && isCardGenerationTarget(target));
}

export function cardGenerationWorkspaceId({
  pageState = {},
  viewTargets = [],
  currentWorkspaceId = "",
  sampleWorkspaceIds = FANFAN_SAMPLE_WORKSPACE_IDS
} = {}) {
  const selectedWorkspaceId = clean(pageState.cardGeneration?.selectedWorkspaceId);
  if (selectedWorkspaceId) return selectedWorkspaceId;
  const contextWorkspaceId = clean(pageState.cardGeneration?.context?.target?.workspaceId);
  if (contextWorkspaceId) return contextWorkspaceId;
  if (pageState.auth?.isOwner && !currentWorkspaceSupportsCardGeneration({ viewTargets, currentWorkspaceId })) {
    return preferredCardGenerationWorkspaceId(viewTargets, sampleWorkspaceIds);
  }
  return clean(currentWorkspaceId);
}

export function selectedWorkspaceSupportsCardGeneration({
  pageState = {},
  viewTargets = [],
  currentWorkspaceId = "",
  sampleWorkspaceIds = FANFAN_SAMPLE_WORKSPACE_IDS
} = {}) {
  const workspaceId = cardGenerationWorkspaceId({ pageState, viewTargets, currentWorkspaceId, sampleWorkspaceIds });
  const contextTarget = pageState.cardGeneration?.context?.target || null;
  if (clean(contextTarget?.workspaceId) === workspaceId && contextTarget?.enabled === true) return true;
  const target = targetForWorkspace(viewTargets, workspaceId)
    || (clean(contextTarget?.workspaceId) === workspaceId ? contextTarget : null)
    || { workspaceId };
  return Boolean(target && isCardGenerationTarget(target));
}

export function selectedProvisionDraft(context = {}, draft = {}) {
  const provisioning = context.targetProvisioning || {};
  const graphOptions = provisioning.graphOptions || context.graphOptions || {};
  const selectedPackId = clean(draft.domainPackId || draft.domain_pack_id || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId);
  const packs = Array.isArray(graphOptions.domainPacks) ? graphOptions.domainPacks : [];
  const pack = packs.find((item) => clean(item.domainPackId || item.domain_pack_id) === selectedPackId) || packs[0] || {};
  const subjects = Array.isArray(pack.subjects) && pack.subjects.length
    ? pack.subjects
    : Array.isArray(graphOptions.subjects) ? graphOptions.subjects : [];
  return {
    domainPackId: selectedPackId || clean(pack.domainPackId || pack.domain_pack_id),
    domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || pack.domain || context.domain),
    subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || subjects[0] || context.subject),
    recipeId: clean(draft.recipeId || draft.recipe_id || context.selectedRecipeId),
    status: clean(draft.status || "idle"),
    result: draft.result || null,
    error: clean(draft.error),
    packs,
    subjects: subjects.map(clean).filter(Boolean).slice(0, 40),
    pack
  };
}

export function targetProvisionSelection(pageState = {}) {
  return selectedProvisionDraft(
    pageState.cardGeneration?.context || {},
    pageState.cardGeneration?.targetProvisionDraft || {}
  );
}

export function cardGenerationProgressSteps(mode = "publish") {
  if (mode === "advance") {
    return [
      { delayMs: 700, progressStep: "planner", progressMessage: "正在通过 Gateway 起草下一张 plan draft。" },
      { delayMs: 2600, progressStep: "validation", progressMessage: "正在校验计划项、图谱绑定和证据要求。" },
      { delayMs: 4800, progressStep: "authoring", progressMessage: "正在通过 Gateway 生成 authoring draft。" },
      { delayMs: 8200, progressStep: "publish", progressMessage: "正在等待发布结果，成功后会写入 Growth SQLite。" }
    ];
  }
  if (mode === "draft") {
    return [
      { delayMs: 700, progressStep: "planner", progressMessage: "正在通过 Gateway 起草下一张 plan draft。" },
      { delayMs: 2600, progressStep: "validation", progressMessage: "正在校验计划项、图谱绑定和证据要求。" }
    ];
  }
  return [
    { delayMs: 700, progressStep: "authoring", progressMessage: "正在通过 Gateway 生成 authoring draft。" },
    { delayMs: 3200, progressStep: "validation", progressMessage: "正在校验 teachingFlow、图谱绑定和隐私边界。" },
    { delayMs: 7600, progressStep: "publish", progressMessage: "正在等待发布结果，成功后会写入 Growth SQLite。" }
  ];
}
