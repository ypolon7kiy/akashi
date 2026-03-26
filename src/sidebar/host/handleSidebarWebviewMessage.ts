import * as vscode from 'vscode';
import type { ConfigDomain } from '../../domains/config';
import type { SerializedSourceSearchQuery } from '../../domains/search/domain/model';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import { appendLine } from '../../log';
import {
  SidebarMessageType,
  type SidebarRequestMessage,
  type SourcesResponseMessage,
} from '../bridge/messages';
import {
  handleSidebarFsBatchDelete,
  handleSidebarFsCreateFile,
  handleSidebarFsDelete,
  handleSidebarFsRename,
} from './fs/handleSourcesFsRequest';
import {
  parseInboundSourcesFsBatchDelete,
  parseInboundSourcesFsCreateFile,
  parseInboundSourcesFsDelete,
  parseInboundSourcesFsRename,
} from './fs/sidebarInboundFsPayload';
import { revealPathInExplorer, revealPathInFileOs } from './revealPathInWorkbench';
import {
  logInboundSidebarMessage,
  logSourcesCommand,
  logSourcesResponse,
  postSourcesResponse,
} from './sidebarHostMessagingLog';
import type { SidebarSourcesHostActions } from './sidebarSourcesHostActions';
import { snapshotWorkspaceFolders } from './sidebarWorkspaceFolders';
import { buildSourcesSnapshotPayload } from './sources/sourcesSnapshotPayload';

export interface HandleSidebarWebviewMessageContext {
  sourcesService: SourcesService;
  configDomain: ConfigDomain;
  actions: SidebarSourcesHostActions;
  notifyFilterChanged?: (matchedPaths: readonly string[] | null) => void;
  saveFilterState?: (query: SerializedSourceSearchQuery) => void;
  getSavedFilterState?: () => SerializedSourceSearchQuery | null;
}

export async function handleSidebarWebviewMessage(
  webview: vscode.Webview,
  message: unknown,
  ctx: HandleSidebarWebviewMessageContext
): Promise<void> {
  const { sourcesService, configDomain, actions } = ctx;
  const { getActiveSourcePresets, getIncludeHomeConfig, workbenchFsSettings } = configDomain;
  logInboundSidebarMessage(message, getIncludeHomeConfig);
  const typedMessage = message as SidebarRequestMessage;

  if (typedMessage?.type === SidebarMessageType.SourcesOpenPath) {
    const filePath = typedMessage.payload?.path;
    if (typeof filePath === 'string' && filePath.length > 0) {
      try {
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        appendLine(
          `[Akashi] Sidebar: openPath failed pathLength=${filePath.length} ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return;
  }

  if (typedMessage?.type === SidebarMessageType.SourcesRevealInExplorer) {
    await revealPathInExplorer(typedMessage.payload?.path);
    return;
  }

  if (typedMessage?.type === SidebarMessageType.SourcesRevealFileInOs) {
    await revealPathInFileOs(typedMessage.payload?.path);
    return;
  }

  if (typedMessage?.type === SidebarMessageType.SourcesFilterChanged) {
    const p = typedMessage.payload;
    if (p === null || Array.isArray(p)) {
      ctx.notifyFilterChanged?.(p);
    }
    return;
  }

  if (typedMessage?.type === SidebarMessageType.SourcesSaveFilterState) {
    const p = typedMessage.payload;
    if (p !== null && typeof p === 'object' && !Array.isArray(p)) {
      ctx.saveFilterState?.(p);
    }
    return;
  }

  const requestId = (typedMessage as { requestId?: string }).requestId;
  if (!requestId) {
    return;
  }

  try {
    if (typedMessage.type === SidebarMessageType.SourcesGetSnapshotRequest) {
      logSourcesCommand(typedMessage.type, requestId);
      const result = await sourcesService.getLastSnapshot();
      const payload = buildSourcesSnapshotPayload(
        result,
        snapshotWorkspaceFolders(),
        getActiveSourcePresets
      );
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: true,
        payload,
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(
        response,
        result ? `sourceCount=${payload?.sourceCount ?? 0} (filtered)` : 'sourceCount=0'
      );
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesGetFilterStateRequest) {
      logSourcesCommand(typedMessage.type, requestId);
      const saved = ctx.getSavedFilterState?.() ?? null;
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: true,
        payload: saved,
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response);
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesIndexWorkspaceRequest) {
      const includeHome = getIncludeHomeConfig();
      logSourcesCommand(typedMessage.type, requestId, {
        includeHomeConfig: includeHome,
      });
      await actions.refreshSourcesIndexFromHost();
      const result = await sourcesService.getLastSnapshot();
      const payload = buildSourcesSnapshotPayload(
        result,
        snapshotWorkspaceFolders(),
        getActiveSourcePresets
      );
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: true,
        payload,
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response, `sourceCount=${payload?.sourceCount ?? 0} (filtered)`);
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesFsRename) {
      logSourcesCommand(typedMessage.type, requestId);
      const parsed = parseInboundSourcesFsRename(message);
      if (!parsed) {
        await postSourcesResponse(webview, {
          type: SidebarMessageType.SourcesResponse,
          requestId,
          ok: false,
          error: 'Invalid rename payload',
        });
        return;
      }
      const result = await handleSidebarFsRename(
        {
          fromPath: parsed.fromPath,
          toPath: parsed.toPath,
          confirmDragAndDrop: parsed.confirmDragAndDrop,
        },
        workbenchFsSettings
      );
      await actions.completeSidebarFsMutation(webview, requestId, result);
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesFsDelete) {
      logSourcesCommand(typedMessage.type, requestId);
      const parsed = parseInboundSourcesFsDelete(message);
      if (!parsed) {
        await postSourcesResponse(webview, {
          type: SidebarMessageType.SourcesResponse,
          requestId,
          ok: false,
          error: 'Invalid delete payload',
        });
        return;
      }
      const result = await handleSidebarFsDelete(
        {
          path: parsed.path,
          isDirectory: parsed.isDirectory,
        },
        workbenchFsSettings
      );
      await actions.completeSidebarFsMutation(webview, requestId, result);
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesFsBatchDelete) {
      logSourcesCommand(typedMessage.type, requestId);
      const parsed = parseInboundSourcesFsBatchDelete(message);
      if (!parsed) {
        await postSourcesResponse(webview, {
          type: SidebarMessageType.SourcesResponse,
          requestId,
          ok: false,
          error: 'Invalid batch delete payload',
        });
        return;
      }
      const result = await handleSidebarFsBatchDelete({ items: parsed.items }, workbenchFsSettings);
      await actions.completeSidebarFsMutation(webview, requestId, result);
      return;
    }

    if (typedMessage.type === SidebarMessageType.SourcesFsCreateFile) {
      logSourcesCommand(typedMessage.type, requestId);
      const parsed = parseInboundSourcesFsCreateFile(message);
      if (!parsed) {
        await postSourcesResponse(webview, {
          type: SidebarMessageType.SourcesResponse,
          requestId,
          ok: false,
          error: 'Invalid create file payload',
        });
        return;
      }
      const result = await handleSidebarFsCreateFile({
        parentPath: parsed.parentPath,
        fileName: parsed.fileName,
      });
      await actions.completeSidebarFsMutation(webview, requestId, result);
      return;
    }
  } catch (error) {
    const response: SourcesResponseMessage = {
      type: SidebarMessageType.SourcesResponse,
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    await postSourcesResponse(webview, response);
    logSourcesResponse(response);
  }
}
