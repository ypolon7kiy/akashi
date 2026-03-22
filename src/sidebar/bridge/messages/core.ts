/**
 * Non–file-system sidebar ↔ host message types.
 */

import type { SourcesSnapshotPayload } from '../sourceDescriptor';

export const SidebarCoreMessageType = {
  SourcesOpenPath: 'sources/openPath',
  SourcesRevealInExplorer: 'sources/revealInExplorer',
  /** Wire string matches workbench command id `revealFileInOS` (capital OS). */
  SourcesRevealFileInOs: 'sources/revealFileInOS',
  SourcesIndexWorkspaceRequest: 'sources/indexWorkspace',
  SourcesGetSnapshotRequest: 'sources/getSnapshot',
  SourcesResponse: 'sources/response',
  /** Host → webview: filtered snapshot when presets change (no request id). */
  SourcesSnapshotPush: 'sources/snapshotPush',
  /** Host → webview: title-bar refresh / long index; drives progress UI without an RPC round-trip. */
  SourcesIndexingState: 'sources/indexingState',
} as const;

/** Triggers a full workspace index; indexing options come from workspace settings (`akashi.presets`, `akashi.includeHomeConfig`, `akashi.homePathOverrides`). */
export interface SourcesIndexWorkspaceRequestMessage {
  type: typeof SidebarCoreMessageType.SourcesIndexWorkspaceRequest;
  /** UUID v4; use `newRequestId()` from webview-shared if posting manually. */
  requestId: string;
}

export interface SourcesGetSnapshotRequestMessage {
  type: typeof SidebarCoreMessageType.SourcesGetSnapshotRequest;
  requestId: string;
}

/** Open a source file in the editor (internal webview → host; not a contributed command). */
export interface SourcesOpenPathMessage {
  type: typeof SidebarCoreMessageType.SourcesOpenPath;
  payload: {
    path: string;
  };
}

export interface SourcesRevealInExplorerMessage {
  type: typeof SidebarCoreMessageType.SourcesRevealInExplorer;
  payload: { path: string };
}

export interface SourcesRevealFileInOsMessage {
  type: typeof SidebarCoreMessageType.SourcesRevealFileInOs;
  payload: { path: string };
}

export interface SourcesResponseMessage {
  type: typeof SidebarCoreMessageType.SourcesResponse;
  /** Echo of the request’s UUID v4. */
  requestId: string;
  ok: boolean;
  payload?: unknown;
  error?: string;
}

export interface SourcesSnapshotPushMessage {
  type: typeof SidebarCoreMessageType.SourcesSnapshotPush;
  payload: SourcesSnapshotPayload | null;
}

export interface SourcesIndexingStateMessage {
  type: typeof SidebarCoreMessageType.SourcesIndexingState;
  busy: boolean;
}

export type SidebarCoreRequestMessage =
  | SourcesIndexWorkspaceRequestMessage
  | SourcesGetSnapshotRequestMessage
  | SourcesOpenPathMessage
  | SourcesRevealInExplorerMessage
  | SourcesRevealFileInOsMessage;
