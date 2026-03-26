import * as vscode from 'vscode';
import type { WorkbenchSidebarFsSettings } from '../../../shared/config/workspaceConfigTypes';

export function createWorkbenchSidebarFsSettings(): WorkbenchSidebarFsSettings {
  return {
    isConfirmDragAndDropEnabled(): boolean {
      const ex = vscode.workspace.getConfiguration('explorer');
      return ex.get<boolean>('confirmDragAndDrop') !== false;
    },
    getDeleteFlowSettings(): { enableTrash: boolean; confirmDelete: boolean } {
      const files = vscode.workspace.getConfiguration('files');
      const explorer = vscode.workspace.getConfiguration('explorer');
      return {
        enableTrash: files.get<boolean>('enableTrash') !== false,
        confirmDelete: explorer.get<boolean>('confirmDelete') !== false,
      };
    },
  };
}
