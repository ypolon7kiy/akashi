import * as vscode from 'vscode';

/** Best-effort workspace folder for workspace-scoped artifact creators (matches wizard behavior). */
export function inferWorkspaceRoot(): string {
  const editor = vscode.window.activeTextEditor;
  const uri = editor?.document.uri;
  if (uri?.scheme === 'file') {
    const wf = vscode.workspace.getWorkspaceFolder(uri);
    if (wf) {
      return wf.uri.fsPath;
    }
  }
  const first = vscode.workspace.workspaceFolders?.[0];
  return first?.uri.fsPath ?? '';
}
