import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { GraphPanel, registerGraphUi } from './domains/graph/ui/register';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { readActiveSourcePresets } from './domains/sources/infrastructure/vscodeSourcePresetConfig';
import type { ActiveSourcePresetsGetter } from './domains/sources/domain/sourcePresets';
import { appendLine, getLog, initLog } from './log';
import type { WorkspaceFolderInfo } from './sidebar/bridge/sourceDescriptor';
import { buildSourcesSnapshotPayload } from './sidebar/host/sourcesSnapshotPayload';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';

function snapshotWorkspaceFolders(): WorkspaceFolderInfo[] {
  return (
    vscode.workspace.workspaceFolders?.map((f) => ({
      name: f.name,
      path: f.uri.fsPath,
    })) ?? []
  );
}

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  const getActiveSourcePresets: ActiveSourcePresetsGetter = readActiveSourcePresets;
  const sourcesService = createSourcesService(context, getActiveSourcePresets);

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
          void GraphPanel.refreshIfOpen(graphEnv);
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
      getLog()?.show(false);
    });
  }
}

export function deactivate(): void {
  // No-op for now; VS Code will dispose resources via subscriptions.
}
