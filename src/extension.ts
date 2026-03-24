import * as vscode from 'vscode';
import { appendLine, initLog } from './log';
import { registerAkashiExtension } from './registerAkashiExtension';

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  registerAkashiExtension(context);
}

export function deactivate(): void {
  // No-op for now; VS Code will dispose resources via subscriptions.
}
