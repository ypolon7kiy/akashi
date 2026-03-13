import * as vscode from 'vscode';
import type { SourcesService } from '../domains/sources/application/SourcesService';
import { ExamplePanel } from '../domains/example/ui/webview/ExamplePanel';
import type { SourceRecord } from '../domains/sources/domain/model';
import { appendLine } from '../log';
import {
  SidebarMessageType,
  type SidebarRequestMessage,
  type SourcesResponseMessage,
} from './messages';

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.js')
  );
  // esbuild emits CSS as a sibling file; it must be linked — importing CSS in TS only produces sidebar-main.css, it is not inlined into JS.
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.css')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};">
  <title>Akashi Sidebar</title>
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
  return {
    resolveWebviewView(
      webviewView: vscode.WebviewView,
      _resolveContext: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ): void {
      appendLine('[Akashi] Sidebar: view resolving.');

      const extensionUri = context.extensionUri;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar')],
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

        const requestId = (typedMessage as { requestId?: string }).requestId;
        if (!requestId) {
          return;
        }

        try {
          if (typedMessage.type === SidebarMessageType.SourcesGetSnapshotRequest) {
            logSourcesCommand(typedMessage.type, requestId);
            const result = await sourcesService.getLastSnapshot();
            const response: SourcesResponseMessage = {
              type: SidebarMessageType.SourcesResponse,
              requestId,
              ok: true,
              payload: result
                ? {
                    generatedAt: result.generatedAt,
                    sourceCount: result.sourceCount,
                    records: result.records.map(toSourceDescriptor),
                  }
                : null,
            };
            await postSourcesResponse(webviewView.webview, response);
            logSourcesResponse(
              response,
              result ? `sourceCount=${result.sourceCount}` : 'sourceCount=0'
            );
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesIndexWorkspaceRequest) {
            logSourcesCommand(typedMessage.type, requestId, {
              includeHomeConfig: typedMessage.payload?.includeHomeConfig ?? false,
            });
            const result = await sourcesService.indexWorkspace({
              includeHomeConfig: typedMessage.payload?.includeHomeConfig,
            });
            const response: SourcesResponseMessage = {
              type: SidebarMessageType.SourcesResponse,
              requestId,
              ok: true,
              payload: {
                generatedAt: result.generatedAt,
                sourceCount: result.sourceCount,
                records: result.records.map(toSourceDescriptor),
              },
            };
            await postSourcesResponse(webviewView.webview, response);
            logSourcesResponse(response, `sourceCount=${result.sourceCount}`);
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesListRequest) {
            logSourcesCommand(typedMessage.type, requestId);
            const result = await sourcesService.listSources();
            const response: SourcesResponseMessage = {
              type: SidebarMessageType.SourcesResponse,
              requestId,
              ok: true,
              payload: result.map(toSourceDescriptor),
            };
            await postSourcesResponse(webviewView.webview, response);
            logSourcesResponse(response, `items=${result.length}`);
            return;
          }

          if (typedMessage.type === SidebarMessageType.SourcesGetByIdRequest) {
            logSourcesCommand(typedMessage.type, requestId, {
              sourceId: typedMessage.payload.sourceId,
            });
            const result = await sourcesService.getSourceById(typedMessage.payload.sourceId);
            const response: SourcesResponseMessage = {
              type: SidebarMessageType.SourcesResponse,
              requestId,
              ok: true,
              payload: result ? toSourceDescriptor(result) : null,
            };
            await postSourcesResponse(webviewView.webview, response);
            logSourcesResponse(response, result ? 'found=true' : 'found=false');
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

function toSourceDescriptor(record: SourceRecord): {
  id: string;
  path: string;
  kind: SourceRecord['document']['kind'];
  scope: SourceRecord['document']['scope'];
  origin: SourceRecord['document']['origin'];
  metadata: SourceRecord['metadata'];
  blockCount: number;
} {
  return {
    id: record.document.id,
    path: record.document.path,
    kind: record.document.kind,
    scope: record.document.scope,
    origin: record.document.origin,
    metadata: record.metadata,
    blockCount: record.blocks.length,
  };
}
