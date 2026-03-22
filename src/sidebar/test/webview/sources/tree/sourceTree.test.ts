import { describe, expect, it } from 'vitest';
import { sourceRecordId } from '../../../../../shared/sourceRecordId';
import { buildSourceTree, type TreeNode } from '../../../../webview/sources/tree/sourceTree';
import type { SourceDescriptor, WorkspaceFolderInfo } from '../../../../bridge/sourceDescriptor';

function descriptor(path: string, preset: string, origin: 'workspace' | 'user'): SourceDescriptor {
  return {
    id: sourceRecordId(preset, origin, path),
    path,
    preset,
    category: 'context',
    scope: origin === 'user' ? 'user' : 'workspace',
    origin,
    tags: [
      { type: 'locality', value: origin === 'user' ? 'global' : 'project' },
      { type: 'category', value: 'context' },
      { type: 'preset', value: preset },
    ],
    metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

describe('buildSourceTree', () => {
  it('merges two descriptors for the same path into one row with presets in the label', () => {
    const p = '/projects/foo/shared.md';
    const folders: WorkspaceFolderInfo[] = [{ name: 'foo', path: '/projects/foo' }];
    const records: SourceDescriptor[] = [
      descriptor(p, 'claude', 'workspace'),
      descriptor(p, 'cursor', 'workspace'),
    ];
    const roots = buildSourceTree(records, folders);
    const fooRoot = roots.find((r) => r.label === 'foo');
    expect(fooRoot?.type).toBe('folder');
    if (fooRoot?.type !== 'folder') {
      return;
    }
    const files = fooRoot.children.filter(
      (c): c is Extract<TreeNode, { type: 'file' }> => c.type === 'file'
    );
    expect(files).toHaveLength(1);
    expect(files[0].presets).toEqual(['claude', 'cursor']);
    expect(files[0].label).toBe('shared.md (claude, cursor)');
    expect(files[0].fileBaseName).toBe('shared.md');
    expect(files[0].path).toBe(p);
    expect(files[0].id).toBe(`ws:foo:file:${encodeURIComponent(p.replace(/\\/g, '/'))}`);
    expect(fooRoot.dirPath).toBe('/projects/foo');
  });
});
