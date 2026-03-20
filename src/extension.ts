import * as vscode from 'vscode';
import { registerExampleUi } from './domains/example/ui/register';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { appendLine, initLog } from './log';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  const sourcesService = createSourcesService(context);

  const disposables = [
    // Register UI/commands for each domain here
    ...registerExampleUi(context),
    vscode.window.registerWebviewViewProvider(
      'akashi.sidebar',
      createSidebarViewProvider(context, sourcesService)
    ),
  ];

  context.subscriptions.push(...disposables);
  appendLine('[Akashi] Extension activated.');
}

export function deactivate(): void {
  // No-op for now; VS Code will dispose resources via subscriptions.
}
