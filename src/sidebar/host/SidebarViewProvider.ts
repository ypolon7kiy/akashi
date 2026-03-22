import { statSync } from 'node:fs';
import * as vscode from 'vscode';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import type { ActiveSourcePresetsGetter } from '../../domains/sources/domain/sourcePresets';
import { readIncludeHomeConfig } from '../../domains/sources/infrastructure/vscodeSourcesIncludeHome';
import { appendLine } from '../../log';
import type { WorkspaceFolderInfo } from '../bridge/sourceDescriptor';
import {
  SidebarMessageType,
  type SidebarRequestMessage,
  type SourcesResponseMessage,
} from '../bridge/messages';
import { buildSidebarCategoryColorStyleBlock } from './styling/sidebarCategoryColorStyle';
import {
  handleSidebarFsCreateFile,
  handleSidebarFsDelete,
  handleSidebarFsRename,
  SIDEBAR_FS_CANCELLED,
} from './fs/handleSourcesFsRequest';
import {
  parseInboundSourcesFsCreateFile,
  parseInboundSourcesFsDelete,
  parseInboundSourcesFsRename,
} from './fs/sidebarInboundFsPayload';
import { revealPathInExplorer, revealPathInFileOs } from './revealPathInWorkbench';
import { buildSourcesSnapshotPayload } from './sources/sourcesSnapshotPayload';

function codiconsDistRoot(extensionUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist');
}

/** Bust webview cache when bundle files change (mtime updates on each esbuild). */
function sidebarBundleCacheQuery(extensionUri: vscode.Uri): string {
  try {
    const dir = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar');
    const jsM = statSync(vscode.Uri.joinPath(dir, 'sidebar-main.js').fsPath).mtimeMs;
    const cssM = statSync(vscode.Uri.joinPath(dir, 'sidebar-main.css').fsPath).mtimeMs;
    return `?v=${Math.floor(Math.max(jsM, cssM))}`;
  } catch {
    return '';
  }
}

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const cacheQ = sidebarBundleCacheQuery(extensionUri);
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.js')
  );
  // esbuild emits CSS as a sibling file; it must be linked — importing CSS in TS only produces sidebar-main.css, it is not inlined into JS.
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.css')
  );
  const codiconCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(codiconsDistRoot(extensionUri), 'codicon.css')
  );
  const categoryColorStyle = buildSidebarCategoryColorStyleBlock();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <title>Akashi Sidebar</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}${cacheQ}">
  ${categoryColorStyle}
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}${cacheQ}"></script>
</body>
</html>`;
}

export interface SidebarViewProviderOptions {
  /** Called after the sidebar (and filtered snapshot) has been updated — e.g. refresh graph panel. */
  onAfterSourcesSnapshotRefreshed?: () => void;
}

export function createSidebarViewProvider(
  context: vscode.ExtensionContext,
  sourcesService: SourcesService,
  getActiveSourcePresets: ActiveSourcePresetsGetter,
  options?: SidebarViewProviderOptions
): vscode.WebviewViewProvider {
  const notifySnapshotRefreshed = (): void => {
    try {
      options?.onAfterSourcesSnapshotRefreshed?.();
    } catch (err) {
      appendLine(
        `[Akashi] Sidebar: onAfterSourcesSnapshotRefreshed failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
  let activeView: vscode.WebviewView | undefined;

  async function postFilteredSnapshotPush(webview: vscode.Webview): Promise<void> {
    const snap = await sourcesService.getLastSnapshot();
    const payload = buildSourcesSnapshotPayload(
      snap,
      snapshotWorkspaceFolders(),
      getActiveSourcePresets
    );
    await webview.postMessage({
      type: SidebarMessageType.SourcesSnapshotPush,
      payload,
    });
  }

  /** Shared path: full index, push snapshot to sidebar webview if visible, notify graph. */
  async function refreshSourcesIndexFromHost(opts?: {
    notifyWebviewBusy?: boolean;
  }): Promise<void> {
    const w = activeView?.webview;
    const showBusy = Boolean(opts?.notifyWebviewBusy && w);
    if (showBusy) {
      await w!.postMessage({ type: SidebarMessageType.SourcesIndexingState, busy: true });
    }
    try {
      await sourcesService.indexWorkspace({ includeHomeConfig: readIncludeHomeConfig() });
      if (w) {
        await postFilteredSnapshotPush(w);
      }
      notifySnapshotRefreshed();
    } finally {
      if (showBusy) {
        await w!.postMessage({ type: SidebarMessageType.SourcesIndexingState, busy: false });
      }
    }
  }

  type FsHandlerResult = { ok: true } | { ok: false; error: string };

  async function completeSidebarFsMutation(
    webview: vscode.Webview,
    requestId: string,
    result: FsHandlerResult
  ): Promise<void> {
    if (!result.ok && result.error === SIDEBAR_FS_CANCELLED) {
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: true,
        payload: { cancelled: true },
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response);
      return;
    }
    if (!result.ok) {
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: false,
        error: result.error,
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response);
      return;
    }
    await refreshSourcesIndexFromHost();
    const response: SourcesResponseMessage = {
      type: SidebarMessageType.SourcesResponse,
      requestId,
      ok: true,
    };
    await postSourcesResponse(webview, response);
    logSourcesResponse(response);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('akashi.sources.refresh', async () => {
      try {
        await refreshSourcesIndexFromHost({ notifyWebviewBusy: true });
      } catch (err) {
        appendLine(
          `[Akashi][Sources] Refresh source index command failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    const sidebarDist = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'sidebar');
    const bundleWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(sidebarDist, 'sidebar-main.*')
    );
    const refreshSidebarHtml = (): void => {
      const w = activeView?.webview;
      if (w) {
        w.html = getHtml(w, context.extensionUri);
        appendLine('[Akashi] Sidebar: webview HTML refreshed after bundle change.');
      }
    };
    bundleWatcher.onDidChange(refreshSidebarHtml);
    bundleWatcher.onDidCreate(refreshSidebarHtml);
    context.subscriptions.push(bundleWatcher);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      const affectsIndexing =
        e.affectsConfiguration('akashi.presets') ||
        e.affectsConfiguration('akashi.includeHomeConfig') ||
        e.affectsConfiguration('akashi.homePathOverrides');
      if (!affectsIndexing) {
        return;
      }
      const w = activeView?.webview;
      if (!w) {
        return;
      }
      void (async () => {
        try {
          await sourcesService.indexWorkspace({ includeHomeConfig: readIncludeHomeConfig() });
        } catch (err) {
          appendLine(
            `[Akashi][Sources] Re-index after sources settings change failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
        await postFilteredSnapshotPush(w);
        notifySnapshotRefreshed();
      })();
    })
  );

  return {
    resolveWebviewView(
      webviewView: vscode.WebviewView,
      _resolveContext: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ): void {
      appendLine('[Akashi] Sidebar: view resolving.');

      const extensionUri = context.extensionUri;
      activeView = webviewView;
      webviewView.onDidDispose(() => {
        if (activeView === webviewView) {
          activeView = undefined;
        }
      });

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar'),
          codiconsDistRoot(extensionUri),
        ],
      };

      webviewView.webview.html = getHtml(webviewView.webview, extensionUri);

      webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
        logInboundSidebarMessage(message);
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
            await postSourcesResponse(webviewView.webview, response);
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
            await refreshSourcesIndexFromHost();
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
            await postSourcesResponse(webviewView.webview, response);
            logSourcesResponse(response, `sourceCount=${payload?.sourceCount ?? 0} (filtered)`);
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesFsRename) {
            logSourcesCommand(typedMessage.type, requestId);
            const parsed = parseInboundSourcesFsRename(message);
            if (!parsed) {
              await postSourcesResponse(webviewView.webview, {
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
            await completeSidebarFsMutation(webviewView.webview, requestId, result);
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesFsDelete) {
            logSourcesCommand(typedMessage.type, requestId);
            const parsed = parseInboundSourcesFsDelete(message);
            if (!parsed) {
              await postSourcesResponse(webviewView.webview, {
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
            await completeSidebarFsMutation(webviewView.webview, requestId, result);
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesFsCreateFile) {
            logSourcesCommand(typedMessage.type, requestId);
            const parsed = parseInboundSourcesFsCreateFile(message);
            if (!parsed) {
              await postSourcesResponse(webviewView.webview, {
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
            await completeSidebarFsMutation(webviewView.webview, requestId, result);
            return;
          }
        } catch (error) {
          const response: SourcesResponseMessage = {
            type: SidebarMessageType.SourcesResponse,
            requestId,
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          await postSourcesResponse(webviewView.webview, response);
          logSourcesResponse(response);
        }
      });
    },
  };
}

async function postSourcesResponse(
  webview: vscode.Webview,
  response: SourcesResponseMessage
): Promise<void> {
  await webview.postMessage(response);
}

function logSourcesCommand(
  type: string,
  requestId: string,
  details?: Record<string, unknown>
): void {
  const detailsSuffix = details ? ` details=${JSON.stringify(details)}` : '';
  appendLine(`[Akashi][Sources] Command ${type} requestId=${requestId}${detailsSuffix}`);
}

function logSourcesResponse(response: SourcesResponseMessage, summary?: string): void {
  const summarySuffix = summary ? ` ${summary}` : '';
  if (response.ok) {
    appendLine(`[Akashi][Sources] Response ok requestId=${response.requestId}${summarySuffix}`);
    return;
  }
  appendLine(
    `[Akashi][Sources] Response error requestId=${response.requestId} message=${response.error ?? 'unknown'}`
  );
}

function snapshotWorkspaceFolders(): WorkspaceFolderInfo[] {
  return (
    vscode.workspace.workspaceFolders?.map((f) => ({
      name: f.name,
      path: f.uri.fsPath,
    })) ?? []
  );
}

function logInboundSidebarMessage(message: unknown): void {
  if (!message || typeof message !== 'object') {
    appendLine('[Akashi] Sidebar: received non-object message');
    return;
  }
  const m = message as Record<string, unknown>;
  const type = typeof m.type === 'string' ? m.type : '?';
  if (
    type === SidebarMessageType.SourcesOpenPath ||
    type === SidebarMessageType.SourcesRevealInExplorer ||
    type === SidebarMessageType.SourcesRevealFileInOs
  ) {
    const p = (m.payload as { path?: unknown } | undefined)?.path;
    const pathLen = typeof p === 'string' ? p.length : 0;
    appendLine(`[Akashi] Sidebar: received message type=${type} pathLength=${pathLen}`);
    return;
  }
  const requestId = typeof m.requestId === 'string' ? m.requestId : undefined;
  if (requestId) {
    const parts: string[] = [];
    if (type === SidebarMessageType.SourcesIndexWorkspaceRequest) {
      parts.push(`includeHomeConfig=${readIncludeHomeConfig()}`);
    }
    const extra = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    appendLine(`[Akashi] Sidebar: received message type=${type} requestId=${requestId}${extra}`);
    return;
  }
  appendLine(`[Akashi] Sidebar: received message type=${type}`);
}
