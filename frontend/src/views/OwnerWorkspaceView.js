import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";
import { renderBoardView } from "./BoardView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function overviewFromState(state = {}) {
  return state.overview || state.model?.overview || {};
}

function routeStateFromState(state = {}) {
  return state.learningGrowthRouteState || state.route?.routeState || {};
}

function isOwner(state = {}, options = {}) {
  return Boolean(options.isOwner === true || state.auth?.isOwner === true);
}

function averageCoinsForWindow(coins = {}, metrics = {}, days = 7) {
  const value = Number(metrics[`averageCoins${days}d`] || metrics[`coinsAverage${days}d`] || coins.growth?.[`averageCoins${days}d`] || 0);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function ownerWorkspaceLearnerLabel(overview = {}, options = {}) {
  return clean(overview.learner?.displayName || options.learnerId || overview.learner?.id || "Learner");
}

export function ownerWorkspaceCurrentWorkspaceId(overview = {}, options = {}) {
  return clean(overview.learner?.workspaceId || options.currentWorkspaceId || options.workspaceId);
}

export function visibleOwnerWorkspaceTargets(viewTargets = []) {
  return asArray(viewTargets).filter((target) => clean(target?.workspaceId));
}

export function renderGrowthViewTargetMenu(state = {}, options = {}) {
  if (!isOwner(state, options)) return "";
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const targets = visibleOwnerWorkspaceTargets(options.viewTargets || state.viewTargets || state.growthViewTargets);
  const currentWorkspaceId = ownerWorkspaceCurrentWorkspaceId(overviewFromState(state), options);
  if (targets.length < 2) return "";
  return `<details class="learning-growth-owner-menu" data-growth-view-target-menu>
      <summary aria-label="切换执行者">...</summary>
      <div class="learning-growth-owner-menu-panel">
        ${targets.map((target) => {
          const id = clean(target.workspaceId);
          const active = Boolean(target.current || id === currentWorkspaceId);
          return `<button type="button" data-growth-view-target="${escapeHtml(id)}" ${active ? "disabled" : ""}>
            ${escapeHtml(target.label || id)}
          </button>`;
        }).join("")}
      </div>
    </details>`;
}

export function renderOwnerWorkspaceRouteNotice(routeState = {}, options = {}) {
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

export function renderOwnerWorkspaceSummary(state = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const overview = overviewFromState(state);
  const moduleInfo = overview.module || {};
  const metrics = overview.metrics || {};
  const coins = options.coins || overview.coins || {};
  const learnerLabel = ownerWorkspaceLearnerLabel(overview, options);
  const availableCoins = Number(coins.balances?.availableCoins || 0);
  const historicalCoins = Number(metrics.totalEarnedCoins
    || coins.growth?.totalEarnedCoins
    || coins.balances?.earnedCoins
    || availableCoins
    || 0);
  const coinText = String(Number.isFinite(historicalCoins) ? Math.round(historicalCoins) : 0);
  const ownerActions = isOwner(state, options)
    ? `<span class="learning-growth-owner-actions">
        ${renderGrowthViewTargetMenu(state, options)}
        <button type="button" class="learning-growth-owner-settings-button" data-learning-growth-open-settings>管理</button>
      </span>`
    : "";
  return `<section class="learning-growth-board-summary" data-learning-growth-board-summary>
      <div class="learning-growth-board-summary-head">
        <span class="learning-growth-board-summary-title">
          <strong>${escapeHtml(moduleInfo.title || "成长")}</strong>
          <small>${escapeHtml(learnerLabel)}</small>
        </span>
        ${ownerActions}
      </div>
      <div class="learning-growth-board-summary-metrics" aria-label="成长概览">
        <span><small>执行者</small><b>${escapeHtml(learnerLabel)}</b></span>
        <span><small>累计金币</small><b>${escapeHtml(coinText)}</b></span>
        <span><small>7日均值</small><b>${escapeHtml(String(averageCoinsForWindow(coins, metrics, 7)))}</b></span>
        <span><small>30日均值</small><b>${escapeHtml(String(averageCoinsForWindow(coins, metrics, 30)))}</b></span>
      </div>
    </section>`;
}

export function renderOwnerWorkspaceView(state = {}, options = {}) {
  const role = isOwner(state, options) ? "owner" : "executor";
  return `<div class="learning-growth-view learning-growth-board-page" data-learning-product="fanfan-growth" data-learning-role="${role}" data-learning-growth-owner-workspace-page>
      ${renderOwnerWorkspaceSummary(state, options)}
      ${renderOwnerWorkspaceRouteNotice(routeStateFromState(state), options)}
      ${renderBoardView(state, options)}
    </div>`;
}
