import { describe, expect, it } from 'vitest';
import {
  buildGraphFromSourcesPayload,
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from './buildGraphFromSourcesPayload';
import type { SourcesSnapshotPayload } from '../../../sidebar/bridge/sourceDescriptor';

const basePayload = (): SourcesSnapshotPayload => ({
  generatedAt: '2025-01-01T00:00:00.000Z',
  sourceCount: 1,
  workspaceFolders: [{ name: 'ws', path: '/ws' }],
  records: [
    {
      id: '/ws/src/AGENTS.md',
      path: '/ws/src/AGENTS.md',
      kind: 'agents_md',
      presets: ['cursor'],
      scope: 'workspace',
      origin: 'workspace',
      tags: [
        { type: 'locality', value: 'project' },
        { type: 'category', value: 'context' },
      ],
      metadata: { byteLength: 10, updatedAt: '2025-01-01T00:00:00.000Z' },
    },
  ],
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

    expect(nodes.find((n) => n.id === graphPresetNodeId('cursor'))?.type).toBe('preset');
    expect(nodes.find((n) => n.id === graphLocalityNodeId('cursor', 'project'))?.type).toBe(
      'locality'
    );

    const fWs = graphFolderNodeId('cursor', 'project', '/ws');
    const fSrc = graphFolderNodeId('cursor', 'project', '/ws/src');
    expect(nodes.some((n) => n.id === fWs && n.type === 'folder')).toBe(true);
    expect(nodes.some((n) => n.id === fSrc && n.type === 'folder')).toBe(true);

    const fileId = graphFileNodeId('cursor', 'project', '/ws/src/AGENTS.md');
    const note = nodes.find((n) => n.id === fileId);
    expect(note?.type).toBe('note');
    expect(note?.filesystemPath).toBe('/ws/src/AGENTS.md');
    expect(note?.formattedTextLines).toEqual(['AGENTS.md']);

    expect(nodes.some((n) => n.type === 'tag')).toBe(false);

    expect(
      edges.some(
        (e) =>
          e.source === graphPresetNodeId('cursor') &&
          e.target === graphLocalityNodeId('cursor', 'project')
      )
    ).toBe(true);
    expect(
      edges.some(
        (e) =>
          e.type === 'contains' &&
          e.target === fileId &&
          e.source === graphFolderNodeId('cursor', 'project', '/ws/src')
      )
    ).toBe(true);
  });

  it('duplicates file node per preset on the same record', () => {
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      records: [
        {
          ...basePayload().records[0],
          presets: ['cursor', 'claude'],
        },
      ],
    };
    const { nodes } = buildGraphFromSourcesPayload(payload);
    const cursorFile = graphFileNodeId('cursor', 'project', '/ws/src/AGENTS.md');
    const claudeFile = graphFileNodeId('claude', 'project', '/ws/src/AGENTS.md');
    expect(nodes.some((n) => n.id === cursorFile)).toBe(true);
    expect(nodes.some((n) => n.id === claudeFile)).toBe(true);
    expect(nodes.filter((n) => n.type === 'preset').length).toBe(2);
  });

  it('applies grid spacing options to node positions', () => {
    const payload = basePayload();
    const fileId = graphFileNodeId('cursor', 'project', '/ws/src/AGENTS.md');
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
    const payload: SourcesSnapshotPayload = {
      ...basePayload(),
      records: [
        {
          ...basePayload().records[0],
          presets: ['cursor', 'claude'],
        },
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
          id: '/home/user/.cursor/mcp.json',
          path: '/home/user/.cursor/mcp.json',
          kind: 'cursor_mcp_json',
          presets: ['cursor'],
          scope: 'user',
          origin: 'user',
          tags: [{ type: 'locality', value: 'global' }],
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
