import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { Graph2DPanel, registerGraphUi } from './domains/graph/ui/register';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { readActiveSourcePresets } from './domains/sources/infrastructure/vscodeSourcePresetConfig';
import type { ActiveSourcePresetsGetter } from './domains/sources/domain/sourcePresets';
import { appendLine, getLog, initLog } from './log';
import { buildSourcesSnapshotPayload } from './sidebar/host/sources/sourcesSnapshotPayload';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';
import { snapshotWorkspaceFolders } from './sidebar/host/sidebarWorkspaceFolders';

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  const getActiveSourcePresets: ActiveSourcePresetsGetter = readActiveSourcePresets;
  const sourcesService = createSourcesService(context, getActiveSourcePresets);
  void sourcesService.getLastSnapshot();

  const graphEnv: GraphPanelEnvironment = {
    getGraphPayload: async () => {
      const snap = await sourcesService.getLastSnapshot();
      return buildSourcesSnapshotPayload(snap, snapshotWorkspaceFolders(), getActiveSourcePresets);
    },
  };

  const disposables = [
    // Register UI/commands for each domain here
    ...registerGraphUi(context, graphEnv),
    vscode.window.registerWebviewViewProvider(
      'akashi.sidebar',
      createSidebarViewProvider(context, sourcesService, getActiveSourcePresets, {
        onAfterSourcesSnapshotRefreshed: () => {
          void Graph2DPanel.refreshIfOpen(graphEnv);
        },
      })
    ),
  ];

  context.subscriptions.push(...disposables);
  appendLine('[Akashi] Extension activated.');

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    queueMicrotask(() => {
      void vscode.commands.executeCommand('workbench.view.extension.akashi');
      void vscode.commands.executeCommand('akashi.sidebar.focus');
      Graph2DPanel.createOrShow(context, graphEnv);
      getLog()?.show(false);
    });
  }
}

export function deactivate(): void {
  // No-op for now; VS Code will dispose resources via subscriptions.
}
