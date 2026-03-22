import * as vscode from 'vscode';
import type { WorkspaceFolderInfo } from '../bridge/sourceDescriptor';

export function snapshotWorkspaceFolders(): WorkspaceFolderInfo[] {
  return (
    vscode.workspace.workspaceFolders?.map((f) => ({
      name: f.name,
      path: f.uri.fsPath,
    })) ?? []
  );
}
