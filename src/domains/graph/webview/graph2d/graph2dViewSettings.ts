/**
 * `vscode.ExtensionContext.globalState` key for the 2D graph webview panel.
 */
export const GRAPH2D_VIEW_SETTINGS_GLOBAL_STATE_KEY = 'akashi.graph2d.viewSettings.v1';

export interface Graph2DWebviewPersistedState {
  controlsCollapsed: boolean;
  /** Target link distance in simulation space. */
  linkDistance: number;
  /** Repulsion strength (positive UI value; negated for many-body force). */
  chargeStrength: number;
  /** How strongly nodes pull toward center (0–1 UI scale). */
  centerStrength: number;
  /** Pull non-preset nodes toward their preset hub (0–1 UI scale). */
  presetClusterStrength: number;
  /** Extra vertical pull toward depth bands (keeps preset → locality → rows readable). */
  layerBandStrength: number;
}

export const GRAPH2D_LINK_DISTANCE_MIN = 20;
export const GRAPH2D_LINK_DISTANCE_MAX = 160;
export const GRAPH2D_LINK_DISTANCE_STEP = 2;

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

/** Fixed link strength (not exposed as a UI control). */
export const GRAPH2D_FIXED_LINK_STRENGTH = 0.4;
/** Fixed collision padding in simulation-space px (not exposed as a UI control). */
export const GRAPH2D_FIXED_COLLIDE_PADDING = 4;

export function defaultGraph2DWebviewPersistedState(): Graph2DWebviewPersistedState {
  return {
    controlsCollapsed: true,
    linkDistance: 60,
    chargeStrength: 120,
    centerStrength: 0.05,
    presetClusterStrength: 0.15,
    layerBandStrength: 0.08,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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
    linkDistance: clamp(
      typeof o.linkDistance === 'number' && Number.isFinite(o.linkDistance)
        ? o.linkDistance
        : d.linkDistance,
      GRAPH2D_LINK_DISTANCE_MIN,
      GRAPH2D_LINK_DISTANCE_MAX
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
  };
}
