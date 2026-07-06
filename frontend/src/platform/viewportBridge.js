import { clean } from "../utils/string.js";

export function boundedViewportNumber(value, max = 4096) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(Math.round(number), Math.max(0, Number(max) || 0)));
}

function objectValue(value) {
  return value && typeof value === "object" ? value : {};
}

export function firstBoundedViewportNumber(values = [], max = 4096) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (!Number.isFinite(number)) continue;
    return boundedViewportNumber(number, max);
  }
  return 0;
}

export function normalizeViewportMessage(input = {}, { now = () => Date.now() } = {}) {
  const source = input && typeof input === "object" ? input : {};
  if (source.type !== "hermes.plugin.viewport" || source.version !== 1) return null;
  const pluginId = clean(source.pluginId);
  if (pluginId && pluginId !== "growth") return null;
  const viewport = objectValue(source.viewport);
  const keyboard = objectValue(source.keyboard);
  const iframe = objectValue(source.iframe);
  const host = objectValue(source.host);
  const footer = objectValue(source.footer);
  const footerSafeArea = footer.safeAreaBottom || footer.bottomSafeArea || footer.hostBottomSafeArea || footer.safeAreaInsetBottom;
  const hostTopSafeArea = firstBoundedViewportNumber([
    viewport.hostTopSafeArea,
    viewport.safeAreaTop,
    viewport.topSafeArea,
    host.hostTopSafeArea,
    host.safeAreaTop,
    host.topSafeArea,
    footer.hostTopSafeArea,
    footer.safeAreaTop,
    footer.topSafeArea
  ], 512);
  const iframeHeight = boundedViewportNumber(iframe.height);
  const viewportHeight = boundedViewportNumber(viewport.height);
  const layoutHeight = boundedViewportNumber(viewport.layoutHeight);
  const rootHeight = keyboard.visible && viewportHeight
    ? Math.max(240, viewportHeight)
    : Math.max(240, iframeHeight || viewportHeight || layoutHeight || 0);
  return {
    receivedAtMs: now(),
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
      safeAreaTop: hostTopSafeArea,
      safeAreaBottom: boundedViewportNumber(footerSafeArea, 512)
    },
    rootHeight
  };
}
