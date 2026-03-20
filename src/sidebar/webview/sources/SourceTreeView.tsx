import { useCallback, useEffect, useMemo, useState } from 'react';
import { getVscodeApi } from '../../../webview-shared/api';
import type { SourceDescriptor, WorkspaceFolderInfo } from '../../bridge/sourceDescriptor';
import { SidebarMessageType } from '../../bridge/messages';
import { buildSourceTree, type TreeNode } from './sourceTree';

function ChevronIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return (
    <span
      className={`codicon codicon-chevron-right akashi-tree__chevron${expanded ? ' akashi-tree__chevron--expanded' : ''}`}
      aria-hidden
    />
  );
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
}

function TreeRows(props: TreeRowProps): JSX.Element {
  const { node, depth, expandedIds, onToggle, selectedFileId, onSelectFile } = props;

  if (node.type === 'file') {
    const title = `${node.path}\n${node.kind} · ${node.blockCount} block(s)`;
    const pad = `calc(var(--akashi-tree-indent-base) + ${depth} * var(--akashi-tree-indent-step))`;
    const isSelected = selectedFileId === node.id;
    return (
      <li className="akashi-tree__item" role="none">
        <button
          type="button"
          className={`akashi-tree__row akashi-tree__row--file${isSelected ? ' akashi-tree__row--selected' : ''}`}
          style={{ paddingLeft: pad }}
          title={title}
          onClick={() => {
            onSelectFile(node.id);
            const vscode = getVscodeApi();
            vscode?.postMessage({
              type: SidebarMessageType.SourcesOpenPath,
              payload: { path: node.path },
            });
          }}
        >
          <span className="akashi-tree__chevron-spacer" aria-hidden />
          <span className="akashi-tree__label">{node.label}</span>
          <span className="akashi-tree__meta">{node.kind}</span>
        </button>
      </li>
    );
  }

  const expanded = expandedIds.has(node.id);
  const pad = `calc(var(--akashi-tree-indent-base) + ${depth} * var(--akashi-tree-indent-step))`;
  return (
    <li className="akashi-tree__item" role="none">
      <button
        type="button"
        className="akashi-tree__row akashi-tree__row--folder"
        style={{ paddingLeft: pad }}
        aria-expanded={expanded}
        onClick={() => {
          onToggle(node.id);
        }}
      >
        <ChevronIcon expanded={expanded} />
        <span className="akashi-tree__label">{node.label}</span>
      </button>
      {expanded ? (
        <ul className="akashi-tree__list" role="group">
          {node.children.map((child) => (
            <TreeRows
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

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
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

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

  const onSelectFile = useCallback((id: string) => {
    setSelectedFileId(id);
  }, []);

  if (records.length === 0) {
    return (
      <div className="akashi-tree akashi-tree--empty">
        <p className="akashi-tree__empty-title">No indexed sources yet</p>
        <p className="akashi-tree__empty-hint">
          {isBusy ? 'Indexing…' : 'Run “Index sources” after opening a workspace.'}
        </p>
      </div>
    );
  }

  return (
    <div className="akashi-tree">
      <ul className="akashi-tree__list akashi-tree__list--root" role="tree">
        {roots.map((node) => (
          <TreeRows
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            onToggle={onToggle}
            selectedFileId={selectedFileId}
            onSelectFile={onSelectFile}
          />
        ))}
      </ul>
    </div>
  );
}
