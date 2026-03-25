import type { TreeNode } from './sourceTree';

/**
 * Recursively prunes a source tree, keeping only file nodes whose path is
 * in `matchedPaths` and folder nodes that have at least one surviving descendant.
 * Returns a new tree (immutable — never mutates the input).
 */
export function filterSourceTree(
  roots: readonly TreeNode[],
  matchedPaths: ReadonlySet<string>,
): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of roots) {
    if (node.type === 'file') {
      if (matchedPaths.has(node.path)) {
        result.push(node);
      }
    } else {
      const filteredChildren = filterSourceTree(node.children, matchedPaths);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }
  return result;
}
