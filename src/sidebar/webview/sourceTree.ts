import type { SourceDescriptor, WorkspaceFolderInfo } from '../sourceDescriptor';

export type TreeNode =
  | { type: 'folder'; id: string; label: string; children: TreeNode[] }
  | {
      type: 'file';
      id: string;
      label: string;
      path: string;
      kind: string;
      blockCount: number;
    };

type TrieEntry =
  | { kind: 'dir'; children: TrieMap }
  | { kind: 'file'; descriptor: SourceDescriptor };

type TrieMap = Map<string, TrieEntry>;

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
    const moved = existing.descriptor;
    const childMap: TrieMap = new Map();
    childMap.set(basename(moved.path), { kind: 'file', descriptor: moved });
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
    map.set(basename(descriptor.path), { kind: 'file', descriptor });
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
  current.set(fileName, { kind: 'file', descriptor });
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
  current.set(leaf, { kind: 'file', descriptor });
}

function trieToTreeNodes(map: TrieMap, idPrefix: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const [name, entry] of map.entries()) {
    if (entry.kind === 'file') {
      const d = entry.descriptor;
      nodes.push({
        type: 'file',
        id: `${idPrefix}:file:${d.id}`,
        label: name,
        path: d.path,
        kind: d.kind,
        blockCount: d.blockCount,
      });
    } else {
      const childId = `${idPrefix}:dir:${name}`;
      const children = trieToTreeNodes(entry.children, childId);
      children.sort(compareTreeNodes);
      nodes.push({
        type: 'folder',
        id: childId,
        label: name,
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
    const children = trieToTreeNodes(bucket.trie, `ws:${f.name}`);
    if (children.length === 0) {
      continue;
    }
    roots.push({
      type: 'folder',
      id: `root:ws:${normalizeFsPath(f.path)}`,
      label: f.name,
      children: sortTreeRoots(children),
    });
  }

  if (unmatchedWorkspace.length > 0) {
    const otherTrie: TrieMap = new Map();
    for (const r of unmatchedWorkspace) {
      insertAbsolutePathTrie(otherTrie, r.path, r);
    }
    const children = trieToTreeNodes(otherTrie, 'root:other');
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
      children: sortTreeRoots(trieToTreeNodes(userTrie, 'root:user')),
    });
  }

  return sortTreeRoots(roots);
}
