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

/**
 * Resolve the workspace root for a workspace-scoped operation.
 *
 * - No folders open → returns `null` (caller should show an error).
 * - Single folder   → returns its path immediately.
 * - Multi-root      → shows a quick-pick so the user can choose; returns
 *   `null` if they dismiss the picker.
 */
export async function pickWorkspaceRoot(): Promise<string | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }
  if (folders.length === 1) {
    return folders[0]!.uri.fsPath;
  }
  const picked = await vscode.window.showQuickPick(
    folders.map((f) => ({ label: f.name, description: f.uri.fsPath, folder: f })),
    { title: 'Target project', placeHolder: 'Which workspace folder should receive the addon?' }
  );
  return picked?.folder.uri.fsPath ?? null;
}
