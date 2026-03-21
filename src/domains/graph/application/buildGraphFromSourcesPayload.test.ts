import { describe, expect, it } from 'vitest';
import {
  buildGraphFromSourcesPayload,
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from './buildGraphFromSourcesPayload';
import type { SourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';
import { sourceRecordId } from '../../../shared/sourceRecordId';

function record(
  path: string,
  preset: string,
  origin: 'workspace' | 'user',
  locality: 'project' | 'global'
): SourcesSnapshotPayload['records'][number] {
  return {
    id: sourceRecordId(preset, origin, path),
    path,
    preset,
    category: 'context',
    scope: origin === 'user' ? 'user' : 'workspace',
    origin,
    tags: [
      { type: 'locality', value: locality },
      { type: 'category', value: 'context' },
      { type: 'preset', value: preset },
    ],
    metadata: { byteLength: 10, updatedAt: '2025-01-01T00:00:00.000Z' },
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

  it('builds preset → locality → folders → file (no facet tag nodes)', () => {
    const payload = basePayload();
    const { nodes, edges } = buildGraphFromSourcesPayload(payload);

    expect(nodes.find((n) => n.id === graphPresetNodeId('claude'))?.type).toBe('preset');
    expect(nodes.find((n) => n.id === graphLocalityNodeId('claude', 'project'))?.type).toBe(
      'locality'
    );

    const fWs = graphFolderNodeId('claude', 'project', '/ws');
    const fSrc = graphFolderNodeId('claude', 'project', '/ws/src');
    expect(nodes.some((n) => n.id === fWs && n.type === 'folder')).toBe(true);
    expect(nodes.some((n) => n.id === fSrc && n.type === 'folder')).toBe(true);

    const fileId = graphFileNodeId('claude', 'project', '/ws/src/CLAUDE.md');
    const note = nodes.find((n) => n.id === fileId);
    expect(note?.type).toBe('note');
    expect(note?.filesystemPath).toBe('/ws/src/CLAUDE.md');
    expect(note?.formattedTextLines).toEqual(['CLAUDE.md']);

    expect(nodes.some((n) => n.type === 'tag')).toBe(false);

    expect(
      edges.some(
        (e) =>
          e.source === graphPresetNodeId('claude') &&
          e.target === graphLocalityNodeId('claude', 'project')
      )
    ).toBe(true);
    expect(
      edges.some(
        (e) =>
          e.type === 'contains' &&
          e.target === fileId &&
          e.source === graphFolderNodeId('claude', 'project', '/ws/src')
      )
    ).toBe(true);
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
    expect(
      nodes.some(
        (n) =>
          n.type === 'note' &&
          n.id === graphFileNodeId('cursor', 'global', '/home/user/.cursor/mcp.json')
      )
    ).toBe(true);
  });
});
