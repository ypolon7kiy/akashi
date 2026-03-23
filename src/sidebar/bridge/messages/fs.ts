/**
 * File-system sidebar ↔ host message types (`workspace.fs.*`).
 */

export const SidebarFsMessageType = {
  /** Rename or move a file/directory (`workspace.fs.rename`). */
  SourcesFsRename: 'sources/fsRename',
  /** Delete a file or directory (`workspace.fs.delete`). */
  SourcesFsDelete: 'sources/fsDelete',
  /** Create an empty file under a folder (`workspace.fs.writeFile`). */
  SourcesFsCreateFile: 'sources/fsCreateFile',
  /** Create a preset-aware artifact file with starter content. */
  SourcesFsCreateArtifact: 'sources/fsCreateArtifact',
} as const;

/** When `confirmDragAndDrop` is true, host honors `explorer.confirmDragAndDrop` before applying. */
export interface SourcesFsRenameRequestMessage {
  type: typeof SidebarFsMessageType.SourcesFsRename;
  requestId: string;
  payload: {
    fromPath: string;
    toPath: string;
    confirmDragAndDrop?: boolean;
  };
}

export interface SourcesFsDeleteRequestMessage {
  type: typeof SidebarFsMessageType.SourcesFsDelete;
  requestId: string;
  payload: {
    path: string;
    isDirectory: boolean;
  };
}

export interface SourcesFsCreateFileRequestMessage {
  type: typeof SidebarFsMessageType.SourcesFsCreateFile;
  requestId: string;
  payload: {
    parentPath: string;
    fileName: string;
  };
}

export interface SourcesFsCreateArtifactRequestMessage {
  type: typeof SidebarFsMessageType.SourcesFsCreateArtifact;
  requestId: string;
  payload: {
    /**
     * Exact id from `ArtifactTemplate.id` — validated host-side against the registry.
     * Sending the id (not a resolved path) prevents path traversal from the webview.
     */
    templateId: string;
    /** User-entered name without extension. Host appends `suggestedExtension`. */
    fileName: string;
    /** Absolute workspace root for workspace-scoped templates; `''` for user-scoped. */
    workspaceRoot: string;
  };
}

export type SidebarFsRequestMessage =
  | SourcesFsRenameRequestMessage
  | SourcesFsDeleteRequestMessage
  | SourcesFsCreateFileRequestMessage
  | SourcesFsCreateArtifactRequestMessage;
