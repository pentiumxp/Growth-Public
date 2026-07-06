import { createGrowthApp } from "./app/createGrowthApp.js";
import { createGrowthRuntimeAdapter } from "./app/runtimeAdapter.js";

export function resolveGrowthViteMount({ document } = {}) {
  const viteRoot = document?.getElementById?.("growth-vite-root") || null;
  if (viteRoot) {
    return {
      mode: "bootstrap",
      root: viteRoot
    };
  }

  const legacyRoot = document?.getElementById?.("growth-root") || null;
  if (legacyRoot?.dataset?.growthViteRuntime === "enabled") {
    return {
      mode: "runtime",
      root: legacyRoot
    };
  }

  return {
    mode: "disabled",
    root: null
  };
}

export function createGrowthViteEntry({
  document = globalThis.document,
  location = globalThis.location,
  appFactory = createGrowthApp,
  runtimeAdapterFactory = createGrowthRuntimeAdapter,
  state,
  api,
  renderView,
  getCurrentWorkspaceId,
  isOwner,
  payloadBuilders,
  refreshers,
  handlers
} = {}) {
  const mount = resolveGrowthViteMount({ document });
  if (mount.mode === "runtime") {
    const runtime = runtimeAdapterFactory({
      root: mount.root,
      state,
      api,
      renderView,
      getCurrentWorkspaceId,
      isOwner,
      payloadBuilders,
      refreshers,
      handlers
    });
    runtime.mount();
    return {
      mode: "runtime",
      root: mount.root,
      runtime,
      app: null
    };
  }

  const app = appFactory({
    root: mount.mode === "bootstrap" ? mount.root : null,
    location,
    document
  });
  const bootState = app.bootstrap();
  return {
    mode: mount.mode,
    root: mount.root,
    runtime: null,
    app,
    state: bootState
  };
}

const entry = createGrowthViteEntry();
const app = entry.runtime || entry.app;

export { app, entry };
