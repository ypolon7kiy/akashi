/**
 * Sidebar ↔ extension host message types.
 * Single source of truth for the sidebar webview and SidebarViewProvider.
 */

import type { SourcesSnapshotPayload } from './sourceDescriptor';

export const SidebarMessageType = {
  OpenGraphPanel: 'sidebar/openGraphPanel',
  SourcesOpenPath: 'sources/openPath',
  SourcesIndexWorkspaceRequest: 'sources/indexWorkspace',
  SourcesGetSnapshotRequest: 'sources/getSnapshot',
  SourcesResponse: 'sources/response',
  /** Host → webview: filtered snapshot when presets change (no request id). */
  SourcesSnapshotPush: 'sources/snapshotPush',
} as const;

export type SidebarMessageKind = (typeof SidebarMessageType)[keyof typeof SidebarMessageType];

/** Triggers a full workspace index; indexing options come from workspace settings (`akashi.presets`, `akashi.includeHomeConfig`, `akashi.homePathOverrides`). */
export interface SourcesIndexWorkspaceRequestMessage {
  type: typeof SidebarMessageType.SourcesIndexWorkspaceRequest;
  /** UUID v4; use `newRequestId()` from webview-shared if posting manually. */
  requestId: string;
}

export interface SourcesGetSnapshotRequestMessage {
  type: typeof SidebarMessageType.SourcesGetSnapshotRequest;
  requestId: string;
}

/** Open a source file in the editor (internal webview → host; not a contributed command). */
export interface SourcesOpenPathMessage {
  type: typeof SidebarMessageType.SourcesOpenPath;
  payload: {
    path: string;
  };
}

export interface SourcesResponseMessage {
  type: typeof SidebarMessageType.SourcesResponse;
  /** Echo of the request’s UUID v4. */
  requestId: string;
  ok: boolean;
  payload?: unknown;
  error?: string;
}

export interface SourcesSnapshotPushMessage {
  type: typeof SidebarMessageType.SourcesSnapshotPush;
  payload: SourcesSnapshotPayload | null;
}

export type SidebarRequestMessage =
  | SourcesIndexWorkspaceRequestMessage
  | SourcesGetSnapshotRequestMessage
  | SourcesOpenPathMessage
  | { type: typeof SidebarMessageType.OpenGraphPanel };
