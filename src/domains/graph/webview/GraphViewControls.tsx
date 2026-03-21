import React from 'react';
import type { CameraAnglePreset } from '../domain/graphTypes';
import {
  GRAPH_VIEW_CAMERA_DISTANCE_MAX,
  GRAPH_VIEW_CAMERA_DISTANCE_MIN,
  GRAPH_VIEW_CAMERA_DISTANCE_STEP,
  GRAPH_VIEW_GRID_CELL_MAX,
  GRAPH_VIEW_GRID_CELL_MIN,
  GRAPH_VIEW_GRID_CELL_STEP,
  GRAPH_VIEW_GRID_LAYER_MAX,
  GRAPH_VIEW_GRID_LAYER_MIN,
  GRAPH_VIEW_GRID_LAYER_STEP,
} from './graphViewSettings';

const DIAGONAL_PRESETS: { id: CameraAnglePreset; label: string; title: string }[] = [
  { id: 'diagonal', label: 'Diag 1', title: 'Diagonal overview (from above)' },
  { id: 'diagonal-2', label: 'Diag 2', title: 'Diagonal (from below)' },
];

/**
 * Floating overlay on the 3D canvas (ioodine ControlPanel-style), VS Code–themed.
 */
export function GraphViewControls(props: {
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
  showEdges: boolean;
  onShowEdgesChange: (v: boolean) => void;
  autoRotate: boolean;
  onAutoRotateChange: (v: boolean) => void;
  gridCellSize: number;
  onGridCellSizeChange: (v: number) => void;
  gridLayerSpacing: number;
  onGridLayerSpacingChange: (v: number) => void;
  cameraDistance: number;
  onCameraDistanceChange: (v: number) => void;
  cameraAnglePreset: CameraAnglePreset;
  onCameraAnglePresetChange: (v: CameraAnglePreset) => void;
  controlsCollapsed: boolean;
  onControlsCollapsedChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <div
      className="akashi-graph-view-controls-float"
      role="region"
      aria-label="Graph view controls"
    >
      {props.controlsCollapsed ? (
        <button
          type="button"
          className="akashi-button akashi-button--secondary akashi-graph-view-controls__peek"
          onClick={() => props.onControlsCollapsedChange(false)}
        >
          Graph controls
        </button>
      ) : (
        <div className="akashi-graph-view-controls-panel">
          <div className="akashi-graph-view-controls__header">
            <span className="akashi-graph-view-controls__title">Graph view</span>
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
              <label className="akashi-graph-view-controls__toggle">
                <input
                  type="checkbox"
                  checked={props.autoRotate}
                  onChange={(e) => props.onAutoRotateChange(e.target.checked)}
                />
                <span>Auto rotate</span>
              </label>
            </div>

            <div className="akashi-graph-view-controls__section">
              <div className="akashi-graph-view-controls__slider-head">
                <span className="akashi-graph-view-controls__label">Space between nodes</span>
                <span className="akashi-graph-view-controls__value">
                  {props.gridCellSize.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                className="akashi-graph-view-controls__range"
                min={GRAPH_VIEW_GRID_CELL_MIN}
                max={GRAPH_VIEW_GRID_CELL_MAX}
                step={GRAPH_VIEW_GRID_CELL_STEP}
                value={props.gridCellSize}
                onChange={(e) => props.onGridCellSizeChange(Number(e.target.value))}
                aria-label="Space between nodes"
              />
            </div>

            <div className="akashi-graph-view-controls__section">
              <div className="akashi-graph-view-controls__slider-head">
                <span className="akashi-graph-view-controls__label">Layer spacing</span>
                <span className="akashi-graph-view-controls__value">
                  {props.gridLayerSpacing.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                className="akashi-graph-view-controls__range"
                min={GRAPH_VIEW_GRID_LAYER_MIN}
                max={GRAPH_VIEW_GRID_LAYER_MAX}
                step={GRAPH_VIEW_GRID_LAYER_STEP}
                value={props.gridLayerSpacing}
                onChange={(e) => props.onGridLayerSpacingChange(Number(e.target.value))}
                aria-label="Layer spacing"
              />
            </div>

            <div className="akashi-graph-view-controls__section">
              <div className="akashi-graph-view-controls__slider-head">
                <span className="akashi-graph-view-controls__label">Camera distance</span>
                <span className="akashi-graph-view-controls__value">
                  {props.cameraDistance.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                className="akashi-graph-view-controls__range"
                min={GRAPH_VIEW_CAMERA_DISTANCE_MIN}
                max={GRAPH_VIEW_CAMERA_DISTANCE_MAX}
                step={GRAPH_VIEW_CAMERA_DISTANCE_STEP}
                value={props.cameraDistance}
                onChange={(e) => props.onCameraDistanceChange(Number(e.target.value))}
                aria-label="Camera distance multiplier"
              />
            </div>

            <div className="akashi-graph-view-controls__section">
              <span className="akashi-graph-view-controls__label akashi-graph-view-controls__label--block">
                Diagonal view
              </span>
              <div
                className="akashi-graph-view-controls__angle-group"
                role="group"
                aria-label="Diagonal camera preset"
              >
                {DIAGONAL_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      props.cameraAnglePreset === p.id
                        ? 'akashi-graph-view-controls__angle-btn akashi-graph-view-controls__angle-btn--active'
                        : 'akashi-graph-view-controls__angle-btn'
                    }
                    title={p.title}
                    aria-pressed={props.cameraAnglePreset === p.id}
                    onClick={() => props.onCameraAnglePresetChange(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
