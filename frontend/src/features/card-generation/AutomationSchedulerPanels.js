import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function automationSchedulerExecutionActionFromHandoff(handoff = {}) {
  const actions = asArray(handoff.actions);
  return actions.find((action = {}) => clean(action.proposalId || action.proposal_id)) || actions[0] || {};
}

export function automationSchedulerExecutionStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "submitting") return "执行中";
  if (value === "started") return "已开始";
  if (value === "published") return "已发布";
  if (value === "blocked") return "已拦截";
  if (value === "failed") return "失败";
  if (value === "skipped") return "已跳过";
  if (value === "executed") return "已记录";
  return value || "待处理";
}

export function automationSchedulerExecutionActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const execution = result.execution || {};
  if (!status || status === "idle") return "";
  const resultStatus = clean(execution.status || result.status || status);
  const detail = status === "submitting"
    ? "正在通过 Growth scheduler execution service 记录 Owner 显式执行。"
    : resultStatus === "published"
      ? `Scheduler execution 已发布：${clean(execution.executionId || execution.execution_id) || "execution"}。`
      : resultStatus === "blocked"
        ? `Scheduler execution 被门禁拦截：${clean(execution.reason || result.error || error) || "blocked"}。`
        : status === "executed"
          ? `Scheduler execution 已记录：${clean(execution.executionId || execution.execution_id) || "execution"}。`
          : error || clean(result.error) || "Scheduler execution 操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-execution-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerExecutionStatusText(resultStatus))}</em>
    </div>`;
}

export function automationSchedulerExecutionRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const executions = asArray(data.executions).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 scheduler execution。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Scheduler execution 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_executions_failed")}</div>`;
  if (!executions.length) return `<div class="learning-card-generation-proposal-empty">暂无 scheduler execution。已投递 handoff 后，可以显式尝试执行一次。</div>`;
  return executions.map((execution) => {
    const executionId = clean(execution.executionId || execution.execution_id);
    const statusText = automationSchedulerExecutionStatusText(execution.status);
    const handoffId = clean(execution.handoffId || execution.handoff_id);
    const proposalId = clean(execution.proposalId || execution.proposal_id);
    const generatedTaskCardId = clean(execution.execution?.generatedTaskCardId || execution.execution?.generated_task_card_id);
    const reason = clean(execution.reason || execution.error || execution.execution?.reason);
    return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-row data-automation-scheduler-execution-id="${escapeHtml(executionId)}">
        <span>
          <strong>${escapeHtml(executionId || "scheduler execution")}</strong>
          <small>${escapeHtml(`handoff ${handoffId || "unknown"} · proposal ${proposalId || "unknown"}`)}</small>
          <small>${escapeHtml(generatedTaskCardId ? `generated card ${generatedTaskCardId}` : (reason || "默认禁用时会记录 blocked，不会发布。"))}</small>
        </span>
        <em>${escapeHtml(statusText)}</em>
      </div>`;
  }).join("");
}

export function automationSchedulerExecutionHandoffRows(handoffsHolder = {}, executionsHolder = {}, escapeHtml = defaultEscapeHtml) {
  const handoffs = asArray(handoffsHolder.data?.handoffs)
    .filter((handoff) => {
      const deliveryStatus = clean(handoff.deliveryStatus || handoff.delivery_status || handoff.status);
      return deliveryStatus === "delivered";
    })
    .slice(0, 4);
  const busy = executionsHolder.actionStatus === "submitting";
  if (!handoffs.length) return `<div class="learning-card-generation-proposal-empty">没有可执行的已投递 handoff。</div>`;
  return handoffs.map((handoff) => {
    const handoffId = clean(handoff.handoffId || handoff.handoff_id);
    const digestId = clean(handoff.digestId || handoff.digest_id);
    const action = automationSchedulerExecutionActionFromHandoff(handoff);
    const proposalId = clean(action.proposalId || action.proposal_id || handoff.proposalId || handoff.proposal_id);
    const selectedItemId = clean(action.selectedItemId || action.selected_item_id || action.itemId || action.item_id);
    return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-handoff-row data-automation-action-handoff-id="${escapeHtml(handoffId)}">
        <span>
          <strong>${escapeHtml(handoffId || "delivered handoff")}</strong>
          <small>${escapeHtml(`digest ${digestId || "unknown"} · proposal ${proposalId || "missing"}`)}</small>
          <small>执行会重新检查 release / activation / runtime gates；默认禁用时只写 blocked 记录。</small>
        </span>
        <em>${escapeHtml(proposalId ? "可尝试" : "缺 proposal")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-scheduler-execution-execute data-automation-action-handoff-id="${escapeHtml(handoffId)}" data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-selected-item-id="${escapeHtml(selectedItemId)}" ${busy || !handoffId || !proposalId ? "disabled" : ""}>执行一次</button>
        </div>
      </div>`;
  }).join("");
}

export function automationSchedulerExecutionPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationSchedulerExecutions || {};
  const data = holder.data || {};
  const executions = asArray(data.executions);
  const published = executions.filter((item) => clean(item.status) === "published").length;
  const blocked = executions.filter((item) => clean(item.status) === "blocked").length;
  const failed = executions.filter((item) => clean(item.status) === "failed").length;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const reason = status === "loading"
    ? "正在读取 scheduler execution。"
    : status === "failed"
      ? clean(holder.error) || "automation_scheduler_executions_failed"
      : "Owner 显式执行只通过 scheduler execution service；默认配置会被门禁拦截。";
  return `<section class="learning-card-generation-proposals learning-card-generation-scheduler-executions" data-automation-scheduler-execution-panel data-automation-scheduler-execution-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler 执行</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-execution-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新执行"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已发布</small><strong>${escapeHtml(String(published))}</strong></span>
        <span><small>已拦截</small><strong>${escapeHtml(String(blocked))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerExecutionHandoffRows(state.automationActionHandoffs || {}, holder, escapeHtml)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerExecutionRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerExecutionActionStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationSchedulerRunStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "loading") return "读取中";
  if (value === "submitting") return "运行中";
  if (value === "started") return "已开始";
  if (value === "completed") return "已完成";
  if (value === "partial") return "部分完成";
  if (value === "blocked") return "已拦截";
  if (value === "failed") return "失败";
  if (value === "skipped") return "已跳过";
  if (value === "ran") return "已记录";
  return value || "待处理";
}

export function automationSchedulerRunActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const run = result.run || {};
  if (!status || status === "idle") return "";
  const resultStatus = clean(run.status || result.status || status);
  const detail = status === "submitting"
    ? "正在通过 Growth scheduler run service 记录一次监督 tick。"
    : resultStatus === "completed"
      ? `Scheduler run 已完成：${clean(run.runId || run.run_id) || "run"}。`
      : resultStatus === "blocked"
        ? `Scheduler run 被门禁拦截：${clean(run.reason || result.error || error) || "blocked"}。`
        : status === "ran"
          ? `Scheduler run 已记录：${clean(run.runId || run.run_id) || "run"}。`
          : error || clean(result.error) || "Scheduler run 操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-run-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerRunStatusText(resultStatus))}</em>
    </div>`;
}

export function automationSchedulerRunRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const runs = asArray(data.runs).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 scheduler run。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Scheduler run 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_runs_failed")}</div>`;
  if (!runs.length) return `<div class="learning-card-generation-proposal-empty">暂无 scheduler run。可以显式运行一次默认禁用的监督 tick。</div>`;
  return runs.map((run) => {
    const runId = clean(run.runId || run.run_id);
    const statusText = automationSchedulerRunStatusText(run.status);
    const summary = run.summary || {};
    const attempted = Number(summary.attemptedExecutions || summary.attempted_executions || asArray(run.executions).length || 0) || 0;
    const inspectedHandoffs = Number(summary.inspectedHandoffs || summary.inspected_handoffs || asArray(run.candidates).length || 0) || 0;
    const reason = clean(run.reason || run.error);
    return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-run-row data-automation-scheduler-run-id="${escapeHtml(runId)}">
        <span>
          <strong>${escapeHtml(runId || "scheduler run")}</strong>
          <small>${escapeHtml(`handoffs ${inspectedHandoffs} · executions ${attempted}`)}</small>
          <small>${escapeHtml(reason || "默认禁用时会记录 blocked run，不会启动后台调度。")}</small>
        </span>
        <em>${escapeHtml(statusText)}</em>
      </div>`;
  }).join("");
}

export function automationSchedulerRunPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationSchedulerRuns || {};
  const data = holder.data || {};
  const runs = asArray(data.runs);
  const completed = runs.filter((item) => clean(item.status) === "completed").length;
  const blocked = runs.filter((item) => clean(item.status) === "blocked").length;
  const failed = runs.filter((item) => clean(item.status) === "failed").length;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  const reason = status === "loading"
    ? "正在读取 scheduler run。"
    : status === "failed"
      ? clean(holder.error) || "automation_scheduler_runs_failed"
      : "Scheduler run 是默认禁用的监督 tick；Owner 点击只会走服务门禁和审计记录。";
  return `<section class="learning-card-generation-proposals learning-card-generation-scheduler-runs" data-automation-scheduler-run-panel data-automation-scheduler-run-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler Run</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-run-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Run"}</button>
          <button type="button" data-automation-scheduler-run-once ${busy ? "disabled" : ""}>${busy ? "运行中" : "运行一次"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已完成</small><strong>${escapeHtml(String(completed))}</strong></span>
        <span><small>已拦截</small><strong>${escapeHtml(String(blocked))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerRunRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerRunActionStatusPanel(holder, escapeHtml)}
    </section>`;
}

export function automationSchedulerWorkerTargetStatusText(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "proposed") return "待复核";
  if (value === "enabled") return "已复核";
  if (value === "disabled") return "已停用";
  if (value === "archived") return "已归档";
  if (value === "submitting") return "保存中";
  if (value === "created") return "已创建";
  if (value === "reviewed") return "已复核";
  if (value === "failed") return "失败";
  return value || "记录";
}

export function automationSchedulerWorkerTargetActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
  const status = clean(holder.actionStatus);
  const error = clean(holder.actionError);
  const result = holder.actionResult || {};
  const target = result.target || {};
  const targetId = clean(target.targetId || result.targetId);
  if (!status || status === "idle") return "";
  const detail = status === "created"
    ? `Worker target 已创建${targetId ? `：${targetId}` : "，等待 Owner 复核。"}`
    : status === "reviewed"
      ? `Worker target 已记录为 ${automationSchedulerWorkerTargetStatusText(target.status)}${targetId ? `：${targetId}` : "。"}`
      : status === "submitting"
        ? "正在通过 Growth worker target service 写入。"
        : error || "Worker target 操作失败。";
  return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-worker-target-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerWorkerTargetStatusText(status))}</em>
    </div>`;
}

export function automationSchedulerWorkerTargetRows(holder = {}, escapeHtml = defaultEscapeHtml) {
  const data = holder.data || {};
  const targets = asArray(data.targets).slice(0, 5);
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 worker target。</div>`;
  if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Worker target 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_worker_targets_failed")}</div>`;
  if (!targets.length) return `<div class="learning-card-generation-proposal-empty">暂无 worker target。可以先创建一个 proposed target，等待 Owner 复核。</div>`;
  return targets.map((target) => {
    const targetId = clean(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id);
    const targetStatus = clean(target.status);
    const policy = target.policy || {};
    const readiness = target.readiness || {};
    const summary = target.target || {};
    const label = clean(summary.subject || target.subject || summary.domain || target.domain || "worker target");
    const nodes = asArray(summary.targetNodeIds || target.targetNodeIds).map(clean).filter(Boolean).slice(0, 3);
    const canEnable = targetStatus === "proposed" || targetStatus === "disabled";
    const canDisable = targetStatus === "proposed" || targetStatus === "enabled";
    const canArchive = targetStatus !== "archived";
    const busy = holder.actionStatus === "submitting";
    return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-worker-target-row data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}">
        <span>
          <strong>${escapeHtml(targetId || label)}</strong>
          <small>${escapeHtml(`${label} · ${clean(target.horizon || summary.horizon || "daily_plan")}`)}</small>
          <small>${escapeHtml(nodes.length ? `nodes ${nodes.join(" · ")}` : "reviewed target config only")}</small>
          <small>${escapeHtml(`productionSchedulingAllowed=${policy.productionSchedulingAllowed === true || readiness.productionSchedulingAllowed === true ? "true" : "false"}`)}</small>
        </span>
        <em>${escapeHtml(automationSchedulerWorkerTargetStatusText(targetStatus))}</em>
        ${canEnable || canDisable || canArchive ? `<div class="learning-card-generation-proposal-actions">
          ${canEnable ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="enabled" ${busy ? "disabled" : ""}>启用记录</button>` : ""}
          ${canDisable ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="disabled" ${busy ? "disabled" : ""}>停用</button>` : ""}
          ${canArchive ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="archived" ${busy ? "disabled" : ""}>归档</button>` : ""}
        </div>` : ""}
      </div>`;
  }).join("");
}

export function automationSchedulerWorkerTargetPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
  const holder = state.automationSchedulerWorkerTargets || {};
  const data = holder.data || {};
  const targets = asArray(data.targets);
  const proposed = targets.filter((item) => clean(item.status) === "proposed").length;
  const enabled = targets.filter((item) => clean(item.status) === "enabled").length;
  const disabled = targets.filter((item) => clean(item.status) === "disabled").length;
  const archived = targets.filter((item) => clean(item.status) === "archived").length;
  const status = clean(holder.status || (data.ok ? "ready" : "idle"));
  const busy = holder.actionStatus === "submitting";
  const reason = status === "loading"
    ? "正在读取 worker target。"
    : status === "failed"
      ? clean(holder.error) || "automation_scheduler_worker_targets_failed"
      : "Worker target 是未来后台 worker 的 Owner 复核配置；创建和复核都不会启动 worker。";
  return `<section class="learning-card-generation-proposals learning-card-generation-worker-targets" data-automation-scheduler-worker-target-panel data-automation-scheduler-worker-target-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Worker Target</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-worker-target-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Target"}</button>
          <button type="button" data-automation-scheduler-worker-target-create ${busy ? "disabled" : ""}>${busy ? "创建中" : "创建 Target"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(proposed))}</strong></span>
        <span><small>已复核</small><strong>${escapeHtml(String(enabled))}</strong></span>
        <span><small>停用/归档</small><strong>${escapeHtml(String(disabled + archived))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerWorkerTargetRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerWorkerTargetActionStatusPanel(holder, escapeHtml)}
    </section>`;
}
