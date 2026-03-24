import type { JSX } from 'react';
import type { Graph2DWebviewPersistedState } from './graph2dViewSettings';
import {
  GRAPH2D_CENTER_MAX,
  GRAPH2D_CENTER_MIN,
  GRAPH2D_CENTER_STEP,
  GRAPH2D_CHARGE_MAX,
  GRAPH2D_CHARGE_MIN,
  GRAPH2D_CHARGE_STEP,
  GRAPH2D_COLLIDE_MAX,
  GRAPH2D_COLLIDE_MIN,
  GRAPH2D_COLLIDE_STEP,
  GRAPH2D_LINK_DISTANCE_MAX,
  GRAPH2D_LINK_DISTANCE_MIN,
  GRAPH2D_LINK_DISTANCE_STEP,
  GRAPH2D_LINK_STRENGTH_MAX,
  GRAPH2D_LINK_STRENGTH_MIN,
  GRAPH2D_LINK_STRENGTH_STEP,
  GRAPH2D_LAYER_BAND_MAX,
  GRAPH2D_LAYER_BAND_MIN,
  GRAPH2D_LAYER_BAND_STEP,
  GRAPH2D_PRESET_CLUSTER_MAX,
  GRAPH2D_PRESET_CLUSTER_MIN,
  GRAPH2D_PRESET_CLUSTER_STEP,
} from './graph2dViewSettings';

export function Graph2DViewControls(props: {
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
  showEdges: boolean;
  onShowEdgesChange: (v: boolean) => void;
  controlsCollapsed: boolean;
  onControlsCollapsedChange: (v: boolean) => void;
  linkDistance: number;
  onLinkDistanceChange: (v: number) => void;
  linkStrength: number;
  onLinkStrengthChange: (v: number) => void;
  chargeStrength: number;
  onChargeStrengthChange: (v: number) => void;
  centerStrength: number;
  onCenterStrengthChange: (v: number) => void;
  presetClusterStrength: number;
  onPresetClusterStrengthChange: (v: number) => void;
  layerBandStrength: number;
  onLayerBandStrengthChange: (v: number) => void;
  collidePadding: number;
  onCollidePaddingChange: (v: number) => void;
}): JSX.Element {
  return (
    <div
      className="akashi-graph2d-view-controls-float"
      role="region"
      aria-label="2D graph controls"
    >
      {props.controlsCollapsed ? (
        <button
          type="button"
          className="akashi-button akashi-button--secondary akashi-graph-view-controls__peek"
          onClick={() => props.onControlsCollapsedChange(false)}
        >
          Graph forces
        </button>
      ) : (
        <div className="akashi-graph-view-controls-panel akashi-graph2d-view-controls-panel">
          <div className="akashi-graph-view-controls__header">
            <span className="akashi-graph-view-controls__title">2D graph</span>
            <button
              type="button"
              className="akashi-graph-view-controls__hide"
              onClick={() => props.onControlsCollapsedChange(true)}
              aria-label="Hide graph controls"
            >
              Hide
            </button>
          </div>
          <div className="akashi-graph-view-controls__body">
            <div className="akashi-graph-view-controls__row">
              <label className="akashi-graph-view-controls__toggle">
                <input
                  type="checkbox"
                  checked={props.showLabels}
                  onChange={(e) => props.onShowLabelsChange(e.target.checked)}
                />
                <span>Labels</span>
              </label>
              <label className="akashi-graph-view-controls__toggle">
                <input
                  type="checkbox"
                  checked={props.showEdges}
                  onChange={(e) => props.onShowEdgesChange(e.target.checked)}
                />
                <span>Edges</span>
              </label>
            </div>

            <Graph2DSliderRow
              label="Link distance"
              value={props.linkDistance}
              min={GRAPH2D_LINK_DISTANCE_MIN}
              max={GRAPH2D_LINK_DISTANCE_MAX}
              step={GRAPH2D_LINK_DISTANCE_STEP}
              format={(v) => Math.round(v).toString()}
              onChange={props.onLinkDistanceChange}
            />
            <Graph2DSliderRow
              label="Link strength"
              value={props.linkStrength}
              min={GRAPH2D_LINK_STRENGTH_MIN}
              max={GRAPH2D_LINK_STRENGTH_MAX}
              step={GRAPH2D_LINK_STRENGTH_STEP}
              format={(v) => v.toFixed(2)}
              onChange={props.onLinkStrengthChange}
            />
            <Graph2DSliderRow
              label="Repel force"
              value={props.chargeStrength}
              min={GRAPH2D_CHARGE_MIN}
              max={GRAPH2D_CHARGE_MAX}
              step={GRAPH2D_CHARGE_STEP}
              format={(v) => Math.round(v).toString()}
              onChange={props.onChargeStrengthChange}
            />
            <Graph2DSliderRow
              label="Center gravity"
              value={props.centerStrength}
              min={GRAPH2D_CENTER_MIN}
              max={GRAPH2D_CENTER_MAX}
              step={GRAPH2D_CENTER_STEP}
              format={(v) => v.toFixed(2)}
              onChange={props.onCenterStrengthChange}
            />
            <Graph2DSliderRow
              label="Preset cluster pull"
              value={props.presetClusterStrength}
              min={GRAPH2D_PRESET_CLUSTER_MIN}
              max={GRAPH2D_PRESET_CLUSTER_MAX}
              step={GRAPH2D_PRESET_CLUSTER_STEP}
              format={(v) => v.toFixed(2)}
              onChange={props.onPresetClusterStrengthChange}
            />
            <Graph2DSliderRow
              label="Layer discipline"
              value={props.layerBandStrength}
              min={GRAPH2D_LAYER_BAND_MIN}
              max={GRAPH2D_LAYER_BAND_MAX}
              step={GRAPH2D_LAYER_BAND_STEP}
              format={(v) => v.toFixed(2)}
              onChange={props.onLayerBandStrengthChange}
            />
            <Graph2DSliderRow
              label="Node padding"
              value={props.collidePadding}
              min={GRAPH2D_COLLIDE_MIN}
              max={GRAPH2D_COLLIDE_MAX}
              step={GRAPH2D_COLLIDE_STEP}
              format={(v) => Math.round(v).toString()}
              onChange={props.onCollidePaddingChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Graph2DSliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
    <div className="akashi-graph-view-controls__section">
      <div className="akashi-graph-view-controls__slider-head">
        <span className="akashi-graph-view-controls__label">{props.label}</span>
        <span className="akashi-graph-view-controls__value">{props.format(props.value)}</span>
      </div>
      <input
        type="range"
        className="akashi-graph-view-controls__range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function graph2DSettingsToPersisted(s: {
  showLabels: boolean;
  showEdges: boolean;
  controlsCollapsed: boolean;
  enabledPresets: ReadonlySet<string> | null;
  enabledCategories: ReadonlySet<string> | null;
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
  centerStrength: number;
  presetClusterStrength: number;
  layerBandStrength: number;
  collidePadding: number;
}): Graph2DWebviewPersistedState {
  return {
    showLabels: s.showLabels,
    showEdges: s.showEdges,
    controlsCollapsed: s.controlsCollapsed,
    enabledPresets: s.enabledPresets === null ? null : [...s.enabledPresets].sort(),
    enabledCategories: s.enabledCategories === null ? null : [...s.enabledCategories].sort(),
    linkDistance: s.linkDistance,
    linkStrength: s.linkStrength,
    chargeStrength: s.chargeStrength,
    centerStrength: s.centerStrength,
    presetClusterStrength: s.presetClusterStrength,
    layerBandStrength: s.layerBandStrength,
    collidePadding: s.collidePadding,
  };
}
