import { describe, expect, it } from 'vitest';
import type { TreeNode } from '@src/sidebar/webview/sources/tree/sourceTree';
import {
  collectVisibleTreeNodes,
  findParentTreeNodeId,
  isPathStrictInside,
  treeItemDomId,
} from '@src/sidebar/webview/sources/fs/sourceTreeExplorerModel';

describe('isPathStrictInside', () => {
  it('detects descendants', () => {
    expect(isPathStrictInside('/a/b', '/a/b/c')).toBe(true);
    expect(isPathStrictInside('/a/b', '/a/b')).toBe(false);
    expect(isPathStrictInside('/a/b', '/a/c')).toBe(false);
  });
});

describe('collectVisibleTreeNodes', () => {
  it('respects expanded state', () => {
    const child: TreeNode = {
      type: 'file',
      id: 'f1',
      label: 'a',
      fileBaseName: 'a',
      path: '/a',
      categoryValue: 'x',
      presets: [],
      categories: [],
      indexingLocality: 'workspace',
    };
    const folder: TreeNode = {
      type: 'folder',
      id: 'd1',
      label: 'd',
      dirPath: '/d',
      indexingLocality: 'workspace',
      children: [child],
    };
    const collapsed = collectVisibleTreeNodes([folder], new Set());
    expect(collapsed.map((n) => n.id)).toEqual(['d1']);
    const expanded = collectVisibleTreeNodes([folder], new Set(['d1']));
    expect(expanded.map((n) => n.id)).toEqual(['d1', 'f1']);
  });
});

describe('findParentTreeNodeId', () => {
  it('returns immediate parent id', () => {
    const child: TreeNode = {
      type: 'file',
      id: 'f1',
      label: 'a',
      fileBaseName: 'a',
      path: '/a',
      categoryValue: 'x',
      presets: [],
      categories: [],
      indexingLocality: 'workspace',
    };
    const folder: TreeNode = {
      type: 'folder',
      id: 'd1',
      label: 'd',
      dirPath: '/d',
      indexingLocality: 'workspace',
      children: [child],
    };
    expect(findParentTreeNodeId([folder], 'f1')).toBe('d1');
    expect(findParentTreeNodeId([folder], 'd1')).toBeNull();
  });
});

describe('treeItemDomId', () => {
  it('encodes ids for use as HTML id attribute', () => {
    expect(treeItemDomId('a:b')).toBe(`akashi-treeitem-${encodeURIComponent('a:b')}`);
  });
});
