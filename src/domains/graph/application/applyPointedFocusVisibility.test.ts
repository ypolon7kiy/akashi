import { describe, expect, it } from 'vitest';
import type { GraphEdge3D, GraphNode3D } from '../domain/graphTypes';
import { applyPointedFocusVisibility } from './applyPointedFocusVisibility';
import {
  graphFileNodeId,
  graphFolderNodeId,
  graphLocalityNodeId,
  graphPresetNodeId,
} from './buildGraphFromSourcesPayload';

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
  const fWs = graphFolderNodeId('cursor', 'project', '/ws');
  const fWsSrc = graphFolderNodeId('cursor', 'project', '/ws/src');
  const nA = graphFileNodeId('cursor', 'project', '/ws/src/a.md');

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
      id: fWs,
      type: 'folder',
      folderPath: '/ws',
      filesystemPath: '/ws',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 2,
    }),
    n({
      id: fWsSrc,
      type: 'folder',
      folderPath: '/ws/src',
      filesystemPath: '/ws/src',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 3,
    }),
    n({
      id: nA,
      type: 'note',
      folderPath: '/ws/src',
      filesystemPath: '/ws/src/a.md',
      graphPresetId: 'cursor',
      graphLocality: 'project',
      graphSliceKey: sk,
      layoutDepth: 4,
    }),
  ];

  const edges: GraphEdge3D[] = [
    e({
      id: 'e0',
      source: presetCursor,
      target: locProj,
      type: 'contains',
      strength: 1,
      opacity: 0.6,
    }),
    e({ id: 'e1', source: locProj, target: fWs, type: 'contains', strength: 1, opacity: 0.6 }),
    e({ id: 'e2', source: fWs, target: fWsSrc, type: 'contains', strength: 1, opacity: 0.6 }),
    e({ id: 'e3', source: fWsSrc, target: nA, type: 'contains', strength: 1, opacity: 0.6 }),
  ];

  it('shows all when pointedId is null', () => {
    const { nodes: outN, edges: outE } = applyPointedFocusVisibility(nodes, edges, null);
    expect(outN.every((x) => x.isVisible)).toBe(true);
    expect(outE.every((x) => x.isVisible)).toBe(true);
  });

  it('shows all when pointedId is unknown', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, '/nope');
    expect(outN.every((x) => x.isVisible)).toBe(true);
  });

  it('note: shows file, ancestor folders, locality, preset', () => {
    const { nodes: outN, edges: outE } = applyPointedFocusVisibility(nodes, edges, nA);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([nA, fWsSrc, fWs, locProj, presetCursor]));
    expect(outE.filter((x) => x.isVisible).length).toBeGreaterThan(0);
  });

  it('folder: shows subtree in slice + locality + preset', () => {
    const { nodes: outN } = applyPointedFocusVisibility(nodes, edges, fWsSrc);
    const vis = new Set(outN.filter((x) => x.isVisible).map((x) => x.id));
    expect(vis).toEqual(new Set([fWsSrc, nA, locProj, presetCursor]));
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
