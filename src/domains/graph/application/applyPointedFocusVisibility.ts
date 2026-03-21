import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';
import { dirnamePath, pathIsUnder, toPosix } from './pathUtils';

function normalizeDirPath(p: string): string {
  return toPosix(p).replace(/\/+$/, '');
}

function parentFolderPath(dir: string): string | null {
  const p = dirnamePath(dir);
  return p.length > 0 ? p : null;
}

/**
 * When hovering a node, restrict visibility to an ioodine-style focused subgraph.
 * If pointedId is null or unknown, all nodes and edges stay visible.
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
      const pre = nodes.find((n) => n.type === 'preset' && n.graphPresetId === pointed.graphPresetId);
      if (pre) {
        visible.add(pre.id);
      }
    }
  } else if (pointed.type === 'note') {
    visible.add(pointed.id);
    const slice = pointed.graphSliceKey;
    const filePath = pointed.filesystemPath ?? pointed.id;

    let parentDir = pointed.folderPath ?? dirnamePath(filePath);
    const seen = new Set<string>();
    while (parentDir && !seen.has(parentDir)) {
      seen.add(parentDir);
      const folderNode = nodes.find(
        (n) =>
          n.type === 'folder' &&
          n.folderPath &&
          normalizeDirPath(n.folderPath) === normalizeDirPath(parentDir) &&
          (slice ? n.graphSliceKey === slice : true)
      );
      if (folderNode) {
        visible.add(folderNode.id);
      }
      const next = parentFolderPath(parentDir);
      parentDir = next ?? '';
      if (!next) {
        break;
      }
    }

    if (slice) {
      const loc = nodes.find((n) => n.type === 'locality' && n.graphSliceKey === slice);
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
    const F = pointed.folderPath;
    if (!F) {
      visible.add(pointed.id);
    } else {
      const fNorm = normalizeDirPath(F);
      const slice = pointed.graphSliceKey;

      for (const n of nodes) {
        if (slice && n.graphSliceKey && n.graphSliceKey !== slice) {
          continue;
        }
        if (n.type === 'folder' && n.folderPath) {
          const pNorm = normalizeDirPath(n.folderPath);
          if (pNorm === fNorm || pathIsUnder(pNorm, fNorm)) {
            visible.add(n.id);
          }
        } else if (n.type === 'note' && n.folderPath) {
          const pNorm = normalizeDirPath(n.folderPath);
          if (pathIsUnder(pNorm, fNorm) || pNorm === fNorm) {
            visible.add(n.id);
          }
        }
      }

      if (slice) {
        const loc = nodes.find((n) => n.type === 'locality' && n.graphSliceKey === slice);
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
    }
  } else {
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
