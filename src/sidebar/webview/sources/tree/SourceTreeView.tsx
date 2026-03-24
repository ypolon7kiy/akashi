/**
 * Indexed sources tree with Explorer-style rename (inline + F2), delete (Del + confirm), drag-move,
 * and a custom context menu (VS Code’s real workbench Explorer menu cannot run inside a webview).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { SourceDescriptor, WorkspaceFolderInfo } from '../../../bridge/sourceDescriptor';
import {
  SourceTreeContextMenu,
  type SourceTreeContextMenuState,
} from '../fs/SourceTreeContextMenu';
import {
  collectVisibleTreeNodes,
  findNodeById,
  findParentTreeNodeId,
  fsOperablePath,
  treeItemDomId,
} from '../fs/sourceTreeExplorerModel';
import { TreeRows, type TreeInteractions } from './SourceTreeRows';
import { buildSourceTree, type TreeNode } from './sourceTree';
import { useSourceTreeDragDrop } from './useSourceTreeDragDrop';
import { useSourceTreeFsState } from './useSourceTreeFsState';

export interface SourceTreeViewProps {
  records: readonly SourceDescriptor[];
  workspaceFolders: readonly WorkspaceFolderInfo[];
  isBusy?: boolean;
}

export function SourceTreeView(props: SourceTreeViewProps): JSX.Element {
  const { records, workspaceFolders, isBusy } = props;

  const roots = useMemo(
    () => buildSourceTree(records, workspaceFolders),
    [records, workspaceFolders]
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<SourceTreeContextMenuState | null>(null);

  const treeRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fs = useSourceTreeFsState({
    roots,
    setSelectedId,
    setContextMenu,
    setExpandedIds,
  });

  const dnd = useSourceTreeDragDrop(fs.runRename);

  useEffect(() => {
    if (roots.length === 0) {
      return;
    }
    setExpandedIds((prev) => {
      if (prev.size > 0) {
        return prev;
      }
      const next = new Set<string>();
      for (const r of roots) {
        if (r.type === 'folder') {
          next.add(r.id);
        }
      }
      return next;
    });
  }, [roots]);

  useEffect(() => {
    if (fs.renamingNodeId && fs.renameInputRef.current) {
      fs.renameInputRef.current.focus();
      fs.renameInputRef.current.select();
    }
  }, [fs.renamingNodeId, fs.renameInputRef]);

  useEffect(() => {
    if (fs.creatingFileParentId && fs.createFileInputRef.current) {
      fs.createFileInputRef.current.focus();
      fs.createFileInputRef.current.select();
    }
  }, [fs.creatingFileParentId, fs.createFileInputRef]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const close = (e: globalThis.MouseEvent): void => {
      if (menuRef.current?.contains(e.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const onToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onRowContextMenu = useCallback((e: MouseEvent, node: TreeNode) => {
    if (!fsOperablePath(node)) {
      return;
    }
    treeRef.current?.focus();
    setSelectedId(node.id);
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const focusTree = useCallback(() => {
    treeRef.current?.focus();
  }, []);

  const ix = useMemo<TreeInteractions>(
    () => ({
      expandedIds,
      onToggle,
      selectedId,
      onSelect: (n) => setSelectedId(n.id),
      focusTree,
      renamingNodeId: fs.renamingNodeId,
      renameDraft: fs.renameDraft,
      setRenameDraft: fs.setRenameDraft,
      onRenameKeyDown: fs.onRenameKeyDown,
      renameInputRef: fs.renameInputRef,
      creatingFileParentId: fs.creatingFileParentId,
      newFileDraft: fs.newFileDraft,
      setNewFileDraft: fs.setNewFileDraft,
      onCreateFileKeyDown: fs.onCreateFileKeyDown,
      createFileInputRef: fs.createFileInputRef,
      onRowContextMenu,
      onDragStartRow: dnd.onDragStartRow,
      onDragOverFolder: dnd.onDragOverFolder,
      onDropOnFolder: dnd.onDropOnFolder,
      dropTargetId: dnd.dropTargetId,
      dragActive: dnd.dragActive,
    }),
    [
      expandedIds,
      onToggle,
      selectedId,
      focusTree,
      fs.renamingNodeId,
      fs.renameDraft,
      fs.setRenameDraft,
      fs.onRenameKeyDown,
      fs.renameInputRef,
      fs.creatingFileParentId,
      fs.newFileDraft,
      fs.setNewFileDraft,
      fs.onCreateFileKeyDown,
      fs.createFileInputRef,
      onRowContextMenu,
      dnd.onDragStartRow,
      dnd.onDragOverFolder,
      dnd.onDropOnFolder,
      dnd.dropTargetId,
      dnd.dragActive,
    ]
  );

  const onTreeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (fs.renamingNodeId || fs.creatingFileParentId) {
        return;
      }
      const visible = collectVisibleTreeNodes(roots, expandedIds);
      const idx = selectedId ? visible.findIndex((n) => n.id === selectedId) : -1;

      if (!selectedId) {
        if (e.key === 'ArrowDown' || e.key === 'Home') {
          if (visible.length > 0) {
            e.preventDefault();
            setSelectedId(visible[0].id);
          }
        } else if (e.key === 'End') {
          if (visible.length > 0) {
            e.preventDefault();
            setSelectedId(visible[visible.length - 1].id);
          }
        }
        return;
      }

      const node = findNodeById(roots, selectedId);
      if (!node) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = visible[idx + 1];
          if (next) {
            setSelectedId(next.id);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = visible[idx - 1];
          if (prev) {
            setSelectedId(prev.id);
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          if (visible.length > 0) {
            setSelectedId(visible[0].id);
          }
          break;
        }
        case 'End': {
          e.preventDefault();
          if (visible.length > 0) {
            setSelectedId(visible[visible.length - 1].id);
          }
          break;
        }
        case 'ArrowRight': {
          if (node.type === 'folder') {
            e.preventDefault();
            if (!expandedIds.has(node.id)) {
              onToggle(node.id);
            } else if (node.children.length > 0) {
              const nextVis = visible[idx + 1];
              if (nextVis && findParentTreeNodeId(roots, nextVis.id) === node.id) {
                setSelectedId(nextVis.id);
              }
            }
          }
          break;
        }
        case 'ArrowLeft': {
          if (node.type === 'folder' && expandedIds.has(node.id)) {
            e.preventDefault();
            onToggle(node.id);
          } else {
            const parentId = findParentTreeNodeId(roots, selectedId);
            if (parentId) {
              e.preventDefault();
              setSelectedId(parentId);
            }
          }
          break;
        }
        case 'F2': {
          if (!fsOperablePath(node)) {
            return;
          }
          e.preventDefault();
          fs.beginRename(node);
          break;
        }
        case 'Delete': {
          if (!fsOperablePath(node)) {
            return;
          }
          e.preventDefault();
          const p = fsOperablePath(node);
          if (p) {
            fs.queueDelete(p, node.type === 'folder');
          }
          break;
        }
        default:
          break;
      }
    },
    [
      fs.renamingNodeId,
      fs.creatingFileParentId,
      fs.beginRename,
      fs.queueDelete,
      selectedId,
      roots,
      expandedIds,
      onToggle,
    ]
  );

  if (records.length === 0) {
    if (isBusy) {
      return <div className="akashi-tree akashi-tree--empty" />;
    }
    return <div className="akashi-tree akashi-tree--empty" />;
  }

  return (
    <div className="akashi-tree akashi-tree--with-fs">
      {fs.fsError ? (
        <p className="akashi-tree__fs-error" role="alert">
          {fs.fsError}
        </p>
      ) : null}
      <div
        ref={treeRef}
        className="akashi-tree__focus-root"
        tabIndex={0}
        role="tree"
        aria-label="Indexed sources"
        aria-activedescendant={
          selectedId && !fs.renamingNodeId && !fs.creatingFileParentId
            ? treeItemDomId(selectedId)
            : undefined
        }
        onKeyDown={onTreeKeyDown}
        onFocus={() => fs.setFsError(null)}
      >
        <ul className="akashi-tree__list akashi-tree__list--root" role="none">
          {roots.map((node) => (
            <TreeRows key={node.id} node={node} depth={0} ix={ix} />
          ))}
        </ul>
      </div>
      <SourceTreeContextMenu
        menuRef={menuRef}
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        beginCreateFile={fs.beginCreateFile}
        beginRename={fs.beginRename}
        runDelete={fs.queueDelete}
      />
    </div>
  );
}
