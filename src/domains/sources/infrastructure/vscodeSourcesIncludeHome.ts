import * as vscode from 'vscode';

/** `akashi.sources.includeHomeConfig` — whether user-home tool configs are scanned (default true). */
export function readIncludeHomeConfig(): boolean {
  return (
    vscode.workspace.getConfiguration('akashi.sources').get<boolean>('includeHomeConfig') ?? true
  );
}
