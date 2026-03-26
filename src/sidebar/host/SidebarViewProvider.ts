import * as vscode from 'vscode';
import type { ConfigDomain } from '../../domains/config';
import type { SerializedSourceSearchQuery } from '../../domains/search/domain/model';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import { appendLine } from '../../log';
import { handleSidebarWebviewMessage } from './handleSidebarWebviewMessage';
import { createSidebarSourcesHostActions } from './sidebarSourcesHostActions';
import { codiconsDistRoot, getSidebarWebviewHtml } from './sidebarWebviewHtml';

const SIDEBAR_FILTER_STATE_KEY = 'akashi.sidebar.filterState.v1';

export interface SidebarViewProviderOptions {
  /** Called after the sidebar (and filtered snapshot) has been updated — e.g. refresh graph panel. */
  onAfterSourcesSnapshotRefreshed?: () => void;
  /** Called when the sidebar filter result changes — relay matched paths to graph panel. */
  onFilterChanged?: (matchedPaths: readonly string[] | null) => void;
}

export function createSidebarViewProvider(
  context: vscode.ExtensionContext,
  sourcesService: SourcesService,
  configDomain: ConfigDomain,
  options: SidebarViewProviderOptions
): vscode.WebviewViewProvider {
  const notifySnapshotRefreshed = (): void => {
    try {
      options.onAfterSourcesSnapshotRefreshed?.();
    } catch (err) {
      appendLine(
        `[Akashi] Sidebar: onAfterSourcesSnapshotRefreshed failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  let activeView: vscode.WebviewView | undefined;

  const actions = createSidebarSourcesHostActions({
    sourcesService,
    getActiveSourcePresets: configDomain.getActiveSourcePresets,
    getIncludeHomeConfig: configDomain.getIncludeHomeConfig,
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
        w.html = getSidebarWebviewHtml(w, context.extensionUri, configDomain.generalConfig);
        appendLine('[Akashi] Sidebar: webview HTML refreshed after bundle change.');
      }
    };
    bundleWatcher.onDidChange(refreshSidebarHtml);
    bundleWatcher.onDidCreate(refreshSidebarHtml);
    context.subscriptions.push(bundleWatcher);
  }

  context.subscriptions.push(
    configDomain.onIndexingSettingsChanged(async () => {
      const w = activeView?.webview;
      if (!w) {
        return;
      }
      try {
        await sourcesService.indexWorkspace({
          includeHomeConfig: configDomain.getIncludeHomeConfig(),
        });
      } catch (err) {
        appendLine(
          `[Akashi][Sources] Re-index after sources settings change failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      await actions.postFilteredSnapshotPush(w);
      notifySnapshotRefreshed();
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
        configDomain.generalConfig
      );

      const notifyFilterChanged = (matchedPaths: readonly string[] | null): void => {
        try {
          options.onFilterChanged?.(matchedPaths);
        } catch (err) {
          appendLine(
            `[Akashi] Sidebar: onFilterChanged failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      };

      const saveFilterState = (query: SerializedSourceSearchQuery): void => {
        context.globalState
          .update(SIDEBAR_FILTER_STATE_KEY, query)
          .then(undefined, (err) =>
            appendLine(
              `[Akashi] Sidebar: failed to save filter state: ${err instanceof Error ? err.message : String(err)}`
            )
          );
      };

      const getSavedFilterState = (): SerializedSourceSearchQuery | null =>
        context.globalState.get<SerializedSourceSearchQuery | null>(SIDEBAR_FILTER_STATE_KEY, null);

      const messageCtx = {
        sourcesService,
        configDomain,
        actions,
        notifyFilterChanged,
        saveFilterState,
        getSavedFilterState,
      };

      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        void handleSidebarWebviewMessage(webviewView.webview, message, messageCtx);
      });
    },
  };
}
