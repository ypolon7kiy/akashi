import { describe, expect, it } from 'vitest';
import {
  getNodeColor,
  getHoverColor,
  getEdgeColor,
  NODE_COLORS,
  EDGE_COLORS,
} from '@src/domains/graph/webview/graphNodeColors';
import { GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS } from '@src/domains/graph/domain/sourceCategoryPalette';
import type { GraphNode3D } from '@src/domains/graph/domain/graphTypes';

function makeNode(overrides: Partial<GraphNode3D> = {}): GraphNode3D {
  return {
    id: 'test',
    label: 'test',
    formattedTextLines: ['test'],
    type: 'note',
    position: [0, 0, 0],
    size: 1,
    isSelected: false,
    isPointed: false,
    isVisible: true,
    ...overrides,
  };
}

describe('getNodeColor', () => {
  it('returns category fill for a note node with graphCategoryId', () => {
    const node = makeNode({ type: 'note', graphCategoryId: 'skill' });
    expect(getNodeColor('note', node)).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.skill.fill);
  });

  it('returns category fill for a folder node with graphCategoryId', () => {
    const node = makeNode({ type: 'folder', graphCategoryId: 'hook' });
    expect(getNodeColor('folder', node)).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.hook.fill);
  });

  it('returns category fill for a category hub node', () => {
    const node = makeNode({ type: 'category', graphCategoryId: 'mcp' });
    expect(getNodeColor('category', node)).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.mcp.fill);
  });

  it('prefers user-supplied categoryPalette over fallback', () => {
    const node = makeNode({ type: 'note', graphCategoryId: 'rule' });
    const palette = { rule: { fill: '#FF0000', hover: '#FF9999' } };
    expect(getNodeColor('note', node, palette)).toBe('#FF0000');
  });

  it('falls back to fixed NOTE color when no graphCategoryId', () => {
    const node = makeNode({ type: 'note' });
    expect(getNodeColor('note', node)).toBe(NODE_COLORS.NOTE);
  });

  it('falls back to fixed FOLDER color when no graphCategoryId', () => {
    const node = makeNode({ type: 'folder' });
    expect(getNodeColor('folder', node)).toBe(NODE_COLORS.FOLDER);
  });

  it('falls back to fixed type color for unknown graphCategoryId', () => {
    const node = makeNode({ type: 'note', graphCategoryId: 'nonexistent' });
    expect(getNodeColor('note', node)).toBe(NODE_COLORS.NOTE);
  });

  it('returns locality colors unchanged', () => {
    const project = makeNode({ type: 'locality', graphLocality: 'project' });
    const global = makeNode({ type: 'locality', graphLocality: 'global' });
    expect(getNodeColor('locality', project)).toBe(NODE_COLORS.LOCALITY_PROJECT);
    expect(getNodeColor('locality', global)).toBe(NODE_COLORS.LOCALITY_GLOBAL);
  });

  it('returns preset color unchanged', () => {
    const node = makeNode({ type: 'preset' });
    expect(getNodeColor('preset', node)).toBe(NODE_COLORS.PRESET);
  });
});

describe('getHoverColor', () => {
  it('returns category hover for a note node with graphCategoryId', () => {
    const node = makeNode({ type: 'note', graphCategoryId: 'skill' });
    expect(getHoverColor('note', node)).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.skill.hover);
  });

  it('returns category hover for a folder node with graphCategoryId', () => {
    const node = makeNode({ type: 'folder', graphCategoryId: 'hook' });
    expect(getHoverColor('folder', node)).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.hook.hover);
  });

  it('prefers user-supplied categoryPalette hover', () => {
    const node = makeNode({ type: 'note', graphCategoryId: 'rule' });
    const palette = { rule: { fill: '#FF0000', hover: '#FF9999' } };
    expect(getHoverColor('note', node, palette)).toBe('#FF9999');
  });

  it('falls back to fixed NOTE_HOVER when no graphCategoryId', () => {
    const node = makeNode({ type: 'note' });
    expect(getHoverColor('note', node)).toBe(NODE_COLORS.NOTE_HOVER);
  });

  it('falls back to fixed FOLDER_HOVER when no graphCategoryId', () => {
    const node = makeNode({ type: 'folder' });
    expect(getHoverColor('folder', node)).toBe(NODE_COLORS.FOLDER_HOVER);
  });

  it('returns locality hover colors unchanged', () => {
    const project = makeNode({ type: 'locality', graphLocality: 'project' });
    const global = makeNode({ type: 'locality', graphLocality: 'global' });
    expect(getHoverColor('locality', project)).toBe(NODE_COLORS.LOCALITY_PROJECT_HOVER);
    expect(getHoverColor('locality', global)).toBe(NODE_COLORS.LOCALITY_GLOBAL_HOVER);
  });
});

describe('getEdgeColor', () => {
  it('returns highlighted color when pointed', () => {
    expect(getEdgeColor(true)).toBe(EDGE_COLORS.HIGHLIGHTED);
  });

  it('returns default color when not pointed', () => {
    expect(getEdgeColor(false)).toBe(EDGE_COLORS.DEFAULT);
  });
});
