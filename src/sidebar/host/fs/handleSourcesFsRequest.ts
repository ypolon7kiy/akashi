import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { validateSourceFileBaseName } from '../../bridge/validateSourceFileBaseName';

/**
 * Sidebar tree file ops on the extension host: `workspace.fs` plus `explorer.*` / `files.*` settings
 * for confirmations and trash, and path allowlisting (workspace + home) for safety.
 */

/** Internal: user dismissed a confirm dialog — host maps to a successful no-op response for the webview. */
export const SIDEBAR_FS_CANCELLED = 'SIDEBAR_FS_CANCELLED';

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
 * Allow paths under any workspace folder, or under the user home directory (indexed “user” sources).
 * Prefer VS Code’s workspace containment (URI-aware) when a folder workspace is open; fall back to
 * home-directory prefix checks for indexed user-config paths outside the workspace.
 */
export function isPathAllowedForSidebarFs(fsPath: string): boolean {
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

export async function handleSidebarFsRename(payload: {
  fromPath: string;
  toPath: string;
  confirmDragAndDrop?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const fromN = path.normalize(payload.fromPath);
  const toN = path.normalize(payload.toPath);
  if (!isPathAllowedForSidebarFs(fromN) || !isPathAllowedForSidebarFs(toN)) {
    return { ok: false, error: 'This path cannot be modified from the Akashi sidebar.' };
  }
  const parentTo = path.dirname(toN);
  if (!isPathAllowedForSidebarFs(parentTo)) {
    return { ok: false, error: 'Destination folder is not allowed.' };
  }

  const nameErr = validateSourceFileBaseName(path.basename(toN));
  if (nameErr) {
    return { ok: false, error: nameErr };
  }

  if (payload.confirmDragAndDrop) {
    const ex = vscode.workspace.getConfiguration('explorer');
    if (ex.get<boolean>('confirmDragAndDrop') !== false) {
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

export async function handleSidebarFsDelete(payload: {
  path: string;
  isDirectory: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = path.normalize(payload.path);
  if (!isPathAllowedForSidebarFs(p)) {
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
  const files = vscode.workspace.getConfiguration('files');
  const enableTrash = files.get<boolean>('enableTrash') !== false;
  const explorer = vscode.workspace.getConfiguration('explorer');
  const confirmDelete = explorer.get<boolean>('confirmDelete') !== false;

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
  if (!isPathAllowedForSidebarFs(parentN)) {
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
  if (!isPathAllowedForSidebarFs(filePath) || !isPathAllowedForSidebarFs(parentOfFile)) {
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
  if (!isPathAllowedForSidebarFs(parentN)) {
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
  if (!isPathAllowedForSidebarFs(folderPath) || !isPathAllowedForSidebarFs(parentOfFolder)) {
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
