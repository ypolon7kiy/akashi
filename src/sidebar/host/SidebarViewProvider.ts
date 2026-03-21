import * as vscode from 'vscode';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import { ExamplePanel } from '../../domains/example/ui/webview/ExamplePanel';
import type { IndexedSourceEntry, SourceIndexSnapshot } from '../../domains/sources/domain/model';
import { presetsContainingKind } from '../../domains/sources/domain/sourcePresets';
import { readActiveSourcePresets } from '../../domains/sources/infrastructure/vscodeSourcePresetConfig';
import { appendLine } from '../../log';
import type {
  SourceDescriptor,
  SourcesSnapshotPayload,
  WorkspaceFolderInfo,
} from '../bridge/sourceDescriptor';
import {
  SidebarMessageType,
  type SidebarRequestMessage,
  type SourcesResponseMessage,
} from '../bridge/messages';
import { filterRecordsByPresets } from './sourcesPresetFilter';

function codiconsDistRoot(extensionUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist');
}

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource}; font-src ${webview.cspSource};">
  <title>Akashi Sidebar</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
}

export function createSidebarViewProvider(
  context: vscode.ExtensionContext,
  sourcesService: SourcesService
): vscode.WebviewViewProvider {
  let activeView: vscode.WebviewView | undefined;
  /** Last successful sidebar index request; used when re-indexing after preset changes. */
  let lastIncludeHomeConfig = false;

  async function postFilteredSnapshotPush(webview: vscode.Webview): Promise<void> {
    const snap = await sourcesService.getLastSnapshot();
    const payload = buildSourcesSnapshotPayload(snap, snapshotWorkspaceFolders());
    await webview.postMessage({
      type: SidebarMessageType.SourcesSnapshotPush,
      payload,
    });
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('akashi.sources.presets')) {
        return;
      }
      const w = activeView?.webview;
      if (!w) {
        return;
      }
      void (async () => {
        try {
          await sourcesService.indexWorkspace({ includeHomeConfig: lastIncludeHomeConfig });
        } catch (err) {
          appendLine(
            `[Akashi][Sources] Re-index after preset change failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
        await postFilteredSnapshotPush(w);
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
        appendLine('[Akashi] Sidebar: received message ' + JSON.stringify(message));
        const typedMessage = message as SidebarRequestMessage;
        if (typedMessage?.type === SidebarMessageType.ShowExamplePanel) {
          appendLine('[Akashi] Sidebar: Show example panel requested.');
          ExamplePanel.createOrShow(context);
          return;
        }

        if (typedMessage?.type === SidebarMessageType.SourcesOpenPath) {
          const filePath = typedMessage.payload?.path;
          if (typeof filePath === 'string' && filePath.length > 0) {
            try {
              const uri = vscode.Uri.file(filePath);
              const doc = await vscode.workspace.openTextDocument(uri);
              await vscode.window.showTextDocument(doc);
            } catch (error) {
              appendLine(
                `[Akashi] Sidebar: openPath failed path=${filePath} ${error instanceof Error ? error.message : String(error)}`
              );
            }
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
            const payload = buildSourcesSnapshotPayload(result, snapshotWorkspaceFolders());
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
            const includeHome = typedMessage.payload?.includeHomeConfig ?? false;
            lastIncludeHomeConfig = includeHome;
            logSourcesCommand(typedMessage.type, requestId, {
              includeHomeConfig: includeHome,
            });
            const result = await sourcesService.indexWorkspace({
              includeHomeConfig: includeHome,
            });
            const payload = buildSourcesSnapshotPayload(result, snapshotWorkspaceFolders());
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

function buildSourcesSnapshotPayload(
  snapshot: SourceIndexSnapshot | null,
  workspaceFolders: WorkspaceFolderInfo[]
): SourcesSnapshotPayload | null {
  if (!snapshot) {
    return null;
  }
  const active = readActiveSourcePresets();
  const filtered = filterRecordsByPresets(snapshot.records, active);
  return {
    generatedAt: snapshot.generatedAt,
    sourceCount: filtered.length,
    records: filtered.map(toSourceDescriptor),
    workspaceFolders,
  };
}

function toSourceDescriptor(record: IndexedSourceEntry): SourceDescriptor {
  return {
    id: record.id,
    path: record.path,
    kind: record.kind,
    presets: presetsContainingKind(record.kind),
    scope: record.scope,
    origin: record.origin,
    metadata: record.metadata,
  };
}
