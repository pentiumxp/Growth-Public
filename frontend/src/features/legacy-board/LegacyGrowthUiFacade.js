import { renderCardDetailView } from "../../views/CardDetailView.js";
import {
  renderOwnerWorkspaceRouteNotice,
  renderOwnerWorkspaceView
} from "../../views/OwnerWorkspaceView.js";
import { renderOwnerSettingsPage } from "../../views/SettingsView.js";
import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";
import {
  renderBoardCard,
  renderLearningGrowthBoard
} from "./LegacyBoardView.js";

function optionFn(options, name, fallback) {
  return typeof options[name] === "function" ? options[name] : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isOwner(options = {}) {
  return Boolean(options.isOwner === true || options.state?.auth?.isOwner === true);
}

function statusText(status) {
  const value = clean(status);
  if (value === "active") return "已接入";
  if (value === "ready") return "已就绪";
  if (value === "foundation") return "底座";
  if (value === "guardrail") return "护栏";
  if (value === "platform-reuse") return "复用平台";
  if (value === "planned") return "规划中";
  if (value === "next") return "下一阶段";
  return value || "待定";
}

function readinessStatusText(status) {
  const value = clean(status);
  if (value === "operational_ready") return "Operational ready";
  if (value === "system_ready") return "System ready";
  if (value === "blocked") return "Blocked";
  return value || "Unknown";
}

function renderReadinessMetric(label, value, options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  const percent = Math.max(0, Math.min(100, Number(value || 0)));
  return `<span>
      <strong>${escapeHtml(`${percent}%`)}</strong>
      <small>${escapeHtml(label)}</small>
    </span>`;
}

function renderReadinessCheckRows(checks = [], options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  return asArray(checks).map((item) => `<li class="learning-readiness-check-row" data-learning-readiness-check="${escapeHtml(item.id || "")}" data-ready="${item.ready ? "1" : "0"}">
      <span>${item.ready ? "OK" : "TODO"}</span>
      <strong>${escapeHtml(item.label || item.id || "")}</strong>
    </li>`).join("");
}

function normalizedState(options = {}) {
  const overview = options.overview || options.state?.overview || {};
  return Object.assign({}, options.state || {}, {
    auth: Object.assign({}, options.state?.auth || {}, { isOwner: isOwner(options) }),
    currentWorkspaceId: options.currentWorkspaceId || options.workspaceId || options.state?.currentWorkspaceId || overview.learner?.workspaceId || "",
    learningGrowthActiveTab: options.activeTab || options.state?.learningGrowthActiveTab || options.state?.route?.activeTab || "",
    learningGrowthBoardLane: options.activeGrowthBoardLane || options.state?.learningGrowthBoardLane || options.state?.route?.boardLane || "",
    learningGrowthRouteState: options.state?.learningGrowthRouteState || options.state?.route?.routeState || {},
    overview,
    selectedLearningTaskCardId: options.selectedGrowthTaskCardId || options.state?.selectedLearningTaskCardId || "",
    viewTargets: options.viewTargets || options.state?.viewTargets || options.state?.growthViewTargets || []
  });
}

function appendBeforeLastClosingDiv(html = "", insertion = "") {
  const index = html.lastIndexOf("</div>");
  if (index < 0) return `${html}${insertion}`;
  return `${html.slice(0, index)}${insertion}${html.slice(index)}`;
}

function taskId(task = {}) {
  return clean(task.taskCardId || task.id || task.cardId);
}

function taskSeriesKey(task = {}) {
  return clean(task.templateId || task.taskModel?.templateId || task.skillId || task.title || taskId(task));
}

function taskSeriesLabel(task = {}) {
  return clean(task.title || task.templateId || task.taskModel?.templateId || task.skillId || taskId(task) || "任务系列");
}

function cardOpenTimeText(card = {}) {
  return clean(card.dueLabel || card.openLabel || card.openedAt || card.createdAt || "");
}

function findGrowthHistorySeed(overview = {}, taskCardId = "") {
  const id = clean(taskCardId);
  if (!id) return null;
  return asArray(overview.board?.cards)
    .concat(asArray(overview.programs?.taskCards || overview.programs?.tasks || overview.programs?.cards))
    .find((card) => taskId(card) === id) || null;
}

function relatedGrowthHistoryCards(overview = {}, seed = {}) {
  const key = taskSeriesKey(seed);
  if (!key) return [];
  return asArray(overview.board?.cards)
    .concat(asArray(overview.programs?.taskCards || overview.programs?.tasks || overview.programs?.cards))
    .filter((card) => taskSeriesKey(card) === key)
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt || left.updatedAt || left.createdAt || left.openedAt || "") || 0;
      const rightTime = Date.parse(right.completedAt || right.updatedAt || right.createdAt || right.openedAt || "") || 0;
      return rightTime - leftTime;
    });
}

export function renderCapabilityCards(capabilities = [], options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  if (!capabilities.length) return `<div class="learning-coin-empty">成长系统模块正在初始化。</div>`;
  return capabilities.map((item) => `<article class="learning-growth-module-card" data-learning-growth-capability="${escapeHtml(item.id)}">
      <div class="learning-growth-module-top">
        <h3>${escapeHtml(item.title || item.id || "模块")}</h3>
        <span>${escapeHtml(statusText(item.status))}</span>
      </div>
      <p>${escapeHtml(item.description || "")}</p>
    </article>`).join("");
}

export function renderPlatformStrip(capabilities = [], options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  return `<div class="learning-growth-platform-strip" aria-label="复用的平台能力">
      ${asArray(capabilities).map((item) => `<span>${escapeHtml(item.title || item.id || "")}</span>`).join("")}
    </div>`;
}

export function renderNextModules(nextModules = [], options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  if (!nextModules.length) return "";
  return `<section class="learning-coin-panel learning-growth-next-panel">
      <div class="learning-section-heading">
        <h3>实施队列</h3>
        <span>可独立演进</span>
      </div>
      <div class="learning-growth-next-list">
        ${nextModules.map((item) => `<div class="learning-growth-next-row">
          <strong>${escapeHtml(item.title || item.id || "")}</strong>
          <span>${escapeHtml(statusText(item.status))}</span>
        </div>`).join("")}
      </div>
    </section>`;
}

export function renderReadinessPanel(readiness = {}, options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  if (!readiness || typeof readiness !== "object") return "";
  const systemChecks = readiness.checks?.system || [];
  const learnerChecks = readiness.checks?.learnerData || [];
  const nextActions = readiness.nextActions || [];
  return `<section class="learning-coin-panel learning-readiness-panel" data-learning-operational-readiness>
      <div class="learning-section-heading">
        <h3>Learning V1 readiness</h3>
        <span>${escapeHtml(readinessStatusText(readiness.status))}</span>
      </div>
      <div class="learning-readiness-grid">
        ${renderReadinessMetric("System gates", readiness.systemReadinessPercent, options)}
        ${renderReadinessMetric("Learner data", readiness.learnerDataReadinessPercent, options)}
        <span>
          <strong>${readiness.operationalTestReady ? "Yes" : "No"}</strong>
          <small>Operational test</small>
        </span>
      </div>
      <div class="learning-readiness-checks">
        <div>
          <strong>System</strong>
          <ul class="learning-readiness-check-list">${renderReadinessCheckRows(systemChecks, options)}</ul>
        </div>
        <div>
          <strong>Learner data</strong>
          <ul class="learning-readiness-check-list">${renderReadinessCheckRows(learnerChecks, options)}</ul>
        </div>
      </div>
      ${nextActions.length ? `<div class="learning-readiness-next">
        <strong>Next actions</strong>
        <ul>${nextActions.map((item) => `<li>${escapeHtml(item.reason || item.checkId || "")}</li>`).join("")}</ul>
      </div>` : ""}
    </section>`;
}

export function renderOwnerSystemPanel(overview = {}, options = {}) {
  if (!isOwner(options)) return "";
  return `<section class="learning-growth-category learning-growth-owner-system" data-learning-growth-category="owner-system">
      <div class="learning-growth-category-heading">
        <h3>后台与平台能力</h3>
        <span>Owner</span>
      </div>
      ${renderReadinessPanel(overview.operationalReadiness, options)}
      ${renderPlatformStrip(overview.platformCapabilities || [], options)}
      <section class="learning-growth-modules">
        ${renderCapabilityCards(overview.capabilities || [], options)}
      </section>
      ${renderNextModules(overview.nextModules || [], options)}
    </section>`;
}

export function renderLearningGrowthTabs(tabs = [], options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  const visible = tabs.filter((tab) => tab && tab.html);
  if (!visible.length) return "";
  const first = visible[0].id;
  const requestedRaw = clean(options.activeTab || options.state?.learningGrowthActiveTab);
  const aliases = {
    settings: "overview",
    "new-task": "tasks",
    "reward-settlement": "rewards",
    "ai-summary": "ai-analysis",
    generation: "generation",
    generate: "generation",
    "card-generation": "generation"
  };
  const requested = aliases[requestedRaw] || requestedRaw;
  const activeId = visible.some((tab) => tab.id === requested) ? requested : first;
  return `<section class="learning-growth-tabs" data-learning-growth-tabs>
      <div class="learning-growth-tab-list" role="tablist" aria-label="复用的平台能力">
        ${visible.map((tab) => `<button type="button" role="tab" data-learning-growth-tab="${escapeHtml(tab.id)}" aria-selected="${tab.id === activeId ? "true" : "false"}" class="${tab.id === activeId ? "active" : ""}">${escapeHtml(tab.label)}</button>`).join("")}
      </div>
      ${visible.map((tab) => `<section class="learning-growth-tab-panel${tab.id === activeId ? " active" : ""}" data-learning-growth-tab-panel="${escapeHtml(tab.id)}" role="tabpanel"${tab.id === activeId ? "" : " hidden"}>
        ${tab.html}
      </section>`).join("")}
    </section>`;
}

export function renderGrowthRouteNotice(routeState = {}, options = {}) {
  return renderOwnerWorkspaceRouteNotice(routeState, options);
}

export function renderGrowthKeyboardComposer(options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  const label = isOwner(options) ? "Owner 备注" : "成长记录";
  return `<form id="composer" class="growth-keyboard-composer" data-growth-keyboard-composer autocomplete="off">
      <label class="growth-keyboard-composer-label" for="messageInput">${escapeHtml(label)}</label>
      <textarea id="messageInput" class="growth-keyboard-composer-input" rows="1" inputmode="text" autocomplete="off" autocapitalize="sentences" aria-label="${escapeHtml(label)}" placeholder="记录一句观察..."></textarea>
    </form>`;
}

export function renderGrowthHistoryPage(overview = {}, options = {}) {
  const escapeHtml = optionFn(options, "escapeHtml", defaultEscapeHtml);
  const taskCardId = clean(options.state?.learningGrowthHistoryTaskCardId || options.historyTaskCardId);
  const seed = findGrowthHistorySeed(overview, taskCardId);
  const cards = seed ? relatedGrowthHistoryCards(overview, seed) : [];
  const workspaceId = clean(seed?.workspaceId || overview.learner?.workspaceId || options.workspaceId);
  return `<div class="learning-growth-view learning-growth-history-page" data-learning-growth-history-page="${escapeHtml(taskCardId)}">
      <section class="learning-coin-panel learning-growth-history-panel">
        <button type="button" class="learning-settings-back" data-learning-growth-history-back>返回任务</button>
        <div class="learning-section-heading">
          <h3>${escapeHtml(seed ? taskSeriesLabel(seed) : "历史卡片")}</h3>
          <span>${escapeHtml(String(cards.length))}</span>
        </div>
        <div class="learning-growth-history-list">
          ${cards.length ? cards.map((card) => {
            const id = taskId(card);
            const score = Number(card.latestEvaluation?.score);
            const scoreText = Number.isFinite(score) && score > 0 ? `${Math.round(score)} 分` : "";
            const timeText = cardOpenTimeText(card);
            return `<button type="button" class="learning-growth-history-row" data-learning-open-growth-task="${escapeHtml(id)}" data-workspace-id="${escapeHtml(card.workspaceId || workspaceId)}">
              <span>
                <strong>${escapeHtml(card.title || id || "学习任务")}</strong>
                <small>${escapeHtml([card.status || card.nextAction || "", timeText, scoreText].filter(Boolean).join(" / "))}</small>
              </span>
            </button>`;
          }).join("") : `<div class="learning-coin-empty">暂无同系列历史卡片。</div>`}
        </div>
      </section>
    </div>`;
}

export function renderLearningGrowthView(options = {}) {
  const state = normalizedState(options);
  const overview = state.overview || {};
  if (state.learningGrowthHistoryTaskCardId || options.historyTaskCardId) {
    return renderGrowthHistoryPage(overview, options);
  }
  if (options.selectedGrowthTaskCardId || state.selectedLearningTaskCardId) {
    return renderCardDetailView(state, Object.assign({}, options, {
      selectedGrowthTaskCardId: options.selectedGrowthTaskCardId || state.selectedLearningTaskCardId
    }));
  }
  if (isOwner(options) && state.learningGrowthSettingsOpen) {
    return renderOwnerSettingsPage(state, Object.assign({}, options, {
      currentWorkspaceId: state.currentWorkspaceId,
      overview,
      viewTargets: state.viewTargets
    }));
  }
  const boardHtml = renderOwnerWorkspaceView(state, Object.assign({}, options, {
    activeGrowthBoardLane: state.learningGrowthBoardLane,
    coins: options.coins || overview.coins,
    currentWorkspaceId: state.currentWorkspaceId,
    isOwner: isOwner(options),
    viewTargets: state.viewTargets
  }));
  return appendBeforeLastClosingDiv(boardHtml, renderGrowthKeyboardComposer(Object.assign({}, options, { state })));
}

export const HermesLearningGrowthUiFacade = Object.freeze({
  renderCapabilityCards,
  renderLearningGrowthTabs,
  renderLearningGrowthBoard,
  renderLearningGrowthView,
  renderGrowthRouteNotice,
  renderNextModules,
  renderOwnerSystemPanel,
  renderPlatformStrip,
  renderReadinessPanel,
  renderBoardCard,
  renderGrowthKeyboardComposer,
  renderGrowthHistoryPage
});
