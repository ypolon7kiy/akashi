import type { GraphEdge3D } from '../domain/graphTypes';

/**
 * The sources graph builder emits a tree along `contains`: each node has at most one parent.
 * This returns the parent id (edge source) for `nodeId` (edge target), or null.
 */
export function parentContainsSource(edges: readonly GraphEdge3D[], nodeId: string): string | null {
  for (const e of edges) {
    if (e.type === 'contains' && e.target === nodeId) {
      return e.source;
    }
  }
  return null;
}

/** All ancestors of `nodeId` along `contains` (parents toward the root), excluding `nodeId`. */
export function ancestorsAlongContains(edges: readonly GraphEdge3D[], nodeId: string): Set<string> {
  const out = new Set<string>();
  let cur: string | null = nodeId;
  for (;;) {
    cur = parentContainsSource(edges, cur);
    if (!cur) {
      break;
    }
    out.add(cur);
  }
  return out;
}

/** All nodes reachable from `rootId` following `contains` edges (source → target), including `rootId`. */
export function descendantsAlongContains(
  edges: readonly GraphEdge3D[],
  rootId: string
): Set<string> {
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const e of edges) {
      if (e.type !== 'contains' || e.source !== id) {
        continue;
      }
      if (!out.has(e.target)) {
        out.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return out;
}
