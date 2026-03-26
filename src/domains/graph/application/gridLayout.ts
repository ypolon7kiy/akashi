import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';

const DEFAULT_LEVEL_SPACING = 10;

/** @deprecated Prefer `layoutDepth` on nodes from the graph builder. */
export function getDepthForNode(nodeType: string, maxFolderDepth: number): number {
  switch (nodeType) {
    case 'folder':
      return 0;
    case 'note':
      return maxFolderDepth + 1;
    case 'tag':
      return maxFolderDepth + 2;
    default:
      return maxFolderDepth + 1;
  }
}

/** @deprecated Prefer layoutDepth-driven layout. */
export function getYForDepth(depth: number, maxFolderDepth: number, layerSpacing?: number): number {
  const spacing = layerSpacing ?? DEFAULT_LEVEL_SPACING;
  const maxY = (maxFolderDepth + 2) * spacing;
  return maxY - depth * spacing;
}

/** Infer `layoutDepth` when the builder did not set it (matches grid tiers). */
export function inferLayoutDepth(node: GraphNode3D, _all: readonly GraphNode3D[]): number {
  switch (node.type) {
    case 'preset':
      return 0;
    case 'locality':
      return 1;
    case 'category':
      return 2;
    case 'folder':
      return 3;
    case 'note':
      return 4;
    case 'tag':
      return 5;
    default:
      return 4;
  }
}

/**
 * Grid layout by `layoutDepth` (preset top → locality → category → folder → notes → tags).
 */
export function applyGridLayout(
  nodes: GraphNode3D[],
  _edges: GraphEdge3D[],
  options?: { cellSize?: number; layerSpacing?: number }
): GraphNode3D[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const cellSize = options?.cellSize ?? 6;
  const layerSpacing = options?.layerSpacing ?? 12;

  // Clone `position` so layout writes never mutate builder-owned tuples; avoids memo + R3F stale props
  // when shallow copies shared the same array reference as upstream nodes.
  const positioned = nodes.map((n) => ({
    ...n,
    position: [n.position[0], n.position[1], n.position[2]] as [number, number, number],
  }));
  const depthBuckets = new Map<number, GraphNode3D[]>();
  let maxLayout = 0;

  for (const n of positioned) {
    const d = typeof n.layoutDepth === 'number' ? n.layoutDepth : inferLayoutDepth(n, positioned);
    maxLayout = Math.max(maxLayout, d);
    let bucket = depthBuckets.get(d);
    if (!bucket) {
      bucket = [];
      depthBuckets.set(d, bucket);
    }
    bucket.push(n);
  }

  depthBuckets.forEach((arr, depth) => {
    const depthY = maxLayout * layerSpacing - depth * layerSpacing;
    const cols = Math.ceil(Math.sqrt(arr.length)) || 1;
    arr.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      node.position[0] = (col - cols / 2) * cellSize;
      node.position[1] = depthY;
      node.position[2] = (row - cols / 2) * cellSize;
    });
  });

  return positioned;
}
