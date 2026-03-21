import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './graphPanelEnvironment';
import { GraphPanel } from './webview/GraphPanel';

export function registerGraphUi(
  context: vscode.ExtensionContext,
  env: GraphPanelEnvironment
): vscode.Disposable[] {
  const show = vscode.commands.registerCommand('akashi.graph.showPanel', () => {
    GraphPanel.createOrShow(context, env);
  });
  return [show];
}

export { GraphPanel };
