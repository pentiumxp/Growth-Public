import { readEmbeddedContext } from "../platform/embeddedContext.js";
import { renderRoot } from "./renderRoot.js";

export function createGrowthApp({ root = null, location, document } = {}) {
  const context = readEmbeddedContext({ location, document });
  const state = {
    booted: false,
    context
  };

  function bootstrap() {
    state.booted = true;
    if (root) {
      renderRoot(root, state);
    }
    return publicState();
  }

  function publicState() {
    return {
      booted: state.booted,
      context: state.context
    };
  }

  return {
    bootstrap,
    state: publicState
  };
}
