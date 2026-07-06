import { createReadbackActionHandlers } from "./actionHandlers.js";
import { createCardGenerationController } from "./appController.js";
import { bindCardGenerationDomEvents } from "./domEvents.js";
import { renderRoot as defaultRenderRoot } from "./renderRoot.js";
import { createCardInteractionController } from "../features/card-interaction/CardInteractionActions.js";
import { bindCardInteractionDomEvents } from "../features/card-interaction/CardInteractionDomEvents.js";
import { createGrowthNavigationController } from "../routing/navigationController.js";
import { createGrowthRouteController } from "../routing/routeController.js";
import { createGrowthStore } from "../state/store.js";
import { createGrowthViewModel } from "../state/viewModel.js";

function defaultState() {
  return {
    cardGeneration: {}
  };
}

export function createGrowthRuntimeAdapter({
  root = null,
  state = defaultState(),
  store = null,
  api = {},
  renderView = defaultRenderRoot,
  getCurrentWorkspaceId = () => "",
  isOwner = () => true,
  viewTargets = [],
  renderers = {},
  payloadBuilders = {},
  refreshers = {},
  cardInteraction = {},
  navigation = {},
  routing = {},
  handlers: extraHandlers = {}
} = {}) {
  let unbindDom = () => {};
  let navigationController = null;
  const runtimeStore = store || createGrowthStore(state);
  const runtimeState = runtimeStore.getState();
  const viewModel = cardInteraction.viewModel || createGrowthViewModel({
    getWorkspaceId: getCurrentWorkspaceId,
    learnerLabel: () => "Owner"
  });

  function resolveViewTargets(nextState = {}) {
    if (typeof viewTargets === "function") {
      const resolved = viewTargets(nextState);
      return Array.isArray(resolved) ? resolved : [];
    }
    if (Array.isArray(viewTargets) && viewTargets.length) return viewTargets;
    return Array.isArray(nextState.viewTargets || nextState.growthViewTargets)
      ? nextState.viewTargets || nextState.growthViewTargets
      : [];
  }

  function render(nextState = runtimeStore.getState(), reason = "render") {
    if (typeof renderView === "function") {
      renderView(root, nextState, {
        currentWorkspaceId: getCurrentWorkspaceId(),
        isOwner: isOwner(),
        renderers,
        viewTargets: resolveViewTargets(nextState)
      });
    }
    runtimeStore.notify(reason);
    return nextState;
  }

  const readbackHandlers = createReadbackActionHandlers({
    state: runtimeState,
    api,
    render,
    getCurrentWorkspaceId,
    isOwner,
    payloadBuilders,
    refreshers
  });
  const handlers = Object.assign({}, readbackHandlers, extraHandlers);
  const controller = createCardGenerationController({
    state: runtimeState,
    handlers,
    render
  });
  const cardInteractionController = createCardInteractionController({
    root,
    state: runtimeState,
    model: cardInteraction.model || runtimeState,
    viewModel,
    api,
    render,
    refreshCard: cardInteraction.refreshCard || refreshers.refreshCard,
    getCurrentWorkspaceId,
    audioController: cardInteraction.audioController || null,
    readBlobAsBase64: cardInteraction.readBlobAsBase64
  });

  function createNavigationController() {
    if (navigation === false) return null;
    const controllerFactory = navigation.createController || createGrowthNavigationController;
    return controllerFactory({
      pageState: runtimeState,
      renderShell: () => render(runtimeStore.getState(), "navigation"),
      historyRef: navigation.historyRef,
      locationRef: navigation.locationRef,
      parentRef: navigation.parentRef,
      windowRef: navigation.windowRef
    });
  }

  const routeController = routing === false ? null : (routing.controller || createGrowthRouteController({
    pluginRoute: routing.pluginRoute,
    pluginItemId: routing.pluginItemId,
    pageState: runtimeState,
    model: routing.model || runtimeState.model || {},
    openCard: routing.openCard
  }));

  function dispatch(action = {}) {
    return controller.handleCardGenerationAction(action);
  }

  function mount() {
    unbindDom();
    if (navigationController && typeof navigationController.unbind === "function") {
      navigationController.unbind();
    }
    const unbindCardGeneration = bindCardGenerationDomEvents({ root, dispatch });
    const unbindCardInteraction = bindCardInteractionDomEvents({
      root,
      state: runtimeState,
      controller: cardInteractionController,
      render
    });
    navigationController = createNavigationController();
    if (navigationController && typeof navigationController.bind === "function") {
      navigationController.bind();
    }
    unbindDom = () => {
      unbindCardGeneration();
      unbindCardInteraction();
      if (navigationController && typeof navigationController.unbind === "function") {
        navigationController.unbind();
      }
    };
    render(state);
    return publicApi;
  }

  function unmount() {
    unbindDom();
    unbindDom = () => {};
  }

  const publicApi = {
    cardInteractionController,
    controller,
    dispatch,
    getState: runtimeStore.getState,
    handlers,
    mount,
    navigationController: () => navigationController,
    render,
    routeController,
    select: runtimeStore.select,
    state: runtimeState,
    store: runtimeStore,
    unmount,
    viewModel
  };

  return publicApi;
}
