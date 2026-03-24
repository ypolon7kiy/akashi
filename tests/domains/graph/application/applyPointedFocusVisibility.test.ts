import { describe, expect, it } from 'vitest';
import type { GraphEdge3D, GraphNode3D } from '@src/domains/graph/domain/graphTypes';
import { applyPointedFocusVisibility } from '@src/domains/graph/application/applyPointedFocusVisibility';
import {
  graphCategoryNodeId,
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from '@src/domains/graph/application/buildGraphFromSourcesPayload';

function n(partial: Partial<GraphNode3D> & Pick<GraphNode3D, 'id' | 'type'>): GraphNode3D {
  return {
    label: partial.label ?? partial.id,
    formattedTextLines: partial.formattedTextLines ?? [partial.label ?? partial.id],
    position: partial.position ?? [0, 0, 0],
    size: partial.size ?? 1,
    isSelected: false,
    isPointed: false,
    isVisible: true,
    ...partial,
  };
}

function e(partial: Omit<GraphEdge3D, 'isPointed' | 'isVisible'>): GraphEdge3D {
  return {
    isPointed: false,
    isVisible: true,
    ...partial,
  };
}

describe('applyPointedFocusVisibility', () => {
  const presetCursor = graphPresetNodeId('cursor');
  const locProj = graphLocalityNodeId('cursor', 'project');
  const sk = 'cursor:project';
  const catCtx = graphCategoryNodeId('cursor', 'project', 'context');
  const catRule = graphCategoryNodeId('cursor', 'project', 'rule');
  const nA = graphFileNodeId('cursor', 'project', '/ws/src/a.md');
  const nB = graphFileNodeId('cursor', 'project', '/ws/src/b.rules');

  const nodes: GraphNode3D[] = [
    n({
      id: presetCursor,
      type: 'preset',
      graphPresetId: 'cursor',
      layoutDepth: 0,
    }),
    n({
      id: locProj,
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 1,
    }),
    n({
      id: catCtx,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 2,
    }),
    n({
      id: catRule,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'rule',
      layoutDepth: 2,
    }),
    n({
      id: nA,
      type: 'note',
      filesystemPath: '/ws/src/a.md',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 3,
    }),
    n({
      id: nB,
      type: 'note',
      filesystemPath: '/ws/src/b.rules',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'rule',
      layoutDepth: 3,
    }),
  ];

  const edges: GraphEdge3D[] = [
    e({
      id: 'e0',
      source: presetCursor,
      target: locProj,
      type: 'contains',
      strength: 1,
      opacity: 0.7,
    }),
    e({ id: 'e1', source: locProj, target: catCtx, type: 'contains', strength: 0.8, opacity: 0.6 }),
    e({
      id: 'e2',
      source: locProj,
      target: catRule,
      type: 'contains',
      strength: 0.8,
      opacity: 0.6,
    }),
    e({ id: 'e3', source: catCtx, target: nA, type: 'contains', strength: 0.5, opacity: 0.4 }),
    e({ id: 'e4', source: catRule, target: nB, type: 'contains', strength: 0.5, opacity: 0.4 }),
  ];

  it('shows all when pointedId is null', () => {
    const { nodes: outN, edges: outE } = applyPointedFocusVisibility(nodes, edges, null);
    expect(outN.every((x) => x.isVisible)).toBe(true);
    expect(outE.every((x) => x.isVisible)).toBe(true);
  });

  it('preserves base visibility when pointedId is null (e.g. category filter)', () => {
    const nodesPartial = nodes.map((x) =>
      x.id === catRule || x.id === nB ? { ...x, isVisible: false } : { ...x }
    );
    const edgesPartial = edges.map((e) => ({
      ...e,
      isVisible: e.id === 'e2' || e.id === 'e4' ? false : true,
    }));
    const { nodes: outN, edges: outE } = applyPointedFocusVisibility(
      nodesPartial,
      edgesPartial,
      null
    );
    expect(outN.find((x) => x.id === catRule)?.isVisible).toBe(false);
    expect(outN.find((x) => x.id === catCtx)?.isVisible).toBe(true);
    expect(outE.find((x) => x.id === 'e2')?.isVisible).toBe(false);
  });

  it('shows all when pointedId is unknown', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, '/nope');
    expect(outN.every((x) => x.isVisible)).toBe(true);
  });

  it('note: shows file, parent category, locality, preset', () => {
    const { nodes: outN, edges: outE } = applyPointedFocusVisibility(nodes, edges, nA);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([nA, catCtx, locProj, presetCursor]));
    expect(outE.filter((x) => x.isVisible).length).toBeGreaterThan(0);
  });

  it('category: shows category, its files, locality, preset (not sibling categories)', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, catCtx);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([catCtx, nA, locProj, presetCursor]));
    expect(vis.has(catRule)).toBe(false);
    expect(vis.has(nB)).toBe(false);
  });

  it('locality: shows full slice + preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, locProj);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set(nodes.map((x) => x.id)));
  });

  it('preset: shows all nodes for that preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, presetCursor);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set(nodes.map((x) => x.id)));
  });
});

describe('applyPointedFocusVisibility with folder tier', () => {
  const presetCursor = graphPresetNodeId('cursor');
  const locProj = graphLocalityNodeId('cursor', 'project');
  const sk = 'cursor:project';
  const catCtx = graphCategoryNodeId('cursor', 'project', 'context');
  const folSrc = graphFolderNodeId('cursor', 'project', '/ws/src');
  const nA = graphFileNodeId('cursor', 'project', '/ws/src/a.md');
  const nB = graphFileNodeId('cursor', 'project', '/ws/src/b.md');

  const nodesFolder: GraphNode3D[] = [
    n({
      id: presetCursor,
      type: 'preset',
      graphPresetId: 'cursor',
      layoutDepth: 0,
    }),
    n({
      id: locProj,
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 1,
    }),
    n({
      id: catCtx,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 2,
    }),
    n({
      id: folSrc,
      type: 'folder',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 3,
    }),
    n({
      id: nA,
      type: 'note',
      filesystemPath: '/ws/src/a.md',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 4,
    }),
    n({
      id: nB,
      type: 'note',
      filesystemPath: '/ws/src/b.md',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 4,
    }),
  ];

  const edgesFolder: GraphEdge3D[] = [
    e({
      id: 'f0',
      source: presetCursor,
      target: locProj,
      type: 'contains',
      strength: 1,
      opacity: 0.7,
    }),
    e({ id: 'f1', source: locProj, target: catCtx, type: 'contains', strength: 0.8, opacity: 0.6 }),
    e({ id: 'f2', source: catCtx, target: folSrc, type: 'contains', strength: 0.5, opacity: 0.4 }),
    e({ id: 'f3', source: folSrc, target: nA, type: 'contains', strength: 0.5, opacity: 0.4 }),
    e({ id: 'f4', source: folSrc, target: nB, type: 'contains', strength: 0.5, opacity: 0.4 }),
  ];

  it('note: shows folder, category, locality, preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodesFolder, edgesFolder, nA);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([nA, folSrc, catCtx, locProj, presetCursor]));
  });

  it('category: shows folder, both notes, locality, preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodesFolder, edgesFolder, catCtx);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([catCtx, folSrc, nA, nB, locProj, presetCursor]));
  });

  it('folder: shows both notes, category, locality, preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodesFolder, edgesFolder, folSrc);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([folSrc, nA, nB, catCtx, locProj, presetCursor]));
  });
});
