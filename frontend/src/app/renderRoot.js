import { growthShellView } from "../views/GrowthShellView.js";

export function renderRoot(root, state = {}, options = {}) {
  if (!root) return;
  root.innerHTML = growthShellView(state, options);
}
