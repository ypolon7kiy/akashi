/**
 * `vscode.ExtensionContext.globalState` key for the 2D graph webview panel.
 */
export const GRAPH2D_VIEW_SETTINGS_GLOBAL_STATE_KEY = 'akashi.graph2d.viewSettings.v1';

export interface Graph2DWebviewPersistedState {
  controlsCollapsed: boolean;
  /** `null` = all presets from snapshot (default). */
  enabledPresets: string[] | null;
  /** `null` = all source categories visible (default). */
  enabledCategories: string[] | null;
  /** Target link distance in simulation space. */
  linkDistance: number;
  /** Link strength multiplier (0–1 scale in UI). */
  linkStrength: number;
  /** Repulsion strength (positive UI value; negated for many-body force). */
  chargeStrength: number;
  /** How strongly nodes pull toward center (0–1 UI scale). */
  centerStrength: number;
  /** Pull non-preset nodes toward their preset hub (0–1 UI scale). */
  presetClusterStrength: number;
  /** Extra vertical pull toward depth bands (keeps preset → locality → rows readable). */
  layerBandStrength: number;
  /** Extra padding around each node for collision (px in world space before zoom). */
  collidePadding: number;
}

export const GRAPH2D_LINK_DISTANCE_MIN = 20;
export const GRAPH2D_LINK_DISTANCE_MAX = 160;
export const GRAPH2D_LINK_DISTANCE_STEP = 2;

export const GRAPH2D_LINK_STRENGTH_MIN = 0.05;
export const GRAPH2D_LINK_STRENGTH_MAX = 1;
export const GRAPH2D_LINK_STRENGTH_STEP = 0.05;

export const GRAPH2D_CHARGE_MIN = 20;
export const GRAPH2D_CHARGE_MAX = 600;
export const GRAPH2D_CHARGE_STEP = 10;

export const GRAPH2D_CENTER_MIN = 0;
export const GRAPH2D_CENTER_MAX = 0.25;
export const GRAPH2D_CENTER_STEP = 0.01;

export const GRAPH2D_PRESET_CLUSTER_MIN = 0;
export const GRAPH2D_PRESET_CLUSTER_MAX = 0.45;
export const GRAPH2D_PRESET_CLUSTER_STEP = 0.01;

export const GRAPH2D_LAYER_BAND_MIN = 0;
export const GRAPH2D_LAYER_BAND_MAX = 0.3;
export const GRAPH2D_LAYER_BAND_STEP = 0.01;

export const GRAPH2D_COLLIDE_MIN = 0;
export const GRAPH2D_COLLIDE_MAX = 24;
export const GRAPH2D_COLLIDE_STEP = 1;

export function defaultGraph2DWebviewPersistedState(): Graph2DWebviewPersistedState {
  return {
    controlsCollapsed: true,
    enabledPresets: null,
    enabledCategories: null,
    linkDistance: 72,
    linkStrength: 0.55,
    chargeStrength: 220,
    centerStrength: 0.03,
    presetClusterStrength: 0.22,
    layerBandStrength: 0.1,
    collidePadding: 6,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseEnabledPresetsField(raw: unknown, fallback: string[] | null): string[] | null {
  if (raw === null) {
    return null;
  }
  if (raw === undefined) {
    return fallback;
  }
  if (!Array.isArray(raw)) {
    return fallback;
  }
  const ids = raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return [...new Set(ids)];
}

function parseEnabledCategoriesField(raw: unknown, fallback: string[] | null): string[] | null {
  return parseEnabledPresetsField(raw, fallback);
}

export function parseGraph2DWebviewPersistedState(raw: unknown): Graph2DWebviewPersistedState {
  const d = defaultGraph2DWebviewPersistedState();
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return d;
  }
  const o = raw as Record<string, unknown>;

  return {
    controlsCollapsed:
      typeof o.controlsCollapsed === 'boolean' ? o.controlsCollapsed : d.controlsCollapsed,
    enabledPresets: parseEnabledPresetsField(o.enabledPresets, d.enabledPresets),
    enabledCategories: parseEnabledCategoriesField(o.enabledCategories, d.enabledCategories),
    linkDistance: clamp(
      typeof o.linkDistance === 'number' && Number.isFinite(o.linkDistance)
        ? o.linkDistance
        : d.linkDistance,
      GRAPH2D_LINK_DISTANCE_MIN,
      GRAPH2D_LINK_DISTANCE_MAX
    ),
    linkStrength: clamp(
      typeof o.linkStrength === 'number' && Number.isFinite(o.linkStrength)
        ? o.linkStrength
        : d.linkStrength,
      GRAPH2D_LINK_STRENGTH_MIN,
      GRAPH2D_LINK_STRENGTH_MAX
    ),
    chargeStrength: clamp(
      typeof o.chargeStrength === 'number' && Number.isFinite(o.chargeStrength)
        ? o.chargeStrength
        : d.chargeStrength,
      GRAPH2D_CHARGE_MIN,
      GRAPH2D_CHARGE_MAX
    ),
    centerStrength: clamp(
      typeof o.centerStrength === 'number' && Number.isFinite(o.centerStrength)
        ? o.centerStrength
        : d.centerStrength,
      GRAPH2D_CENTER_MIN,
      GRAPH2D_CENTER_MAX
    ),
    presetClusterStrength: clamp(
      typeof o.presetClusterStrength === 'number' && Number.isFinite(o.presetClusterStrength)
        ? o.presetClusterStrength
        : d.presetClusterStrength,
      GRAPH2D_PRESET_CLUSTER_MIN,
      GRAPH2D_PRESET_CLUSTER_MAX
    ),
    layerBandStrength: clamp(
      typeof o.layerBandStrength === 'number' && Number.isFinite(o.layerBandStrength)
        ? o.layerBandStrength
        : d.layerBandStrength,
      GRAPH2D_LAYER_BAND_MIN,
      GRAPH2D_LAYER_BAND_MAX
    ),
    collidePadding: clamp(
      typeof o.collidePadding === 'number' && Number.isFinite(o.collidePadding)
        ? o.collidePadding
        : d.collidePadding,
      GRAPH2D_COLLIDE_MIN,
      GRAPH2D_COLLIDE_MAX
    ),
  };
}
