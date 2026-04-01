import * as vscode from 'vscode';
import type { DiffPanelEnvironment } from './diffPanelEnvironment';
import { DiffPanel } from './webview/DiffPanel';

export function registerDiffUi(
  context: vscode.ExtensionContext,
  env: DiffPanelEnvironment
): vscode.Disposable[] {
  const showDiff = vscode.commands.registerCommand('akashi.diff.showPanel', () => {
    DiffPanel.createOrShow(context, env);
  });
  return [showDiff];
}

export { DiffPanel };
