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
          className="akashi-button akashi-button--secondary akashi-graph-view-controls__peek akashi-graph-view-controls__peek--icon"
          onClick={() => props.onControlsCollapsedChange(false)}
          aria-label="Layout forces"
          title="Layout forces"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 9C10.3425 9 9 10.3425 9 12C9 13.6575 10.3425 15 12 15C13.6575 15 15 13.6575 15 12C15 10.3425 13.6575 9 12 9ZM12 13.5C11.172 13.5 10.5 12.828 10.5 12C10.5 11.172 11.172 10.5 12 10.5C12.828 10.5 13.5 11.172 13.5 12C13.5 12.828 12.828 13.5 12 13.5ZM21.8475 14.5725L19.9185 12.942C19.8675 12.8985 19.8195 12.8505 19.776 12.7995C19.332 12.279 19.3965 11.5005 19.9185 11.058L21.8475 9.4275C22.0395 9.2655 22.113 9.0045 22.0365 8.766C21.579 7.3545 20.823 6.06 19.8285 4.962C19.7085 4.83 19.5405 4.758 19.368 4.758C19.2975 4.758 19.227 4.77 19.1595 4.794L16.779 5.6415C16.716 5.664 16.65 5.682 16.584 5.694C16.509 5.7075 16.434 5.715 16.3605 5.715C15.7725 5.715 15.2505 5.298 15.141 4.701L14.6865 2.223C14.6415 1.977 14.451 1.782 14.205 1.7295C13.485 1.5765 12.7485 1.5 12.0015 1.5C11.2545 1.5 10.5165 1.578 9.7965 1.7295C9.5505 1.782 9.36 1.977 9.315 2.223L8.862 4.701C8.85 4.767 8.832 4.8315 8.8095 4.8945C8.628 5.4 8.151 5.715 7.641 5.715C7.503 5.715 7.362 5.691 7.224 5.643L4.8435 4.7955C4.776 4.7715 4.704 4.7595 4.635 4.7595C4.4625 4.7595 4.2945 4.8315 4.1745 4.9635C3.1785 6.0615 2.424 7.356 1.965 8.7675C1.887 9.006 1.962 9.267 2.154 9.429L4.083 11.0595C4.134 11.103 4.182 11.151 4.2255 11.202C4.6695 11.7225 4.605 12.501 4.083 12.9435L2.154 14.574C1.962 14.736 1.8885 14.997 1.965 15.2355C2.4225 16.647 3.1785 17.9415 4.1745 19.0395C4.2945 19.1715 4.4625 19.2435 4.635 19.2435C4.7055 19.2435 4.776 19.2315 4.8435 19.2075L7.224 18.36C7.287 18.3375 7.353 18.3195 7.419 18.3075C7.494 18.294 7.569 18.288 7.6425 18.288C8.2305 18.288 8.7525 18.705 8.862 19.302L9.315 21.78C9.36 22.026 9.5505 22.221 9.7965 22.2735C10.5165 22.4265 11.2545 22.503 12.0015 22.503C12.7485 22.503 13.4865 22.425 14.205 22.2735C14.451 22.221 14.6415 22.026 14.6865 21.78L15.141 19.302C15.153 19.236 15.171 19.1715 15.1935 19.1085C15.375 18.603 15.852 18.288 16.362 18.288C16.5 18.288 16.641 18.312 16.779 18.36L19.158 19.2075C19.227 19.2315 19.2975 19.2435 19.3665 19.2435C19.539 19.2435 19.707 19.1715 19.827 19.0395C20.823 17.9415 21.5775 16.647 22.035 15.2355C22.113 14.997 22.038 14.736 21.846 14.574L21.8475 14.5725ZM19.092 17.589L17.2815 16.944C16.9845 16.839 16.6755 16.785 16.362 16.785C15.2085 16.785 14.1705 17.514 13.782 18.5985C13.731 18.738 13.6935 18.882 13.6665 19.029L13.3215 20.9055C12.8865 20.9685 12.444 21 12.0015 21C11.559 21 11.1165 20.9685 10.68 20.904L10.3365 19.0275C10.098 17.727 8.9655 16.7835 7.6425 16.7835C7.4805 16.7835 7.3155 16.7985 7.149 16.8285C7.0035 16.8555 6.861 16.893 6.72 16.9425L4.9095 17.5875C4.3575 16.896 3.9165 16.1385 3.591 15.321L5.052 14.0865C5.6115 13.614 5.952 12.951 6.012 12.222C6.072 11.493 5.8425 10.785 5.367 10.227C5.271 10.1145 5.1645 10.008 5.052 9.912L3.591 8.6775C3.9165 7.86 4.3575 7.101 4.9095 6.411L6.72 7.056C7.017 7.161 7.326 7.215 7.641 7.215C8.7945 7.215 9.8325 6.486 10.221 5.4015C10.272 5.2605 10.3095 5.1165 10.3365 4.971L10.68 3.0945C11.1165 3.0315 11.559 2.9985 12.0015 2.9985C12.444 2.9985 12.8865 3.03 13.3215 3.093L13.665 4.9695C13.9035 6.27 15.036 7.2135 16.359 7.2135C16.521 7.2135 16.686 7.1985 16.851 7.1685C16.9965 7.1415 17.1405 7.104 17.2815 7.0545L19.092 6.4095C19.644 7.0995 20.085 7.8585 20.4105 8.676L18.951 9.9105C18.3915 10.383 18.0495 11.046 17.991 11.775C17.931 12.504 18.1605 13.2135 18.636 13.77C18.7335 13.884 18.8385 13.989 18.9525 14.085L20.4135 15.3195C20.088 16.137 19.647 16.896 19.095 17.586L19.092 17.589Z"/>
          </svg>
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
    linkDistance: s.linkDistance,
    linkStrength: s.linkStrength,
    chargeStrength: s.chargeStrength,
    centerStrength: s.centerStrength,
    presetClusterStrength: s.presetClusterStrength,
    layerBandStrength: s.layerBandStrength,
    collidePadding: s.collidePadding,
  };
}
