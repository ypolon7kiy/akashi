import * as path from 'node:path';
import * as vscode from 'vscode';
import type { WorkbenchSidebarFsSettings } from '../../../shared/config/workspaceConfigTypes';
import { isPathAllowedForWorkspaceOrHome } from '../../../shared/extensionHost/isPathAllowedForWorkspaceOrHome';
import { validateSourceFileBaseName } from '../../bridge/validateSourceFileBaseName';

/**
 * Sidebar tree file ops on the extension host: `workspace.fs` plus workbench settings (injected)
 * for confirmations and trash, and path allowlisting (workspace + home) for safety.
 */

/** Internal: user dismissed a confirm dialog — host maps to a successful no-op response for the webview. */
export const SIDEBAR_FS_CANCELLED = 'SIDEBAR_FS_CANCELLED';

export { isPathAllowedForWorkspaceOrHome as isPathAllowedForSidebarFs };

export async function handleSidebarFsRename(
  payload: {
    fromPath: string;
    toPath: string;
    confirmDragAndDrop?: boolean;
  },
  workbenchFs: WorkbenchSidebarFsSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fromN = path.normalize(payload.fromPath);
  const toN = path.normalize(payload.toPath);
  if (!isPathAllowedForWorkspaceOrHome(fromN) || !isPathAllowedForWorkspaceOrHome(toN)) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }
  const parentTo = path.dirname(toN);
  if (!isPathAllowedForWorkspaceOrHome(parentTo)) {
    return { ok: false, error: 'Destination folder is not allowed.' };
  }

  const nameErr = validateSourceFileBaseName(path.basename(toN));
  if (nameErr) {
    return { ok: false, error: nameErr };
  }

  if (payload.confirmDragAndDrop) {
    if (workbenchFs.isConfirmDragAndDropEnabled()) {
      const base = path.basename(fromN);
      const choice = await vscode.window.showWarningMessage(
        `Are you sure you want to move '${base}'?`,
        { modal: true },
        'Move'
      );
      if (choice !== 'Move') {
        return { ok: false, error: SIDEBAR_FS_CANCELLED };
      }
    }
  }

  if (fromN === toN) {
    return { ok: false, error: 'Source and destination are the same.' };
  }

  const fromUri = vscode.Uri.file(fromN);
  let fromIsDir = false;
  try {
    const st = await vscode.workspace.fs.stat(fromUri);
    fromIsDir = st.type === vscode.FileType.Directory;
  } catch {
    return { ok: false, error: 'Source file or folder was not found.' };
  }

  if (fromIsDir) {
    const rel = path.relative(fromN, toN);
    const inside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    if (inside) {
      return { ok: false, error: 'Cannot move a folder into itself or its descendant.' };
    }
  }

  try {
    const pst = await vscode.workspace.fs.stat(vscode.Uri.file(parentTo));
    if (pst.type !== vscode.FileType.Directory) {
      return { ok: false, error: 'Destination parent is not a folder.' };
    }
  } catch {
    return { ok: false, error: 'Destination folder does not exist.' };
  }

  const toUri = vscode.Uri.file(toN);
  try {
    await vscode.workspace.fs.stat(toUri);
    return { ok: false, error: 'A file or folder with that name already exists.' };
  } catch {
    // absent — ok
  }

  try {
    await vscode.workspace.fs.rename(fromUri, toUri, { overwrite: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function handleSidebarFsDelete(
  payload: {
    path: string;
    isDirectory: boolean;
  },
  workbenchFs: WorkbenchSidebarFsSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = path.normalize(payload.path);
  if (!isPathAllowedForWorkspaceOrHome(p)) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }

  const uri = vscode.Uri.file(p);
  let isDirectory = payload.isDirectory;
  try {
    const st = await vscode.workspace.fs.stat(uri);
    isDirectory = st.type === vscode.FileType.Directory;
  } catch {
    return { ok: false, error: 'File or folder was not found.' };
  }

  const base = path.basename(p);
  const { enableTrash, confirmDelete } = workbenchFs.getDeleteFlowSettings();

  if (confirmDelete) {
    const msg = enableTrash
      ? isDirectory
        ? `Move '${base}' and its contents to the Trash?`
        : `Move '${base}' to the Trash?`
      : isDirectory
        ? `Are you sure you want to permanently delete '${base}' and its contents?`
        : `Are you sure you want to permanently delete '${base}'?`;
    const detail = enableTrash
      ? 'You can restore from the Trash later.'
      : 'This action cannot be undone.';
    const choice = await vscode.window.showWarningMessage(msg, { modal: true, detail }, 'Delete');
    if (choice !== 'Delete') {
      return { ok: false, error: SIDEBAR_FS_CANCELLED };
    }
  }

  try {
    await vscode.workspace.fs.delete(uri, { recursive: isDirectory, useTrash: enableTrash });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function handleSidebarFsBatchDelete(
  payload: {
    items: readonly { path: string; isDirectory: boolean }[];
  },
  workbenchFs: WorkbenchSidebarFsSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validate and stat all items up front.
  const resolved: { uri: vscode.Uri; isDirectory: boolean; base: string }[] = [];
  for (const item of payload.items) {
    const p = path.normalize(item.path);
    if (!isPathAllowedForWorkspaceOrHome(p)) {
      return {
        ok: false,
        error: `'${path.basename(p)}' cannot be modified from the Akashi sidebar.`,
      };
    }
    const uri = vscode.Uri.file(p);
    let isDirectory = item.isDirectory;
    try {
      const st = await vscode.workspace.fs.stat(uri);
      isDirectory = st.type === vscode.FileType.Directory;
    } catch {
      return { ok: false, error: `'${path.basename(p)}' was not found.` };
    }
    resolved.push({ uri, isDirectory, base: path.basename(p) });
  }

  const { enableTrash, confirmDelete } = workbenchFs.getDeleteFlowSettings();

  if (confirmDelete) {
    const count = resolved.length;
    const names = resolved.map((r) => r.base);
    const nameList =
      names.length <= 5
        ? names.join(', ')
        : `${names.slice(0, 5).join(', ')} and ${names.length - 5} more`;
    const msg = enableTrash
      ? `Are you sure you want to delete the following ${count} items?`
      : `Are you sure you want to permanently delete the following ${count} items?`;
    const detail = enableTrash
      ? `${nameList}\nYou can restore from the Trash later.`
      : `${nameList}\nThis action cannot be undone.`;
    const choice = await vscode.window.showWarningMessage(msg, { modal: true, detail }, 'Delete');
    if (choice !== 'Delete') {
      return { ok: false, error: SIDEBAR_FS_CANCELLED };
    }
  }

  for (const { uri, isDirectory } of resolved) {
    try {
      await vscode.workspace.fs.delete(uri, { recursive: isDirectory, useTrash: enableTrash });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ok: true };
}

export async function handleSidebarFsCreateFile(payload: {
  parentPath: string;
  fileName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parentN = path.normalize(payload.parentPath);
  // Host re-validates names already checked in the webview (defense in depth).
  const nameErr = validateSourceFileBaseName(payload.fileName);
  if (nameErr) {
    return { ok: false, error: nameErr };
  }
  const base = payload.fileName.trim();
  if (!isPathAllowedForWorkspaceOrHome(parentN)) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }

  const parentUri = vscode.Uri.file(parentN);
  try {
    const pst = await vscode.workspace.fs.stat(parentUri);
    if (pst.type !== vscode.FileType.Directory) {
      return { ok: false, error: 'Parent is not a folder.' };
    }
  } catch {
    return { ok: false, error: 'Destination folder does not exist.' };
  }

  const filePath = path.normalize(path.join(parentN, base));
  const parentOfFile = path.dirname(filePath);
  if (parentOfFile !== parentN) {
    return { ok: false, error: 'Enter a valid name.' };
  }
  if (
    !isPathAllowedForWorkspaceOrHome(filePath) ||
    !isPathAllowedForWorkspaceOrHome(parentOfFile)
  ) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }

  const fileUri = vscode.Uri.file(filePath);
  try {
    await vscode.workspace.fs.stat(fileUri);
    return { ok: false, error: 'A file or folder with that name already exists.' };
  } catch {
    // absent — ok
  }

  try {
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function handleSidebarFsCreateFolder(payload: {
  parentPath: string;
  folderName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parentN = path.normalize(payload.parentPath);
  const nameErr = validateSourceFileBaseName(payload.folderName);
  if (nameErr) {
    return { ok: false, error: nameErr };
  }
  const base = payload.folderName.trim();
  if (!isPathAllowedForWorkspaceOrHome(parentN)) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }

  const parentUri = vscode.Uri.file(parentN);
  try {
    const pst = await vscode.workspace.fs.stat(parentUri);
    if (pst.type !== vscode.FileType.Directory) {
      return { ok: false, error: 'Parent is not a folder.' };
    }
  } catch {
    return { ok: false, error: 'Destination folder does not exist.' };
  }

  const folderPath = path.normalize(path.join(parentN, base));
  const parentOfFolder = path.dirname(folderPath);
  if (parentOfFolder !== parentN) {
    return { ok: false, error: 'Enter a valid name.' };
  }
  if (
    !isPathAllowedForWorkspaceOrHome(folderPath) ||
    !isPathAllowedForWorkspaceOrHome(parentOfFolder)
  ) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }

  const folderUri = vscode.Uri.file(folderPath);
  try {
    await vscode.workspace.fs.stat(folderUri);
    return { ok: false, error: 'A file or folder with that name already exists.' };
  } catch {
    // absent — ok
  }

  try {
    await vscode.workspace.fs.createDirectory(folderUri);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
