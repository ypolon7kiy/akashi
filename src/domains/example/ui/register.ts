import * as vscode from 'vscode';
import { ExamplePanel } from './webview/ExamplePanel';

export function registerExampleUi(context: vscode.ExtensionContext): vscode.Disposable[] {
  const showPanelCommand = vscode.commands.registerCommand('dddExample.example.showPanel', () => {
    ExamplePanel.createOrShow(context);
  });
  return [showPanelCommand];
}
