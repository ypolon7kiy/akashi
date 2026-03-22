import type { DragEvent, KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import { getVscodeApi } from '../../../../webview-shared/api';
import { SidebarMessageType } from '../../../bridge/messages';
import { sidebarCategoryLabel, sidebarCategoryMetaModifier } from './categorySidebarLabel';
import type { TreeNode } from './sourceTree';
import { fsOperablePath, treeItemDomId } from '../fs/sourceTreeExplorerModel';

function ChevronIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return (
    <span
      className={`codicon codicon-chevron-right akashi-tree__chevron${expanded ? ' akashi-tree__chevron--expanded' : ''}`}
      aria-hidden
    />
  );
}

export interface TreeInteractions {
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  focusTree: () => void;
  renamingNodeId: string | null;
  renameDraft: string;
  setRenameDraft: (v: string) => void;
  onRenameKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  renameInputRef: MutableRefObject<HTMLInputElement | null>;
  creatingFileParentId: string | null;
  newFileDraft: string;
  setNewFileDraft: (v: string) => void;
  onCreateFileKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  createFileInputRef: MutableRefObject<HTMLInputElement | null>;
  onRowContextMenu: (e: MouseEvent, node: TreeNode) => void;
  onDragStartRow: (e: DragEvent, node: TreeNode) => void;
  onDragOverFolder: (e: DragEvent, node: TreeNode) => void;
  onDropOnFolder: (e: DragEvent, node: TreeNode) => void;
  dropTargetId: string | null;
  dragActive: boolean;
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  ix: TreeInteractions;
}

export function TreeRows(props: TreeRowProps): JSX.Element {
  const { node, depth, ix } = props;
  const pad = `calc(var(--akashi-tree-indent-base) + ${depth} * var(--akashi-tree-indent-step))`;
  const opPath = fsOperablePath(node);
  const canFs = opPath !== null;
  const isRenaming = ix.renamingNodeId === node.id;
  const isSelected = ix.selectedId === node.id;
  const isDropTarget = node.type === 'folder' && ix.dropTargetId === node.id && ix.dragActive;

  if (node.type === 'file') {
    const presetLine = node.presets.length > 0 ? `\nPresets: ${node.presets.join(', ')}` : '';
    const categoriesLine =
      node.categories.length > 1 ? `\nCategories: ${node.categories.join(', ')}` : '';
    const categoryDisplay = sidebarCategoryLabel(node.categoryValue);
    const categoryMod = sidebarCategoryMetaModifier(node.categoryValue);
    const categoryHint =
      categoryDisplay !== node.categoryValue ? `\nCategory: ${node.categoryValue}` : '';
    const title = `${node.path}\n${node.categoryValue}${categoryHint}${presetLine}${categoriesLine}`;

    return (
      <li className="akashi-tree__item" role="none">
        <div
          id={treeItemDomId(node.id)}
          role="treeitem"
          tabIndex={-1}
          aria-selected={isSelected}
          draggable={canFs && !isRenaming}
          className={`akashi-tree__row akashi-tree__row--file${isSelected ? ' akashi-tree__row--selected' : ''}${isDropTarget ? ' akashi-tree__row--drop-target' : ''}`}
          style={{ paddingLeft: pad }}
          title={title}
          onClick={() => {
            ix.focusTree();
            ix.onSelect(node);
            getVscodeApi()?.postMessage({
              type: SidebarMessageType.SourcesOpenPath,
              payload: { path: node.path },
            });
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ix.onRowContextMenu(e, node);
          }}
          onDragStart={(e) => ix.onDragStartRow(e, node)}
        >
          <span className="akashi-tree__chevron-spacer" aria-hidden />
          {isRenaming ? (
            <input
              ref={ix.renameInputRef}
              className="akashi-tree__rename-input"
              value={ix.renameDraft}
              aria-label="Rename"
              onChange={(e) => ix.setRenameDraft(e.target.value)}
              onKeyDown={ix.onRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="akashi-tree__label">{node.label}</span>
              <span className={`akashi-tree__meta akashi-tree__meta--cat-${categoryMod}`}>
                {categoryDisplay}
              </span>
            </>
          )}
        </div>
      </li>
    );
  }

  const expanded = ix.expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  return (
    <li className="akashi-tree__item" role="none">
      <div
        id={treeItemDomId(node.id)}
        role="treeitem"
        tabIndex={-1}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        draggable={canFs && !isRenaming}
        className={`akashi-tree__row akashi-tree__row--folder${isSelected ? ' akashi-tree__row--selected' : ''}${isDropTarget ? ' akashi-tree__row--drop-target' : ''}`}
        style={{ paddingLeft: pad }}
        onClick={() => {
          ix.focusTree();
          ix.onSelect(node);
          ix.onToggle(node.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ix.onRowContextMenu(e, node);
        }}
        onDragStart={(e) => ix.onDragStartRow(e, node)}
        onDragOver={(e) => ix.onDragOverFolder(e, node)}
        onDrop={(e) => ix.onDropOnFolder(e, node)}
      >
        <ChevronIcon expanded={expanded} />
        {isRenaming ? (
          <input
            ref={ix.renameInputRef}
            className="akashi-tree__rename-input"
            value={ix.renameDraft}
            aria-label="Rename folder"
            onChange={(e) => ix.setRenameDraft(e.target.value)}
            onKeyDown={ix.onRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="akashi-tree__label">{node.label}</span>
        )}
      </div>
      {expanded ? (
        <ul className="akashi-tree__list" role="group">
          {ix.creatingFileParentId === node.id && node.dirPath ? (
            <li className="akashi-tree__item" role="none">
              <div
                className="akashi-tree__row akashi-tree__row--new-file"
                style={{
                  paddingLeft: `calc(var(--akashi-tree-indent-base) + ${depth + 1} * var(--akashi-tree-indent-step))`,
                }}
              >
                <span className="akashi-tree__chevron-spacer" aria-hidden />
                <input
                  ref={ix.createFileInputRef}
                  className="akashi-tree__rename-input"
                  value={ix.newFileDraft}
                  placeholder="Filename"
                  aria-label="New file name"
                  onChange={(e) => ix.setNewFileDraft(e.target.value)}
                  onKeyDown={ix.onCreateFileKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </li>
          ) : null}
          {node.children.map((child) => (
            <TreeRows key={child.id} node={child} depth={depth + 1} ix={ix} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
