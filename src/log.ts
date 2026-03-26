import * as vscode from 'vscode';

let channel: vscode.OutputChannel | null = null;

export function initLog(context: vscode.ExtensionContext): void {
  channel = vscode.window.createOutputChannel('Akashi');
  context.subscriptions.push(channel);
}

export function getLog(): vscode.OutputChannel | null {
  return channel;
}

export function appendLine(message: string): void {
  channel?.appendLine(message);
}
