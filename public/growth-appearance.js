(function registerGrowthAppearance(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalizeTheme(value) {
    const text = clean(value).toLowerCase();
    return ["light", "dark", "system"].includes(text) ? text : "system";
  }

  function normalizeFontSize(value) {
    const text = clean(value).toLowerCase();
    if (text === "default") return "standard";
    return ["small", "standard", "large", "xlarge", "xxlarge"].includes(text) ? text : "standard";
  }

  function createGrowthAppearance({ params, documentRef } = {}) {
    function applyAppearance(input = {}) {
      const source = input && typeof input === "object" ? input : {};
      const theme = normalizeTheme(source.theme || source.pluginTheme || source.appearanceTheme || params.get("pluginTheme") || params.get("appearanceTheme") || params.get("theme"));
      const fontSize = normalizeFontSize(source.fontSize || source.pluginFontSize || source.appearanceFontSize || params.get("pluginFontSize") || params.get("appearanceFontSize") || params.get("fontSize"));
      documentRef.documentElement.dataset.theme = theme;
      documentRef.documentElement.dataset.fontSize = fontSize;
    }

    function bindAppearanceMessages(windowRef) {
      windowRef.addEventListener("message", (event) => {
        const data = event?.data && typeof event.data === "object" ? event.data : null;
        if (!data || data.version !== 1) return;
        if (data.type === "hermes.plugin.appearance" || data.type === "hermes.plugin.viewport") {
          applyAppearance(data.appearance || data);
        }
      });
    }

    return {
      applyAppearance,
      bindAppearanceMessages
    };
  }

  root.HermesGrowthAppearance = {
    createGrowthAppearance,
    normalizeFontSize,
    normalizeTheme
  };
})(typeof window !== "undefined" ? window : globalThis);
