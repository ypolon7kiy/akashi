import { describe, expect, it } from 'vitest';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import { buildSourceTree, type TreeNode } from '@src/sidebar/webview/sources/tree/sourceTree';
import type { SourceDescriptor, WorkspaceFolderInfo } from '@src/sidebar/bridge/sourceDescriptor';

function descriptor(
  path: string,
  preset: string,
  origin: 'workspace' | 'user',
  category = 'context'
): SourceDescriptor {
  return {
    id: sourceRecordId(preset, origin, path),
    path,
    preset,
    category,
    scope: origin === 'user' ? 'user' : 'workspace',
    origin,
    tags: [
      { type: 'locality', value: origin === 'user' ? 'global' : 'project' },
      { type: 'category', value: category },
      { type: 'preset', value: preset },
    ],
    metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

function findFolder(
  nodes: TreeNode[],
  label: string
): Extract<TreeNode, { type: 'folder' }> | undefined {
  for (const n of nodes) {
    if (n.type === 'folder' && n.label === label) {
      return n;
    }
    if (n.type === 'folder') {
      const found = findFolder(n.children, label);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
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
    expect(fooRoot.indexingOrigin).toBe('workspace');
    expect(files[0].indexingOrigin).toBe('workspace');
  });
});

describe('folder presetId / categoryId propagation', () => {
  const folders: WorkspaceFolderInfo[] = [{ name: 'app', path: '/ws/app' }];

  it('sets presetId when all files in a subfolder share one preset', () => {
    const records = [
      descriptor('/ws/app/.claude/skills/a.md', 'claude', 'workspace', 'skill'),
      descriptor('/ws/app/.claude/skills/b.md', 'claude', 'workspace', 'skill'),
    ];
    const roots = buildSourceTree(records, folders);
    const skillsFolder = findFolder(roots, 'skills');
    expect(skillsFolder?.presetId).toBe('claude');
  });

  it('sets categoryId when all files in a subfolder share one category', () => {
    const records = [
      descriptor('/ws/app/.claude/skills/a.md', 'claude', 'workspace', 'skill'),
      descriptor('/ws/app/.claude/skills/b.md', 'claude', 'workspace', 'skill'),
    ];
    const roots = buildSourceTree(records, folders);
    const skillsFolder = findFolder(roots, 'skills');
    expect(skillsFolder?.categoryId).toBe('skill');
  });

  it('leaves presetId undefined when files span multiple presets', () => {
    const records = [
      descriptor('/ws/app/.claude/rules/r.md', 'claude', 'workspace', 'rule'),
      descriptor('/ws/app/.claude/rules/r.md', 'cursor', 'workspace', 'rule'),
    ];
    const roots = buildSourceTree(records, folders);
    const rulesFolder = findFolder(roots, 'rules');
    // two presets → no presetId
    expect(rulesFolder?.presetId).toBeUndefined();
  });

  it('leaves categoryId undefined when files span multiple categories', () => {
    const records = [
      descriptor('/ws/app/mixed/a.md', 'claude', 'workspace', 'skill'),
      descriptor('/ws/app/mixed/b.md', 'claude', 'workspace', 'rule'),
    ];
    const roots = buildSourceTree(records, folders);
    const mixedFolder = findFolder(roots, 'mixed');
    expect(mixedFolder?.categoryId).toBeUndefined();
  });
});

describe('indexingOrigin', () => {
  it('marks workspace subtree nodes as workspace', () => {
    const folders: WorkspaceFolderInfo[] = [{ name: 'app', path: '/ws/app' }];
    const records = [
      descriptor('/ws/app/.claude/skills/a.md', 'claude', 'workspace', 'skill'),
      descriptor('/ws/app/.claude/skills/b.md', 'claude', 'workspace', 'skill'),
    ];
    const roots = buildSourceTree(records, folders);
    const appRoot = roots.find((r) => r.label === 'app');
    expect(appRoot?.type).toBe('folder');
    if (appRoot?.type !== 'folder') {
      return;
    }
    expect(appRoot.indexingOrigin).toBe('workspace');
    const skillsFolder = findFolder(roots, 'skills');
    expect(skillsFolder?.indexingOrigin).toBe('workspace');
  });

  it('marks user subtree nodes as user', () => {
    const folders: WorkspaceFolderInfo[] = [{ name: 'app', path: '/ws/app' }];
    const userPath = '/home/tester/.codex/skills/g.md';
    const records = [descriptor(userPath, 'codex', 'user', 'skill')];
    const roots = buildSourceTree(records, folders);
    const userRoot = roots.find((r) => r.label === 'User configuration');
    expect(userRoot?.type).toBe('folder');
    if (userRoot?.type !== 'folder') {
      return;
    }
    expect(userRoot.indexingOrigin).toBe('user');
    const skillsFolder = findFolder(roots, 'skills');
    expect(skillsFolder?.indexingOrigin).toBe('user');
    const files = skillsFolder?.children.filter(
      (c): c is Extract<TreeNode, { type: 'file' }> => c.type === 'file'
    );
    expect(files).toHaveLength(1);
    expect(files?.[0].indexingOrigin).toBe('user');
  });

  /**
   * Artifact menu scope must follow the tree branch (`indexingOrigin`), not an aggregate of
   * `SourceDescriptor.scope` under the folder (which can be ambiguous).
   */
  it('keeps workspace indexingOrigin when descriptor scope values would disagree', () => {
    const folders: WorkspaceFolderInfo[] = [{ name: 'app', path: '/ws/app' }];
    const a = descriptor('/ws/app/mixed/x.md', 'claude', 'workspace', 'skill');
    const b = {
      ...descriptor('/ws/app/mixed/y.md', 'claude', 'workspace', 'rule'),
      scope: 'user' as const,
    };
    const roots = buildSourceTree([a, b], folders);
    const mixedFolder = findFolder(roots, 'mixed');
    expect(mixedFolder?.indexingOrigin).toBe('workspace');
  });
});
