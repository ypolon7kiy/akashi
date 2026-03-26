import * as vscode from 'vscode';
import { parseGitignorePatterns } from '../domain/parseGitignorePatterns';

/**
 * Reads `.gitignore` from each workspace folder root and returns the merged
 * set of parsed exclusion patterns.
 */
export async function readWorkspaceGitignorePatterns(): Promise<readonly string[]> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return [];
  }
  const allPatterns: string[] = [];
  for (const folder of folders) {
    const gitignoreUri = vscode.Uri.joinPath(folder.uri, '.gitignore');
    try {
      const bytes = await vscode.workspace.fs.readFile(gitignoreUri);
      const content = new TextDecoder().decode(bytes);
      allPatterns.push(...parseGitignorePatterns(content));
    } catch {
      // .gitignore doesn't exist in this workspace folder — that's fine.
    }
  }
  return allPatterns;
}
