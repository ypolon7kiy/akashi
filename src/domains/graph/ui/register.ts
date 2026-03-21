import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './graphPanelEnvironment';
import { Graph2DPanel } from './webview/Graph2DPanel';

export function registerGraphUi(
  context: vscode.ExtensionContext,
  env: GraphPanelEnvironment
): vscode.Disposable[] {
  const showGraph = vscode.commands.registerCommand('akashi.graph.showPanel', () => {
    Graph2DPanel.createOrShow(context, env);
  });
  return [showGraph];
}

export { Graph2DPanel };
