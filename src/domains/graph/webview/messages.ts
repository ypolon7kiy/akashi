import type { SourcesSnapshotPayload } from '../../../sidebar/bridge/sourceDescriptor';

export const GraphMessageType = {
  /** Host → webview: latest sources snapshot for graph. */
  Snapshot: 'graph/snapshot',
  /** Webview → host: webview finished loading; host should re-send snapshot (avoids early postMessage race). */
  WebviewReady: 'graph/webviewReady',
  /** Webview → host: open file or reveal folder. */
  OpenPath: 'graph/openPath',
  /** Webview → host: copy path to clipboard. */
  CopyPath: 'graph/copyPath',
} as const;

export interface GraphSnapshotMessage {
  type: typeof GraphMessageType.Snapshot;
  payload: SourcesSnapshotPayload | null;
}

export interface GraphOpenPathMessage {
  type: typeof GraphMessageType.OpenPath;
  payload: { path: string };
}

export interface GraphCopyPathMessage {
  type: typeof GraphMessageType.CopyPath;
  payload: { path: string };
}
