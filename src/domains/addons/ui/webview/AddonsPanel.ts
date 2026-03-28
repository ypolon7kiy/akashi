import * as vscode from 'vscode';
import { appendLine } from '../../../../log';
import { codiconsDistRoot } from '../../../../sidebar/host/sidebarWebviewHtml';
import { AddonsMessageType } from '../../webview/addons/messages';
import type { AddonsPanelEnvironment } from '../addonsPanelEnvironment';

const viewType = 'akashi.addonsPanel';

export class AddonsPanel {
  public static currentPanel: AddonsPanel | undefined;

  private snapshotEnv: AddonsPanelEnvironment | null = null;

  public static createOrShow(context: vscode.ExtensionContext, env: AddonsPanelEnvironment): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (AddonsPanel.currentPanel) {
      void AddonsPanel.currentPanel.pushCatalog(env);
      AddonsPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(viewType, 'Akashi Addons', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'addons'),
        codiconsDistRoot(extensionUri),
      ],
    });

    AddonsPanel.currentPanel = new AddonsPanel(panel, extensionUri, env);
    context.subscriptions.push(panel);
  }

  public static async refreshIfOpen(env: AddonsPanelEnvironment): Promise<void> {
    const p = AddonsPanel.currentPanel;
    if (p) {
      await p.pushCatalog(env);
    }
  }

  private constructor(
    public readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    initialEnv: AddonsPanelEnvironment
  ) {
    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.onDispose());
    this.panel.webview.onDidReceiveMessage(
      async (message: { type?: string; payload?: unknown }) => {
        if (message?.type === AddonsMessageType.WebviewReady) {
          appendLine('[Akashi][Addons] Webview ready — sending catalog.');
          if (this.snapshotEnv) {
            await this.pushCatalog(this.snapshotEnv);
          }
          return;
        }
        if (message?.type === AddonsMessageType.OpenFile) {
          const path = (message.payload as { path?: string } | undefined)?.path;
          if (typeof path === 'string' && path.length > 0) {
            await this.snapshotEnv?.openAddonFile(path);
          }
          return;
        }
        if (message?.type === AddonsMessageType.RefreshRequest) {
          if (this.snapshotEnv) {
            await this.pushCatalog(this.snapshotEnv);
          }
          return;
        }
        // Origin management
        if (message?.type === AddonsMessageType.AddOrigin) {
          const p = message.payload as
            | { label?: string; kind?: string; value?: string }
            | undefined;
          if (p?.label && p?.kind && p?.value) {
            await this.snapshotEnv?.addOrigin(p.label, { kind: p.kind, value: p.value });
            await this.refreshAfterMutation();
          }
          return;
        }
        if (message?.type === AddonsMessageType.RemoveOrigin) {
          const p = message.payload as { originId?: string } | undefined;
          if (p?.originId) {
            await this.snapshotEnv?.removeOrigin(p.originId);
            await this.refreshAfterMutation();
          }
          return;
        }
        if (message?.type === AddonsMessageType.ToggleOrigin) {
          const p = message.payload as { originId?: string; enabled?: boolean } | undefined;
          if (p?.originId !== undefined && p?.enabled !== undefined) {
            await this.snapshotEnv?.toggleOrigin(p.originId, p.enabled);
            await this.refreshAfterMutation();
          }
          return;
        }
        if (message?.type === AddonsMessageType.FetchOrigin) {
          const p = message.payload as { originId?: string } | undefined;
          if (p?.originId) {
            await this.snapshotEnv?.fetchOrigin(p.originId);
            await this.refreshAfterMutation();
          }
          return;
        }
        // Install/Uninstall
        if (message?.type === AddonsMessageType.InstallPlugin) {
          const p = message.payload as
            | { pluginId?: string; locality?: 'workspace' | 'user' }
            | undefined;
          if (p?.pluginId) {
            const locality = p.locality === 'user' ? 'user' : 'workspace';
            appendLine(`[Akashi][Addons] Installing plugin=${p.pluginId} locality=${locality}`);
            const result = await this.snapshotEnv?.installPlugin(p.pluginId, locality);
            appendLine(
              `[Akashi][Addons] Install result plugin=${p.pluginId} ok=${result?.ok} error=${result?.error ?? 'none'}`
            );
            void this.panel.webview.postMessage({
              type: AddonsMessageType.OperationResult,
              payload: { operation: 'install', pluginId: p.pluginId, ...result },
            });
            await this.refreshAfterMutation();
          }
          return;
        }
        if (message?.type === AddonsMessageType.DeleteAddon) {
          const p = message.payload as { primaryPath?: string; pluginId?: string } | undefined;
          if (p?.primaryPath || p?.pluginId) {
            appendLine(
              `[Akashi][Addons] Delete requested path=${p?.primaryPath ?? 'none'} pluginId=${p?.pluginId ?? 'none'}`
            );
            const confirm = await vscode.window.showWarningMessage(
              'Delete addon? This will remove its files from disk.',
              { modal: true },
              'Delete'
            );
            if (confirm !== 'Delete') {
              appendLine('[Akashi][Addons] Delete cancelled by user');
              void this.panel.webview.postMessage({
                type: AddonsMessageType.OperationResult,
                payload: { operation: 'delete', ok: true, cancelled: true },
              });
              return;
            }
            const result = await this.snapshotEnv?.deleteAddon(p.primaryPath, p.pluginId);
            appendLine(
              `[Akashi][Addons] Delete result ok=${result?.ok} error=${result?.error ?? 'none'}`
            );
            void this.panel.webview.postMessage({
              type: AddonsMessageType.OperationResult,
              payload: { operation: 'delete', ...result },
            });
            await this.refreshAfterMutation();
          }
          return;
        }
        if (message?.type === AddonsMessageType.MoveToGlobal) {
          const p = message.payload as { addonId?: string } | undefined;
          if (p?.addonId) {
            appendLine(`[Akashi][Addons] Moving to global addonId=${p.addonId}`);
            const result = await this.snapshotEnv?.moveToGlobal(p.addonId);
            appendLine(
              `[Akashi][Addons] Move result addonId=${p.addonId} ok=${result?.ok} error=${result?.error ?? 'none'}`
            );
            void this.panel.webview.postMessage({
              type: AddonsMessageType.OperationResult,
              payload: { operation: 'move', addonId: p.addonId, ...result },
            });
            await this.refreshAfterMutation();
          }
          return;
        }
      }
    );
    void this.pushCatalog(initialEnv);
  }

  public async pushCatalog(env: AddonsPanelEnvironment): Promise<void> {
    this.snapshotEnv = env;
    const payload = await env.getAddonsCatalog();
    const installed = payload?.records?.length ?? 0;
    const available = payload?.catalogPlugins?.length ?? 0;
    appendLine(
      `[Akashi][Addons] postMessage catalog installed=${installed} available=${available}`
    );
    await this.panel.webview.postMessage({
      type: AddonsMessageType.Catalog,
      payload,
    });
  }

  private async refreshAfterMutation(): Promise<void> {
    if (this.snapshotEnv) {
      await this.pushCatalog(this.snapshotEnv);
    }
  }

  private onDispose(): void {
    AddonsPanel.currentPanel = undefined;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'addons', 'addons-main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'addons', 'addons-main.css')
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
  <title>Akashi Addons</title>
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
