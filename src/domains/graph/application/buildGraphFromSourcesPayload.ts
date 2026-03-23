import type { SourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';
import type { GraphEdge3D, GraphNode3D, GraphLocality } from '../domain/graphTypes';
import { applyGridLayout } from './gridLayout';
import { dirnamePath, toPosix } from './pathUtils';

/** @deprecated Legacy path-folder id; new graph uses {@link graphFolderNodeId}. */
export const FOLDER_NODE_ID_PREFIX = 'folder:';

export function graphPresetNodeId(presetId: string): string {
  return `gpre:${presetId}`;
}

export function graphLocalityNodeId(presetId: string, locality: GraphLocality): string {
  return `gloc:${presetId}:${locality}`;
}

export function graphCategoryNodeId(
  presetId: string,
  locality: GraphLocality,
  category: string
): string {
  return `gcat:${presetId}:${locality}:${category}`;
}

export function graphFolderNodeId(
  presetId: string,
  locality: GraphLocality,
  absoluteDirPath: string
): string {
  return `gfol:${presetId}:${locality}:${encodeURIComponent(toPosix(absoluteDirPath))}`;
}

export function graphFileNodeId(
  presetId: string,
  locality: GraphLocality,
  absoluteFilePath: string
): string {
  return `gfil:${presetId}:${locality}:${encodeURIComponent(toPosix(absoluteFilePath))}`;
}

/** @deprecated Use {@link graphFolderNodeId} with bucket context. */
export function folderNodeId(absoluteDirPath: string): string {
  return FOLDER_NODE_ID_PREFIX + absoluteDirPath;
}

/** @deprecated */
export function isFolderNodeId(id: string): boolean {
  return id.startsWith(FOLDER_NODE_ID_PREFIX);
}

/** @deprecated */
export function folderPathFromNodeId(id: string): string | null {
  if (!isFolderNodeId(id)) {
    return null;
  }
  return id.slice(FOLDER_NODE_ID_PREFIX.length);
}

export function tagNodeId(tagType: string, value: string): string {
  return `tag:${tagType}:${value}`;
}

function truncateLabel(label: string, maxLen = 24): string {
  if (label.length <= maxLen) {
    return label;
  }
  return `${label.slice(0, maxLen - 1)}…`;
}

function baseName(fsPath: string): string {
  const parts = fsPath.split(/[/\\]/);
  return parts[parts.length - 1] || fsPath;
}

function localityForRecord(r: {
  origin: string;
  tags: readonly { type: string; value: string }[];
}): GraphLocality {
  const loc = r.tags.find((t) => t.type === 'locality');
  if (loc?.value === 'global') {
    return 'global';
  }
  if (loc?.value === 'project') {
    return 'project';
  }
  return r.origin === 'user' ? 'global' : 'project';
}

/** Display label for a source category. */
const CATEGORY_LABELS: Record<string, string> = {
  context: 'Context',
  rule: 'Rules',
  skill: 'Skills',
  hook: 'Hooks',
  config: 'Config',
  mcp: 'MCP',
  unknown: 'Other',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** File node size: base 0.5, scaled up slightly by byteLength (max +0.3 at 10 KB). */
function fileNodeSize(byteLength: number): number {
  return 0.5 + Math.min(0.3, byteLength / 10000);
}

export interface BuildSourcesGraphOptions {
  /** If set, only buckets for these preset ids are built. */
  enabledPresets?: ReadonlySet<string> | null;
  /** Grid horizontal cell spacing (see {@link applyGridLayout} default 6). */
  gridCellSize?: number;
  /** Grid vertical spacing between depth layers (see {@link applyGridLayout} default 12). */
  gridLayerSpacing?: number;
  /**
   * When false, skip {@link applyGridLayout} so nodes keep placeholder positions (e.g. for 2D force layout).
   * Default true.
   */
  applyGridLayout?: boolean;
}

export interface SourcesGraphModel {
  nodes: GraphNode3D[];
  edges: GraphEdge3D[];
}

function sliceKey(presetId: string, locality: GraphLocality): string {
  return `${presetId}:${locality}`;
}

/** Edge strengths and opacities per tier. */
const EDGE_TIER = {
  spine: { strength: 1.0, opacity: 0.7 },
  branch: { strength: 0.8, opacity: 0.6 },
  leaf: { strength: 0.5, opacity: 0.4 },
} as const;

/**
 * Build positioned graph: preset → locality (project/global) → category → file.
 * Category nodes group files by their source category (context, rule, skill, hook, config, mcp).
 */
export function buildGraphFromSourcesPayload(
  payload: SourcesSnapshotPayload | null,
  options?: BuildSourcesGraphOptions
): SourcesGraphModel {
  if (!payload || payload.records.length === 0) {
    return { nodes: [], edges: [] };
  }

  const enabled = options?.enabledPresets ?? null;

  type BucketKey = string;
  const buckets = new Map<BucketKey, typeof payload.records>();

  for (const r of payload.records) {
    const presetId = r.preset;
    if (!presetId) {
      continue;
    }
    if (enabled !== null && !enabled.has(presetId)) {
      continue;
    }
    const loc = localityForRecord(r);
    const key = sliceKey(presetId, loc);
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(r);
  }

  if (buckets.size === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: GraphNode3D[] = [];
  const edges: GraphEdge3D[] = [];
  let edgeSeq = 0;
  const addEdge = (
    source: string,
    target: string,
    type: GraphEdge3D['type'],
    tier: keyof typeof EDGE_TIER = 'leaf'
  ): void => {
    const t = EDGE_TIER[tier];
    edges.push({
      id: `e:${edgeSeq++}`,
      source,
      target,
      type,
      strength: t.strength,
      opacity: t.opacity,
      isPointed: false,
      isVisible: true,
    });
  };

  const presetNodesAdded = new Set<string>();
  const localityNodesAdded = new Set<string>();

  for (const [key, fileRecords] of buckets) {
    const colon = key.indexOf(':');
    const presetId = key.slice(0, colon);
    const locality = key.slice(colon + 1) as GraphLocality;

    const preId = graphPresetNodeId(presetId);
    const locId = graphLocalityNodeId(presetId, locality);

    // --- Preset node (tier 0) ---
    if (!presetNodesAdded.has(presetId)) {
      presetNodesAdded.add(presetId);
      nodes.push({
        id: preId,
        label: truncateLabel(presetId),
        formattedTextLines: [presetId],
        type: 'preset',
        position: [0, 0, 0],
        size: 3,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: 0,
        graphPresetId: presetId,
      });
    }

    // --- Locality node (tier 1) ---
    if (!localityNodesAdded.has(key)) {
      localityNodesAdded.add(key);
      const locLabel = locality === 'global' ? 'Global' : 'Project';
      nodes.push({
        id: locId,
        label: locLabel,
        formattedTextLines: [locLabel],
        type: 'locality',
        position: [0, 0, 0],
        size: 1.8,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: 1,
        graphPresetId: presetId,
        graphLocality: locality,
        graphSliceKey: key,
        childCount: 0, // updated below
      });
      addEdge(preId, locId, 'contains', 'spine');
    }

    // --- Group records by category ---
    const byCategory = new Map<string, typeof fileRecords>();
    for (const r of fileRecords) {
      const cat = r.category || 'unknown';
      let arr = byCategory.get(cat);
      if (!arr) {
        arr = [];
        byCategory.set(cat, arr);
      }
      arr.push(r);
    }

    // Update locality childCount
    const locNode = nodes.find((n) => n.id === locId);
    if (locNode) {
      locNode.childCount = byCategory.size;
    }

    // --- Category nodes (tier 2) ---
    for (const [cat, catRecords] of byCategory) {
      const catId = graphCategoryNodeId(presetId, locality, cat);
      const label = categoryLabel(cat);
      nodes.push({
        id: catId,
        label: `${label} (${catRecords.length})`,
        formattedTextLines: [label, `${catRecords.length}`],
        type: 'category',
        position: [0, 0, 0],
        size: 1.2,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: 2,
        graphPresetId: presetId,
        graphLocality: locality,
        graphSliceKey: key,
        graphCategoryId: cat,
        childCount: catRecords.length,
      });
      addEdge(locId, catId, 'contains', 'branch');

      // --- File nodes (tier 3) ---
      for (const r of catRecords) {
        const path = r.path;
        const nid = graphFileNodeId(presetId, locality, path);
        const fileLabel = truncateLabel(baseName(path));
        nodes.push({
          id: nid,
          label: fileLabel,
          formattedTextLines: [fileLabel],
          type: 'note',
          position: [0, 0, 0],
          size: fileNodeSize(r.metadata.byteLength),
          isSelected: false,
          isPointed: false,
          isVisible: true,
          layoutDepth: 3,
          folderPath: dirnamePath(path) || undefined,
          filesystemPath: path,
          graphPresetId: presetId,
          graphLocality: locality,
          graphSliceKey: key,
          graphCategoryId: cat,
        });
        addEdge(catId, nid, 'contains', 'leaf');
      }
    }
  }

  if (options?.applyGridLayout === false) {
    return { nodes, edges };
  }
  const positioned = applyGridLayout(nodes, edges, {
    cellSize: options?.gridCellSize,
    layerSpacing: options?.gridLayerSpacing,
  });
  return { nodes: positioned, edges };
}
