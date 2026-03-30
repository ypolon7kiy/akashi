import * as vscode from 'vscode';
import type { PulsePanelEnvironment } from './pulsePanelEnvironment';
import { PulsePanel } from './webview/PulsePanel';

export function registerPulseUi(
  context: vscode.ExtensionContext,
  env: PulsePanelEnvironment
): vscode.Disposable[] {
  const showPulse = vscode.commands.registerCommand('akashi.pulse.showPanel', () => {
    PulsePanel.createOrShow(context, env);
  });
  return [showPulse];
}

export { PulsePanel };
