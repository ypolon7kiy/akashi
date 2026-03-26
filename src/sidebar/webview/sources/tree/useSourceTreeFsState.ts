import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { getVscodeApi } from '../../../../webview-shared/api';
import { validateSourceFileBaseName } from '../../../bridge/validateSourceFileBaseName';
import {
  postSidebarFsBatchDelete,
  postSidebarFsCreateFile,
  postSidebarFsDelete,
  postSidebarFsRename,
} from '../fs/postSidebarFsRpc';
import type { SourceTreeContextMenuState } from '../fs/SourceTreeContextMenu';
import { findNodeById, fsOperablePath } from '../fs/sourceTreeExplorerModel';
import { dirnameFsPath, joinDirSegment, type TreeNode } from './sourceTree';

export interface UseSourceTreeFsStateArgs {
  readonly roots: readonly TreeNode[];
  readonly clearSelection: () => void;
  readonly setContextMenu: Dispatch<SetStateAction<SourceTreeContextMenuState | null>>;
  readonly setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
}

export interface UseSourceTreeFsStateResult {
  readonly fsError: string | null;
  readonly setFsError: Dispatch<SetStateAction<string | null>>;
  readonly renamingNodeId: string | null;
  readonly renameDraft: string;
  readonly setRenameDraft: Dispatch<SetStateAction<string>>;
  readonly creatingFileParentId: string | null;
  readonly newFileDraft: string;
  readonly setNewFileDraft: Dispatch<SetStateAction<string>>;
  readonly renameInputRef: MutableRefObject<HTMLInputElement | null>;
  readonly createFileInputRef: MutableRefObject<HTMLInputElement | null>;
  readonly runRename: (
    fromPath: string,
    toPath: string,
    confirmDragAndDrop?: boolean
  ) => Promise<void>;
  readonly queueDelete: (path: string, isDirectory: boolean) => void;
  readonly queueBatchDelete: (items: readonly { path: string; isDirectory: boolean }[]) => void;
  readonly beginRename: (node: TreeNode) => void;
  readonly commitRename: () => void;
  readonly cancelRename: () => void;
  readonly beginCreateFile: (node: TreeNode) => void;
  readonly commitCreateFile: () => void;
  readonly cancelCreateFile: () => void;
  readonly onRenameKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  readonly onCreateFileKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function useSourceTreeFsState(args: UseSourceTreeFsStateArgs): UseSourceTreeFsStateResult {
  const { roots, clearSelection, setContextMenu, setExpandedIds } = args;

  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [creatingFileParentId, setCreatingFileParentId] = useState<string | null>(null);
  const [newFileDraft, setNewFileDraft] = useState('');
  const [fsError, setFsError] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const runRename = useCallback(
    async (fromPath: string, toPath: string, confirmDragAndDrop?: boolean) => {
      const vscode = getVscodeApi();
      if (!vscode) {
        return;
      }
      const out = await postSidebarFsRename(vscode, fromPath, toPath, confirmDragAndDrop);
      if (out.kind === 'cancelled') {
        return;
      }
      if (out.kind === 'error') {
        setFsError(out.message);
        return;
      }
      setFsError(null);
      setRenamingNodeId(null);
    },
    []
  );

  const runDelete = useCallback(
    async (path: string, isDirectory: boolean) => {
      const vscode = getVscodeApi();
      if (!vscode) {
        return;
      }
      const out = await postSidebarFsDelete(vscode, path, isDirectory);
      if (out.kind === 'cancelled') {
        return;
      }
      if (out.kind === 'error') {
        setFsError(out.message);
        return;
      }
      setFsError(null);
      clearSelection();
    },
    [clearSelection]
  );

  const runCreateFile = useCallback(async (parentPath: string, fileName: string) => {
    const vscode = getVscodeApi();
    if (!vscode) {
      return;
    }
    const out = await postSidebarFsCreateFile(vscode, parentPath, fileName);
    if (out.kind === 'cancelled') {
      return;
    }
    if (out.kind === 'error') {
      setFsError(out.message);
      return;
    }
    setFsError(null);
    setCreatingFileParentId(null);
    setNewFileDraft('');
  }, []);

  const queueDelete = useCallback(
    (path: string, isDirectory: boolean) => {
      void runDelete(path, isDirectory);
    },
    [runDelete]
  );

  const runBatchDelete = useCallback(
    async (items: readonly { path: string; isDirectory: boolean }[]) => {
      const vscode = getVscodeApi();
      if (!vscode) {
        return;
      }
      const out = await postSidebarFsBatchDelete(vscode, items);
      if (out.kind === 'cancelled') {
        return;
      }
      if (out.kind === 'error') {
        setFsError(out.message);
        return;
      }
      setFsError(null);
      clearSelection();
    },
    [clearSelection]
  );

  const queueBatchDelete = useCallback(
    (items: readonly { path: string; isDirectory: boolean }[]) => {
      void runBatchDelete(items);
    },
    [runBatchDelete]
  );

  const beginRename = useCallback(
    (node: TreeNode) => {
      const p = fsOperablePath(node);
      if (!p) {
        return;
      }
      setContextMenu(null);
      setFsError(null);
      setCreatingFileParentId(null);
      setNewFileDraft('');
      setRenamingNodeId(node.id);
      if (node.type === 'file') {
        setRenameDraft(node.fileBaseName);
      } else {
        setRenameDraft(node.label);
      }
    },
    [setContextMenu]
  );

  const commitRename = useCallback(() => {
    if (!renamingNodeId) {
      return;
    }
    const node = findNodeById(roots, renamingNodeId);
    if (!node) {
      setRenamingNodeId(null);
      return;
    }
    const fromPath = fsOperablePath(node);
    if (!fromPath) {
      setRenamingNodeId(null);
      return;
    }
    const err = validateSourceFileBaseName(renameDraft);
    if (err) {
      setFsError(err);
      return;
    }
    const t = renameDraft.trim();
    const parent = dirnameFsPath(fromPath);
    const toPath = joinDirSegment(parent, t);
    if (toPath === fromPath) {
      setRenamingNodeId(null);
      return;
    }
    void runRename(fromPath, toPath, false);
  }, [renamingNodeId, renameDraft, roots, runRename]);

  const cancelRename = useCallback(() => {
    setRenamingNodeId(null);
    setFsError(null);
  }, []);

  const beginCreateFile = useCallback(
    (node: TreeNode) => {
      if (node.type !== 'folder' || !node.dirPath) {
        return;
      }
      setContextMenu(null);
      setFsError(null);
      setRenamingNodeId(null);
      setRenameDraft('');
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
      setCreatingFileParentId(node.id);
      setNewFileDraft('');
    },
    [setContextMenu, setExpandedIds]
  );

  const commitCreateFile = useCallback(() => {
    if (!creatingFileParentId) {
      return;
    }
    const folder = findNodeById(roots, creatingFileParentId);
    if (folder?.type !== 'folder' || !folder.dirPath) {
      setCreatingFileParentId(null);
      setNewFileDraft('');
      return;
    }
    const err = validateSourceFileBaseName(newFileDraft);
    if (err) {
      setFsError(err);
      return;
    }
    const t = newFileDraft.trim();
    void runCreateFile(folder.dirPath, t);
  }, [creatingFileParentId, newFileDraft, roots, runCreateFile]);

  const cancelCreateFile = useCallback(() => {
    setCreatingFileParentId(null);
    setNewFileDraft('');
    setFsError(null);
  }, []);

  const onCreateFileKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCreateFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelCreateFile();
      }
    },
    [commitCreateFile, cancelCreateFile]
  );

  const onRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename();
      }
    },
    [commitRename, cancelRename]
  );

  return {
    fsError,
    setFsError,
    renamingNodeId,
    renameDraft,
    setRenameDraft,
    creatingFileParentId,
    newFileDraft,
    setNewFileDraft,
    renameInputRef,
    createFileInputRef,
    runRename,
    queueDelete,
    queueBatchDelete,
    beginRename,
    commitRename,
    cancelRename,
    beginCreateFile,
    commitCreateFile,
    cancelCreateFile,
    onRenameKeyDown,
    onCreateFileKeyDown,
  };
}
