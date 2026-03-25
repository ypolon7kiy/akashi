import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { getVscodeApi } from '../../../../webview-shared/api';
import { SidebarMessageType } from '../../../bridge/messages';
import type { TreeNode } from '../tree/sourceTree';
import { findNodeById, fsOperablePath } from './sourceTreeExplorerModel';

export interface SourceTreeContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly node: TreeNode;
}

export interface SourceTreeContextMenuProps {
  readonly menuRef: RefObject<HTMLDivElement>;
  readonly contextMenu: SourceTreeContextMenuState | null;
  readonly onClose: () => void;
  readonly beginCreateFile: (node: TreeNode) => void;
  readonly beginRename: (node: TreeNode) => void;
  readonly runDelete: (path: string, isDirectory: boolean) => void;
  readonly selectedIds: ReadonlySet<string>;
  readonly runBatchDelete: (items: ReadonlyArray<{ path: string; isDirectory: boolean }>) => void;
  readonly roots: readonly TreeNode[];
}

function clampMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  const margin = 6;
  const maxX = window.innerWidth - width - margin;
  const maxY = window.innerHeight - height - margin;
  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, maxX)),
    y: Math.min(Math.max(margin, y), Math.max(margin, maxY)),
  };
}

export function SourceTreeContextMenu(props: SourceTreeContextMenuProps): JSX.Element | null {
  const { menuRef, contextMenu, onClose, beginCreateFile, beginRename, runDelete, selectedIds, runBatchDelete, roots } = props;
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!contextMenu) {
      return;
    }
    const el = menuRef.current;
    if (!el) {
      setPos({ x: contextMenu.x, y: contextMenu.y });
      return;
    }
    el.style.visibility = 'hidden';
    el.style.left = `${contextMenu.x}px`;
    el.style.top = `${contextMenu.y}px`;
    const r = el.getBoundingClientRect();
    const next = clampMenuPosition(contextMenu.x, contextMenu.y, r.width, r.height);
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.visibility = '';
    setPos(next);
  }, [contextMenu, menuRef]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const el = menuRef.current;
    if (!el) {
      return;
    }
    const items = (): HTMLButtonElement[] =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
    const focusAt = (index: number): void => {
      const list = items();
      if (list.length === 0) {
        return;
      }
      const i = ((index % list.length) + list.length) % list.length;
      list[i]?.focus();
    };
    requestAnimationFrame(() => {
      focusAt(0);
    });

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      const list = items();
      if (list.length === 0) {
        return;
      }
      const active = document.activeElement;
      let current = list.findIndex((b) => b === active);
      if (current < 0) {
        current = 0;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusAt(current + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusAt(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusAt(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusAt(list.length - 1);
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [contextMenu, menuRef, onClose]);

  if (!contextMenu || !fsOperablePath(contextMenu.node)) {
    return null;
  }

  const node = contextMenu.node;

  return (
    <div
      ref={menuRef}
      className="akashi-tree-context"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      aria-label="Source actions"
    >
      {node.type === 'file' ? (
        <button
          type="button"
          className="akashi-tree-context__item"
          role="menuitem"
          onClick={() => {
            const p = node.type === 'file' ? node.path : '';
            onClose();
            if (p) {
              getVscodeApi()?.postMessage({
                type: SidebarMessageType.SourcesOpenPath,
                payload: { path: p },
              });
            }
          }}
        >
          <span className="codicon codicon-go-to-file" aria-hidden />
          Open
        </button>
      ) : null}
      {node.type === 'file' ? <div className="akashi-tree-context__sep" role="separator" /> : null}
      {node.type === 'folder' && node.dirPath ? (
        <>
          <button
            type="button"
            className="akashi-tree-context__item"
            role="menuitem"
            onClick={() => {
              onClose();
              beginCreateFile(node);
            }}
          >
            <span className="codicon codicon-new-file" aria-hidden />
            New File
          </button>
          <div className="akashi-tree-context__sep" role="separator" />
        </>
      ) : null}
      <button
        type="button"
        className="akashi-tree-context__item"
        role="menuitem"
        onClick={() => {
          onClose();
          beginRename(node);
        }}
      >
        <span className="codicon codicon-edit" aria-hidden />
        Rename
      </button>
      <div className="akashi-tree-context__sep" role="separator" />
      <button
        type="button"
        className="akashi-tree-context__item"
        role="menuitem"
        onClick={() => {
          const p = fsOperablePath(node);
          onClose();
          if (p) {
            getVscodeApi()?.postMessage({
              type: SidebarMessageType.SourcesRevealInExplorer,
              payload: { path: p },
            });
          }
        }}
      >
        <span className="codicon codicon-folder-opened" aria-hidden />
        Reveal in Explorer View
      </button>
      <button
        type="button"
        className="akashi-tree-context__item"
        role="menuitem"
        onClick={() => {
          const p = fsOperablePath(node);
          onClose();
          if (p) {
            getVscodeApi()?.postMessage({
              type: SidebarMessageType.SourcesRevealFileInOs,
              payload: { path: p },
            });
          }
        }}
      >
        <span className="codicon codicon-link-external" aria-hidden />
        Open Containing Folder
      </button>
      <div className="akashi-tree-context__sep" role="separator" />
      <button
        type="button"
        className="akashi-tree-context__item akashi-tree-context__item--danger"
        role="menuitem"
        onClick={() => {
          onClose();
          // When the right-clicked node is part of a multi-selection, delete all selected items.
          if (selectedIds.has(node.id) && selectedIds.size > 1) {
            const items: Array<{ path: string; isDirectory: boolean }> = [];
            for (const sid of selectedIds) {
              const sNode = findNodeById(roots, sid);
              if (!sNode) {
                continue;
              }
              const p = fsOperablePath(sNode);
              if (p) {
                items.push({ path: p, isDirectory: sNode.type === 'folder' });
              }
            }
            if (items.length > 1) {
              runBatchDelete(items);
            } else if (items.length === 1) {
              runDelete(items[0].path, items[0].isDirectory);
            }
          } else {
            const p = fsOperablePath(node);
            if (p) {
              runDelete(p, node.type === 'folder');
            }
          }
        }}
      >
        <span className="codicon codicon-trash" aria-hidden />
        Delete
      </button>
    </div>
  );
}
