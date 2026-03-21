import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { buildGraphFromSourcesPayload } from '../../application/buildGraphFromSourcesPayload';
import type { GraphEdge3D, GraphNode3D } from '../../domain/graphTypes';
import { diagnoseInboundSnapshotMessage } from '../graphSnapshotDiagnostics';
import { GraphPresetToggles } from '../GraphPresetToggles';
import { Graph2DMessageType } from './messages';
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
  const [inboundCount, setInboundCount] = useState(0);
  const [lastDiag, setLastDiag] = useState<ReturnType<
    typeof diagnoseInboundSnapshotMessage
  > | null>(null);
  const [mountTime] = useState(() => new Date().toISOString());

  const [showLabels, setShowLabels] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [viewSettingsHydrated, setViewSettingsHydrated] = useState(false);
  const [enabledPresetOverride, setEnabledPresetOverride] = useState<ReadonlySet<string> | null>(
    null
  );

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

  const skipNextViewSettingsPersistRef = useRef(false);

  const hasVscodeApi = useMemo(() => getVscodeApi() != null, []);
  const sceneReady = viewSettingsHydrated || !hasVscodeApi;

  useEffect(() => {
    const vscode = getVscodeApi();
    vscode?.postMessage({ type: Graph2DMessageType.WebviewReady });
    if (!vscode) {
      setViewSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const data = event.data as { type?: string; payload?: unknown };
      if (data?.type === Graph2DMessageType.ViewSettings) {
        const s = parseGraph2DWebviewPersistedState(data.payload);
        skipNextViewSettingsPersistRef.current = true;
        setShowLabels(s.showLabels);
        setShowEdges(s.showEdges);
        setControlsCollapsed(s.controlsCollapsed);
        setEnabledPresetOverride(s.enabledPresets === null ? null : new Set(s.enabledPresets));
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
      setInboundCount((c) => c + 1);
      const diag = diagnoseInboundSnapshotMessage(data as { type?: string; payload?: unknown });
      setLastDiag(diag);
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

  const snapshotPresetIds = useMemo(() => {
    const s = new Set<string>();
    snapshot?.records.forEach((r) => {
      if (r.preset) {
        s.add(r.preset);
      }
    });
    return [...s].sort();
  }, [snapshot]);

  const effectiveEnabledPresets = enabledPresetOverride;

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
          showLabels,
          showEdges,
          controlsCollapsed,
          enabledPresets: enabledPresetOverride,
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
    showLabels,
    showEdges,
    controlsCollapsed,
    enabledPresetOverride,
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
        enabledPresets: effectiveEnabledPresets,
        applyGridLayout: false,
      }),
    [snapshot, effectiveEnabledPresets]
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

  const isPresetEnabled = useCallback(
    (pid: string): boolean => effectiveEnabledPresets === null || effectiveEnabledPresets.has(pid),
    [effectiveEnabledPresets]
  );

  const onTogglePreset = useCallback(
    (pid: string) => {
      setEnabledPresetOverride((prev) => {
        const full = new Set(snapshotPresetIds);
        if (prev === null) {
          const next = new Set(full);
          next.delete(pid);
          return next;
        }
        const next = new Set(prev);
        if (next.has(pid)) {
          next.delete(pid);
        } else {
          next.add(pid);
        }
        if (next.size === full.size && [...full].every((p) => next.has(p))) {
          return null;
        }
        return next;
      });
    },
    [snapshotPresetIds]
  );

  const nodeBreakdown = useMemo(() => {
    const folders = model.nodes.filter((n) => n.type === 'folder').length;
    const notes = model.nodes.filter((n) => n.type === 'note').length;
    const tags = model.nodes.filter((n) => n.type === 'tag').length;
    const presets = model.nodes.filter((n) => n.type === 'preset').length;
    const localities = model.nodes.filter((n) => n.type === 'locality').length;
    return { folders, notes, tags, presets, localities };
  }, [model.nodes]);

  const statusText = useMemo(() => {
    if (!snapshot) {
      return 'No validated snapshot yet (see Debug below).';
    }
    return `${snapshot.sourceCount} sources · ${new Date(snapshot.generatedAt).toLocaleString()}`;
  }, [snapshot]);

  const emptyHint = useMemo(
    () =>
      buildEmptyHint(snapshot, model, {
        allPresetsHidden:
          !!snapshot &&
          snapshot.records.length > 0 &&
          snapshotPresetIds.length > 0 &&
          effectiveEnabledPresets !== null &&
          effectiveEnabledPresets.size === 0,
        noPresetsOnRecords:
          !!snapshot && snapshot.records.length > 0 && snapshotPresetIds.length === 0,
      }),
    [snapshot, model, snapshotPresetIds, effectiveEnabledPresets]
  );

  return (
    <div className="akashi-graph-app akashi-graph2d-app">
      <header className="akashi-graph-toolbar">
        <GraphPresetToggles
          presetIds={snapshotPresetIds}
          isPresetEnabled={isPresetEnabled}
          onToggle={onTogglePreset}
        />
        <span className="akashi-graph-status">{statusText}</span>
      </header>
      <div className="akashi-graph-scene">
        <div className="akashi-graph-scene-stack">
          {sceneReady ? (
            <>
              <ForceGraphView
                nodes={model.nodes}
                edges={model.edges}
                emptyHint={emptyHint}
                showLabels={showLabels}
                showEdges={showEdges}
                sim={simProps}
              />
              <Graph2DViewControls
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
                showEdges={showEdges}
                onShowEdgesChange={setShowEdges}
                controlsCollapsed={controlsCollapsed}
                onControlsCollapsedChange={setControlsCollapsed}
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
      <details className="akashi-graph-debug akashi-graph2d-debug">
        <summary className="akashi-graph-debug-summary">Graph2D debug</summary>
        <div className="akashi-graph-debug-body">
          <p className="akashi-graph-debug-line">
            <strong>Webview mounted</strong> {mountTime}
          </p>
          <p className="akashi-graph-debug-line">
            <strong>Snapshot messages received</strong> {inboundCount}
          </p>
          {lastDiag ? (
            <>
              <p className="akashi-graph-debug-line">
                <strong>Last message type</strong> {lastDiag.messageType}
              </p>
              <p className="akashi-graph-debug-line">
                <strong>Payload</strong> present={String(lastDiag.payloadPresent)} · type=
                {String(lastDiag.payloadType)}
              </p>
              <p className="akashi-graph-debug-line">
                <strong>Top-level keys</strong> {lastDiag.topLevelKeys}
              </p>
              <p className="akashi-graph-debug-line">
                <strong>isSourcesSnapshotPayload</strong> {String(lastDiag.validationPassed)}
              </p>
              <ul className="akashi-graph-debug-list">
                {lastDiag.detailLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="akashi-graph-debug-line">
              No <code>graph2d/snapshot</code> message received yet.
            </p>
          )}
          <p className="akashi-graph-debug-line">
            <strong>Built graph</strong> nodes={model.nodes.length} edges={model.edges.length}{' '}
            (presets=
            {nodeBreakdown.presets}, localities=
            {nodeBreakdown.localities}, folders=
            {nodeBreakdown.folders}, files={nodeBreakdown.notes}, facet-tags=
            {nodeBreakdown.tags})
          </p>
          <p className="akashi-graph-debug-line akashi-graph-debug-hint">
            <strong>Controls</strong> Pan: drag background. Zoom: wheel. Drag nodes to reposition.
            Double-click a file or folder to open. Hover to dim non-neighbors. Presets start as
            separate hubs (global/local beside each); adjust “Preset cluster pull” if a cluster
            drifts.
          </p>
        </div>
      </details>
    </div>
  );
}

function buildEmptyHint(
  snapshot: SourcesSnapshotPayload | null,
  model: { nodes: GraphNode3D[]; edges: GraphEdge3D[] },
  opts?: { allPresetsHidden?: boolean; noPresetsOnRecords?: boolean }
): string | null {
  if (model.nodes.length > 0) {
    return null;
  }
  if (!snapshot) {
    return 'Waiting for index data. Run “Index sources” in the Akashi sidebar, then open the 2D graph again.';
  }
  if (snapshot.records.length === 0) {
    return 'Snapshot has 0 records after preset filter. Adjust Akashi presets or index again.';
  }
  if (opts?.allPresetsHidden) {
    return 'All presets are hidden. Turn on at least one preset toggle above.';
  }
  if (opts?.noPresetsOnRecords) {
    return 'Indexed records are missing a preset id; re-run “Index sources” after upgrading.';
  }
  return 'Graph builder returned no nodes (unexpected). See Graph2D debug below.';
}
