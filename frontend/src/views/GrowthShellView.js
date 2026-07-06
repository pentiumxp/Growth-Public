import { renderOwnerCardGenerationPanel } from "../features/card-generation/CardGenerationPanel.js";
import { selectOwnerGenerationRuntimeState } from "../state/selectors.js";
import { escapeHtml } from "../utils/escapeHtml.js";
import { renderCardDetailView, selectedCardDetailId } from "./CardDetailView.js";
import { renderOwnerWorkspaceView } from "./OwnerWorkspaceView.js";
import { renderRewardsView } from "./RewardsView.js";
import { renderOwnerSettingsPage } from "./SettingsView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveViewTargets(state = {}, options = {}) {
  return asArray(options.viewTargets).length
    ? options.viewTargets
    : asArray(state.viewTargets || state.growthViewTargets);
}

function resolveWorkspaceId(runtime = {}, state = {}, options = {}) {
  return runtime.workspaceId || options.currentWorkspaceId || state.currentWorkspaceId || "";
}

function ownerGenerationShell(state = {}, options = {}) {
  const viewTargets = resolveViewTargets(state, options);
  const runtime = selectOwnerGenerationRuntimeState(state, {
    currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
    viewTargets,
    sampleWorkspaceIds: options.sampleWorkspaceIds
  });
  const workspaceId = resolveWorkspaceId(runtime, state, options);

  return `<section class="growth-vite-bootstrap growth-vite-shell" data-growth-vite-bootstrap="true" data-growth-vite-shell="true" data-growth-vite-active-tab="${escapeHtml(runtime.route.activeTab)}">
    ${renderOwnerCardGenerationPanel({
      state,
      workspaceId,
      viewTargets,
      renderers: options.renderers || {}
    })}
  </section>`;
}

function bootstrapShell(state = {}) {
  const context = state.context || {};
  return `<section class="growth-vite-bootstrap" data-growth-vite-bootstrap="true">
    <h1>成长</h1>
    <p data-growth-vite-mode>${escapeHtml(context.mode || "standalone")}</p>
  </section>`;
}

function hasBoardState(state = {}) {
  return Boolean(state.board || state.overview?.board || state.model?.overview?.board);
}

function shellSection(state = {}, runtime = {}, body = "") {
  return `<section class="growth-vite-bootstrap growth-vite-shell" data-growth-vite-bootstrap="true" data-growth-vite-shell="true" data-growth-vite-active-tab="${escapeHtml(runtime.route.activeTab)}">
      ${body}
    </section>`;
}

export function growthShellView(state = {}, options = {}) {
  const runtime = selectOwnerGenerationRuntimeState(state, {
    currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
    viewTargets: resolveViewTargets(state, options),
    sampleWorkspaceIds: options.sampleWorkspaceIds
  });
  const isOwner = runtime.isOwner || options.isOwner === true;
  if (isOwner && runtime.route.settingsOpen) {
    return shellSection(state, runtime, renderOwnerSettingsPage(state, {
      coins: options.coins,
      currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
      renderers: options.renderers || {},
      viewTargets: resolveViewTargets(state, options)
    }));
  }
  if (isOwner && runtime.route.activeTab === "generation") {
    return ownerGenerationShell(state, options);
  }
  if (runtime.route.activeTab === "rewards") {
    return shellSection(state, runtime, renderRewardsView(state, {
      coins: options.coins,
      currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
      isOwner
    }));
  }
  if (selectedCardDetailId(state, options)) {
    return shellSection(state, runtime, renderCardDetailView(state, {
      currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
      renderers: options.renderers || {}
    }));
  }
  if (hasBoardState(state)) {
    return shellSection(state, runtime, renderOwnerWorkspaceView(state, {
        activeGrowthBoardLane: runtime.route.boardLane,
        coins: options.coins,
        currentWorkspaceId: options.currentWorkspaceId || state.currentWorkspaceId || "",
        isOwner,
        viewTargets: resolveViewTargets(state, options)
      }));
  }
  return bootstrapShell(state);
}
