import * as vscode from 'vscode';
import { registerExampleUi } from './domains/example/ui/register';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { readActiveSourcePresets } from './domains/sources/infrastructure/vscodeSourcePresetConfig';
import type { ActiveSourcePresetsGetter } from './domains/sources/domain/sourcePresets';
import { appendLine, getLog, initLog } from './log';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  const getActiveSourcePresets: ActiveSourcePresetsGetter = readActiveSourcePresets;
  const sourcesService = createSourcesService(context, getActiveSourcePresets);

  const disposables = [
    // Register UI/commands for each domain here
    ...registerExampleUi(context),
    vscode.window.registerWebviewViewProvider(
      'akashi.sidebar',
      createSidebarViewProvider(context, sourcesService, getActiveSourcePresets)
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
