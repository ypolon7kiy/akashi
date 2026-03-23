import { describe, expect, it } from 'vitest';
import {
  buildGraphFromSourcesPayload,
  graphCategoryNodeId,
  graphFileNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from './buildGraphFromSourcesPayload';
import type { SourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';
import { sourceRecordId } from '../../../shared/sourceRecordId';

function record(
  path: string,
  preset: string,
  origin: 'workspace' | 'user',
  locality: 'project' | 'global',
  category = 'context',
  byteLength = 10
): SourcesSnapshotPayload['records'][number] {
  return {
    id: sourceRecordId(preset, origin, path),
    path,
    preset,
    category,
    scope: origin === 'user' ? 'user' : 'workspace',
    origin,
    tags: [
      { type: 'locality', value: locality },
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

  it('builds preset → locality → category → file hierarchy', () => {
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
    expect(catNode?.childCount).toBe(1);
    expect(catNode?.label).toBe('Context (1)');

    // File node
    const fileId = graphFileNodeId('claude', 'project', '/ws/src/CLAUDE.md');
    const note = nodes.find((n) => n.id === fileId);
    expect(note?.type).toBe('note');
    expect(note?.filesystemPath).toBe('/ws/src/CLAUDE.md');
    expect(note?.graphCategoryId).toBe('context');

    // No folder nodes (replaced by category)
    expect(nodes.some((n) => n.type === 'folder')).toBe(false);

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

    // Edge: category → file (leaf)
    expect(
      edges.some((e) => e.type === 'contains' && e.source === catId && e.target === fileId)
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
    const { nodes } = buildGraphFromSourcesPayload(payload);

    const contextCat = nodes.find(
      (n) => n.id === graphCategoryNodeId('claude', 'project', 'context')
    );
    const ruleCat = nodes.find((n) => n.id === graphCategoryNodeId('claude', 'project', 'rule'));
    expect(contextCat?.childCount).toBe(1);
    expect(ruleCat?.childCount).toBe(2);
    expect(ruleCat?.label).toBe('Rules (2)');
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

  it('places user-origin record in global locality bucket', () => {
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
          scope: 'user',
          origin: 'user',
          tags: [
            { type: 'locality', value: 'global' },
            { type: 'category', value: 'mcp' },
            { type: 'preset', value: 'cursor' },
          ],
          metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
        },
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload);
    expect(nodes.some((n) => n.id === graphLocalityNodeId('cursor', 'global'))).toBe(true);
    // MCP category node exists
    expect(
      nodes.some(
        (n) => n.id === graphCategoryNodeId('cursor', 'global', 'mcp') && n.type === 'category'
      )
    ).toBe(true);
    // File node under global
    expect(
      nodes.some(
        (n) =>
          n.type === 'note' &&
          n.id === graphFileNodeId('cursor', 'global', '/home/user/.cursor/mcp.json')
      )
    ).toBe(true);
  });

  it('edge tiers have decreasing strength and opacity', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      sourceCount: 1,
      records: [record('/ws/CLAUDE.md', 'claude', 'workspace', 'project')],
    };
    const { edges } = buildGraphFromSourcesPayload(payload, { applyGridLayout: false });

    const presetToLocality = edges.find(
      (e) =>
        e.source === graphPresetNodeId('claude') &&
        e.target === graphLocalityNodeId('claude', 'project')
    );
    const localityToCategory = edges.find(
      (e) =>
        e.source === graphLocalityNodeId('claude', 'project') &&
        e.target === graphCategoryNodeId('claude', 'project', 'context')
    );
    const categoryToFile = edges.find(
      (e) =>
        e.source === graphCategoryNodeId('claude', 'project', 'context') &&
        e.target === graphFileNodeId('claude', 'project', '/ws/CLAUDE.md')
    );

    expect(presetToLocality).toBeDefined();
    expect(localityToCategory).toBeDefined();
    expect(categoryToFile).toBeDefined();

    // Spine > branch > leaf
    expect(presetToLocality!.strength).toBeGreaterThan(localityToCategory!.strength);
    expect(localityToCategory!.strength).toBeGreaterThan(categoryToFile!.strength);
    expect(presetToLocality!.opacity).toBeGreaterThan(localityToCategory!.opacity);
    expect(localityToCategory!.opacity).toBeGreaterThan(categoryToFile!.opacity);
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
