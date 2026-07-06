import { renderOwnerCardGenerationPanel } from "../features/card-generation/CardGenerationPanel.js";
import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";
import {
  boardStatusText,
  cardOpenTimeText,
  cardRewardText,
  taskRewardCapCoins
} from "./BoardView.js";
import { cardDetailGoalText } from "./CardDetailView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function overviewFromState(state = {}) {
  return state.overview || state.model?.overview || {};
}

function programsFromOverview(overview = {}) {
  return overview.programs || {};
}

function settingsRouteState(state = {}) {
  return state.learningGrowthRouteState || state.route?.routeState || {};
}

export function settingsActiveTab(state = {}, options = {}) {
  const requestedRaw = clean(options.activeTab || state.learningGrowthActiveTab || state.route?.activeTab);
  const aliases = {
    settings: "overview",
    "new-task": "tasks",
    "reward-settlement": "rewards",
    "ai-summary": "ai-analysis",
    generate: "generation",
    "card-generation": "generation"
  };
  return aliases[requestedRaw] || requestedRaw || "overview";
}

export function ownerSettingsLearnerLabel(overview = {}, options = {}) {
  return clean(overview.learner?.displayName || overview.learner?.id || options.learnerId || options.currentWorkspaceId);
}

export function ownerSettingsTasks(overview = {}) {
  const byId = new Map();
  const add = (task) => {
    const id = clean(task?.taskCardId || task?.id);
    if (id && !byId.has(id)) byId.set(id, task);
  };
  asArray(overview.board?.cards).forEach(add);
  const programs = programsFromOverview(overview);
  asArray(programs.taskCards || programs.tasks || programs.cards).forEach(add);
  return Array.from(byId.values()).slice(0, 80);
}

export function ownerSettingsTaskById(overview = {}, taskCardId = "") {
  const id = clean(taskCardId);
  return ownerSettingsTasks(overview).find((task) => clean(task.taskCardId || task.id) === id) || null;
}

function taskSeriesKey(task = {}) {
  return clean(task.templateId || task.taskModel?.templateId || task.skillId || task.title || task.taskCardId || task.id);
}

function taskSeriesLabel(task = {}) {
  return clean(task.title || task.templateId || task.taskModel?.templateId || task.skillId || task.taskCardId || task.id || "任务系列");
}

export function ownerSettingsTaskSeries(overview = {}, task = {}) {
  const key = taskSeriesKey(task);
  return ownerSettingsTasks(overview)
    .filter((item) => taskSeriesKey(item) === key)
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt || left.updatedAt || left.createdAt || left.openedAt || "") || 0;
      const rightTime = Date.parse(right.completedAt || right.updatedAt || right.createdAt || right.openedAt || "") || 0;
      return rightTime - leftTime;
    });
}

function completedTaskCount(tasks = []) {
  return tasks.filter((task) => /complete|completed|done/i.test(clean(task.status || task.nextAction))).length;
}

function averageCoinsForWindow(coins = {}, metrics = {}, days = 7) {
  const value = Number(metrics[`averageCoins${days}d`] || metrics[`coinsAverage${days}d`] || coins.growth?.[`averageCoins${days}d`] || 0);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function renderSettingsRouteNotice(routeState = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const status = clean(routeState.status);
  if (status !== "empty" && status !== "unavailable") return "";
  const route = clean(routeState.route);
  const title = routeState.emptyTitle || routeState.title || "暂无可执行内容";
  const body = routeState.emptyBody || routeState.body || "这个入口当前没有可打开的学习状态。";
  const code = clean(routeState.code);
  return `<section class="learning-coin-panel learning-growth-route-notice" data-growth-route-state="${escapeHtml(route)}" data-growth-route-status="${escapeHtml(status)}">
      <div class="learning-section-heading">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(routeState.label || route || "入口")}</span>
      </div>
      <p class="learning-growth-muted">${escapeHtml(body)}</p>
      ${code ? `<small class="learning-growth-muted">${escapeHtml(code)}</small>` : ""}
    </section>`;
}

export function renderOwnerSettingsOverview(overview = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const tasks = ownerSettingsTasks(overview);
  const completed = completedTaskCount(tasks);
  const activeTasks = tasks.length - completed;
  const coins = options.coins || overview.coins || {};
  const growth = coins.growth || {};
  const balances = coins.balances || {};
  const counts = programsFromOverview(overview).launchOperations?.counts || {};
  const earned = Number(growth.totalEarnedCoins || balances.earnedCoins || 0);
  return `<section class="learning-settings-overview" data-learning-settings-overview>
      <div class="learning-settings-kpi-grid">
        <span><small>执行者</small><strong>${escapeHtml(ownerSettingsLearnerLabel(overview, options) || "执行者")}</strong></span>
        <span><small>当前任务</small><strong>${escapeHtml(String(activeTasks))}</strong></span>
        <span><small>已完成</small><strong>${escapeHtml(String(completed || counts.completedTasks || 0))}</strong></span>
        <span><small>累计金币</small><strong>${escapeHtml(String(Math.round(earned || 0)))}</strong></span>
        <span><small>7日均值</small><strong>${escapeHtml(String(averageCoinsForWindow(coins, overview.metrics || {}, 7)))}</strong></span>
        <span><small>30日均值</small><strong>${escapeHtml(String(averageCoinsForWindow(coins, overview.metrics || {}, 30)))}</strong></span>
        <span><small>待结算</small><strong>${escapeHtml(String(counts.pendingRewardSettlements || 0))}</strong></span>
      </div>
    </section>`;
}

export function renderOwnerTaskList(overview = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const tasks = ownerSettingsTasks(overview);
  if (!tasks.length) return `<div class="learning-coin-empty">暂无任务。</div>`;
  const workspaceId = clean(overview.learner?.workspaceId || options.currentWorkspaceId || options.workspaceId);
  return `<section class="learning-coin-panel learning-settings-task-list" data-learning-settings-task-list>
      <div class="learning-section-heading">
        <h3>当前任务</h3>
        <span>${escapeHtml(String(tasks.length))}</span>
      </div>
      <div class="learning-settings-task-rows">
        ${tasks.map((task) => {
          const taskCardId = clean(task.taskCardId || task.id);
          const generated = cardOpenTimeText(task);
          const meta = [
            task.templateId || task.taskModel?.templateId || "",
            task.status || task.nextAction || "",
            generated ? `开放 ${generated}` : ""
          ].map(clean).filter(Boolean).join(" / ");
          return `<button type="button" class="learning-settings-task-row" data-learning-open-settings-task="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(clean(task.workspaceId || workspaceId))}">
            <span>
              <strong>${escapeHtml(task.title || taskCardId)}</strong>
              <small>${escapeHtml(meta)}</small>
            </span>
            <em>查看</em>
          </button>`;
        }).join("")}
      </div>
    </section>`;
}

export function renderOwnerSettingsTaskDetail(overview = {}, state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskId = clean(state.learningGrowthSettingsTaskId || state.route?.settingsTaskId || options.settingsTaskId);
  const task = ownerSettingsTaskById(overview, taskId);
  if (!task) {
    return `<section class="learning-coin-panel learning-settings-task-detail" data-learning-settings-task-detail>
        <button type="button" class="learning-settings-back" data-learning-settings-task-back>返回任务列表</button>
        <div class="learning-coin-empty">这项任务已更新或不在当前列表里。</div>
      </section>`;
  }
  const series = ownerSettingsTaskSeries(overview, task);
  const completed = completedTaskCount(series);
  const latest = series.slice(0, 6);
  const nextSuggestion = task.learningGrowthGenerationReport?.goal
    || task.learningGrowthJitGeneration?.goal
    || task.learningGrowthJitGeneration?.decision
    || task.nextRecommendation
    || "建议在 AI分析 标签刷新学习总结后，再决定下一张卡的方向。";
  return `<section class="learning-coin-panel learning-settings-task-detail" data-learning-settings-task-detail>
      <button type="button" class="learning-settings-back" data-learning-settings-task-back>返回任务列表</button>
      <div class="learning-section-heading">
        <h3>${escapeHtml(task.title || taskId)}</h3>
        <span>${escapeHtml(task.status || task.nextAction || "未定")}</span>
      </div>
      <div class="learning-settings-task-detail-grid">
        <span><small>系列</small><strong>${escapeHtml(taskSeriesLabel(task))}</strong></span>
        <span><small>已生成</small><strong>${escapeHtml(String(series.length))}</strong></span>
        <span><small>已完成</small><strong>${escapeHtml(String(completed))}</strong></span>
        <span><small>奖励</small><strong>${escapeHtml(String(taskRewardCapCoins(task)))}</strong></span>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>目标</h4>
        <p>${escapeHtml(cardDetailGoalText(task) || "暂无目标摘要。")}</p>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>当前状态</h4>
        <p>${escapeHtml([task.activityType || "", task.skillId || "", cardOpenTimeText(task) ? `开放 ${cardOpenTimeText(task)}` : ""].filter(Boolean).join(" / ") || "暂无状态摘要。")}</p>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>已生成卡片</h4>
        ${latest.length ? latest.map((item) => `<p>${escapeHtml([item.title || item.taskCardId || item.id, item.status || item.nextAction || "", cardOpenTimeText(item) ? `开放 ${cardOpenTimeText(item)}` : ""].filter(Boolean).join(" / "))}</p>`).join("") : `<p>暂无卡片记录。</p>`}
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>后续建议</h4>
        <p>${escapeHtml(nextSuggestion)}</p>
      </div>
    </section>`;
}

export function renderOwnerSettingsRewards(overview = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const coins = options.coins || overview.coins || {};
  const growth = coins.growth || {};
  const balances = coins.balances || {};
  const settlements = asArray(programsFromOverview(overview).rewardSettlements);
  const settled = settlements.filter((item) => clean(item.status) === "settled");
  const settledCoins = settled.reduce((sum, item) => sum + (Number(item.coinAmount) || 0), 0);
  const averageSettled = settled.length ? Math.round(settledCoins / settled.length) : 0;
  return `<section class="learning-coin-panel learning-settings-reward-stats" data-learning-settings-reward-stats>
      <div class="learning-section-heading">
        <h3>奖励统计</h3>
        <span>执行者</span>
      </div>
      <div class="learning-settings-reward-rows">
        <span><small>累计金币</small><strong>${escapeHtml(String(Math.round(Number(growth.totalEarnedCoins || balances.earnedCoins || 0) || 0)))}</strong></span>
        <span><small>7日均值</small><strong>${escapeHtml(String(averageCoinsForWindow(coins, overview.metrics || {}, 7)))}</strong></span>
        <span><small>30日均值</small><strong>${escapeHtml(String(averageCoinsForWindow(coins, overview.metrics || {}, 30)))}</strong></span>
        <span><small>已结算次数</small><strong>${escapeHtml(String(settled.length))}</strong></span>
        <span><small>平均每次</small><strong>${escapeHtml(String(averageSettled))}</strong></span>
      </div>
    </section>`;
}

export function renderOwnerSettingsTabs(tabs = [], activeTab = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const visible = tabs.filter((tab) => tab && tab.html);
  if (!visible.length) return "";
  const activeId = visible.some((tab) => tab.id === activeTab) ? activeTab : visible[0].id;
  return `<section class="learning-program-section learning-program-parent-admin learning-growth-settings-tabs" data-learning-growth-module="programs" data-learning-growth-category="parent-admin" data-learning-growth-owner-management>
      <section class="learning-growth-tabs" data-learning-growth-tabs>
        <div class="learning-growth-tab-list" role="tablist" aria-label="复用的平台能力">
          ${visible.map((tab) => `<button type="button" role="tab" data-learning-growth-tab="${escapeHtml(tab.id)}" aria-selected="${tab.id === activeId ? "true" : "false"}" class="${tab.id === activeId ? "active" : ""}">${escapeHtml(tab.label)}</button>`).join("")}
        </div>
        ${visible.map((tab) => `<section class="learning-growth-tab-panel${tab.id === activeId ? " active" : ""}" data-learning-growth-tab-panel="${escapeHtml(tab.id)}" role="tabpanel"${tab.id === activeId ? "" : " hidden"}>
          ${tab.html}
        </section>`).join("")}
      </section>
    </section>`;
}

export function renderOwnerSettingsPage(state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const overview = options.overview || overviewFromState(state);
  const learnerLabel = ownerSettingsLearnerLabel(overview, options);
  if (!learnerLabel) {
    return `<div class="learning-growth-view learning-growth-settings-page" data-learning-role="owner" data-learning-growth-settings-page>
      <section class="learning-coin-panel learning-settings-empty" data-learning-settings-no-learner>
        <div class="learning-section-heading">
          <h3>成长设置</h3>
          <span>未选择执行者</span>
        </div>
        <p class="learning-growth-muted">当前还没有可用于成长计划的执行者。请先创建或选择执行者工作区，再配置学习范围、任务和奖励规则。</p>
      </section>
    </div>`;
  }
  const activeTab = settingsActiveTab(state, options);
  const routeNoticeHtml = renderSettingsRouteNotice(settingsRouteState(state), options);
  const generationRenderer = options.renderers?.ownerGenerationPanel || renderOwnerCardGenerationPanel;
  const generationHtml = typeof generationRenderer === "function"
    ? generationRenderer({
      state,
      workspaceId: state.cardGeneration?.selectedWorkspaceId || options.currentWorkspaceId || overview.learner?.workspaceId || "",
      viewTargets: options.viewTargets || state.viewTargets || [],
      renderers: options.renderers || {}
    })
    : "";
  const tabs = renderOwnerSettingsTabs([
    { id: "overview", label: "总览", html: renderOwnerSettingsOverview(overview, options) },
    { id: "tasks", label: "任务", html: state.learningGrowthSettingsTaskId ? renderOwnerSettingsTaskDetail(overview, state, options) : renderOwnerTaskList(overview, options) },
    { id: "rewards", label: "奖励", html: renderOwnerSettingsRewards(overview, options) },
    { id: "generation", label: "生成", html: generationHtml }
  ], activeTab, options);
  return `<div class="learning-growth-view learning-growth-settings-page" data-learning-product="fanfan-growth" data-learning-role="owner" data-learning-growth-settings-page>
      <section class="learning-growth-owner-settings-toolbar">
        <button type="button" data-learning-growth-close-settings>返回看板</button>
        <span>Owner 管理 · ${escapeHtml(learnerLabel)}</span>
      </section>
      ${routeNoticeHtml}
      ${tabs}
    </div>`;
}
