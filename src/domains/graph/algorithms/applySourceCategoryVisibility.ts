import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';
import { ancestorsAlongContains, descendantsAlongContains } from './containsTree';
import type { SourceCategoryVisibilitySelection } from './types';

/**
 * Restricts visibility to the union of: for each enabled category node, the path to the preset
 * (via `contains` ancestors) and the full subtree under that category (via `contains` descendants).
 * When `selection` is `null`, all nodes and edges remain visible.
 */
export function applySourceCategoryVisibility(
  nodes: GraphNode3D[],
  edges: GraphEdge3D[],
  selection: SourceCategoryVisibilitySelection
): { nodes: GraphNode3D[]; edges: GraphEdge3D[] } {
  if (selection === null) {
    return {
      nodes: nodes.map((n) => ({ ...n, isVisible: true })),
      edges: edges.map((e) => ({ ...e, isVisible: true })),
    };
  }

  if (selection.size === 0) {
    return {
      nodes: nodes.map((n) => ({ ...n, isVisible: false })),
      edges: edges.map((e) => ({ ...e, isVisible: false })),
    };
  }

  const visible = new Set<string>();

  for (const n of nodes) {
    if (n.type !== 'category' || !n.graphCategoryId) {
      continue;
    }
    if (!selection.has(n.graphCategoryId)) {
      continue;
    }
    for (const a of ancestorsAlongContains(edges, n.id)) {
      visible.add(a);
    }
    visible.add(n.id);
    for (const d of descendantsAlongContains(edges, n.id)) {
      visible.add(d);
    }
  }

  const visibleNodes = nodes.map((n) => ({
    ...n,
    isVisible: visible.has(n.id),
  }));

  const visibleEdges = edges.map((e) => ({
    ...e,
    isVisible: visible.has(e.source) && visible.has(e.target),
  }));

  return { nodes: visibleNodes, edges: visibleEdges };
}
