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

export type SidebarFsRequestMessage =
  | SourcesFsRenameRequestMessage
  | SourcesFsDeleteRequestMessage
  | SourcesFsCreateFileRequestMessage;
