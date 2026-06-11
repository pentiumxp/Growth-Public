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

  function boundedViewportNumber(value, max = 4096) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(Math.round(number), Math.max(0, Number(max) || 0)));
  }

  function objectValue(value) {
    return value && typeof value === "object" ? value : {};
  }

  function createGrowthAppearance({ params, documentRef } = {}) {
    let lastHostViewport = null;

    function setRootStyle(name, value) {
      if (!documentRef?.documentElement?.style?.setProperty) return;
      documentRef.documentElement.style.setProperty(name, value);
    }

    function setRootClass(name, enabled) {
      if (!documentRef?.documentElement?.classList?.toggle) return;
      documentRef.documentElement.classList.toggle(name, Boolean(enabled));
    }

    function applyAppearance(input = {}) {
      const source = input && typeof input === "object" ? input : {};
      const theme = normalizeTheme(source.theme || source.pluginTheme || source.appearanceTheme || params.get("pluginTheme") || params.get("appearanceTheme") || params.get("theme"));
      const fontSize = normalizeFontSize(source.fontSize || source.pluginFontSize || source.appearanceFontSize || params.get("pluginFontSize") || params.get("appearanceFontSize") || params.get("fontSize"));
      documentRef.documentElement.dataset.theme = theme;
      documentRef.documentElement.dataset.fontSize = fontSize;
    }

    function normalizeViewportMessage(input = {}) {
      const source = input && typeof input === "object" ? input : {};
      if (source.type !== "hermes.plugin.viewport" || source.version !== 1) return null;
      const pluginId = clean(source.pluginId);
      if (pluginId && pluginId !== "growth") return null;
      const viewport = objectValue(source.viewport);
      const keyboard = objectValue(source.keyboard);
      const iframe = objectValue(source.iframe);
      const footer = objectValue(source.footer);
      const footerSafeArea = footer.safeAreaBottom || footer.bottomSafeArea || footer.hostBottomSafeArea || footer.safeAreaInsetBottom;
      const iframeHeight = boundedViewportNumber(iframe.height);
      const viewportHeight = boundedViewportNumber(viewport.height);
      const layoutHeight = boundedViewportNumber(viewport.layoutHeight);
      const rootHeight = keyboard.visible && viewportHeight
        ? Math.max(240, viewportHeight)
        : Math.max(240, iframeHeight || viewportHeight || layoutHeight || 0);
      return {
        receivedAtMs: Date.now(),
        reason: clean(source.reason).slice(0, 60),
        viewport: {
          width: boundedViewportNumber(viewport.width),
          height: viewportHeight,
          offsetTop: boundedViewportNumber(viewport.offsetTop),
          offsetLeft: boundedViewportNumber(viewport.offsetLeft),
          layoutWidth: boundedViewportNumber(viewport.layoutWidth),
          layoutHeight
        },
        iframe: {
          width: boundedViewportNumber(iframe.width),
          height: iframeHeight
        },
        keyboard: {
          visible: Boolean(keyboard.visible),
          bottomInset: boundedViewportNumber(keyboard.bottomInset || keyboard.height, 1024),
          offsetTop: boundedViewportNumber(keyboard.offsetTop),
          height: boundedViewportNumber(keyboard.height || keyboard.bottomInset, 1024)
        },
        footer: {
          safeAreaBottom: boundedViewportNumber(footerSafeArea, 512)
        },
        rootHeight
      };
    }

    function applyViewport(input = {}) {
      const normalized = normalizeViewportMessage(input);
      if (!normalized) return false;
      lastHostViewport = normalized;
      setRootStyle("--app-height", `${normalized.rootHeight}px`);
      setRootStyle("--app-viewport-height", `${normalized.rootHeight}px`);
      setRootStyle("--app-viewport-offset-top", `${normalized.viewport.offsetTop}px`);
      setRootStyle("--host-bottom-safe-area", `${normalized.footer.safeAreaBottom}px`);
      setRootStyle("--growth-host-bottom-safe-area", `${normalized.footer.safeAreaBottom}px`);
      setRootStyle("--growth-keyboard-bottom", `${normalized.keyboard.bottomInset}px`);
      setRootClass("keyboard-open", normalized.keyboard.visible);
      setRootClass("growth-keyboard-open", normalized.keyboard.visible);
      return true;
    }

    function hostViewport() {
      return lastHostViewport;
    }

    function bindAppearanceMessages(windowRef) {
      windowRef.handleHermesPluginViewportMessage = applyViewport;
      windowRef.__hermesGrowthVisualHarness = Object.freeze({
        hostViewport
      });
      windowRef.addEventListener("message", (event) => {
        const data = event?.data && typeof event.data === "object" ? event.data : null;
        if (!data || data.version !== 1) return;
        if (data.type === "hermes.plugin.viewport") {
          applyViewport(data);
          applyAppearance(data.appearance || data);
        } else if (data.type === "hermes.plugin.appearance") {
          applyAppearance(data.appearance || data);
        }
      });
    }

    return {
      applyAppearance,
      applyViewport,
      bindAppearanceMessages
    };
  }

  root.HermesGrowthAppearance = {
    boundedViewportNumber,
    createGrowthAppearance,
    normalizeFontSize,
    normalizeTheme
  };
})(typeof window !== "undefined" ? window : globalThis);
