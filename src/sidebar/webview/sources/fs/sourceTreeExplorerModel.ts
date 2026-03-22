import type { TreeNode } from '../tree/sourceTree';

/**
 * Custom MIME type for tree row drag data (same webview only).
 */
export const AKASHI_TREE_DRAG_MIME = 'application/vnd.akashi.sources-tree';

export function findNodeById(nodes: readonly TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) {
      return n;
    }
    if (n.type === 'folder') {
      const c = findNodeById(n.children, id);
      if (c) {
        return c;
      }
    }
  }
  return null;
}

export function fsOperablePath(node: TreeNode): string | null {
  if (node.type === 'file') {
    return node.path;
  }
  return node.dirPath ?? null;
}

/** True if `inner` is a strict path descendant of `outer` (forward-slash normalized). */
export function isPathStrictInside(outer: string, inner: string): boolean {
  const o = outer.replace(/\\/g, '/').replace(/\/+$/, '');
  const i = inner.replace(/\\/g, '/').replace(/\/+$/, '');
  if (o === i) {
    return false;
  }
  const prefix = o.endsWith('/') ? o : `${o}/`;
  return i.startsWith(prefix);
}

/** Depth-first list of visible rows (respects `expandedIds` on folders). */
export function collectVisibleTreeNodes(
  nodes: readonly TreeNode[],
  expandedIds: ReadonlySet<string>,
  out: TreeNode[] = []
): TreeNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.type === 'folder' && expandedIds.has(n.id)) {
      collectVisibleTreeNodes(n.children, expandedIds, out);
    }
  }
  return out;
}

/** Parent folder row id, or `null` if `childId` is a top-level root or not found. */
export function findParentTreeNodeId(nodes: readonly TreeNode[], childId: string): string | null {
  for (const n of nodes) {
    if (n.type === 'folder') {
      for (const c of n.children) {
        if (c.id === childId) {
          return n.id;
        }
      }
      const deeper = findParentTreeNodeId(n.children, childId);
      if (deeper !== null) {
        return deeper;
      }
    }
  }
  return null;
}

/** Stable DOM id for `aria-activedescendant` (must match between tree and rows). */
export function treeItemDomId(nodeId: string): string {
  return `akashi-treeitem-${encodeURIComponent(nodeId)}`;
}
