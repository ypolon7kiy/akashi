import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { buildGraphFromSourcesPayload } from '../../application/buildGraphFromSourcesPayload';
import type { GraphEdge3D, GraphNode3D } from '../../domain/graphTypes';
import { Graph2DMessageType, type Graph2DFileColorsPayload } from './messages';
import {
  defaultGraph2DWebviewPersistedState,
  parseGraph2DWebviewPersistedState,
} from './graph2dViewSettings';
import { Graph2DViewControls, graph2DSettingsToPersisted } from './Graph2DViewControls';
import { ForceGraphView, type ForceGraphSimProps } from './ForceGraphView';
import {
  isSourcesSnapshotPayload,
  type SourcesSnapshotPayload,
} from '../../../../shared/types/sourcesSnapshotPayload';
import { getVscodeApi } from '../../../../webview-shared/api';

export function Graph2DApp(): JSX.Element {
  const [snapshot, setSnapshot] = useState<SourcesSnapshotPayload | null>(null);
  const [categoryPalette, setCategoryPalette] = useState<Graph2DFileColorsPayload | null>(null);

  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [viewSettingsHydrated, setViewSettingsHydrated] = useState(false);

  const [linkDistance, setLinkDistance] = useState(
    defaultGraph2DWebviewPersistedState().linkDistance
  );
  const [linkStrength, setLinkStrength] = useState(
    defaultGraph2DWebviewPersistedState().linkStrength
  );
  const [chargeStrength, setChargeStrength] = useState(
    defaultGraph2DWebviewPersistedState().chargeStrength
  );
  const [centerStrength, setCenterStrength] = useState(
    defaultGraph2DWebviewPersistedState().centerStrength
  );
  const [presetClusterStrength, setPresetClusterStrength] = useState(
    defaultGraph2DWebviewPersistedState().presetClusterStrength
  );
  const [layerBandStrength, setLayerBandStrength] = useState(
    defaultGraph2DWebviewPersistedState().layerBandStrength
  );
  const [collidePadding, setCollidePadding] = useState(
    defaultGraph2DWebviewPersistedState().collidePadding
  );

  /** Sidebar filter result: matched file paths. null = no filter active → show all. */
  const [sidebarMatchedPaths, setSidebarMatchedPaths] = useState<ReadonlySet<string> | null>(null);

  const skipNextViewSettingsPersistRef = useRef(false);

  const hasVscodeApi = useMemo(() => getVscodeApi() != null, []);
  const sceneReady = viewSettingsHydrated || !hasVscodeApi;

  useEffect(() => {
    const vscode = getVscodeApi();
    if (vscode) {
      vscode.postMessage({ type: Graph2DMessageType.WebviewReady });
    } else {
      setViewSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const data = event.data as { type?: string; payload?: unknown };
      if (data?.type === Graph2DMessageType.FileColors) {
        const p = data.payload;
        if (p && typeof p === 'object' && !Array.isArray(p)) {
          setCategoryPalette(p as Graph2DFileColorsPayload);
        }
        return;
      }
      if (data?.type === Graph2DMessageType.FilterQuery) {
        const p = data.payload;
        if (p === null) {
          setSidebarMatchedPaths((prev) => (prev === null ? prev : null));
        } else if (Array.isArray(p)) {
          const arr = p as string[];
          setSidebarMatchedPaths((prev) => {
            if (prev !== null && prev.size === arr.length && arr.every((v) => prev.has(v))) {
              return prev;
            }
            return new Set(arr);
          });
        } else {
          // Unexpected payload shape — clear filter to avoid stale state.
          setSidebarMatchedPaths((prev) => (prev === null ? prev : null));
        }
        return;
      }
      if (data?.type === Graph2DMessageType.ViewSettings) {
        const s = parseGraph2DWebviewPersistedState(data.payload);
        skipNextViewSettingsPersistRef.current = true;
        setControlsCollapsed(s.controlsCollapsed);
        setLinkDistance(s.linkDistance);
        setLinkStrength(s.linkStrength);
        setChargeStrength(s.chargeStrength);
        setCenterStrength(s.centerStrength);
        setPresetClusterStrength(s.presetClusterStrength);
        setLayerBandStrength(s.layerBandStrength);
        setCollidePadding(s.collidePadding);
        setViewSettingsHydrated(true);
        return;
      }
      if (data?.type !== Graph2DMessageType.Snapshot) {
        return;
      }
      const p = data.payload;
      if (p == null) {
        setSnapshot(null);
        return;
      }
      if (isSourcesSnapshotPayload(p)) {
        setSnapshot(p);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!viewSettingsHydrated) {
      return;
    }
    if (skipNextViewSettingsPersistRef.current) {
      skipNextViewSettingsPersistRef.current = false;
      return;
    }
    const vscode = getVscodeApi();
    if (!vscode) {
      return;
    }
    const t = window.setTimeout(() => {
      vscode.postMessage({
        type: Graph2DMessageType.SaveViewSettings,
        payload: graph2DSettingsToPersisted({
          controlsCollapsed,
          linkDistance,
          linkStrength,
          chargeStrength,
          centerStrength,
          presetClusterStrength,
          layerBandStrength,
          collidePadding,
        }),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    viewSettingsHydrated,
    controlsCollapsed,
    linkDistance,
    linkStrength,
    chargeStrength,
    centerStrength,
    presetClusterStrength,
    layerBandStrength,
    collidePadding,
  ]);

  const model = useMemo(
    () =>
      buildGraphFromSourcesPayload(snapshot, {
        matchedPaths: sidebarMatchedPaths,
        applyGridLayout: false,
      }),
    [snapshot, sidebarMatchedPaths]
  );

  const simProps: ForceGraphSimProps = useMemo(
    () => ({
      linkDistance,
      linkStrength,
      chargeStrength,
      centerStrength,
      presetClusterStrength,
      layerBandStrength,
      collidePadding,
    }),
    [
      linkDistance,
      linkStrength,
      chargeStrength,
      centerStrength,
      presetClusterStrength,
      layerBandStrength,
      collidePadding,
    ]
  );

  const onResetForces = useCallback(() => {
    const d = defaultGraph2DWebviewPersistedState();
    setLinkDistance(d.linkDistance);
    setLinkStrength(d.linkStrength);
    setChargeStrength(d.chargeStrength);
    setCenterStrength(d.centerStrength);
    setPresetClusterStrength(d.presetClusterStrength);
    setLayerBandStrength(d.layerBandStrength);
    setCollidePadding(d.collidePadding);
  }, []);

  const emptyHint = useMemo(
    () => buildEmptyHint(snapshot, model, sidebarMatchedPaths !== null),
    [snapshot, model, sidebarMatchedPaths]
  );

  return (
    <div className="akashi-graph-app akashi-graph2d-app">
      <div className="akashi-graph-scene">
        <div className="akashi-graph-scene-stack">
          {sceneReady ? (
            <>
              <ForceGraphView
                nodes={model.nodes}
                edges={model.edges}
                emptyHint={emptyHint}
                sim={simProps}
                categoryPalette={categoryPalette ?? undefined}
                artifactCreators={snapshot?.artifactCreators}
              />
              <Graph2DViewControls
                controlsCollapsed={controlsCollapsed}
                onControlsCollapsedChange={setControlsCollapsed}
                onResetForces={onResetForces}
                linkDistance={linkDistance}
                onLinkDistanceChange={setLinkDistance}
                linkStrength={linkStrength}
                onLinkStrengthChange={setLinkStrength}
                chargeStrength={chargeStrength}
                onChargeStrengthChange={setChargeStrength}
                centerStrength={centerStrength}
                onCenterStrengthChange={setCenterStrength}
                presetClusterStrength={presetClusterStrength}
                onPresetClusterStrengthChange={setPresetClusterStrength}
                layerBandStrength={layerBandStrength}
                onLayerBandStrengthChange={setLayerBandStrength}
                collidePadding={collidePadding}
                onCollidePaddingChange={setCollidePadding}
              />
            </>
          ) : (
            <div className="akashi-graph-scene-stack__loading" role="status" aria-live="polite">
              <span className="akashi-graph-scene-stack__loading-text">Loading 2D graph…</span>
              <span className="akashi-graph-scene-stack__loading-hint">
                Restoring saved layout settings.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildEmptyHint(
  snapshot: SourcesSnapshotPayload | null,
  model: { nodes: GraphNode3D[]; edges: GraphEdge3D[] },
  isFilterActive: boolean
): string | null {
  if (model.nodes.length > 0) {
    return null;
  }
  if (!snapshot) {
    return 'Waiting for index data. Run "Index sources" in the Akashi sidebar, then open the 2D graph again.';
  }
  if (snapshot.records.length === 0) {
    return 'Snapshot has 0 records after preset filter. Adjust Akashi presets or index again.';
  }
  if (isFilterActive) {
    return 'No sources match the current search filter.';
  }
  return 'Graph builder returned no nodes (unexpected).';
}
