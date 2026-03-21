import type { SourcesSnapshotPayload } from '../../../../shared/types/sourcesSnapshotPayload';
import type { Graph2DWebviewPersistedState } from './graph2dViewSettings';

export const Graph2DMessageType = {
  Snapshot: 'graph2d/snapshot',
  ViewSettings: 'graph2d/viewSettings',
  SaveViewSettings: 'graph2d/saveViewSettings',
  WebviewReady: 'graph2d/webviewReady',
  OpenPath: 'graph2d/openPath',
  CopyPath: 'graph2d/copyPath',
} as const;

export interface Graph2DSnapshotMessage {
  type: typeof Graph2DMessageType.Snapshot;
  payload: SourcesSnapshotPayload | null;
}

export interface Graph2DViewSettingsMessage {
  type: typeof Graph2DMessageType.ViewSettings;
  payload: Graph2DWebviewPersistedState;
}
