import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';
import { parentContainsSource } from '../algorithms/containsTree';

function addLocalityAndPreset(
  visible: Set<string>,
  localityBySliceKey: Map<string, GraphNode3D>,
  presetByPresetId: Map<string, GraphNode3D>,
  graphSliceKey: string | undefined,
  graphPresetId: string | undefined
): void {
  if (graphSliceKey) {
    const loc = localityBySliceKey.get(graphSliceKey);
    if (loc) {
      visible.add(loc.id);
    }
  }
  if (graphPresetId) {
    const pre = presetByPresetId.get(graphPresetId);
    if (pre) {
      visible.add(pre.id);
    }
  }
}

/**
 * When hovering a node, restrict visibility to a focused subgraph (intersected with input visibility).
 * If pointedId is null or unknown, returns clones preserving each node/edge `isVisible` (e.g. category filter).
 *
 * Hierarchy: preset → locality → category → optional folder → file (note).
 */
export function applyPointedFocusVisibility(
  nodes: GraphNode3D[],
  edges: GraphEdge3D[],
  pointedId: string | null
): { nodes: GraphNode3D[]; edges: GraphEdge3D[] } {
  const preserveBaseVisibility = (): { nodes: GraphNode3D[]; edges: GraphEdge3D[] } => ({
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
  });

  if (!pointedId || nodes.length === 0) {
    return preserveBaseVisibility();
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const pointed = nodeById.get(pointedId);
  if (!pointed) {
    return preserveBaseVisibility();
  }

  const localityBySliceKey = new Map<string, GraphNode3D>();
  const presetByPresetId = new Map<string, GraphNode3D>();
  for (const n of nodes) {
    if (n.type === 'locality' && n.graphSliceKey) localityBySliceKey.set(n.graphSliceKey, n);
    if (n.type === 'preset' && n.graphPresetId) presetByPresetId.set(n.graphPresetId, n);
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
      const pre = presetByPresetId.get(pointed.graphPresetId);
      if (pre) {
        visible.add(pre.id);
      }
    }
  } else if (pointed.type === 'category') {
    visible.add(pointed.id);
    const sk = pointed.graphSliceKey;
    const catId = pointed.graphCategoryId;
    for (const n of nodes) {
      if (n.graphSliceKey !== sk || n.graphCategoryId !== catId) {
        continue;
      }
      if (n.type === 'note' || n.type === 'folder') {
        visible.add(n.id);
      }
    }
    addLocalityAndPreset(visible, localityBySliceKey, presetByPresetId, sk, pointed.graphPresetId);
  } else if (pointed.type === 'note') {
    visible.add(pointed.id);
    let cur: string | null = pointed.id;
    for (;;) {
      const src = parentContainsSource(edges, cur);
      if (!src) {
        break;
      }
      visible.add(src);
      const pn = nodeById.get(src);
      if (pn?.type === 'category') {
        break;
      }
      cur = src;
    }
    addLocalityAndPreset(
      visible,
      localityBySliceKey,
      presetByPresetId,
      pointed.graphSliceKey,
      pointed.graphPresetId
    );
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
    visible.add(pointed.id);
    for (const e of edges) {
      if (e.type !== 'contains' || e.source !== pointed.id) {
        continue;
      }
      const t = nodeById.get(e.target);
      if (t?.type === 'note') {
        visible.add(e.target);
      }
    }
    const catId = parentContainsSource(edges, pointed.id);
    if (catId) {
      visible.add(catId);
    }
    addLocalityAndPreset(
      visible,
      localityBySliceKey,
      presetByPresetId,
      pointed.graphSliceKey,
      pointed.graphPresetId
    );
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
    isVisible: visible.has(n.id) && n.isVisible,
  }));

  const nodeOutVis = new Map(visibleNodes.map((n) => [n.id, n.isVisible]));

  const visibleEdges = edges.map((e) => ({
    ...e,
    isVisible: Boolean(nodeOutVis.get(e.source) && nodeOutVis.get(e.target)),
  }));

  return { nodes: visibleNodes, edges: visibleEdges };
}
