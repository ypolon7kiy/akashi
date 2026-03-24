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
  controlsCollapsed: boolean;
  onControlsCollapsedChange: (v: boolean) => void;
  onResetForces: () => void;
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
      aria-label="Layout force controls"
    >
      {props.controlsCollapsed ? (
        <button
          type="button"
          className="akashi-button akashi-button--secondary akashi-graph-view-controls__peek"
          onClick={() => props.onControlsCollapsedChange(false)}
        >
          <span className="akashi-graph-view-controls__peek-inner">
            <span className="codicon codicon-settings-gear" aria-hidden="true" />
            <span>Layout forces</span>
          </span>
        </button>
      ) : (
        <div className="akashi-graph-view-controls-panel akashi-graph2d-view-controls-panel">
          <div className="akashi-graph-view-controls__header">
            <span className="akashi-graph-view-controls__title">Layout forces</span>
            <button
              type="button"
              className="akashi-graph-view-controls__hide"
              onClick={() => props.onControlsCollapsedChange(true)}
              aria-label="Hide layout force controls"
            >
              <span className="akashi-graph-view-controls__peek-inner">
                <span className="codicon codicon-chevron-left" aria-hidden="true" />
                <span>Hide</span>
              </span>
            </button>
          </div>
          <div className="akashi-graph-view-controls__body">
            <div className="akashi-graph-view-controls__group">
              <p className="akashi-graph-view-controls__group-title">Links</p>
              <p className="akashi-graph-view-controls__group-hint">
                How strongly edges pull and how long they prefer to be.
              </p>
              <Graph2DSliderRow
                id="graph2d-force-link-distance"
                label="Link distance"
                hint="Preferred length between linked nodes."
                value={props.linkDistance}
                min={GRAPH2D_LINK_DISTANCE_MIN}
                max={GRAPH2D_LINK_DISTANCE_MAX}
                step={GRAPH2D_LINK_DISTANCE_STEP}
                format={(v) => Math.round(v).toString()}
                onChange={props.onLinkDistanceChange}
              />
              <Graph2DSliderRow
                id="graph2d-force-link-strength"
                label="Link strength"
                hint="Higher values tighten edges toward the target distance."
                value={props.linkStrength}
                min={GRAPH2D_LINK_STRENGTH_MIN}
                max={GRAPH2D_LINK_STRENGTH_MAX}
                step={GRAPH2D_LINK_STRENGTH_STEP}
                format={(v) => v.toFixed(2)}
                onChange={props.onLinkStrengthChange}
              />
            </div>

            <div className="akashi-graph-view-controls__group">
              <p className="akashi-graph-view-controls__group-title">Forces and centering</p>
              <p className="akashi-graph-view-controls__group-hint">
                Spread nodes apart and pull the graph toward the middle of the view.
              </p>
              <Graph2DSliderRow
                id="graph2d-force-charge"
                label="Repel force"
                hint="How strongly nodes push each other away."
                value={props.chargeStrength}
                min={GRAPH2D_CHARGE_MIN}
                max={GRAPH2D_CHARGE_MAX}
                step={GRAPH2D_CHARGE_STEP}
                format={(v) => Math.round(v).toString()}
                onChange={props.onChargeStrengthChange}
              />
              <Graph2DSliderRow
                id="graph2d-force-center"
                label="Center gravity"
                hint="Keeps the whole graph from drifting off-screen."
                value={props.centerStrength}
                min={GRAPH2D_CENTER_MIN}
                max={GRAPH2D_CENTER_MAX}
                step={GRAPH2D_CENTER_STEP}
                format={(v) => v.toFixed(2)}
                onChange={props.onCenterStrengthChange}
              />
            </div>

            <div className="akashi-graph-view-controls__group">
              <p className="akashi-graph-view-controls__group-title">Preset clusters and layers</p>
              <p className="akashi-graph-view-controls__group-hint">
                Shapes each preset hub and keeps depth rows readable.
              </p>
              <Graph2DSliderRow
                id="graph2d-force-preset-cluster"
                label="Preset cluster pull"
                hint="Pulls files and structure toward their preset hub."
                value={props.presetClusterStrength}
                min={GRAPH2D_PRESET_CLUSTER_MIN}
                max={GRAPH2D_PRESET_CLUSTER_MAX}
                step={GRAPH2D_PRESET_CLUSTER_STEP}
                format={(v) => v.toFixed(2)}
                onChange={props.onPresetClusterStrengthChange}
              />
              <Graph2DSliderRow
                id="graph2d-force-layer-band"
                label="Layer discipline"
                hint="Vertical spacing between preset, locality, category, and file rows."
                value={props.layerBandStrength}
                min={GRAPH2D_LAYER_BAND_MIN}
                max={GRAPH2D_LAYER_BAND_MAX}
                step={GRAPH2D_LAYER_BAND_STEP}
                format={(v) => v.toFixed(2)}
                onChange={props.onLayerBandStrengthChange}
              />
            </div>

            <div className="akashi-graph-view-controls__group">
              <p className="akashi-graph-view-controls__group-title">Collision</p>
              <p className="akashi-graph-view-controls__group-hint">
                Minimum gap between node circles to reduce overlap.
              </p>
              <Graph2DSliderRow
                id="graph2d-force-collide"
                label="Node padding"
                hint="Extra space added around each node for hit-testing and layout."
                value={props.collidePadding}
                min={GRAPH2D_COLLIDE_MIN}
                max={GRAPH2D_COLLIDE_MAX}
                step={GRAPH2D_COLLIDE_STEP}
                format={(v) => Math.round(v).toString()}
                onChange={props.onCollidePaddingChange}
              />
            </div>
          </div>
          <div className="akashi-graph-view-controls__footer">
            <button
              type="button"
              className="akashi-button akashi-button--secondary"
              onClick={props.onResetForces}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Graph2DSliderRow(props: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}): JSX.Element {
  const shown = props.format(props.value);
  return (
    <div className="akashi-graph-view-controls__section">
      <div className="akashi-graph-view-controls__slider-head">
        <label htmlFor={props.id} className="akashi-graph-view-controls__label">
          {props.label}
        </label>
        <span className="akashi-graph-view-controls__value" aria-hidden="true">
          {shown}
        </span>
      </div>
      <p className="akashi-graph-view-controls__slider-hint">{props.hint}</p>
      <input
        id={props.id}
        type="range"
        className="akashi-graph-view-controls__range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        aria-valuetext={shown}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function graph2DSettingsToPersisted(s: {
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
