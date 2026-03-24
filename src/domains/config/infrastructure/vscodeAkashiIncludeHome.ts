import * as vscode from 'vscode';

/** `akashi.includeHomeConfig` — whether user-home tool configs are scanned (default true). */
export function readIncludeHomeConfig(): boolean {
  return vscode.workspace.getConfiguration('akashi').get<boolean>('includeHomeConfig') ?? true;
}
