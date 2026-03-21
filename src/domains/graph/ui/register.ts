import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './graphPanelEnvironment';
import { Graph2DPanel } from './webview/Graph2DPanel';
import { GraphPanel } from './webview/GraphPanel';

export function registerGraphUi(
  context: vscode.ExtensionContext,
  env: GraphPanelEnvironment
): vscode.Disposable[] {
  const show3d = vscode.commands.registerCommand('akashi.graph.showPanel', () => {
    GraphPanel.createOrShow(context, env);
  });
  const show2d = vscode.commands.registerCommand('akashi.graph2d.showPanel', () => {
    Graph2DPanel.createOrShow(context, env);
  });
  return [show3d, show2d];
}

export { Graph2DPanel, GraphPanel };
