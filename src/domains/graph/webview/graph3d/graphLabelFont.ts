import graphLabelFontRelative from '@fontsource/inter/files/inter-latin-400-normal.woff2';

declare global {
  interface Window {
    /** Injected in graph webview HTML before graph-main.js (absolute webview URL to bundled .woff2). */
    __AKASHI_GRAPH_LABEL_FONT_URL__?: string;
  }
}

/**
 * Esbuild emits `./name-hash.woff2`. In VS Code webviews, relative URLs often 404 for Troika.
 * Prefer the host-injected absolute URL; else resolve against the graph bundle script URL.
 */
function resolveBundledAssetUrl(relativeFromEsbuild: string): string {
  if (typeof document === 'undefined') {
    return relativeFromEsbuild;
  }
  const path = relativeFromEsbuild.startsWith('./')
    ? relativeFromEsbuild
    : `./${relativeFromEsbuild}`;
  const withSrc = [...document.getElementsByTagName('script')].filter(
    (s): s is HTMLScriptElement => s instanceof HTMLScriptElement && s.src.length > 0
  );
  const graphScript = withSrc.find((s) => s.src.includes('graph-main'));
  const base = graphScript?.src ?? withSrc[withSrc.length - 1]?.src;
  if (base) {
    try {
      return new URL(path, base).href;
    } catch {
      /* fall through */
    }
  }
  try {
    return new URL(path, window.location.href).href;
  } catch {
    return relativeFromEsbuild;
  }
}

function graphLabelFontUrl(): string {
  if (typeof window !== 'undefined') {
    const injected = window.__AKASHI_GRAPH_LABEL_FONT_URL__;
    if (typeof injected === 'string' && injected.length > 0) {
      return injected;
    }
  }
  return resolveBundledAssetUrl(graphLabelFontRelative);
}

export const GRAPH_LABEL_FONT_URL = graphLabelFontUrl();
