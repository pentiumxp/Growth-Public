function defaultState() {
  return {
    cardGeneration: {}
  };
}

export function createGrowthStore(initialState = defaultState()) {
  const state = initialState && typeof initialState === "object" ? initialState : defaultState();
  const listeners = new Set();

  function getState() {
    return state;
  }

  function notify(reason = "state_changed") {
    const snapshot = getState();
    for (const listener of Array.from(listeners)) {
      listener(snapshot, reason);
    }
    return snapshot;
  }

  function mutate(mutator, reason = "state_mutated") {
    if (typeof mutator === "function") {
      mutator(state);
    }
    return notify(reason);
  }

  function reduce(reducer, action = {}, reason = "state_reduced") {
    const changed = typeof reducer === "function" ? reducer(state, action) : false;
    if (changed) notify(reason);
    return {
      changed: Boolean(changed),
      state
    };
  }

  function select(selector, ...args) {
    return typeof selector === "function" ? selector(state, ...args) : undefined;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getState,
    mutate,
    notify,
    reduce,
    select,
    subscribe
  };
}
