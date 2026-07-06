import { clean } from "../utils/string.js";

export function normalizeTheme(value) {
  const text = clean(value).toLowerCase();
  return ["light", "dark", "system"].includes(text) ? text : "system";
}

export function normalizeFontSize(value) {
  const text = clean(value).toLowerCase();
  if (text === "default") return "standard";
  return ["small", "standard", "large", "xlarge", "xxlarge"].includes(text) ? text : "standard";
}

export function appearanceFromInput(input = {}, params = new URLSearchParams()) {
  const source = input && typeof input === "object" ? input : {};
  return {
    theme: normalizeTheme(source.theme || source.pluginTheme || source.appearanceTheme || params.get("pluginTheme") || params.get("appearanceTheme") || params.get("theme")),
    fontSize: normalizeFontSize(source.fontSize || source.pluginFontSize || source.appearanceFontSize || params.get("pluginFontSize") || params.get("appearanceFontSize") || params.get("fontSize"))
  };
}
