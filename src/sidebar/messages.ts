/**
 * Sidebar → extension host message types.
 * Single source of truth for the sidebar webview and SidebarViewProvider.
 */

export const SidebarMessageType = {
  ShowExamplePanel: 'showExamplePanel',
  SourcesOpenPath: 'sources/openPath',
  SourcesIndexWorkspaceRequest: 'sources/indexWorkspace',
  SourcesGetSnapshotRequest: 'sources/getSnapshot',
  SourcesListRequest: 'sources/list',
  SourcesGetByIdRequest: 'sources/getById',
  SourcesResponse: 'sources/response',
} as const;

export type SidebarMessageKind = (typeof SidebarMessageType)[keyof typeof SidebarMessageType];

/** Triggers a full workspace index; no filters or options in the message. */
export interface SourcesIndexWorkspaceRequestMessage {
  type: typeof SidebarMessageType.SourcesIndexWorkspaceRequest;
  /** UUID v4; use `newRequestId()` from webview-shared if posting manually. */
  requestId: string;
  payload?: {
    includeHomeConfig?: boolean;
  };
}

/** Returns all sources from the current index (re-indexes if needed); no filters in the message. */
export interface SourcesListRequestMessage {
  type: typeof SidebarMessageType.SourcesListRequest;
  /** UUID v4; use `newRequestId()` from webview-shared if posting manually. */
  requestId: string;
}

export interface SourcesGetByIdRequestMessage {
  type: typeof SidebarMessageType.SourcesGetByIdRequest;
  /** UUID v4; use `newRequestId()` from webview-shared if posting manually. */
  requestId: string;
  payload: {
    sourceId: string;
  };
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

export type SidebarRequestMessage =
  | SourcesIndexWorkspaceRequestMessage
  | SourcesGetSnapshotRequestMessage
  | SourcesListRequestMessage
  | SourcesGetByIdRequestMessage
  | SourcesOpenPathMessage
  | { type: typeof SidebarMessageType.ShowExamplePanel };
