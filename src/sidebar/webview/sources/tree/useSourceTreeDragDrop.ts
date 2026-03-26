import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  AKASHI_TREE_DRAG_MIME,
  fsOperablePath,
  isPathStrictInside,
} from '../fs/sourceTreeExplorerModel';
import { basenameFsPath, joinDirSegment, type TreeNode } from './sourceTree';

/**
 * Drag-move within the sources tree. Webview MIME / path checks are UX only; the extension host
 * enforces real safety via `isPathAllowedForWorkspaceOrHome` (shared) / sidebar FS host.
 */
export interface UseSourceTreeDragDropResult {
  readonly dropTargetId: string | null;
  readonly dragActive: boolean;
  readonly onDragStartRow: (e: DragEvent, node: TreeNode) => void;
  readonly onDragOverFolder: (e: DragEvent, node: TreeNode) => void;
  readonly onDropOnFolder: (e: DragEvent, node: TreeNode) => void;
}

export function useSourceTreeDragDrop(
  runRename: (fromPath: string, toPath: string, confirmDragAndDrop?: boolean) => Promise<void>
): UseSourceTreeDragDropResult {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  /** `getData` is only available on `drop` in many browsers; use ref for drag-over validation. */
  const dragSourceRef = useRef<{ path: string; isDirectory: boolean } | null>(null);

  useEffect(() => {
    const onDragEnd = (): void => {
      dragSourceRef.current = null;
      setDropTargetId(null);
      setDragActive(false);
    };
    window.addEventListener('dragend', onDragEnd);
    return () => window.removeEventListener('dragend', onDragEnd);
  }, []);

  const onDragStartRow = useCallback((e: DragEvent, node: TreeNode) => {
    const p = fsOperablePath(node);
    if (!p || !e.dataTransfer) {
      e.preventDefault();
      return;
    }
    const isDirectory = node.type === 'folder';
    dragSourceRef.current = { path: p, isDirectory };
    const payload = JSON.stringify({ path: p, isDirectory });
    e.dataTransfer.setData(AKASHI_TREE_DRAG_MIME, payload);
    e.dataTransfer.setData('text/plain', p);
    e.dataTransfer.effectAllowed = 'move';
    setDragActive(true);
  }, []);

  const onDragOverFolder = useCallback((e: DragEvent, node: TreeNode) => {
    if (node.type !== 'folder' || !node.dirPath) {
      return;
    }
    const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
    if (!types.includes(AKASHI_TREE_DRAG_MIME)) {
      return;
    }
    const src = dragSourceRef.current;
    if (!src) {
      return;
    }
    if (src.isDirectory && isPathStrictInside(src.path, node.dirPath)) {
      return;
    }
    const dt = e.dataTransfer;
    if (!dt) {
      return;
    }
    e.preventDefault();
    dt.dropEffect = 'move';
    setDropTargetId(node.id);
  }, []);

  const onDropOnFolder = useCallback(
    (e: DragEvent, node: TreeNode) => {
      e.preventDefault();
      setDropTargetId(null);
      setDragActive(false);
      if (node.type !== 'folder' || !node.dirPath) {
        return;
      }
      const raw = e.dataTransfer?.getData(AKASHI_TREE_DRAG_MIME);
      if (!raw) {
        return;
      }
      let fromPath = '';
      let fromIsDir = false;
      try {
        const j = JSON.parse(raw) as { path?: string; isDirectory?: boolean };
        fromPath = typeof j.path === 'string' ? j.path : '';
        fromIsDir = j.isDirectory === true;
      } catch {
        return;
      }
      if (!fromPath) {
        return;
      }
      if (fromIsDir && isPathStrictInside(fromPath, node.dirPath)) {
        return;
      }
      const base = basenameFsPath(fromPath);
      const toPath = joinDirSegment(node.dirPath, base);
      if (toPath === fromPath) {
        return;
      }
      void runRename(fromPath, toPath, true);
    },
    [runRename]
  );

  return {
    dropTargetId,
    dragActive,
    onDragStartRow,
    onDragOverFolder,
    onDropOnFolder,
  };
}
