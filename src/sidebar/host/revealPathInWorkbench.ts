import * as vscode from 'vscode';
import { appendLine } from '../../log';

/**
 * Workbench integration for the sources sidebar. Uses internal VS Code command IDs (`revealInExplorer`,
 * `revealFileInOS` (bridge: `SidebarMessageType.SourcesRevealFileInOs`, wire string `sources/revealFileInOS`).
 * These IDs are not a stable extension API and may change across VS Code versions.
 */

export async function revealPathInExplorer(fsPath: unknown): Promise<void> {
  if (typeof fsPath !== 'string' || fsPath.length === 0) {
    return;
  }
  try {
    await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(fsPath));
  } catch (error) {
    appendLine(
      `[Akashi] Sidebar: revealInExplorer failed ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function revealPathInFileOs(fsPath: unknown): Promise<void> {
  if (typeof fsPath !== 'string' || fsPath.length === 0) {
    return;
  }
  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fsPath));
  } catch (error) {
    appendLine(
      `[Akashi] Sidebar: revealFileInOS failed ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
