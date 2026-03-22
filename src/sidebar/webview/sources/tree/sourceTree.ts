import { SourceTagType } from '../../../../domains/sources/domain/model';
import type { SourceDescriptor, WorkspaceFolderInfo } from '../../../bridge/sourceDescriptor';

function categoryValueFromTags(
  tags: readonly { readonly type: string; readonly value: string }[]
): string | undefined {
  const t = tags.find((x) => x.type === SourceTagType.Category);
  return t?.value;
}

export type TreeNode =
  | {
      type: 'folder';
      id: string;
      label: string;
      /**
       * Absolute directory path for FS operations. Omitted for synthetic grouping roots
       * (“Workspace (other)”, “User configuration”) — only nested children are operable.
       */
      dirPath?: string;
      children: TreeNode[];
    }
  | {
      type: 'file';
      id: string;
      label: string;
      /** File name on disk (Trie leaf key); `label` may add preset suffixes. */
      fileBaseName: string;
      path: string;
      /** Category id for badges / CSS (first descriptor after preset/id sort when they differ). */
      categoryValue: string;
      /** Presets that discovered this path, sorted. */
      presets: readonly string[];
      /** Distinct category ids across merged descriptors, sorted (for tooltip when length > 1). */
      categories: readonly string[];
    };

type TrieEntry =
  | { kind: 'dir'; children: TrieMap }
  | { kind: 'file'; descriptors: SourceDescriptor[] };

type TrieMap = Map<string, TrieEntry>;

function pushDescriptorToLeaf(map: TrieMap, leafKey: string, descriptor: SourceDescriptor): void {
  const existing = map.get(leafKey);
  if (!existing) {
    map.set(leafKey, { kind: 'file', descriptors: [descriptor] });
    return;
  }
  if (existing.kind === 'file') {
    if (!existing.descriptors.some((d) => d.id === descriptor.id)) {
      existing.descriptors.push(descriptor);
    }
    return;
  }
}

function normalizeFsPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function basename(fsPath: string): string {
  const n = normalizeFsPath(fsPath);
  const i = n.lastIndexOf('/');
  return i >= 0 ? n.slice(i + 1) : n;
}

function longestWorkspaceFolder(
  filePath: string,
  folders: readonly WorkspaceFolderInfo[]
): { folder: WorkspaceFolderInfo; relative: string } | null {
  const norm = normalizeFsPath(filePath);
  let best: { folder: WorkspaceFolderInfo; len: number } | null = null;
  for (const f of folders) {
    const fp = normalizeFsPath(f.path);
    const prefix = fp.endsWith('/') ? fp : `${fp}/`;
    if (norm === fp || norm.startsWith(prefix)) {
      if (!best || fp.length > best.len) {
        best = { folder: f, len: fp.length };
      }
    }
  }
  if (!best) {
    return null;
  }
  const fp = normalizeFsPath(best.folder.path);
  if (norm === fp) {
    return { folder: best.folder, relative: '' };
  }
  let rel = norm.slice(fp.length);
  if (rel.startsWith('/')) {
    rel = rel.slice(1);
  }
  return { folder: best.folder, relative: rel };
}

function ensureDir(map: TrieMap, segment: string): TrieMap {
  const existing = map.get(segment);
  if (existing?.kind === 'dir') {
    return existing.children;
  }
  if (existing?.kind === 'file') {
    const moved = existing.descriptors;
    const childMap: TrieMap = new Map();
    const name = basename(moved[0].path);
    childMap.set(name, { kind: 'file', descriptors: [...moved] });
    map.set(segment, { kind: 'dir', children: childMap });
    return childMap;
  }
  const children: TrieMap = new Map();
  map.set(segment, { kind: 'dir', children });
  return children;
}

function insertFileAtRelativePath(
  map: TrieMap,
  relative: string,
  descriptor: SourceDescriptor
): void {
  const segments = relative.split('/').filter(Boolean);
  if (segments.length === 0) {
    pushDescriptorToLeaf(map, basename(descriptor.path), descriptor);
    return;
  }
  let current = map;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg === undefined) {
      return;
    }
    current = ensureDir(current, seg);
  }
  const fileName = segments[segments.length - 1];
  if (fileName === undefined) {
    return;
  }
  pushDescriptorToLeaf(current, fileName, descriptor);
}

function insertAbsolutePathTrie(map: TrieMap, fsPath: string, descriptor: SourceDescriptor): void {
  const segments = normalizeFsPath(fsPath).split('/').filter(Boolean);
  if (segments.length === 0) {
    return;
  }
  let current = map;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg === undefined) {
      return;
    }
    current = ensureDir(current, seg);
  }
  const leaf = segments[segments.length - 1];
  if (leaf === undefined) {
    return;
  }
  pushDescriptorToLeaf(current, leaf, descriptor);
}

function categoryForDescriptor(d: SourceDescriptor): string {
  return d.category ?? categoryValueFromTags(d.tags) ?? 'unknown';
}

/** Build absolute dir path from parent + one trie segment (webview-safe, forward slashes). */
export function joinDirSegment(parentDirFsPath: string, segment: string): string {
  const seg = segment.replace(/\\/g, '/');
  if (!parentDirFsPath) {
    if (/^[A-Za-z]:$/.test(seg)) {
      return `${seg}/`;
    }
    return seg.startsWith('/') ? seg : `/${seg}`;
  }
  const base = parentDirFsPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return `${base}/${seg}`;
}

/** Parent directory of a file or folder path (webview-safe). */
export function dirnameFsPath(fsPath: string): string {
  const n = fsPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const i = n.lastIndexOf('/');
  if (i < 0) {
    return '.';
  }
  if (i === 0) {
    return '/';
  }
  const head = n.slice(0, i);
  if (/^[A-Za-z]:$/.test(head)) {
    return `${head}/`;
  }
  return head;
}

export function basenameFsPath(fsPath: string): string {
  const n = fsPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const j = n.lastIndexOf('/');
  return j < 0 ? n : n.slice(j + 1);
}

function trieToTreeNodes(map: TrieMap, idPrefix: string, parentDirFsPath: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const [name, entry] of map.entries()) {
    if (entry.kind === 'file') {
      const list = [...entry.descriptors].sort(
        (a, b) => a.preset.localeCompare(b.preset) || a.id.localeCompare(b.id)
      );
      const path = list[0].path;
      const presets = [...new Set(list.map((d) => d.preset))].sort((a, b) => a.localeCompare(b));
      const categories = [...new Set(list.map(categoryForDescriptor))].sort((a, b) =>
        a.localeCompare(b)
      );
      const first = list[0];
      nodes.push({
        type: 'file',
        id: `${idPrefix}:file:${encodeURIComponent(normalizeFsPath(path))}`,
        label: presets.length > 1 ? `${name} (${presets.join(', ')})` : name,
        fileBaseName: name,
        path,
        categoryValue: categoryForDescriptor(first),
        presets,
        categories,
      });
    } else {
      const dirPath = joinDirSegment(parentDirFsPath, name);
      const childId = `${idPrefix}:dir:${name}`;
      const children = trieToTreeNodes(entry.children, childId, dirPath);
      nodes.push({
        type: 'folder',
        id: childId,
        label: name,
        dirPath,
        children,
      });
    }
  }
  return nodes;
}

function compareTreeNodes(a: TreeNode, b: TreeNode): number {
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1;
  }
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

function sortTreeRoots(nodes: TreeNode[]): TreeNode[] {
  const copy = [...nodes];
  copy.sort(compareTreeNodes);
  for (const n of copy) {
    if (n.type === 'folder') {
      n.children = sortTreeRoots(n.children);
    }
  }
  return copy;
}

/**
 * Groups indexed sources into Explorer-style folder roots (workspace folders + user + fallback).
 */
export function buildSourceTree(
  records: readonly SourceDescriptor[],
  workspaceFolders: readonly WorkspaceFolderInfo[]
): TreeNode[] {
  const workspaceRecords: SourceDescriptor[] = [];
  const userRecords: SourceDescriptor[] = [];
  const unmatchedWorkspace: SourceDescriptor[] = [];

  for (const r of records) {
    if (r.origin === 'user') {
      userRecords.push(r);
    } else {
      workspaceRecords.push(r);
    }
  }

  const roots: TreeNode[] = [];
  const byFolder = new Map<string, { folder: WorkspaceFolderInfo; trie: TrieMap }>();

  for (const f of workspaceFolders) {
    byFolder.set(normalizeFsPath(f.path), { folder: f, trie: new Map() });
  }

  for (const r of workspaceRecords) {
    const match = longestWorkspaceFolder(r.path, workspaceFolders);
    if (!match || match.relative === '') {
      unmatchedWorkspace.push(r);
      continue;
    }
    const key = normalizeFsPath(match.folder.path);
    const bucket = byFolder.get(key);
    if (!bucket) {
      unmatchedWorkspace.push(r);
      continue;
    }
    insertFileAtRelativePath(bucket.trie, match.relative, r);
  }

  const orderedFolders = [...workspaceFolders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  for (const f of orderedFolders) {
    const bucket = byFolder.get(normalizeFsPath(f.path));
    if (!bucket) {
      continue;
    }
    const wsPath = normalizeFsPath(f.path);
    const children = trieToTreeNodes(bucket.trie, `ws:${f.name}`, wsPath);
    if (children.length === 0) {
      continue;
    }
    roots.push({
      type: 'folder',
      id: `root:ws:${wsPath}`,
      label: f.name,
      dirPath: wsPath,
      children: sortTreeRoots(children),
    });
  }

  if (unmatchedWorkspace.length > 0) {
    const otherTrie: TrieMap = new Map();
    for (const r of unmatchedWorkspace) {
      insertAbsolutePathTrie(otherTrie, r.path, r);
    }
    const children = trieToTreeNodes(otherTrie, 'root:other', '');
    roots.push({
      type: 'folder',
      id: 'root:workspace-other',
      label: 'Workspace (other)',
      children: sortTreeRoots(children),
    });
  }

  if (userRecords.length > 0) {
    const userTrie: TrieMap = new Map();
    for (const r of userRecords) {
      insertAbsolutePathTrie(userTrie, r.path, r);
    }
    roots.push({
      type: 'folder',
      id: 'root:user',
      label: 'User configuration',
      children: sortTreeRoots(trieToTreeNodes(userTrie, 'root:user', '')),
    });
  }

  return sortTreeRoots(roots);
}
