import * as vscode from 'vscode';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import type { ActiveSourcePresetsGetter } from '../../domains/sources/domain/sourcePresets';
import { readIncludeHomeConfig } from '../../domains/sources/infrastructure/vscodeSourcesIncludeHome';
import { appendLine } from '../../log';
import {
  SidebarMessageType,
  type SidebarRequestMessage,
  type SourcesResponseMessage,
} from '../bridge/messages';
import {
  handleSidebarFsCreateArtifact,
  handleSidebarFsCreateFile,
  handleSidebarFsDelete,
  handleSidebarFsRename,
} from './fs/handleSourcesFsRequest';
import {
  parseInboundSourcesFsCreateArtifact,
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
  getActiveSourcePresets: ActiveSourcePresetsGetter;
  actions: SidebarSourcesHostActions;
}

export async function handleSidebarWebviewMessage(
  webview: vscode.Webview,
  message: unknown,
  ctx: HandleSidebarWebviewMessageContext
): Promise<void> {
  logInboundSidebarMessage(message);
  const typedMessage = message as SidebarRequestMessage;
  const { sourcesService, getActiveSourcePresets, actions } = ctx;

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

    if (typedMessage.type === SidebarMessageType.SourcesIndexWorkspaceRequest) {
      const includeHome = readIncludeHomeConfig();
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
      const result = await handleSidebarFsRename({
        fromPath: parsed.fromPath,
        toPath: parsed.toPath,
        confirmDragAndDrop: parsed.confirmDragAndDrop,
      });
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
      const result = await handleSidebarFsDelete({
        path: parsed.path,
        isDirectory: parsed.isDirectory,
      });
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

    if (typedMessage.type === SidebarMessageType.SourcesFsCreateArtifact) {
      logSourcesCommand(typedMessage.type, requestId);
      const parsed = parseInboundSourcesFsCreateArtifact(message);
      if (!parsed) {
        await postSourcesResponse(webview, {
          type: SidebarMessageType.SourcesResponse,
          requestId,
          ok: false,
          error: 'Invalid create artifact payload',
        });
        return;
      }
      const result = await handleSidebarFsCreateArtifact({
        templateId: parsed.templateId,
        fileName: parsed.fileName,
        workspaceRoot: parsed.workspaceRoot,
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
