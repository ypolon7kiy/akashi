import { describe, expect, it } from 'vitest';
import {
  buildGraphFromSourcesPayload,
  graphCategoryNodeId,
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
  groupSourceRecordsByParentDir,
  useFolderNodeForDirectory,
} from '@src/domains/graph/application/buildGraphFromSourcesPayload';
import type { SourcesSnapshotPayload } from '@src/shared/types/sourcesSnapshotPayload';
import { sourceRecordId } from '@src/shared/sourceRecordId';

function record(
  path: string,
  preset: string,
  locality: 'workspace' | 'user',
  graphLocality: 'project' | 'global',
  category = 'context',
  byteLength = 10
): SourcesSnapshotPayload['records'][number] {
  return {
    id: sourceRecordId(preset, locality, path),
    path,
    preset,
    category,
    locality,
    tags: [
      { type: 'locality', value: graphLocality },
      { type: 'category', value: category },
      { type: 'preset', value: preset },
    ],
    metadata: { byteLength, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

const basePayload = (): SourcesSnapshotPayload => ({
  generatedAt: '2025-01-01T00:00:00.000Z',
  sourceCount: 1,
  workspaceFolders: [{ name: 'ws', path: '/ws' }],
  records: [record('/ws/src/CLAUDE.md', 'claude', 'workspace', 'project')],
});

describe('buildGraphFromSourcesPayload', () => {
  it('returns empty graph for null payload', () => {
    const g = buildGraphFromSourcesPayload(null);
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it('builds preset → locality → category → folder → file for single-file directory', () => {
    const payload = basePayload();
    const { nodes, edges } = buildGraphFromSourcesPayload(payload);

    // Preset node
    expect(nodes.find((n) => n.id === graphPresetNodeId('claude'))?.type).toBe('preset');
    expect(nodes.find((n) => n.id === graphPresetNodeId('claude'))?.size).toBe(3);

    // Locality node
    expect(nodes.find((n) => n.id === graphLocalityNodeId('claude', 'project'))?.type).toBe(
      'locality'
    );

    // Category node (context)
    const catId = graphCategoryNodeId('claude', 'project', 'context');
    const catNode = nodes.find((n) => n.id === catId);
    expect(catNode?.type).toBe('category');
    expect(catNode?.graphCategoryId).toBe('context');
    expect(catNode?.label).toBe('Context');

    const srcDir = '/ws/src';
    const folId = graphFolderNodeId('claude', 'project', srcDir);
    expect(nodes.some((n) => n.id === folId && n.type === 'folder')).toBe(true);

    // File node
    const fileId = graphFileNodeId('claude', 'project', '/ws/src/CLAUDE.md');
    const note = nodes.find((n) => n.id === fileId);
    expect(note?.type).toBe('note');
    expect(note?.layoutDepth).toBe(4);
    expect(note?.filesystemPath).toBe('/ws/src/CLAUDE.md');
    expect(note?.graphCategoryId).toBe('context');

    // Edge: preset → locality (spine)
    expect(
      edges.some(
        (e) =>
          e.source === graphPresetNodeId('claude') &&
          e.target === graphLocalityNodeId('claude', 'project')
      )
    ).toBe(true);

    // Edge: locality → category (branch)
    expect(
      edges.some(
        (e) =>
          e.type === 'contains' &&
          e.source === graphLocalityNodeId('claude', 'project') &&
          e.target === catId
      )
    ).toBe(true);

    // Edge: category → folder → file
    expect(
      edges.some((e) => e.type === 'contains' && e.source === catId && e.target === folId)
    ).toBe(true);
    expect(
      edges.some((e) => e.type === 'contains' && e.source === folId && e.target === fileId)
    ).toBe(true);
  });

  it('groups files by category under the same locality', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 3,
      records: [
        record('/ws/CLAUDE.md', 'claude', 'workspace', 'project', 'context'),
        record('/ws/.claude/rules/a.md', 'claude', 'workspace', 'project', 'rule'),
        record('/ws/.claude/rules/b.md', 'claude', 'workspace', 'project', 'rule'),
      ],
    };
    const { nodes, edges } = buildGraphFromSourcesPayload(payload);

    const contextCat = nodes.find(
      (n) => n.id === graphCategoryNodeId('claude', 'project', 'context')
    );
    const ruleCat = nodes.find((n) => n.id === graphCategoryNodeId('claude', 'project', 'rule'));
    expect(contextCat?.label).toBe('Context');
    expect(ruleCat?.label).toBe('Rules');

    const rulesDir = '/ws/.claude/rules';
    const folId = graphFolderNodeId('claude', 'project', rulesDir);
    expect(nodes.some((n) => n.id === folId && n.type === 'folder')).toBe(true);
    expect(
      edges.some(
        (e) =>
          e.type === 'contains' &&
          e.source === graphCategoryNodeId('claude', 'project', 'rule') &&
          e.target === folId
      )
    ).toBe(true);
    const fileA = graphFileNodeId('claude', 'project', '/ws/.claude/rules/a.md');
    const fileB = graphFileNodeId('claude', 'project', '/ws/.claude/rules/b.md');
    expect(nodes.find((n) => n.id === fileA)?.layoutDepth).toBe(4);
    expect(nodes.find((n) => n.id === fileB)?.layoutDepth).toBe(4);
    expect(edges.some((e) => e.source === folId && e.target === fileA)).toBe(true);
    expect(edges.some((e) => e.source === folId && e.target === fileB)).toBe(true);
  });

  it('respects minFilesForFolderNode to skip folder tier', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 2,
      records: [
        record('/ws/.claude/rules/a.md', 'claude', 'workspace', 'project', 'rule'),
        record('/ws/.claude/rules/b.md', 'claude', 'workspace', 'project', 'rule'),
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload, { minFilesForFolderNode: 3 });
    expect(nodes.some((n) => n.type === 'folder')).toBe(false);
  });

  it('groupSourceRecordsByParentDir and useFolderNodeForDirectory', () => {
    const recs = [
      record('/ws/a/x.md', 'claude', 'workspace', 'project'),
      record('/ws/a/y.md', 'claude', 'workspace', 'project'),
      record('/ws/b/z.md', 'claude', 'workspace', 'project'),
    ];
    const g = groupSourceRecordsByParentDir(recs);
    expect(g.get('/ws/a')?.length).toBe(2);
    expect(g.get('/ws/b')?.length).toBe(1);
    expect(useFolderNodeForDirectory(2, 2)).toBe(true);
    expect(useFolderNodeForDirectory(1, 2)).toBe(false);
    expect(useFolderNodeForDirectory(1, 1)).toBe(true);
  });

  it('two records same path different presets yield two file nodes', () => {
    const path = '/ws/src/shared.md';
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 2,
      records: [
        record(path, 'cursor', 'workspace', 'project'),
        record(path, 'claude', 'workspace', 'project'),
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload);
    const cursorFile = graphFileNodeId('cursor', 'project', path);
    const claudeFile = graphFileNodeId('claude', 'project', path);
    expect(nodes.some((n) => n.id === cursorFile)).toBe(true);
    expect(nodes.some((n) => n.id === claudeFile)).toBe(true);
    expect(nodes.filter((n) => n.type === 'preset').length).toBe(2);
  });

  it('applies grid spacing options to node positions', () => {
    const payload = basePayload();
    const fileId = graphFileNodeId('claude', 'project', '/ws/src/CLAUDE.md');
    const defaultPos = buildGraphFromSourcesPayload(payload).nodes.find(
      (n) => n.id === fileId
    )?.position;
    const widePos = buildGraphFromSourcesPayload(payload, {
      gridCellSize: 20,
      gridLayerSpacing: 24,
    }).nodes.find((n) => n.id === fileId)?.position;
    expect(defaultPos).toBeDefined();
    expect(widePos).toBeDefined();
    expect(widePos).not.toEqual(defaultPos);
  });

  it('respects enabledPresets filter', () => {
    const path = '/ws/x.md';
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 2,
      records: [
        record(path, 'cursor', 'workspace', 'project'),
        record(path, 'claude', 'workspace', 'project'),
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload, {
      enabledPresets: new Set(['cursor']),
    });
    expect(nodes.some((n) => n.graphPresetId === 'claude')).toBe(false);
    expect(nodes.some((n) => n.graphPresetId === 'cursor')).toBe(true);
  });

  it('places user-locality record in global locality bucket', () => {
    const payload: SourcesSnapshotPayload = {
      generatedAt: '2025-01-01T00:00:00.000Z',
      sourceCount: 1,
      workspaceFolders: [{ name: 'ws', path: '/ws' }],
      records: [
        {
          id: sourceRecordId('cursor', 'user', '/home/user/.cursor/mcp.json'),
          path: '/home/user/.cursor/mcp.json',
          preset: 'cursor',
          category: 'mcp',
          locality: 'user',
          tags: [
            { type: 'locality', value: 'global' },
            { type: 'category', value: 'mcp' },
            { type: 'preset', value: 'cursor' },
          ],
          metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
        },
      ],
    };
    const { nodes, edges } = buildGraphFromSourcesPayload(payload);
    expect(nodes.some((n) => n.id === graphLocalityNodeId('cursor', 'global'))).toBe(true);
    // MCP category node exists
    const catMcp = graphCategoryNodeId('cursor', 'global', 'mcp');
    expect(nodes.some((n) => n.id === catMcp && n.type === 'category')).toBe(true);
    const cursorDir = '/home/user/.cursor';
    const folId = graphFolderNodeId('cursor', 'global', cursorDir);
    expect(nodes.some((n) => n.id === folId && n.type === 'folder')).toBe(true);
    expect(
      edges.some((e) => e.type === 'contains' && e.source === catMcp && e.target === folId)
    ).toBe(true);
    // File node under global
    const fileId = graphFileNodeId('cursor', 'global', '/home/user/.cursor/mcp.json');
    expect(nodes.some((n) => n.type === 'note' && n.id === fileId)).toBe(true);
    expect(
      edges.some((e) => e.type === 'contains' && e.source === folId && e.target === fileId)
    ).toBe(true);
  });

  it('edge tiers have decreasing strength and opacity', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 1,
      records: [record('/ws/CLAUDE.md', 'claude', 'workspace', 'project')],
    };
    const { edges } = buildGraphFromSourcesPayload(payload, { applyGridLayout: false });

    const catId = graphCategoryNodeId('claude', 'project', 'context');
    const folId = graphFolderNodeId('claude', 'project', '/ws');
    const fileId = graphFileNodeId('claude', 'project', '/ws/CLAUDE.md');

    const presetToLocality = edges.find(
      (e) =>
        e.source === graphPresetNodeId('claude') &&
        e.target === graphLocalityNodeId('claude', 'project')
    );
    const localityToCategory = edges.find(
      (e) => e.source === graphLocalityNodeId('claude', 'project') && e.target === catId
    );
    const categoryToFolder = edges.find(
      (e) => e.source === catId && e.target === folId && e.type === 'contains'
    );
    const folderToFile = edges.find(
      (e) => e.source === folId && e.target === fileId && e.type === 'contains'
    );

    expect(presetToLocality).toBeDefined();
    expect(localityToCategory).toBeDefined();
    expect(categoryToFolder).toBeDefined();
    expect(folderToFile).toBeDefined();

    expect(presetToLocality!.strength).toBeGreaterThan(localityToCategory!.strength);
    expect(localityToCategory!.strength).toBeGreaterThan(categoryToFolder!.strength);
    expect(categoryToFolder!.strength).toBeGreaterThanOrEqual(folderToFile!.strength);
    expect(presetToLocality!.opacity).toBeGreaterThan(localityToCategory!.opacity);
    expect(localityToCategory!.opacity).toBeGreaterThan(categoryToFolder!.opacity);
    expect(categoryToFolder!.opacity).toBeGreaterThanOrEqual(folderToFile!.opacity);
  });

  it('edge tiers stay monotonic when folder tier is present', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 2,
      records: [
        record('/ws/.claude/rules/a.md', 'claude', 'workspace', 'project', 'rule'),
        record('/ws/.claude/rules/b.md', 'claude', 'workspace', 'project', 'rule'),
      ],
    };
    const { edges } = buildGraphFromSourcesPayload(payload, { applyGridLayout: false });
    const catId = graphCategoryNodeId('claude', 'project', 'rule');
    const folId = graphFolderNodeId('claude', 'project', '/ws/.claude/rules');
    const presetToLocality = edges.find(
      (e) =>
        e.source === graphPresetNodeId('claude') &&
        e.target === graphLocalityNodeId('claude', 'project')
    );
    const localityToCategory = edges.find(
      (e) => e.source === graphLocalityNodeId('claude', 'project') && e.target === catId
    );
    const categoryToFolder = edges.find(
      (e) => e.source === catId && e.target === folId && e.type === 'contains'
    );
    const folderToFile = edges.find(
      (e) =>
        e.source === folId &&
        e.target === graphFileNodeId('claude', 'project', '/ws/.claude/rules/a.md')
    );
    expect(presetToLocality).toBeDefined();
    expect(localityToCategory).toBeDefined();
    expect(categoryToFolder).toBeDefined();
    expect(folderToFile).toBeDefined();
    expect(presetToLocality!.strength).toBeGreaterThan(localityToCategory!.strength);
    expect(localityToCategory!.strength).toBeGreaterThan(categoryToFolder!.strength);
    expect(categoryToFolder!.strength).toBeGreaterThanOrEqual(folderToFile!.strength);
  });

  it('file node size scales with byteLength', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 2,
      records: [
        record('/ws/small.md', 'claude', 'workspace', 'project', 'context', 100),
        record('/ws/large.md', 'claude', 'workspace', 'project', 'context', 15000),
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload, { applyGridLayout: false });
    const small = nodes.find((n) => n.filesystemPath === '/ws/small.md');
    const large = nodes.find((n) => n.filesystemPath === '/ws/large.md');
    expect(small).toBeDefined();
    expect(large).toBeDefined();
    expect(large!.size).toBeGreaterThan(small!.size);
  });
});
