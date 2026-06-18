#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const {
  projectPlannerReadinessSmokeReadback
} = require("./smoke-growth-planner-readiness");
const {
  projectDailyLoopSmokeReadback
} = require("./smoke-growth-daily-loop");
const {
  projectAutomationActionHandoffSmokeReadback
} = require("./smoke-growth-automation-action-handoff");
const {
  projectPlatformActionEvidenceSmokeReadback
} = require("./smoke-growth-platform-action-evidence");
const {
  projectReleaseReadinessSmokeReadback
} = require("./smoke-growth-release-readiness");
const {
  projectReleaseWorkbenchActionSmokeReadback
} = require("./smoke-growth-release-workbench-action");

const DEFAULT_HOME_AI_BASE_URL = "http://127.0.0.1:8797";
const DEFAULT_PROXY_PREFIX = "/api/hermes-plugins/growth/proxy";

const WRITE_OPERATIONS = new Set([
  "daily-loop-draft",
  "daily-loop-advance",
  "daily-loop-publish",
  "action-handoff-create",
  "action-handoff-deliver",
  "workbench-action-record"
]);

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectRepeatedValues(args, names) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      const value = String(args[index + 1] || "").trim();
      if (value) values.push(value);
    }
  }
  return values;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 220)).filter(Boolean)));
}

function listArg(args, repeatedNames, csvNames) {
  return uniqueStrings([
    ...collectRepeatedValues(args, repeatedNames),
    ...splitCsv(firstArgValue(args, csvNames, ""))
  ]);
}

function parseJsonArg(args, names, fallback = {}) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--op"], "release-readiness").trim();
  if (operation === "readiness") return "release-readiness";
  if (operation === "planner") return "planner-readiness";
  if (operation === "platform-action") return "platform-action-evidence";
  if (operation === "daily-loop") return "daily-loop-advance";
  if (operation === "action-handoff") return "action-handoff-list";
  if (operation === "workbench-action") return "workbench-action-record";
  return operation || "release-readiness";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function targetNodeIds(args) {
  return listArg(args, ["--target-node-id", "--targetNodeId"], ["--target-node-ids", "--targetNodeIds", "--node-ids", "--nodeIds"]);
}

function selectorInputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId", "--target-workspace-id", "--targetWorkspaceId"], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    availableMinutes: firstArgValue(args, ["--available-minutes", "--availableMinutes"], "15") || "15",
    targetNodeIds: targetNodeIds(args),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], ""),
    itemId: firstArgValue(args, ["--item-id", "--itemId", "--selected-item-id", "--selectedItemId"], ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], ""),
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], ""),
    endpointKey: firstArgValue(args, ["--endpoint-key", "--endpointKey"], ""),
    actionKey: firstArgValue(args, ["--action-key", "--actionKey", "--key"], ""),
    status: firstArgValue(args, ["--status", "--decision", "--decision-status", "--decisionStatus"], ""),
    deliveryStatus: firstArgValue(args, ["--delivery-status", "--deliveryStatus"], ""),
    limit: firstArgValue(args, ["--limit"], ""),
    tasks: listArg(args, ["--task", "--task-id", "--taskId"], ["--tasks", "--task-ids", "--taskIds"]),
    requiredTaskIds: listArg(args, ["--required-task", "--required-task-id", "--requiredTaskId"], ["--required-tasks", "--required-task-ids", "--requiredTasks", "--requiredTaskIds"]),
    requiredApprovalKeys: listArg(args, ["--required-approval-key", "--requiredApprovalKey"], ["--required-approval-keys", "--requiredApprovalKeys"]),
    writeCollectionRun: hasFlag(args, "--write-collection-run") || hasFlag(args, "--writeCollectionRun"),
    writeReleaseEvidenceRecords: hasFlag(args, "--write-release-evidence-records") || hasFlag(args, "--writeReleaseEvidenceRecords"),
    autoSelectLatestCompletedCycle: hasFlag(args, "--auto-select-latest-completed-cycle") || hasFlag(args, "--autoSelectLatestCompletedCycle"),
    autoSelectLatestReadyCollectionRun: hasFlag(args, "--auto-select-latest-ready-collection-run") || hasFlag(args, "--autoSelectLatestReadyCollectionRun"),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    reviewedBy: firstArgValue(args, ["--reviewed-by", "--reviewedBy"], ""),
    deliveredBy: firstArgValue(args, ["--delivered-by", "--deliveredBy"], "")
  };
}

function inputFromArgs(args, env = process.env) {
  return {
    operation: operationFromArgs(args),
    homeAiBaseUrl: firstArgValue(args, ["--home-ai-base-url", "--homeAiBaseUrl"], env.HOME_AI_BASE_URL || DEFAULT_HOME_AI_BASE_URL),
    proxyPrefix: firstArgValue(args, ["--proxy-prefix", "--proxyPrefix"], env.HOME_AI_GROWTH_PROXY_PREFIX || DEFAULT_PROXY_PREFIX),
    accessKeyFile: firstArgValue(args, ["--home-ai-access-key-file", "--homeAiAccessKeyFile", "--web-key-file", "--webKeyFile"], env.HOME_AI_ACCESS_KEY_FILE || env.HOME_AI_WEB_KEY_FILE || env.HERMES_WEB_KEY_FILE || ""),
    accessKeyEnv: firstArgValue(args, ["--home-ai-access-key-env", "--homeAiAccessKeyEnv", "--web-key-env", "--webKeyEnv"], ""),
    allowWrite: allowWrite(args),
    bodyJson: parseJsonArg(args, ["--body-json", "--bodyJson"], {}),
    evidenceJson: parseJsonArg(args, ["--evidence-json", "--evidenceJson"], {}),
    selector: selectorInputFromArgs(args)
  };
}

function validateInput(input = {}) {
  if (!input.selector?.workspaceId) {
    return { ok: false, error: "home_ai_proxy_smoke_workspace_required", exitCode: 2 };
  }
  if (WRITE_OPERATIONS.has(input.operation) && input.allowWrite !== true) {
    return { ok: false, error: "home_ai_proxy_smoke_write_not_allowed", operation: input.operation, requiredFlag: "--allow-write", exitCode: 2 };
  }
  if (input.operation === "action-handoff-deliver" && !input.selector.handoffId) {
    return { ok: false, error: "home_ai_proxy_smoke_handoff_id_required", operation: input.operation, exitCode: 2 };
  }
  if (input.operation === "daily-loop-publish" && !input.selector.planDraftId) {
    return { ok: false, error: "home_ai_proxy_smoke_plan_draft_id_required", operation: input.operation, exitCode: 2 };
  }
  if (input.operation === "workbench-action-record" && !input.selector.endpointKey) {
    return { ok: false, error: "home_ai_proxy_smoke_endpoint_key_required", operation: input.operation, exitCode: 2 };
  }
  if (!operationSpec(input.operation, input.selector)) {
    return { ok: false, error: "home_ai_proxy_smoke_operation_invalid", operation: input.operation, exitCode: 2 };
  }
  return { ok: true };
}

function compactSelectorForQuery(selector = {}) {
  const query = {
    targetWorkspaceId: selector.workspaceId,
    learnerId: selector.learnerId,
    programId: selector.programId,
    domainPackId: selector.domainPackId,
    domain: selector.domain,
    subject: selector.subject,
    horizon: selector.horizon,
    availableMinutes: selector.availableMinutes,
    targetNodeIds: selector.targetNodeIds?.length ? selector.targetNodeIds.join(",") : "",
    planDraftId: selector.planDraftId,
    itemId: selector.itemId,
    taskCardId: selector.taskCardId,
    digestId: selector.digestId,
    handoffId: selector.handoffId,
    endpointKey: selector.endpointKey,
    actionKey: selector.actionKey,
    status: selector.status,
    deliveryStatus: selector.deliveryStatus,
    limit: selector.limit
  };
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function compactSelectorForBody(selector = {}) {
  return Object.fromEntries(Object.entries({
    workspace_id: selector.workspaceId,
    learner_id: selector.learnerId,
    program_id: selector.programId,
    domain_pack_id: selector.domainPackId,
    domain: selector.domain,
    subject: selector.subject,
    horizon: selector.horizon,
    available_minutes: selector.availableMinutes,
    target_node_ids: selector.targetNodeIds?.length ? selector.targetNodeIds : undefined,
    plan_draft_id: selector.planDraftId,
    item_id: selector.itemId,
    task_card_id: selector.taskCardId,
    digest_id: selector.digestId,
    handoff_id: selector.handoffId,
    endpoint_key: selector.endpointKey,
    action_key: selector.actionKey,
    status: selector.status,
    delivery_status: selector.deliveryStatus,
    limit: selector.limit ? Number(selector.limit) || selector.limit : undefined,
    tasks: selector.tasks?.length ? selector.tasks : undefined,
    required_task_ids: selector.requiredTaskIds?.length ? selector.requiredTaskIds : undefined,
    required_approval_keys: selector.requiredApprovalKeys?.length ? selector.requiredApprovalKeys : undefined,
    write_collection_run: selector.writeCollectionRun === true ? true : undefined,
    write_release_evidence_records: selector.writeReleaseEvidenceRecords === true ? true : undefined,
    auto_select_latest_completed_cycle: selector.autoSelectLatestCompletedCycle === true ? true : undefined,
    auto_select_latest_ready_collection_run: selector.autoSelectLatestReadyCollectionRun === true ? true : undefined,
    requested_by: selector.requestedBy,
    reviewed_by: selector.reviewedBy,
    delivered_by: selector.deliveredBy
  }).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function operationSpec(operation, selector = {}) {
  if (operation === "release-readiness") return { method: "GET", path: "/api/v1/growth/automation/release-readiness", projection: "release-readiness" };
  if (operation === "planner-readiness") return { method: "GET", path: "/api/v1/growth/automation/planner-readiness", projection: "planner-readiness" };
  if (operation === "platform-action-evidence") return { method: "GET", path: "/api/v1/growth/automation/platform-action-evidence", projection: "platform-action-evidence" };
  if (operation === "daily-loop-preview") return { method: "GET", path: "/api/v1/growth/daily-loop/preview", projection: "daily-loop", dailyLoopOperation: "preview" };
  if (operation === "daily-loop-draft") return { method: "POST", path: "/api/v1/growth/daily-loop/draft", projection: "daily-loop", dailyLoopOperation: "draft" };
  if (operation === "daily-loop-advance") return { method: "POST", path: "/api/v1/growth/daily-loop/advance", projection: "daily-loop", dailyLoopOperation: "advance" };
  if (operation === "daily-loop-publish") return { method: "POST", path: "/api/v1/growth/daily-loop/publish", projection: "daily-loop", dailyLoopOperation: "publish" };
  if (operation === "action-handoff-list") return { method: "GET", path: "/api/v1/growth/automation/action-handoffs", projection: "action-handoff", actionHandoffOperation: "list" };
  if (operation === "action-handoff-create") return { method: "POST", path: "/api/v1/growth/automation/action-handoffs", projection: "action-handoff", actionHandoffOperation: "create" };
  if (operation === "action-handoff-deliver") return { method: "POST", path: `/api/v1/growth/automation/action-handoffs/${encodeURIComponent(selector.handoffId)}/deliver`, projection: "action-handoff", actionHandoffOperation: "deliver" };
  if (operation === "workbench-action-record") return { method: "POST", path: "/api/v1/growth/automation/release-workbench/actions", projection: "workbench-action" };
  if (operation === "workbench-action-audits") return { method: "GET", path: "/api/v1/growth/automation/release-workbench/action-audits", projection: "workbench-action-audits" };
  return null;
}

function proxyUrl(input = {}, spec = {}) {
  const prefix = `/${String(input.proxyPrefix || DEFAULT_PROXY_PREFIX).replace(/^\/+|\/+$/g, "")}`;
  const url = new URL(`${prefix}${spec.path}`, input.homeAiBaseUrl || DEFAULT_HOME_AI_BASE_URL);
  for (const [key, value] of Object.entries(compactSelectorForQuery(input.selector))) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

function proxyBody(input = {}, spec = {}) {
  if (spec.method !== "POST") return undefined;
  return Object.assign({}, compactSelectorForBody(input.selector), objectOnly(input.evidenceJson), objectOnly(input.bodyJson));
}

function readHomeAiAccessKey(input = {}, env = process.env, readFile = fs.readFileSync) {
  const envName = cleanString(input.accessKeyEnv, 80);
  const envValue = envName ? String(env[envName] || "").trim() : "";
  if (envValue) return { ok: true, key: envValue, source: "env" };
  const filePath = cleanString(input.accessKeyFile, 1000);
  if (!filePath) return { ok: false, error: "home_ai_proxy_smoke_access_key_required" };
  try {
    const key = String(readFile(filePath, "utf8") || "").trim();
    if (!key) return { ok: false, error: "home_ai_proxy_smoke_access_key_empty" };
    return { ok: true, key, source: "file" };
  } catch (_error) {
    return { ok: false, error: "home_ai_proxy_smoke_access_key_unreadable" };
  }
}

async function fetchJson(url, options = {}, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") return { ok: false, error: "home_ai_proxy_smoke_fetch_unavailable", httpStatus: 0 };
  const response = await fetchImpl(url, options);
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (_error) {
      return {
        ok: false,
        error: "home_ai_proxy_smoke_invalid_json",
        httpStatus: response.status,
        homeAiProxyHttpOk: response.ok
      };
    }
  }
  return {
    ok: response.ok,
    httpStatus: response.status,
    homeAiProxyHttpOk: response.ok,
    body
  };
}

function projectOperationResult(body = {}, input = {}, spec = {}) {
  if (spec.projection === "planner-readiness") return projectPlannerReadinessSmokeReadback(body, input.selector);
  if (spec.projection === "daily-loop") return projectDailyLoopSmokeReadback(Object.assign({ operation: spec.dailyLoopOperation }, body));
  if (spec.projection === "action-handoff") {
    return projectAutomationActionHandoffSmokeReadback(
      Object.assign({ operation: spec.actionHandoffOperation }, body),
      spec.actionHandoffOperation,
      input.selector,
      input.allowWrite
    );
  }
  if (spec.projection === "platform-action-evidence") return projectPlatformActionEvidenceSmokeReadback(body, input.selector);
  if (spec.projection === "release-readiness") return projectReleaseReadinessSmokeReadback(body, input.selector);
  if (spec.projection === "workbench-action") return projectReleaseWorkbenchActionSmokeReadback(Object.assign({ operation: "record" }, body), input.selector);
  if (spec.projection === "workbench-action-audits") return projectReleaseWorkbenchActionSmokeReadback(Object.assign({ operation: "list-audits" }, body), input.selector);
  return body;
}

function projectHomeAiProxySmokeReadback(httpResult = {}, projected = {}, input = {}, spec = {}) {
  const bodyError = objectOnly(httpResult.body).error;
  const errorCode = typeof bodyError === "object" && bodyError ? cleanString(bodyError.code, 160) : cleanString(projected.error || httpResult.error, 160);
  return Object.assign({}, projected, {
    homeAiProxySmokeSchemaVersion: "growth.homeAiProxySmoke.v1",
    homeAiProxySmokeSummaryOnly: true,
    homeAiProxySmokeOperation: input.operation,
    homeAiProxySmokeHttpStatus: Number(httpResult.httpStatus || 0) || 0,
    homeAiProxySmokeHttpOk: httpResult.homeAiProxyHttpOk === true,
    homeAiProxySmokeOk: httpResult.homeAiProxyHttpOk === true && projected.ok !== false,
    homeAiProxySmokeRoutePath: spec.path,
    homeAiProxySmokeMethod: spec.method,
    homeAiProxySmokeWriteOperation: WRITE_OPERATIONS.has(input.operation),
    homeAiProxySmokeWriteAllowed: input.allowWrite === true,
    homeAiProxySmokeWritesPerformed: WRITE_OPERATIONS.has(input.operation) && input.allowWrite === true && httpResult.homeAiProxyHttpOk === true && projected.ok !== false,
    homeAiProxySmokeAccessKeySource: input.accessKeyEnv ? "env" : "file",
    homeAiProxySmokeErrorCode: errorCode
  });
}

async function runProxyOperation(input = {}, deps = {}) {
  const validation = validateInput(input);
  if (!validation.ok) return validation;
  const keyResult = readHomeAiAccessKey(input, deps.env || process.env, deps.readFile || fs.readFileSync);
  if (!keyResult.ok) return Object.assign({ exitCode: 2 }, keyResult);
  const spec = operationSpec(input.operation, input.selector);
  const url = proxyUrl(input, spec);
  const body = proxyBody(input, spec);
  const headers = {
    "X-Hermes-Web-Key": keyResult.key
  };
  const options = { method: spec.method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const httpResult = await fetchJson(url, options, deps.fetchImpl);
  if (!httpResult.body) {
    return projectHomeAiProxySmokeReadback(httpResult, { ok: false, error: httpResult.error || "home_ai_proxy_smoke_failed" }, input, spec);
  }
  const projected = projectOperationResult(httpResult.body, input, spec);
  return projectHomeAiProxySmokeReadback(httpResult, projected, input, spec);
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: "home_ai_proxy_smoke_invalid_json",
      detail: cleanString(error && error.message, 160)
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const result = await runProxyOperation(input);
  process.stdout.write(formatResult(result, pretty));
  if (result.exitCode) {
    process.exitCode = result.exitCode;
  } else {
    process.exitCode = result.homeAiProxySmokeHttpOk === false || result.homeAiProxySmokeOk === false ? 1 : 0;
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "home_ai_proxy_smoke_failed",
      detail: cleanString(error && error.message ? error.message : error, 180)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationSpec,
  projectHomeAiProxySmokeReadback,
  proxyBody,
  proxyUrl,
  readHomeAiAccessKey,
  runProxyOperation,
  validateInput
};
