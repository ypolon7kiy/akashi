import type { SourcesSnapshotPayload } from '../../../sidebar/bridge/sourceDescriptor';
import type { GraphWebviewPersistedState } from './graphViewSettings';

export const GraphMessageType = {
  /** Host → webview: latest sources snapshot for graph. */
  Snapshot: 'graph/snapshot',
  /** Host → webview: persisted graph UI settings from extension globalState. */
  ViewSettings: 'graph/viewSettings',
  /** Webview → host: persist graph UI settings to extension globalState. */
  SaveViewSettings: 'graph/saveViewSettings',
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

export interface GraphViewSettingsMessage {
  type: typeof GraphMessageType.ViewSettings;
  payload: GraphWebviewPersistedState;
}

export interface GraphSaveViewSettingsMessage {
  type: typeof GraphMessageType.SaveViewSettings;
  payload: GraphWebviewPersistedState;
}
