import * as vscode from 'vscode';
import type { AddonsPanelEnvironment } from './addonsPanelEnvironment';
import { AddonsPanel } from './webview/AddonsPanel';

export function registerAddonsUi(
  context: vscode.ExtensionContext,
  env: AddonsPanelEnvironment
): vscode.Disposable[] {
  const showAddons = vscode.commands.registerCommand('akashi.addons.showPanel', () => {
    AddonsPanel.createOrShow(context, env);
  });
  return [showAddons];
}

export { AddonsPanel };
