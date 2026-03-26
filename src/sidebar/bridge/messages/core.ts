/**
 * Non–file-system sidebar ↔ host message types.
 */

import type { SerializedSourceSearchQuery } from '../../../domains/search/domain/model';
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
  /** Webview → host: sidebar filter state changed (fire-and-forget). */
  SourcesFilterChanged: 'sources/filterChanged',
  /** Webview → host: persist current filter state to globalState. */
  SourcesSaveFilterState: 'sources/saveFilterState',
  /** Webview → host (RPC): request saved filter state from globalState. */
  SourcesGetFilterStateRequest: 'sources/getFilterState',
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

/**
 * Sidebar webview → host: filter result (matched paths) changed.
 * `null` = no filter active (show all). Empty array = nothing matches (hide all).
 */
export interface SourcesFilterChangedMessage {
  type: typeof SidebarCoreMessageType.SourcesFilterChanged;
  payload: readonly string[] | null;
}

/** Sidebar webview → host: persist filter state to globalState. */
export interface SourcesSaveFilterStateMessage {
  type: typeof SidebarCoreMessageType.SourcesSaveFilterState;
  payload: SerializedSourceSearchQuery;
}

/** Webview → host (RPC): request saved filter state from globalState. */
export interface SourcesGetFilterStateRequestMessage {
  type: typeof SidebarCoreMessageType.SourcesGetFilterStateRequest;
  requestId: string;
}

export type SidebarCoreRequestMessage =
  | SourcesIndexWorkspaceRequestMessage
  | SourcesGetSnapshotRequestMessage
  | SourcesGetFilterStateRequestMessage
  | SourcesOpenPathMessage
  | SourcesRevealInExplorerMessage
  | SourcesRevealFileInOsMessage
  | SourcesFilterChangedMessage
  | SourcesSaveFilterStateMessage;
