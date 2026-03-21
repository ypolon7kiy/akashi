import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGraphFromSourcesPayload } from '../application/buildGraphFromSourcesPayload';
import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';
import { diagnoseInboundSnapshotMessage } from './graphSnapshotDiagnostics';
import { GraphCanvas } from './graph3d/GraphCanvas';
import { GraphPresetToggles } from './GraphPresetToggles';
import { GraphMessageType } from './messages';
import {
  isSourcesSnapshotPayload,
  type SourcesSnapshotPayload,
} from '../../../sidebar/bridge/sourceDescriptor';
import { getVscodeApi } from '../../../webview-shared/api';

export function GraphApp(): JSX.Element {
  const [snapshot, setSnapshot] = useState<SourcesSnapshotPayload | null>(null);
  const [inboundCount, setInboundCount] = useState(0);
  const [lastDiag, setLastDiag] = useState<ReturnType<
    typeof diagnoseInboundSnapshotMessage
  > | null>(null);
  const [mountTime] = useState(() => new Date().toISOString());

  useEffect(() => {
    const vscode = getVscodeApi();
    vscode?.postMessage({ type: GraphMessageType.WebviewReady });
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const data = event.data as { type?: string; payload?: unknown };
      if (data?.type !== GraphMessageType.Snapshot) {
        return;
      }
      setInboundCount((c) => c + 1);
      const diag = diagnoseInboundSnapshotMessage(data);
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
      r.presets.forEach((p) => s.add(p));
    });
    return [...s].sort();
  }, [snapshot]);

  const [enabledPresetOverride, setEnabledPresetOverride] = useState<ReadonlySet<string> | null>(
    null
  );

  const effectiveEnabledPresets = enabledPresetOverride;

  const model = useMemo(
    () => buildGraphFromSourcesPayload(snapshot, { enabledPresets: effectiveEnabledPresets }),
    [snapshot, effectiveEnabledPresets]
  );

  const isPresetEnabled = useCallback(
    (pid: string): boolean =>
      effectiveEnabledPresets === null || effectiveEnabledPresets.has(pid),
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

  return (
    <div className="akashi-graph-app">
      <header className="akashi-graph-toolbar">
        <GraphPresetToggles
          presetIds={snapshotPresetIds}
          isPresetEnabled={isPresetEnabled}
          onToggle={onTogglePreset}
        />
        <span className="akashi-graph-status">{statusText}</span>
      </header>
      <div className="akashi-graph-scene">
        <GraphScene
          nodes={model.nodes}
          edges={model.edges}
          emptyHint={buildEmptyHint(snapshot, model, {
            allPresetsHidden:
              !!snapshot &&
              snapshot.records.length > 0 &&
              snapshotPresetIds.length > 0 &&
              effectiveEnabledPresets !== null &&
              effectiveEnabledPresets.size === 0,
            noPresetsOnRecords:
              !!snapshot &&
              snapshot.records.length > 0 &&
              snapshotPresetIds.length === 0,
          })}
        />
      </div>
      <details className="akashi-graph-debug">
        <summary className="akashi-graph-debug-summary">Graph debug</summary>
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
              No <code>graph/snapshot</code> message received yet.
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
          {inboundCount === 0 ? (
            <p className="akashi-graph-debug-line akashi-graph-debug-hint">
              <strong>No snapshot yet.</strong> The host may have posted before this webview
              subscribed — we send <code>graph/webviewReady</code> on load to request a resend.
              Check Output → Akashi for <code>[Akashi][Graph]</code> lines.
            </p>
          ) : null}
          {model.nodes.length > 0 ? (
            <p className="akashi-graph-debug-line akashi-graph-debug-hint">
              <strong>Data pipeline OK.</strong> Orbit with mouse (drag / scroll). If the view looks
              empty, resize the panel once — the canvas needs a non-zero size to render WebGL.
            </p>
          ) : null}
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
    return 'Waiting for index data. Run “Index sources” in the Akashi sidebar, then open the graph again.';
  }
  if (snapshot.records.length === 0) {
    return 'Snapshot has 0 records after preset filter. Adjust Akashi presets or index again.';
  }
  if (opts?.allPresetsHidden) {
    return 'All presets are hidden. Turn on at least one preset toggle above.';
  }
  if (opts?.noPresetsOnRecords) {
    return 'No preset tags on indexed records; the graph needs presets on each source.';
  }
  return 'Graph builder returned no nodes (unexpected). See Graph debug below.';
}

/** Isolate R3F Canvas remount when graph empties vs populated to reset GL context cleanly. */
function GraphScene({
  nodes,
  edges,
  emptyHint,
}: {
  nodes: GraphNode3D[];
  edges: GraphEdge3D[];
  emptyHint: string | null;
}): JSX.Element {
  const key = nodes.length === 0 ? 'empty' : 'graph';
  return <GraphCanvas key={key} nodes={nodes} edges={edges} emptyHint={emptyHint} />;
}
