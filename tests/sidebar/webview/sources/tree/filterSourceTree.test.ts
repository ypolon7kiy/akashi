import { describe, expect, it } from 'vitest';
import { filterSourceTree } from '@src/sidebar/webview/sources/tree/filterSourceTree';
import type { TreeNode } from '@src/sidebar/webview/sources/tree/sourceTree';

function file(path: string, label?: string): TreeNode {
  return {
    type: 'file',
    id: `file:${path}`,
    label: label ?? path.split('/').pop()!,
    fileBaseName: path.split('/').pop()!,
    path,
    categoryValue: 'context',
    presets: ['claude'],
    categories: ['context'],
    indexingLocality: 'workspace',
  };
}

function folder(label: string, children: TreeNode[]): TreeNode {
  return {
    type: 'folder',
    id: `dir:${label}`,
    label,
    dirPath: `/${label}`,
    indexingLocality: 'workspace',
    children,
  };
}

describe('filterSourceTree', () => {
  it('returns empty array when no paths match', () => {
    const tree = [folder('src', [file('/src/a.ts'), file('/src/b.ts')])];
    const result = filterSourceTree(tree, new Set(['/other/x.ts']));
    expect(result).toEqual([]);
  });

  it('keeps file nodes whose path is in the matched set', () => {
    const tree = [file('/a.ts'), file('/b.ts'), file('/c.ts')];
    const result = filterSourceTree(tree, new Set(['/a.ts', '/c.ts']));
    expect(result).toHaveLength(2);
    expect(result.map((n) => (n as Extract<TreeNode, { type: 'file' }>).path)).toEqual([
      '/a.ts',
      '/c.ts',
    ]);
  });

  it('keeps folders that have at least one matching descendant', () => {
    const tree = [folder('src', [file('/src/match.ts'), file('/src/miss.ts')])];
    const result = filterSourceTree(tree, new Set(['/src/match.ts']));
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('folder');
    const kids = (result[0] as Extract<TreeNode, { type: 'folder' }>).children;
    expect(kids).toHaveLength(1);
    expect((kids[0] as Extract<TreeNode, { type: 'file' }>).path).toBe('/src/match.ts');
  });

  it('prunes folders with no matching descendants', () => {
    const tree = [
      folder('empty', [file('/empty/a.ts')]),
      folder('has-match', [file('/has-match/b.ts')]),
    ];
    const result = filterSourceTree(tree, new Set(['/has-match/b.ts']));
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('has-match');
  });

  it('handles deeply nested trees', () => {
    const tree = [folder('a', [folder('b', [folder('c', [file('/a/b/c/deep.ts')])])])];
    const result = filterSourceTree(tree, new Set(['/a/b/c/deep.ts']));
    expect(result).toHaveLength(1);
    const level1 = (result[0] as Extract<TreeNode, { type: 'folder' }>).children;
    expect(level1).toHaveLength(1);
    const level2 = (level1[0] as Extract<TreeNode, { type: 'folder' }>).children;
    expect(level2).toHaveLength(1);
    const level3 = (level2[0] as Extract<TreeNode, { type: 'folder' }>).children;
    expect(level3).toHaveLength(1);
    expect((level3[0] as Extract<TreeNode, { type: 'file' }>).path).toBe('/a/b/c/deep.ts');
  });

  it('does not mutate the original tree', () => {
    const original = [folder('src', [file('/src/a.ts'), file('/src/b.ts')])];
    const originalChildCount = (original[0] as Extract<TreeNode, { type: 'folder' }>).children
      .length;
    filterSourceTree(original, new Set(['/src/a.ts']));
    expect((original[0] as Extract<TreeNode, { type: 'folder' }>).children.length).toBe(
      originalChildCount
    );
  });

  it('returns empty array for empty input', () => {
    expect(filterSourceTree([], new Set(['/a.ts']))).toEqual([]);
  });

  it('returns empty for empty matchedPaths', () => {
    const tree = [file('/a.ts')];
    expect(filterSourceTree(tree, new Set())).toEqual([]);
  });
});
