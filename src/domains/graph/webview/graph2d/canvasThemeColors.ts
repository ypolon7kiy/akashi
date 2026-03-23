/**
 * Canvas 2D does not resolve `var(--vscode-*)` in strokeStyle/fillStyle.
 * Read computed values from the webview body once per paint (cached when inputs unchanged).
 */
import { parseCssColorToRgb } from '../cssColorParse';

export interface CanvasThemeColors {
  edge: string;
  edgeHighlight: string;
  label: string;
  nodeStroke: string;
  nodeStrokeHighlight: string;
  /** Outer ring on nodes; from VS Code border tokens. */
  nodeRimStroke: string;
  /** Fixed soft shadow for tier nodes (theme-agnostic tint). */
  nodeShadow: string;
}

/**
 * Cache invalidation: each key’s raw trimmed `getPropertyValue` is part of the fingerprint.
 * `buildCanvasThemeColors` uses fallbacks when a value is empty, but the fingerprint still
 * changes when a variable goes from empty to set (or vice versa), so the cache stays correct.
 *
 * When adding a new `pick('--vscode-…')` that affects `CanvasThemeColors`, append that
 * property here so theme updates are not missed while the fingerprint looks unchanged.
 */
const THEME_FINGERPRINT_KEYS = [
  '--vscode-charts-lines',
  '--vscode-charts-purple',
  '--vscode-editor-foreground',
  '--vscode-widget-border',
  '--vscode-focusBorder',
  '--vscode-panel-border',
] as const;

let themeCache: { fingerprint: string; colors: CanvasThemeColors } | null = null;

function fingerprintTheme(style: CSSStyleDeclaration): string {
  return THEME_FINGERPRINT_KEYS.map((k) => style.getPropertyValue(k).trim()).join('\0');
}

/** Subtle depth under tier nodes; not tied to editor luminance. */
const NODE_SHADOW = 'rgba(0,0,0,0.32)';

/**
 * If editor-adaptive rim/shadow is added: compute `relativeLuminanceRgb` once for the editor
 * background (or other chrome RGB) and pass that `L` (or a boolean `editorLight`) into a helper
 * like `rimAndShadowForEditorRgb` — avoid calling relative luminance twice on the same RGB.
 */
function buildCanvasThemeColors(style: CSSStyleDeclaration): CanvasThemeColors {
  const pick = (name: string, fallback: string): string => {
    const v = style.getPropertyValue(name).trim();
    if (v.length === 0) {
      return fallback;
    }
    return parseCssColorToRgb(v) !== null ? v : fallback;
  };
  const widgetBorder = pick('--vscode-widget-border', '#555555');
  return {
    edge: pick('--vscode-charts-lines', '#7c8c9d'),
    edgeHighlight: pick('--vscode-charts-purple', '#a78bfa'),
    label: pick('--vscode-editor-foreground', '#cccccc'),
    nodeStroke: widgetBorder,
    nodeStrokeHighlight: pick('--vscode-focusBorder', '#3794ff'),
    nodeRimStroke: pick('--vscode-panel-border', widgetBorder),
    nodeShadow: NODE_SHADOW,
  };
}

export function readCanvasThemeColors(): CanvasThemeColors {
  try {
    const style = getComputedStyle(document.body);
    const fingerprint = fingerprintTheme(style);
    if (themeCache?.fingerprint === fingerprint) {
      return themeCache.colors;
    }
    const colors = buildCanvasThemeColors(style);
    themeCache = { fingerprint, colors };
    return colors;
  } catch {
    themeCache = null;
    return {
      edge: '#7c8c9d',
      edgeHighlight: '#a78bfa',
      label: '#cccccc',
      nodeStroke: '#555555',
      nodeStrokeHighlight: '#3794ff',
      nodeRimStroke: '#555555',
      nodeShadow: NODE_SHADOW,
    };
  }
}
