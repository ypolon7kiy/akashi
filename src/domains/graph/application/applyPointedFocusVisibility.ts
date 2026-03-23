import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';

/**
 * When hovering a node, restrict visibility to a focused subgraph.
 * If pointedId is null or unknown, all nodes and edges stay visible.
 *
 * Hierarchy: preset → locality → category → file (note).
 */
export function applyPointedFocusVisibility(
  nodes: GraphNode3D[],
  edges: GraphEdge3D[],
  pointedId: string | null
): { nodes: GraphNode3D[]; edges: GraphEdge3D[] } {
  const allVisible = (): { nodes: GraphNode3D[]; edges: GraphEdge3D[] } => ({
    nodes: nodes.map((n) => ({ ...n, isVisible: true })),
    edges: edges.map((e) => ({ ...e, isVisible: true })),
  });

  if (!pointedId || nodes.length === 0) {
    return allVisible();
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const pointed = nodeById.get(pointedId);
  if (!pointed) {
    return allVisible();
  }

  const visible = new Set<string>();

  if (pointed.type === 'preset') {
    // Show all descendants of this preset
    const pid = pointed.graphPresetId;
    if (!pid) {
      visible.add(pointed.id);
    } else {
      for (const n of nodes) {
        if (n.graphPresetId === pid || n.id === pointed.id) {
          visible.add(n.id);
        }
      }
    }
  } else if (pointed.type === 'locality') {
    // Show all nodes in this slice + parent preset
    const sk = pointed.graphSliceKey;
    if (sk) {
      for (const n of nodes) {
        if (n.graphSliceKey === sk) {
          visible.add(n.id);
        }
      }
    }
    visible.add(pointed.id);
    if (pointed.graphPresetId) {
      const pre = nodes.find(
        (n) => n.type === 'preset' && n.graphPresetId === pointed.graphPresetId
      );
      if (pre) {
        visible.add(pre.id);
      }
    }
  } else if (pointed.type === 'category') {
    // Show category, its child files, parent locality, parent preset
    visible.add(pointed.id);
    const sk = pointed.graphSliceKey;
    const catId = pointed.graphCategoryId;
    for (const n of nodes) {
      if (n.type === 'note' && n.graphSliceKey === sk && n.graphCategoryId === catId) {
        visible.add(n.id);
      }
    }
    if (sk) {
      const loc = nodes.find((n) => n.type === 'locality' && n.graphSliceKey === sk);
      if (loc) {
        visible.add(loc.id);
      }
    }
    if (pointed.graphPresetId) {
      const pre = nodes.find(
        (n) => n.type === 'preset' && n.graphPresetId === pointed.graphPresetId
      );
      if (pre) {
        visible.add(pre.id);
      }
    }
  } else if (pointed.type === 'note') {
    // Show file, parent category, parent locality, parent preset
    visible.add(pointed.id);
    const sk = pointed.graphSliceKey;
    const catId = pointed.graphCategoryId;
    if (sk && catId) {
      const catNode = nodes.find(
        (n) => n.type === 'category' && n.graphSliceKey === sk && n.graphCategoryId === catId
      );
      if (catNode) {
        visible.add(catNode.id);
      }
    }
    if (sk) {
      const loc = nodes.find((n) => n.type === 'locality' && n.graphSliceKey === sk);
      if (loc) {
        visible.add(loc.id);
      }
    }
    if (pointed.graphPresetId) {
      const pre = nodes.find(
        (n) => n.type === 'preset' && n.graphPresetId === pointed.graphPresetId
      );
      if (pre) {
        visible.add(pre.id);
      }
    }
    // Also show tags connected via 'contains'
    for (const e of edges) {
      if (e.type !== 'contains') {
        continue;
      }
      if (e.source === pointed.id) {
        const t = nodeById.get(e.target);
        if (t?.type === 'tag') {
          visible.add(e.target);
        }
      }
    }
  } else if (pointed.type === 'tag') {
    visible.add(pointed.id);
    for (const e of edges) {
      if (e.type !== 'contains') {
        continue;
      }
      if (e.target === pointed.id) {
        const s = nodeById.get(e.source);
        if (s?.type === 'note') {
          visible.add(e.source);
        }
      }
    }
  } else if (pointed.type === 'folder') {
    // Legacy folder support: show folder, its slice locality + preset
    visible.add(pointed.id);
    const sk = pointed.graphSliceKey;
    if (sk) {
      const loc = nodes.find((n) => n.type === 'locality' && n.graphSliceKey === sk);
      if (loc) {
        visible.add(loc.id);
      }
    }
    if (pointed.graphPresetId) {
      const pre = nodes.find(
        (n) => n.type === 'preset' && n.graphPresetId === pointed.graphPresetId
      );
      if (pre) {
        visible.add(pre.id);
      }
    }
  } else {
    // Fallback: show direct neighbors
    visible.add(pointed.id);
    for (const e of edges) {
      if (e.source === pointed.id) {
        visible.add(e.target);
      }
      if (e.target === pointed.id) {
        visible.add(e.source);
      }
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
