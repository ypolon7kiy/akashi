import * as vscode from 'vscode';
import { appendLine } from '../../../../log';
import { codiconsDistRoot } from '../../../../sidebar/host/sidebarWebviewHtml';
import { DiffMessageType } from '../../webview/diff/messages';
import type { DiffPanelEnvironment } from '../diffPanelEnvironment';
import type { DiffTarget } from '../../domain/model';

const viewType = 'akashi.diffPanel';

export class DiffPanel {
  public static currentPanel: DiffPanel | undefined;

  private snapshotEnv: DiffPanelEnvironment;

  public static createOrShow(context: vscode.ExtensionContext, env: DiffPanelEnvironment): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (DiffPanel.currentPanel) {
      void DiffPanel.currentPanel.pushDiffData(env, { kind: 'working' });
      DiffPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(viewType, 'Akashi Diff', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'diff'),
        codiconsDistRoot(extensionUri),
      ],
    });

    DiffPanel.currentPanel = new DiffPanel(panel, extensionUri, env);
    context.subscriptions.push(panel);
  }

  public static async refreshIfOpen(env: DiffPanelEnvironment): Promise<void> {
    const p = DiffPanel.currentPanel;
    if (p) {
      await p.pushDiffData(env, { kind: 'working' });
    }
  }

  private constructor(
    public readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    initialEnv: DiffPanelEnvironment
  ) {
    this.snapshotEnv = initialEnv;
    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.onDispose());
    this.panel.webview.onDidReceiveMessage(
      async (message: { type?: string; payload?: unknown }) => {
        try {
          if (message?.type === DiffMessageType.WebviewReady) {
            appendLine('[Akashi][Diff] Webview ready — sending working diff.');
            await this.pushDiffData(this.snapshotEnv, { kind: 'working' });
            return;
          }
          if (message?.type === DiffMessageType.RefreshRequest) {
            const p = message.payload as { target?: DiffTarget } | undefined;
            const target: DiffTarget = p?.target ?? { kind: 'working' };
            await this.pushDiffData(this.snapshotEnv, target);
            return;
          }
          if (message?.type === DiffMessageType.RequestDiff) {
            const p = message.payload as { target?: DiffTarget } | undefined;
            if (p?.target) {
              await this.pushDiffData(this.snapshotEnv, p.target);
            }
            return;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          appendLine(`[Akashi][Diff] Message handler error: ${msg}`);
          await this.panel.webview.postMessage({
            type: DiffMessageType.DiffError,
            payload: { error: msg },
          });
        }
      }
    );
  }

  public async pushDiffData(env: DiffPanelEnvironment, target: DiffTarget): Promise<void> {
    this.snapshotEnv = env;
    const result = await env.getDiff(target);
    appendLine(`[Akashi][Diff] postMessage diff empty=${result.isEmpty}`);
    await this.panel.webview.postMessage({
      type: DiffMessageType.DiffData,
      payload: result,
    });
  }

  private onDispose(): void {
    DiffPanel.currentPanel = undefined;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'diff', 'diff-main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'diff', 'diff-main.css')
    );
    const codiconCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(codiconsDistRoot(this.extensionUri), 'codicon.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <title>Akashi Diff</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
