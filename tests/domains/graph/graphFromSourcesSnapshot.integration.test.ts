import { describe, expect, it } from 'vitest';
import {
  buildGraphFromSourcesPayload,
  graphFileNodeId,
  graphPresetNodeId,
} from '@src/domains/graph/application/buildGraphFromSourcesPayload';
import { applyPointedFocusVisibility } from '@src/domains/graph/application/applyPointedFocusVisibility';
import type { SourcesSnapshotPayload } from '@src/shared/types/sourcesSnapshotPayload';
import { sourceRecordId } from '@src/shared/sourceRecordId';

function record(
  fsPath: string,
  preset: string,
  origin: 'workspace' | 'user',
  locality: 'project' | 'global',
  category = 'context',
  byteLength = 10
): SourcesSnapshotPayload['records'][number] {
  return {
    id: sourceRecordId(preset, origin, fsPath),
    path: fsPath,
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

describe('graph from sources snapshot (integration)', () => {
  it('buildGraph then applyPointedFocusVisibility narrows visible set', () => {
    const payload: SourcesSnapshotPayload = {
      generatedAt: '2025-01-01T00:00:00.000Z',
      sourceCount: 2,
      workspaceFolders: [{ name: 'ws', path: '/ws' }],
      records: [
        record('/ws/src/CLAUDE.md', 'claude', 'workspace', 'project', 'context'),
        record('/ws/other/GEMINI.md', 'antigravity', 'workspace', 'project', 'context'),
      ],
    };

    const model = buildGraphFromSourcesPayload(payload);
    expect(model.nodes.length).toBeGreaterThan(3);
    expect(model.edges.length).toBeGreaterThan(0);

    const allVisible = applyPointedFocusVisibility(model.nodes, model.edges, null);
    expect(allVisible.nodes.every((n) => n.isVisible)).toBe(true);
    expect(allVisible.edges.every((e) => e.isVisible)).toBe(true);

    const fileId = graphFileNodeId('claude', 'project', '/ws/src/CLAUDE.md');
    const focused = applyPointedFocusVisibility(model.nodes, model.edges, fileId);
    const visibleCount = focused.nodes.filter((n) => n.isVisible).length;
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(model.nodes.length);
    expect(focused.nodes.find((n) => n.id === fileId)?.isVisible).toBe(true);
    expect(focused.nodes.find((n) => n.id === graphPresetNodeId('claude'))?.isVisible).toBe(true);
  });
});
