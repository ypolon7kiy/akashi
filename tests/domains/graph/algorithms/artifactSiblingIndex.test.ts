import { describe, expect, it } from 'vitest';
import type { GraphNode3D } from '@src/domains/graph/domain/graphTypes';
import { buildArtifactSiblingIndex } from '@src/domains/graph/algorithms/artifactSiblingIndex';

function n(partial: Partial<GraphNode3D> & Pick<GraphNode3D, 'id' | 'type'>): GraphNode3D {
  return {
    label: partial.label ?? partial.id,
    formattedTextLines: [partial.label ?? partial.id],
    position: [0, 0, 0],
    size: 1,
    isSelected: false,
    isPointed: false,
    isVisible: true,
    ...partial,
  };
}

describe('buildArtifactSiblingIndex', () => {
  it('returns empty index when no nodes have graphArtifactId', () => {
    const nodes = [n({ id: 'a', type: 'note' }), n({ id: 'b', type: 'note' })];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.size).toBe(0);
  });

  it('returns empty index for single-member artifact', () => {
    const nodes = [
      n({ id: 'a', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.size).toBe(0);
  });

  it('returns empty index when all artifact members share the same category', () => {
    const nodes = [
      n({ id: 'a', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
      n({ id: 'b', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.size).toBe(0);
  });

  it('indexes cross-category siblings for two-member artifact', () => {
    const nodes = [
      n({ id: 'lint', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
      n({ id: 'settings', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'config' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.get('lint')).toEqual(['settings']);
    expect(idx.crossCategorySiblings.get('settings')).toEqual(['lint']);
  });

  it('indexes three-member cross-category artifact', () => {
    const nodes = [
      n({ id: 'a', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
      n({ id: 'b', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'config' }),
      n({ id: 'c', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.get('a')).toEqual(['b', 'c']);
    expect(idx.crossCategorySiblings.get('b')).toEqual(['a', 'c']);
    expect(idx.crossCategorySiblings.get('c')).toEqual(['a', 'b']);
  });

  it('handles multiple artifacts: only cross-category ones are indexed', () => {
    const nodes = [
      // Artifact 1: cross-category
      n({ id: 'lint', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
      n({ id: 'settings', type: 'note', graphArtifactId: 'art:1', graphCategoryId: 'config' }),
      // Artifact 2: same category (not indexed)
      n({ id: 'x', type: 'note', graphArtifactId: 'art:2', graphCategoryId: 'rule' }),
      n({ id: 'y', type: 'note', graphArtifactId: 'art:2', graphCategoryId: 'rule' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.has('lint')).toBe(true);
    expect(idx.crossCategorySiblings.has('settings')).toBe(true);
    expect(idx.crossCategorySiblings.has('x')).toBe(false);
    expect(idx.crossCategorySiblings.has('y')).toBe(false);
  });

  it('ignores non-note node types even if they have graphArtifactId', () => {
    const nodes = [
      n({ id: 'cat', type: 'category', graphArtifactId: 'art:1', graphCategoryId: 'hook' }),
      n({ id: 'fol', type: 'folder', graphArtifactId: 'art:1', graphCategoryId: 'config' }),
    ];
    const idx = buildArtifactSiblingIndex(nodes);
    expect(idx.crossCategorySiblings.size).toBe(0);
  });

  it('returns empty index for empty nodes array', () => {
    const idx = buildArtifactSiblingIndex([]);
    expect(idx.crossCategorySiblings.size).toBe(0);
  });
});
