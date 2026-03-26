import * as vscode from 'vscode';

/** `akashi.exclude` — additional user-defined exclusion patterns (default empty). */
export function readUserExcludePatterns(): readonly string[] {
  const raw = vscode.workspace.getConfiguration('akashi').get<unknown>('exclude');
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}
