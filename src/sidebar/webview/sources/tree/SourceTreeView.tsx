/**
 * Indexed sources tree with Explorer-style rename (inline + F2), delete (Del + confirm), drag-move,
 * and a custom context menu (VS Code's real workbench Explorer menu cannot run inside a webview).
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
import { getVscodeApi } from '../../../../webview-shared/api';
import { SidebarMessageType } from '../../../bridge/messages';
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
import {
  EMPTY_SELECTION,
  isPlatformMultiSelectKey,
  selectAll,
  selectExtendFocus,
  selectMoveFocus,
  selectNone,
  selectRange,
  selectSingle,
  selectToggle,
  type TreeSelectionState,
} from './treeSelection';
import { useSourceTreeDragDrop } from './useSourceTreeDragDrop';
import { useSourceTreeFsState } from './useSourceTreeFsState';

export interface SourceTreeViewProps {
  records: readonly SourceDescriptor[];
  workspaceFolders: readonly WorkspaceFolderInfo[];
  isBusy?: boolean;
  /** When provided, only these (pre-filtered) roots are rendered and navigable. */
  filteredRoots?: readonly TreeNode[];
}

export function SourceTreeView(props: SourceTreeViewProps): JSX.Element {
  const { records, workspaceFolders, isBusy, filteredRoots } = props;

  const roots = useMemo(
    () => buildSourceTree(records, workspaceFolders),
    [records, workspaceFolders]
  );

  /** Roots used for rendering and navigation — filtered when search is active. */
  const displayRoots = filteredRoots ?? roots;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selection, setSelection] = useState<TreeSelectionState>(EMPTY_SELECTION);
  const [contextMenu, setContextMenu] = useState<SourceTreeContextMenuState | null>(null);

  const { selectedIds, focusedId } = selection;

  const treeRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const clearSelection = useCallback(() => setSelection(EMPTY_SELECTION), []);

  const fs = useSourceTreeFsState({
    roots,
    clearSelection,
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

  // Scroll the focused row into view on keyboard navigation.
  useEffect(() => {
    if (!focusedId) {
      return;
    }
    const el = document.getElementById(treeItemDomId(focusedId));
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedId]);

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

  const onRowClick = useCallback(
    (node: TreeNode, e: MouseEvent) => {
      const visibleIds = collectVisibleTreeNodes(displayRoots, expandedIds).map((n) => n.id);

      if (e.shiftKey) {
        setSelection((prev) => selectRange(prev, node.id, visibleIds));
      } else if (isPlatformMultiSelectKey(e)) {
        setSelection((prev) => selectToggle(prev, node.id));
      } else {
        setSelection(selectSingle(node.id));
        if (node.type === 'file') {
          getVscodeApi()?.postMessage({
            type: SidebarMessageType.SourcesOpenPath,
            payload: { path: node.path },
          });
        }
      }
    },
    [displayRoots, expandedIds]
  );

  const onRowContextMenu = useCallback((e: MouseEvent, node: TreeNode) => {
    if (!fsOperablePath(node)) {
      return;
    }
    treeRef.current?.focus();
    // If the right-clicked node is already selected, keep the multi-selection.
    // Otherwise, select only the right-clicked node (VS Code behavior).
    setSelection((prev) => {
      if (prev.selectedIds.has(node.id)) {
        return { ...prev, focusedId: node.id };
      }
      return selectSingle(node.id);
    });
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const focusTree = useCallback(() => {
    treeRef.current?.focus();
  }, []);

  const ix = useMemo<TreeInteractions>(
    () => ({
      expandedIds,
      onToggle,
      selectedIds,
      focusedId,
      onRowClick,
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
      selectedIds,
      focusedId,
      onRowClick,
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
      const visible = collectVisibleTreeNodes(displayRoots, expandedIds);
      const visibleIds = visible.map((n) => n.id);
      const idx = focusedId ? visible.findIndex((n) => n.id === focusedId) : -1;

      if (!focusedId) {
        if (e.key === 'ArrowDown' || e.key === 'Home') {
          if (visible.length > 0) {
            e.preventDefault();
            setSelection(selectMoveFocus(visible[0].id));
          }
        } else if (e.key === 'End') {
          if (visible.length > 0) {
            e.preventDefault();
            setSelection(selectMoveFocus(visible[visible.length - 1].id));
          }
        }
        return;
      }

      const node = findNodeById(roots, focusedId);
      if (!node) {
        return;
      }

      // Ctrl/Cmd+A: select all visible
      if (e.key === 'a' && isPlatformMultiSelectKey(e)) {
        e.preventDefault();
        setSelection(selectAll(visibleIds));
        return;
      }

      // Escape: clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelection(selectNone());
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = visible[idx + 1];
          if (next) {
            if (e.shiftKey) {
              setSelection((prev) => selectExtendFocus(prev, next.id, visibleIds));
            } else {
              setSelection(selectMoveFocus(next.id));
            }
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = visible[idx - 1];
          if (prev) {
            if (e.shiftKey) {
              setSelection((p) => selectExtendFocus(p, prev.id, visibleIds));
            } else {
              setSelection(selectMoveFocus(prev.id));
            }
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          if (visible.length > 0) {
            if (e.shiftKey) {
              setSelection((prev) => selectExtendFocus(prev, visible[0].id, visibleIds));
            } else {
              setSelection(selectMoveFocus(visible[0].id));
            }
          }
          break;
        }
        case 'End': {
          e.preventDefault();
          if (visible.length > 0) {
            const last = visible[visible.length - 1];
            if (e.shiftKey) {
              setSelection((prev) => selectExtendFocus(prev, last.id, visibleIds));
            } else {
              setSelection(selectMoveFocus(last.id));
            }
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
                setSelection(selectMoveFocus(nextVis.id));
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
            const parentId = findParentTreeNodeId(roots, focusedId);
            if (parentId) {
              e.preventDefault();
              setSelection(selectMoveFocus(parentId));
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
          e.preventDefault();
          const deleteItems: { path: string; isDirectory: boolean }[] = [];
          for (const sid of selectedIds) {
            const sNode = findNodeById(roots, sid);
            if (!sNode) {
              continue;
            }
            const p = fsOperablePath(sNode);
            if (p) {
              deleteItems.push({ path: p, isDirectory: sNode.type === 'folder' });
            }
          }
          if (deleteItems.length === 1) {
            fs.queueDelete(deleteItems[0].path, deleteItems[0].isDirectory);
          } else if (deleteItems.length > 1) {
            fs.queueBatchDelete(deleteItems);
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
      fs.queueBatchDelete,
      focusedId,
      selectedIds,
      roots,
      displayRoots,
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
        aria-multiselectable="true"
        aria-activedescendant={
          focusedId && !fs.renamingNodeId && !fs.creatingFileParentId
            ? treeItemDomId(focusedId)
            : undefined
        }
        onKeyDown={onTreeKeyDown}
        onFocus={() => fs.setFsError(null)}
      >
        <ul className="akashi-tree__list akashi-tree__list--root" role="none">
          {displayRoots.map((node) => (
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
        selectedIds={selectedIds}
        runBatchDelete={fs.queueBatchDelete}
        roots={roots}
      />
    </div>
  );
}
