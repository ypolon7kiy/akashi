import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

function isPathInsideOrEqual(root: string, candidate: string): boolean {
  const r = path.normalize(root);
  const c = path.normalize(candidate);
  if (r === c) {
    return true;
  }
  const rel = path.relative(r, c);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * True when `fsPath` is under a workspace folder (when any is open) or under the user home directory.
 * Used for sidebar FS ops and artifact creation so the same allowlist applies everywhere.
 */
export function isPathAllowedForWorkspaceOrHome(fsPath: string): boolean {
  const uri = vscode.Uri.file(fsPath);
  if ((vscode.workspace.workspaceFolders?.length ?? 0) > 0) {
    if (vscode.workspace.getWorkspaceFolder(uri) !== undefined) {
      return true;
    }
  }
  const home = os.homedir();
  if (!home) {
    return false;
  }
  const n = path.normalize(fsPath);
  const h = path.normalize(home);
  return isPathInsideOrEqual(h, n);
}
