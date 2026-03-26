import * as vscode from 'vscode';
import type { GeneralConfigProvider } from '../../../shared/config/generalConfigProvider';
import type { GraphPanelEnvironment } from './graphPanelEnvironment';
import { Graph2DPanel } from './webview/Graph2DPanel';

export function registerGraphUi(
  context: vscode.ExtensionContext,
  env: GraphPanelEnvironment,
  generalConfig: GeneralConfigProvider
): vscode.Disposable[] {
  const showGraph = vscode.commands.registerCommand('akashi.graph.showPanel', () => {
    Graph2DPanel.createOrShow(context, env, generalConfig);
  });
  return [showGraph];
}

export { Graph2DPanel };
