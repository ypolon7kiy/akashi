import type { SourcesSnapshotPayload } from '../../../sidebar/bridge/sourceDescriptor';
import type { GraphEdge3D, GraphNode3D, GraphLocality } from '../domain/graphTypes';
import { applyGridLayout } from './gridLayout';
import {
  dirnamePath,
  joinRootSegments,
  pathIsUnder,
  relativeUnderRoot,
  resolveWorkspaceRoot,
  toPosix,
} from './pathUtils';

/** @deprecated Legacy path-folder id; new graph uses {@link graphFolderNodeId}. */
export const FOLDER_NODE_ID_PREFIX = 'folder:';

export function graphPresetNodeId(presetId: string): string {
  return `gpre:${presetId}`;
}

export function graphLocalityNodeId(presetId: string, locality: GraphLocality): string {
  return `gloc:${presetId}:${locality}`;
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

function folderChainForFile(filePath: string, workspaceRoots: readonly string[]): string[] {
  const root = resolveWorkspaceRoot(filePath, workspaceRoots);
  const parent = dirnamePath(filePath);
  if (!parent) {
    return [];
  }
  if (!root || !pathIsUnder(filePath, root)) {
    return [parent];
  }
  if (toPosix(parent) === toPosix(root)) {
    return [root];
  }
  const relParent = relativeUnderRoot(root, parent);
  if (!relParent) {
    return [root];
  }
  const parts = relParent.split('/').filter(Boolean);
  const segments = joinRootSegments(root, parts);
  return [root, ...segments];
}

export interface BuildSourcesGraphOptions {
  /** If set, only buckets for these preset ids are built. */
  enabledPresets?: ReadonlySet<string> | null;
  /** Grid horizontal cell spacing (see {@link applyGridLayout} default 6). */
  gridCellSize?: number;
  /** Grid vertical spacing between depth layers (see {@link applyGridLayout} default 12). */
  gridLayerSpacing?: number;
}

export interface SourcesGraphModel {
  nodes: GraphNode3D[];
  edges: GraphEdge3D[];
}

function sliceKey(presetId: string, locality: GraphLocality): string {
  return `${presetId}:${locality}`;
}

/**
 * Build positioned 3D graph: preset → locality (project/global) → folder → file per (preset × locality) slice.
 * Does not emit facet tag nodes (category / preset / locality tags) in v1.
 */
export function buildGraphFromSourcesPayload(
  payload: SourcesSnapshotPayload | null,
  options?: BuildSourcesGraphOptions
): SourcesGraphModel {
  if (!payload || payload.records.length === 0) {
    return { nodes: [], edges: [] };
  }

  const roots = payload.workspaceFolders.map((w) => w.path);
  const enabled = options?.enabledPresets ?? null;

  type BucketKey = string;
  const buckets = new Map<BucketKey, typeof payload.records>();

  for (const r of payload.records) {
    if (r.presets.length === 0) {
      continue;
    }
    for (const presetId of r.presets) {
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
  }

  if (buckets.size === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: GraphNode3D[] = [];
  const edges: GraphEdge3D[] = [];
  let edgeSeq = 0;
  const addEdge = (source: string, target: string, type: GraphEdge3D['type']): void => {
    edges.push({
      id: `e:${edgeSeq++}`,
      source,
      target,
      type,
      strength: 1,
      opacity: 0.6,
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

    if (!presetNodesAdded.has(presetId)) {
      presetNodesAdded.add(presetId);
      nodes.push({
        id: preId,
        label: truncateLabel(presetId),
        formattedTextLines: [presetId],
        type: 'preset',
        position: [0, 0, 0],
        size: 2,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: 0,
        graphPresetId: presetId,
      });
    }

    if (!localityNodesAdded.has(key)) {
      localityNodesAdded.add(key);
      const locLabel = locality === 'global' ? 'Global' : 'Local';
      nodes.push({
        id: locId,
        label: locLabel,
        formattedTextLines: [locLabel, locality],
        type: 'locality',
        position: [0, 0, 0],
        size: 1.35,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: 1,
        graphPresetId: presetId,
        graphLocality: locality,
        graphSliceKey: key,
      });
      addEdge(preId, locId, 'contains');
    }

    const folderPaths = new Set<string>();
    for (const r of fileRecords) {
      for (const d of folderChainForFile(r.path, roots)) {
        folderPaths.add(d);
      }
    }

    const depthByFolder = new Map<string, number>();
    for (const fp of folderPaths) {
      const root = resolveWorkspaceRoot(fp, roots);
      if (root && pathIsUnder(fp, root)) {
        const rel = relativeUnderRoot(root, fp);
        const depth = rel === '' ? 0 : rel.split('/').filter(Boolean).length;
        depthByFolder.set(fp, depth);
      } else {
        depthByFolder.set(fp, 0);
      }
    }

    let maxFolderDepthInBucket = 0;
    for (const d of depthByFolder.values()) {
      maxFolderDepthInBucket = Math.max(maxFolderDepthInBucket, d);
    }

    for (const dir of folderPaths) {
      const fid = graphFolderNodeId(presetId, locality, dir);
      const label = truncateLabel(baseName(dir) || dir);
      const fd = depthByFolder.get(dir) ?? 0;
      maxFolderDepthInBucket = Math.max(maxFolderDepthInBucket, fd);
      nodes.push({
        id: fid,
        label,
        formattedTextLines: [label],
        type: 'folder',
        position: [0, 0, 0],
        size: 1.5,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        depth: fd,
        layoutDepth: 2 + fd,
        folderPath: dir,
        parentFolderPath: dirnamePath(dir) || undefined,
        filesystemPath: dir,
        graphPresetId: presetId,
        graphLocality: locality,
        graphSliceKey: key,
      });
    }

    const sortedFolders = [...folderPaths].sort((a, b) => a.length - b.length);
    for (const dir of sortedFolders) {
      const parent = dirnamePath(dir);
      if (!parent || !folderPaths.has(parent)) {
        continue;
      }
      addEdge(
        graphFolderNodeId(presetId, locality, parent),
        graphFolderNodeId(presetId, locality, dir),
        'contains'
      );
    }

    for (const dir of folderPaths) {
      const parent = dirnamePath(dir);
      const isRootInBucket = !parent || !folderPaths.has(parent);
      if (isRootInBucket) {
        addEdge(locId, graphFolderNodeId(presetId, locality, dir), 'contains');
      }
    }

    const noteLayoutDepth = 2 + maxFolderDepthInBucket + 1;
    for (const r of fileRecords) {
      const path = r.path;
      const nid = graphFileNodeId(presetId, locality, path);
      const label = truncateLabel(baseName(path));
      nodes.push({
        id: nid,
        label,
        formattedTextLines: [label],
        type: 'note',
        position: [0, 0, 0],
        size: 0.55,
        isSelected: false,
        isPointed: false,
        isVisible: true,
        layoutDepth: noteLayoutDepth,
        folderPath: dirnamePath(path) || undefined,
        filesystemPath: path,
        graphPresetId: presetId,
        graphLocality: locality,
        graphSliceKey: key,
      });

      const chain = folderChainForFile(path, roots);
      const parentDir = chain.length > 0 ? chain[chain.length - 1] : dirnamePath(path);
      if (parentDir && folderPaths.has(parentDir)) {
        addEdge(graphFolderNodeId(presetId, locality, parentDir), nid, 'contains');
      }
    }
  }

  const positioned = applyGridLayout(nodes, edges, {
    cellSize: options?.gridCellSize,
    layerSpacing: options?.gridLayerSpacing,
  });
  return { nodes: positioned, edges };
}
