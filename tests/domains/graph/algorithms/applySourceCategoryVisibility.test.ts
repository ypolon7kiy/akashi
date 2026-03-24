import { describe, expect, it } from 'vitest';
import { applySourceCategoryVisibility } from '@src/domains/graph/algorithms/applySourceCategoryVisibility';
import type { GraphEdge3D, GraphNode3D } from '@src/domains/graph/domain/graphTypes';
import {
  graphCategoryNodeId,
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from '@src/domains/graph/application/buildGraphFromSourcesPayload';

function node(partial: Partial<GraphNode3D> & Pick<GraphNode3D, 'id' | 'type'>): GraphNode3D {
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

function edge(partial: Omit<GraphEdge3D, 'isPointed' | 'isVisible'>): GraphEdge3D {
  return {
    isPointed: false,
    isVisible: true,
    ...partial,
  };
}

describe('applySourceCategoryVisibility', () => {
  const presetCursor = graphPresetNodeId('cursor');
  const locProj = graphLocalityNodeId('cursor', 'project');
  const sk = 'cursor:project';
  const catCtx = graphCategoryNodeId('cursor', 'project', 'context');
  const catRule = graphCategoryNodeId('cursor', 'project', 'rule');
  const nA = graphFileNodeId('cursor', 'project', '/ws/src/a.md');
  const nB = graphFileNodeId('cursor', 'project', '/ws/src/b.rules');

  const nodes: GraphNode3D[] = [
    node({
      id: presetCursor,
      type: 'preset',
      graphPresetId: 'cursor',
      layoutDepth: 0,
    }),
    node({
      id: locProj,
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 1,
    }),
    node({
      id: catCtx,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 2,
    }),
    node({
      id: catRule,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'rule',
      layoutDepth: 2,
    }),
    node({
      id: nA,
      type: 'note',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 3,
    }),
    node({
      id: nB,
      type: 'note',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'rule',
      layoutDepth: 3,
    }),
  ];

  const edges: GraphEdge3D[] = [
    edge({
      id: 'e0',
      source: presetCursor,
      target: locProj,
      type: 'contains',
      strength: 1,
      opacity: 0.7,
    }),
    edge({
      id: 'e1',
      source: locProj,
      target: catCtx,
      type: 'contains',
      strength: 0.8,
      opacity: 0.6,
    }),
    edge({
      id: 'e2',
      source: locProj,
      target: catRule,
      type: 'contains',
      strength: 0.8,
      opacity: 0.6,
    }),
    edge({ id: 'e3', source: catCtx, target: nA, type: 'contains', strength: 0.5, opacity: 0.4 }),
    edge({ id: 'e4', source: catRule, target: nB, type: 'contains', strength: 0.5, opacity: 0.4 }),
  ];

  it('null selection keeps all nodes and edges visible', () => {
    const { nodes: outN, edges: outE } = applySourceCategoryVisibility(nodes, edges, null);
    expect(outN.every((x) => x.isVisible)).toBe(true);
    expect(outE.every((x) => x.isVisible)).toBe(true);
  });

  it('empty set hides every node and edge', () => {
    const { nodes: outN, edges: outE } = applySourceCategoryVisibility(nodes, edges, new Set());
    expect(outN.every((x) => !x.isVisible)).toBe(true);
    expect(outE.every((x) => !x.isVisible)).toBe(true);
  });

  it('single category: spine and descendants only', () => {
    const { nodes: outN, edges: outE } = applySourceCategoryVisibility(
      nodes,
      edges,
      new Set(['context'])
    );
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([presetCursor, locProj, catCtx, nA]));
    expect(
      outE
        .filter((x) => x.isVisible)
        .map((x) => x.id)
        .sort()
    ).toEqual(['e0', 'e1', 'e3'].sort());
  });

  it('two categories: union of spines and subtrees', () => {
    const { nodes: outN } = applySourceCategoryVisibility(
      nodes,
      edges,
      new Set(['context', 'rule'])
    );
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set(nodes.map((x) => x.id)));
  });

  it('unknown category id is included when a matching category node exists', () => {
    const catUnk = graphCategoryNodeId('cursor', 'project', 'unknown');
    const nU = graphFileNodeId('cursor', 'project', '/ws/src/u.txt');
    const nodesU: GraphNode3D[] = [
      ...nodes,
      node({
        id: catUnk,
        type: 'category',
        graphPresetId: 'cursor',
        graphLocality: 'project',
        graphSliceKey: sk,
        graphCategoryId: 'unknown',
        layoutDepth: 2,
      }),
      node({
        id: nU,
        type: 'note',
        graphPresetId: 'cursor',
        graphLocality: 'project',
        graphSliceKey: sk,
        graphCategoryId: 'unknown',
        layoutDepth: 3,
      }),
    ];
    const edgesU: GraphEdge3D[] = [
      ...edges,
      edge({
        id: 'eu1',
        source: locProj,
        target: catUnk,
        type: 'contains',
        strength: 0.8,
        opacity: 0.6,
      }),
      edge({
        id: 'eu2',
        source: catUnk,
        target: nU,
        type: 'contains',
        strength: 0.5,
        opacity: 0.4,
      }),
    ];
    const { nodes: outN } = applySourceCategoryVisibility(nodesU, edgesU, new Set(['unknown']));
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([presetCursor, locProj, catUnk, nU]));
  });

  it('second locality: union across slices', () => {
    const locGlobal = graphLocalityNodeId('cursor', 'global');
    const skG = 'cursor:global';
    const catCtxG = graphCategoryNodeId('cursor', 'global', 'context');
    const nG = graphFileNodeId('cursor', 'global', '/ws/g/x.md');
    const nodes2: GraphNode3D[] = [
      ...nodes,
      node({
        id: locGlobal,
        type: 'locality',
        graphPresetId: 'cursor',
        graphLocality: 'global',
        graphSliceKey: skG,
        layoutDepth: 1,
      }),
      node({
        id: catCtxG,
        type: 'category',
        graphPresetId: 'cursor',
        graphLocality: 'global',
        graphSliceKey: skG,
        graphCategoryId: 'context',
        layoutDepth: 2,
      }),
      node({
        id: nG,
        type: 'note',
        graphPresetId: 'cursor',
        graphLocality: 'global',
        graphSliceKey: skG,
        graphCategoryId: 'context',
        layoutDepth: 3,
      }),
    ];
    const edges2: GraphEdge3D[] = [
      ...edges,
      edge({
        id: 'g0',
        source: presetCursor,
        target: locGlobal,
        type: 'contains',
        strength: 1,
        opacity: 0.7,
      }),
      edge({
        id: 'g1',
        source: locGlobal,
        target: catCtxG,
        type: 'contains',
        strength: 0.8,
        opacity: 0.6,
      }),
      edge({
        id: 'g2',
        source: catCtxG,
        target: nG,
        type: 'contains',
        strength: 0.5,
        opacity: 0.4,
      }),
    ];
    const { nodes: outN } = applySourceCategoryVisibility(nodes2, edges2, new Set(['context']));
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([presetCursor, locProj, catCtx, nA, locGlobal, catCtxG, nG]));
  });
});

describe('applySourceCategoryVisibility with folder tier', () => {
  const presetCursor = graphPresetNodeId('cursor');
  const locProj = graphLocalityNodeId('cursor', 'project');
  const sk = 'cursor:project';
  const catCtx = graphCategoryNodeId('cursor', 'project', 'context');
  const folSrc = graphFolderNodeId('cursor', 'project', '/ws/src');
  const nA = graphFileNodeId('cursor', 'project', '/ws/src/a.md');

  const nodesFolder: GraphNode3D[] = [
    node({
      id: presetCursor,
      type: 'preset',
      graphPresetId: 'cursor',
      layoutDepth: 0,
    }),
    node({
      id: locProj,
      type: 'locality',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 1,
    }),
    node({
      id: catCtx,
      type: 'category',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 2,
    }),
    node({
      id: folSrc,
      type: 'folder',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 3,
    }),
    node({
      id: nA,
      type: 'note',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      graphCategoryId: 'context',
      layoutDepth: 4,
    }),
  ];

  const edgesFolder: GraphEdge3D[] = [
    edge({
      id: 'f0',
      source: presetCursor,
      target: locProj,
      type: 'contains',
      strength: 1,
      opacity: 0.7,
    }),
    edge({
      id: 'f1',
      source: locProj,
      target: catCtx,
      type: 'contains',
      strength: 0.8,
      opacity: 0.6,
    }),
    edge({
      id: 'f2',
      source: catCtx,
      target: folSrc,
      type: 'contains',
      strength: 0.5,
      opacity: 0.4,
    }),
    edge({ id: 'f3', source: folSrc, target: nA, type: 'contains', strength: 0.5, opacity: 0.4 }),
  ];

  it('includes folder and file under selected category', () => {
    const { nodes: outN } = applySourceCategoryVisibility(
      nodesFolder,
      edgesFolder,
      new Set(['context'])
    );
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([presetCursor, locProj, catCtx, folSrc, nA]));
  });
});
