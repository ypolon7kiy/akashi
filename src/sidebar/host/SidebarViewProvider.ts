import * as vscode from 'vscode';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import type { ActiveSourcePresetsGetter } from '../../domains/sources/domain/sourcePresets';
import { readIncludeHomeConfig } from '../../domains/sources/infrastructure/vscodeSourcesIncludeHome';
import type { GeneralConfigProvider } from '../../shared/config/generalConfigProvider';
import { appendLine } from '../../log';
import { handleSidebarWebviewMessage } from './handleSidebarWebviewMessage';
import { createSidebarSourcesHostActions } from './sidebarSourcesHostActions';
import { codiconsDistRoot, getSidebarWebviewHtml } from './sidebarWebviewHtml';

export interface SidebarViewProviderOptions {
  /** Called after the sidebar (and filtered snapshot) has been updated — e.g. refresh graph panel. */
  onAfterSourcesSnapshotRefreshed?: () => void;
}

export function createSidebarViewProvider(
  context: vscode.ExtensionContext,
  sourcesService: SourcesService,
  getActiveSourcePresets: ActiveSourcePresetsGetter,
  generalConfig: GeneralConfigProvider,
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

  const actions = createSidebarSourcesHostActions({
    sourcesService,
    getActiveSourcePresets,
    getWebview: () => activeView?.webview,
    notifySnapshotRefreshed,
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('akashi.sources.refresh', async () => {
      try {
        await actions.refreshSourcesIndexFromHost({ notifyWebviewBusy: true });
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
        w.html = getSidebarWebviewHtml(w, context.extensionUri, generalConfig);
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
        await actions.postFilteredSnapshotPush(w);
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

      webviewView.webview.html = getSidebarWebviewHtml(
        webviewView.webview,
        extensionUri,
        generalConfig
      );

      const messageCtx = {
        sourcesService,
        getActiveSourcePresets,
        actions,
      };

      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        void handleSidebarWebviewMessage(webviewView.webview, message, messageCtx);
      });
    },
  };
}
