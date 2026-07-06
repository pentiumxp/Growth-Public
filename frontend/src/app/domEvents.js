import {
  cardGenerationActionFromDataset,
  cardGenerationClickSelectors,
  cardGenerationInputSelectors,
  cardGenerationSubmitSelectors
} from "../features/card-generation/generationEvents.js";

export function selectorForCardGenerationEventType(eventType = "") {
  if (eventType === "click") return cardGenerationClickSelectors.join(", ");
  if (eventType === "change" || eventType === "input") return cardGenerationInputSelectors.join(", ");
  if (eventType === "submit") return cardGenerationSubmitSelectors.join(", ");
  return "";
}

export function actionElementFromEvent(event = {}, selector = "") {
  if (!selector) return null;
  const target = event.target || null;
  if (!target) return null;
  if (typeof target.closest === "function") return target.closest(selector);
  if (typeof target.matches === "function" && target.matches(selector)) return target;
  return null;
}

export function cardGenerationActionFromDomEvent(event = {}) {
  const selector = selectorForCardGenerationEventType(event.type);
  const element = actionElementFromEvent(event, selector);
  if (!element || !element.dataset) return null;
  return cardGenerationActionFromDataset(element.dataset, {
    disabled: element.disabled === true,
    value: "value" in element ? element.value : ""
  });
}

export function bindCardGenerationDomEvents({ root = null, dispatch } = {}) {
  if (!root || typeof root.addEventListener !== "function" || typeof dispatch !== "function") {
    return () => {};
  }
  const eventTypes = ["click", "change", "input", "submit"];
  const listeners = eventTypes.map((eventType) => {
    const listener = (event) => {
      const action = cardGenerationActionFromDomEvent(event);
      if (!action) return;
      if (action.preventDefault && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      dispatch(action, event);
    };
    root.addEventListener(eventType, listener);
    return [eventType, listener];
  });
  return () => {
    if (typeof root.removeEventListener !== "function") return;
    listeners.forEach(([eventType, listener]) => {
      root.removeEventListener(eventType, listener);
    });
  };
}
