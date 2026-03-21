import { CAMERA_CONSTANTS } from './graph3d/Constants';
import type { CameraAnglePreset } from '../domain/graphTypes';

/**
 * `vscode.ExtensionContext.globalState` key for the graph webview panel.
 * Value: {@link GraphWebviewPersistedState} (3D controls, preset filters; extend for more UI state).
 */
export const GRAPH_VIEW_SETTINGS_GLOBAL_STATE_KEY = 'akashi.graph.viewSettings.v1';

/**
 * All graph webview UI persisted in extension globalState (load/save via graph/viewSettings messages).
 * Add new optional fields here when introducing more toggles; use {@link parseGraphWebviewPersistedState} to clamp/validate.
 */
export interface GraphWebviewPersistedState {
  showLabels: boolean;
  showEdges: boolean;
  autoRotate: boolean;
  gridCellSize: number;
  gridLayerSpacing: number;
  cameraDistance: number;
  cameraAnglePreset: CameraAnglePreset;
  controlsCollapsed: boolean;
  /**
   * Preset toolbar filters: `null` = all presets from the snapshot are shown (default).
   * Non-null = only these preset ids are included when building the graph.
   */
  enabledPresets: string[] | null;
}

/** @deprecated Use {@link GraphWebviewPersistedState}. */
export type GraphViewPersistedSettings = GraphWebviewPersistedState;

/** Clamps / slider bounds for `gridCellSize` (must match {@link GraphViewControls} ranges). */
export const GRAPH_VIEW_GRID_CELL_MIN = 2;
export const GRAPH_VIEW_GRID_CELL_MAX = 12;
export const GRAPH_VIEW_GRID_CELL_STEP = 0.5;

/** Clamps / slider bounds for `gridLayerSpacing`. */
export const GRAPH_VIEW_GRID_LAYER_MIN = 4;
export const GRAPH_VIEW_GRID_LAYER_MAX = 20;
export const GRAPH_VIEW_GRID_LAYER_STEP = 0.5;

/** Clamps / slider bounds for camera distance multiplier. */
export const GRAPH_VIEW_CAMERA_DISTANCE_MIN = 0.2;
export const GRAPH_VIEW_CAMERA_DISTANCE_MAX = 1.5;
export const GRAPH_VIEW_CAMERA_DISTANCE_STEP = 0.05;

export function defaultGraphWebviewPersistedState(): GraphWebviewPersistedState {
  return {
    showLabels: true,
    showEdges: true,
    autoRotate: false,
    gridCellSize: 6,
    gridLayerSpacing: 12,
    cameraDistance: 1,
    cameraAnglePreset: CAMERA_CONSTANTS.DEFAULT_ANGLE_PRESET,
    controlsCollapsed: true,
    enabledPresets: null,
  };
}

/** @deprecated Use {@link defaultGraphWebviewPersistedState}. */
export function defaultGraphViewPersistedSettings(): GraphWebviewPersistedState {
  return defaultGraphWebviewPersistedState();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isCameraAnglePreset(v: unknown): v is CameraAnglePreset {
  return v === 'diagonal' || v === 'diagonal-2';
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

/**
 * Normalize host- or webview-supplied JSON to a safe persisted shape (extension + webview).
 */
export function parseGraphWebviewPersistedState(raw: unknown): GraphWebviewPersistedState {
  const d = defaultGraphWebviewPersistedState();
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return d;
  }
  const o = raw as Record<string, unknown>;

  return {
    showLabels: typeof o.showLabels === 'boolean' ? o.showLabels : d.showLabels,
    showEdges: typeof o.showEdges === 'boolean' ? o.showEdges : d.showEdges,
    autoRotate: typeof o.autoRotate === 'boolean' ? o.autoRotate : d.autoRotate,
    gridCellSize: clamp(
      typeof o.gridCellSize === 'number' && Number.isFinite(o.gridCellSize)
        ? o.gridCellSize
        : d.gridCellSize,
      GRAPH_VIEW_GRID_CELL_MIN,
      GRAPH_VIEW_GRID_CELL_MAX
    ),
    gridLayerSpacing: clamp(
      typeof o.gridLayerSpacing === 'number' && Number.isFinite(o.gridLayerSpacing)
        ? o.gridLayerSpacing
        : d.gridLayerSpacing,
      GRAPH_VIEW_GRID_LAYER_MIN,
      GRAPH_VIEW_GRID_LAYER_MAX
    ),
    cameraDistance: clamp(
      typeof o.cameraDistance === 'number' && Number.isFinite(o.cameraDistance)
        ? o.cameraDistance
        : d.cameraDistance,
      GRAPH_VIEW_CAMERA_DISTANCE_MIN,
      GRAPH_VIEW_CAMERA_DISTANCE_MAX
    ),
    cameraAnglePreset: isCameraAnglePreset(o.cameraAnglePreset)
      ? o.cameraAnglePreset
      : d.cameraAnglePreset,
    controlsCollapsed:
      typeof o.controlsCollapsed === 'boolean' ? o.controlsCollapsed : d.controlsCollapsed,
    enabledPresets: parseEnabledPresetsField(o.enabledPresets, d.enabledPresets),
  };
}

/** @deprecated Use {@link parseGraphWebviewPersistedState}. */
export function clampAndParseGraphViewSettings(raw: unknown): GraphWebviewPersistedState {
  return parseGraphWebviewPersistedState(raw);
}
