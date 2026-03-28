import type {
  SourceDescriptor,
  SourcesSnapshotPayload,
} from '../../../shared/types/sourcesSnapshotPayload';
import type { GraphEdge3D, GraphNode3D, GraphLocality } from '../domain/graphTypes';
import {
  GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES,
  labelGraphSourceCategory,
} from '../domain/graphSourceCategoryLabels';
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
  locality: string;
  tags: readonly { type: string; value: string }[];
}): GraphLocality {
  const loc = r.tags.find((t) => t.type === 'locality');
  if (loc?.value === 'global') {
    return 'global';
  }
  if (loc?.value === 'project') {
    return 'project';
  }
  return r.locality === 'user' ? 'global' : 'project';
}

/** File node size: base 0.5, scaled up slightly by byteLength (max +0.3 at 10 KB). */
function fileNodeSize(byteLength: number): number {
  return 0.5 + Math.min(0.3, byteLength / 10000);
}

/** Grid / force layout: folder tier under category. */
const LAYOUT_DEPTH_FOLDER = 3;
/** File nodes when parent is a folder node. */
const LAYOUT_DEPTH_FILE_UNDER_FOLDER = 4;
/** File nodes when attached directly from category (when folder tier is skipped). */
const LAYOUT_DEPTH_FILE_DIRECT = 3;

const DEFAULT_MIN_FILES_FOR_FOLDER_NODE = 1;

/**
 * Group source records by parent directory path (`dirname` of `path`).
 * Key is POSIX-normalized absolute dir string (may be empty for root-level files).
 */
export function groupSourceRecordsByParentDir(
  records: readonly SourceDescriptor[]
): Map<string, SourceDescriptor[]> {
  const byDir = new Map<string, SourceDescriptor[]>();
  for (const r of records) {
    const dir = dirnamePath(r.path);
    let arr = byDir.get(dir);
    if (!arr) {
      arr = [];
      byDir.set(dir, arr);
    }
    arr.push(r);
  }
  return byDir;
}

/** When true, insert a folder node between category and these files. */
export function useFolderNodeForDirectory(
  recordCountInDir: number,
  minFilesForFolderNode: number
): boolean {
  return recordCountInDir >= minFilesForFolderNode;
}

function folderNodeDisplayLabel(absoluteDirPath: string): string {
  if (absoluteDirPath === '') {
    return '(root)';
  }
  return truncateLabel(baseName(absoluteDirPath));
}

export interface BuildSourcesGraphOptions {
  /** If set, only buckets for these preset ids are built. */
  enabledPresets?: ReadonlySet<string> | null;
  /**
   * If set, only records whose `path` is in this set are included.
   * `null` means include all records (no filter). This is the sidebar's
   * filter result — records not in this set are excluded from the graph entirely.
   */
  matchedPaths?: ReadonlySet<string> | null;
  /** Grid horizontal cell spacing (see {@link applyGridLayout} default 6). */
  gridCellSize?: number;
  /** Grid vertical spacing between depth layers (see {@link applyGridLayout} default 12). */
  gridLayerSpacing?: number;
  /**
   * When false, skip {@link applyGridLayout} so nodes keep placeholder positions (e.g. for 2D force layout).
   * Default true.
   */
  applyGridLayout?: boolean;
  /**
   * Minimum files sharing a directory under one category before adding a folder node.
   * When the count is below this threshold, category connects directly to each file (no folder tier).
   * Default {@link DEFAULT_MIN_FILES_FOR_FOLDER_NODE}.
   */
  minFilesForFolderNode?: number;
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
 * Build positioned graph: preset → locality → category → (optional folder) → file.
 * Folder nodes group files in the same directory when the directory has at least
 * `minFilesForFolderNode` indexed file(s); default is 1 so single-file dirs still get a folder tier.
 */
export function buildGraphFromSourcesPayload(
  payload: SourcesSnapshotPayload | null,
  options?: BuildSourcesGraphOptions
): SourcesGraphModel {
  if (!payload || payload.records.length === 0) {
    return { nodes: [], edges: [] };
  }

  const enabled = options?.enabledPresets ?? null;
  const filteredPaths = options?.matchedPaths ?? null;
  const minFilesForFolderNode = options?.minFilesForFolderNode ?? DEFAULT_MIN_FILES_FOR_FOLDER_NODE;

  // Build sets for top-level artifact handling:
  // - skipRecordIds: subordinate records of multi-member artifacts (hidden from graph)
  // - directToCategoryIds: primary records of top-level artifacts (bypass folder grouping)
  // - directRecordLabel: label overrides for folder-file primaries (folder name, not SKILL.md)
  const skipRecordIds = new Set<string>();
  const directToCategoryIds = new Set<string>();
  const directRecordLabel = new Map<string, string>();
  if (payload.artifacts) {
    const recordPathById = new Map<string, string>();
    for (const r of payload.records) {
      recordPathById.set(r.id, r.path);
    }
    for (const art of payload.artifacts) {
      if (art.topLevel === false) continue;
      const primaryNorm = art.primaryPath.replace(/\\/g, '/');
      for (const rid of art.memberRecordIds) {
        const rPath = recordPathById.get(rid)?.replace(/\\/g, '/');
        if (rPath === primaryNorm) {
          directToCategoryIds.add(rid);
          if (art.shape === 'folder-file') {
            directRecordLabel.set(rid, baseName(dirnamePath(primaryNorm)));
          }
        } else {
          skipRecordIds.add(rid);
        }
      }
    }
  }

  type BucketKey = string;
  const buckets = new Map<BucketKey, typeof payload.records>();

  for (const r of payload.records) {
    if (skipRecordIds.has(r.id)) {
      continue;
    }
    const presetId = r.preset;
    if (!presetId) {
      continue;
    }
    if (enabled !== null && !enabled.has(presetId)) {
      continue;
    }
    if (filteredPaths !== null && !filteredPaths.has(r.path)) {
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

    // Ensure all known categories appear even when no records belong to them.
    // 'unknown' ("Other") is intentionally excluded — it's a catch-all that only
    // makes sense when files are actually present without a recognised category.
    // When a sidebar filter is active we skip this so empty categories are pruned.
    if (filteredPaths === null) {
      for (const cat of GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES) {
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
        }
      }
    }

    // --- Category nodes (tier 2) ---
    for (const [cat, catRecords] of byCategory) {
      const catId = graphCategoryNodeId(presetId, locality, cat);
      const label = labelGraphSourceCategory(cat);
      nodes.push({
        id: catId,
        label,
        formattedTextLines: [label],
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
      });
      addEdge(locId, catId, 'contains', 'branch');

      // Top-level artifact primaries connect directly to category (no folder node).
      const directRecords = catRecords.filter((r) => directToCategoryIds.has(r.id));
      const folderRecords = catRecords.filter((r) => !directToCategoryIds.has(r.id));

      for (const r of directRecords) {
        const path = r.path;
        const nid = graphFileNodeId(presetId, locality, path);
        const fileLabel = truncateLabel(directRecordLabel.get(r.id) ?? baseName(path));
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
          layoutDepth: LAYOUT_DEPTH_FILE_DIRECT,
          folderPath: dirnamePath(path) || undefined,
          filesystemPath: path,
          graphPresetId: presetId,
          graphLocality: locality,
          graphSliceKey: key,
          graphCategoryId: cat,
        });
        addEdge(catId, nid, 'contains', 'leaf');
      }

      const byParentDir = groupSourceRecordsByParentDir(folderRecords);

      for (const [, dirRecords] of byParentDir) {
        const useFolder = useFolderNodeForDirectory(dirRecords.length, minFilesForFolderNode);

        if (useFolder) {
          const dirPath = dirnamePath(dirRecords[0].path);
          const folId = graphFolderNodeId(presetId, locality, dirPath);
          const dirPosix = toPosix(dirPath);
          const folLabel = folderNodeDisplayLabel(dirPath);
          const folLines = dirPath === '' ? [folLabel] : [folLabel, truncateLabel(dirPosix, 48)];

          nodes.push({
            id: folId,
            label: folLabel,
            formattedTextLines: folLines,
            type: 'folder',
            position: [0, 0, 0],
            size: 1,
            isSelected: false,
            isPointed: false,
            isVisible: true,
            layoutDepth: LAYOUT_DEPTH_FOLDER,
            folderPath: dirPath || undefined,
            filesystemPath: dirPath === '' ? undefined : dirPath,
            graphPresetId: presetId,
            graphLocality: locality,
            graphSliceKey: key,
            graphCategoryId: cat,
          });
          addEdge(catId, folId, 'contains', 'leaf');

          for (const r of dirRecords) {
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
              layoutDepth: LAYOUT_DEPTH_FILE_UNDER_FOLDER,
              folderPath: dirnamePath(path) || undefined,
              filesystemPath: path,
              graphPresetId: presetId,
              graphLocality: locality,
              graphSliceKey: key,
              graphCategoryId: cat,
            });
            addEdge(folId, nid, 'contains', 'leaf');
          }
        } else {
          for (const r of dirRecords) {
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
              layoutDepth: LAYOUT_DEPTH_FILE_DIRECT,
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
