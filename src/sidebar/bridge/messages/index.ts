/**
 * Sidebar ↔ extension host message types.
 * Single source of truth for the sidebar webview and SidebarViewProvider.
 */

import { SidebarCoreMessageType, type SidebarCoreRequestMessage } from './core';
import { SidebarFsMessageType, type SidebarFsRequestMessage } from './fs';

export const SidebarMessageType = {
  ...SidebarCoreMessageType,
  ...SidebarFsMessageType,
} as const;

export type SidebarMessageKind = (typeof SidebarMessageType)[keyof typeof SidebarMessageType];

export type SidebarRequestMessage = SidebarCoreRequestMessage | SidebarFsRequestMessage;

export {
  type SourcesFsCreateFileRequestMessage,
  type SourcesFsDeleteRequestMessage,
  type SourcesFsRenameRequestMessage,
  type SidebarFsRequestMessage,
  SidebarFsMessageType,
} from './fs';

export {
  type SourcesGetFilterStateRequestMessage,
  type SourcesGetSnapshotRequestMessage,
  type SourcesIndexingStateMessage,
  type SourcesIndexWorkspaceRequestMessage,
  type SourcesOpenPathMessage,
  type SourcesResponseMessage,
  type SourcesRevealFileInOsMessage,
  type SourcesRevealInExplorerMessage,
  type SourcesSaveFilterStateMessage,
  type SourcesSnapshotPushMessage,
  type SidebarCoreRequestMessage,
  SidebarCoreMessageType,
} from './core';
