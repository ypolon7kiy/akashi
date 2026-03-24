import { describe, expect, it } from 'vitest';
import { filterArtifactCreatorsForGraphNode } from '@src/domains/graph/application/filterArtifactCreatorsForGraphNode';
import type { GraphNode3D } from '@src/domains/graph/domain/graphTypes';
import type { ArtifactCreatorMenuEntry } from '@src/shared/types/sourcesSnapshotPayload';

function baseNode(overrides: Partial<GraphNode3D>): GraphNode3D {
  return {
    id: 'n1',
    label: 'L',
    formattedTextLines: ['L'],
    type: 'category',
    position: [0, 0, 0],
    size: 1,
    isSelected: false,
    isPointed: false,
    isVisible: true,
    ...overrides,
  };
}

const entries: ArtifactCreatorMenuEntry[] = [
  {
    id: 'cursor/skill/workspace',
    label: 'New Skill',
    presetId: 'cursor',
    scope: 'workspace',
    category: 'skill',
  },
  {
    id: 'cursor/skill/user',
    label: 'New Skill (global)',
    presetId: 'cursor',
    scope: 'user',
    category: 'skill',
  },
  {
    id: 'claude/skill/workspace',
    label: 'Claude Skill',
    presetId: 'claude',
    scope: 'workspace',
    category: 'skill',
  },
];

describe('filterArtifactCreatorsForGraphNode', () => {
  it('returns [] for note and unknown types', () => {
    const note = baseNode({ type: 'note', graphPresetId: 'cursor', graphCategoryId: 'skill' });
    expect(filterArtifactCreatorsForGraphNode(entries, note, null)).toEqual([]);
    const tag = baseNode({ type: 'tag', graphPresetId: 'cursor' });
    expect(filterArtifactCreatorsForGraphNode(entries, tag, null)).toEqual([]);
  });

  it('returns [] when graphPresetId is missing', () => {
    const n = baseNode({ type: 'category', graphCategoryId: 'skill', graphLocality: 'project' });
    expect(filterArtifactCreatorsForGraphNode(entries, n, null)).toEqual([]);
  });

  it('filters by enabled presets when set', () => {
    const n = baseNode({
      type: 'preset',
      graphPresetId: 'cursor',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, n, new Set(['claude']))).toEqual([]);
    expect(filterArtifactCreatorsForGraphNode(entries, n, new Set(['cursor']))).toEqual([
      entries[0],
      entries[1],
    ]);
  });

  it('matches preset tier: all creators for that preset', () => {
    const n = baseNode({ type: 'preset', graphPresetId: 'cursor' });
    expect(filterArtifactCreatorsForGraphNode(entries, n, null)).toEqual([entries[0], entries[1]]);
  });

  it('matches locality: preset + scope from project/global', () => {
    const proj = baseNode({
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'project',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, proj, null)).toEqual([entries[0]]);
    const glob = baseNode({
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'global',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, glob, null)).toEqual([entries[1]]);
  });

  it('returns [] for locality without graphLocality', () => {
    const n = baseNode({ type: 'locality', graphPresetId: 'cursor' });
    expect(filterArtifactCreatorsForGraphNode(entries, n, null)).toEqual([]);
  });

  it('matches category and folder by graphCategoryId', () => {
    const cat = baseNode({
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphCategoryId: 'skill',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, cat, null)).toEqual([entries[0]]);
    const fol = baseNode({
      type: 'folder',
      graphPresetId: 'cursor',
      graphLocality: 'global',
      graphCategoryId: 'skill',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, fol, null)).toEqual([entries[1]]);
  });

  it('returns [] for category when category id mismatches', () => {
    const cat = baseNode({
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphCategoryId: 'rule',
    });
    expect(filterArtifactCreatorsForGraphNode(entries, cat, null)).toEqual([]);
  });
});
