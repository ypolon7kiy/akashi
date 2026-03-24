import * as vscode from 'vscode';
import { appendLine } from '../../../../log';
import {
  GRAPH2D_VIEW_SETTINGS_GLOBAL_STATE_KEY,
  defaultGraph2DWebviewPersistedState,
  parseGraph2DWebviewPersistedState,
} from '../../webview/graph2d/graph2dViewSettings';
import { Graph2DMessageType, type Graph2DFileColorsPayload } from '../../webview/graph2d/messages';
import type { GraphPanelEnvironment } from '../graphPanelEnvironment';
import {
  FROZEN_CONFIG_KEYS,
  type GeneralConfigProvider,
} from '../../../../shared/config/generalConfigProvider';
import { resolveGraphSourceCategoryPalette } from '../../domain/sourceCategoryPalette';

const viewType = 'akashi.graph2DPanel';

export class Graph2DPanel {
  public static currentPanel: Graph2DPanel | undefined;

  private snapshotEnv: GraphPanelEnvironment | null = null;

  private readonly categoryPalette: Graph2DFileColorsPayload;

  public static createOrShow(
    context: vscode.ExtensionContext,
    env: GraphPanelEnvironment,
    generalConfig: GeneralConfigProvider
  ): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (Graph2DPanel.currentPanel) {
      void Graph2DPanel.currentPanel.pushSnapshot(env);
      Graph2DPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(viewType, 'Akashi 2D graph', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'graph2d')],
    });

    Graph2DPanel.currentPanel = new Graph2DPanel(panel, extensionUri, env, context, generalConfig);
    context.subscriptions.push(panel);
  }

  public static async refreshIfOpen(env: GraphPanelEnvironment): Promise<void> {
    const p = Graph2DPanel.currentPanel;
    if (p) {
      await p.pushSnapshot(env);
    }
  }

  private constructor(
    public readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    initialEnv: GraphPanelEnvironment,
    private readonly extensionContext: vscode.ExtensionContext,
    _generalConfig: GeneralConfigProvider
  ) {
    this.categoryPalette = resolveGraphSourceCategoryPalette(
      _generalConfig.getFrozen(FROZEN_CONFIG_KEYS.sidebarSourceCategoryFileColors)
    );
    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.onDispose());
    this.panel.webview.onDidReceiveMessage(
      async (message: { type?: string; payload?: unknown }) => {
        if (message?.type === Graph2DMessageType.WebviewReady) {
          appendLine('[Akashi][Graph2D] Webview ready — re-sending snapshot.');
          if (this.snapshotEnv) {
            await this.pushSnapshot(this.snapshotEnv);
          }
          this.postViewSettings();
          this.postFileColors();
          return;
        }
        if (message?.type === Graph2DMessageType.SaveViewSettings) {
          const parsed = parseGraph2DWebviewPersistedState(message.payload);
          await this.extensionContext.globalState.update(
            GRAPH2D_VIEW_SETTINGS_GLOBAL_STATE_KEY,
            parsed
          );
          return;
        }
        if (message?.type === Graph2DMessageType.OpenPath) {
          const path = (message.payload as { path?: string } | undefined)?.path;
          if (typeof path === 'string' && path.length > 0) {
            await Graph2DPanel.openPath(path);
          }
          return;
        }
        if (message?.type === Graph2DMessageType.CopyPath) {
          const path = (message.payload as { path?: string } | undefined)?.path;
          if (typeof path === 'string') {
            await vscode.env.clipboard.writeText(path);
          }
          return;
        }
        if (message?.type === Graph2DMessageType.RunArtifactCreator) {
          const templateId = (message.payload as { templateId?: string } | undefined)?.templateId;
          if (typeof templateId === 'string' && templateId.length > 0) {
            await this.snapshotEnv?.runArtifactCreator?.(templateId);
          }
          return;
        }
      }
    );
    void this.pushSnapshot(initialEnv);
  }

  private static async openPath(fsPath: string): Promise<void> {
    const uri = vscode.Uri.file(fsPath);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        await vscode.commands.executeCommand('revealFileInOS', uri);
        return;
      }
    } catch {
      // Path may be missing or not a file URI (e.g. tag label).
    }
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch {
      try {
        await vscode.commands.executeCommand('revealFileInOS', uri);
      } catch {
        void vscode.window.showInformationMessage(`Could not open: ${fsPath}`);
      }
    }
  }

  public async pushSnapshot(env: GraphPanelEnvironment): Promise<void> {
    this.snapshotEnv = env;
    const payload = await env.getGraphPayload();
    const rec = payload?.records?.length ?? 0;
    appendLine(
      `[Akashi][Graph2D] postMessage snapshot payload=${payload ? 'object' : 'null'} recordCount=${rec} sourceCount=${payload?.sourceCount ?? 'n/a'}`
    );
    await this.panel.webview.postMessage({
      type: Graph2DMessageType.Snapshot,
      payload,
    });
  }

  private postFileColors(): void {
    void this.panel.webview.postMessage({
      type: Graph2DMessageType.FileColors,
      payload: this.categoryPalette,
    });
  }

  private postViewSettings(): void {
    const raw = this.extensionContext.globalState.get(GRAPH2D_VIEW_SETTINGS_GLOBAL_STATE_KEY);
    const payload =
      raw !== undefined && raw !== null
        ? parseGraph2DWebviewPersistedState(raw)
        : defaultGraph2DWebviewPersistedState();
    void this.panel.webview.postMessage({
      type: Graph2DMessageType.ViewSettings,
      payload,
    });
  }

  private onDispose(): void {
    Graph2DPanel.currentPanel = undefined;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'graph2d', 'graph2d-main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'graph2d', 'graph2d-main.css')
    );
    const codiconCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        '@vscode',
        'codicons',
        'dist',
        'codicon.css'
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} blob: data:; connect-src ${webview.cspSource}; worker-src ${webview.cspSource} blob:;">
  <title>Akashi 2D graph</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
