import type { GraphEdge3D } from '../../domain/graphTypes';
import { GEOMETRY_CONSTANTS, VISUAL_CONSTANTS } from './Constants';

export function calculateEdgeThickness(edge: GraphEdge3D, isPointed: boolean): number {
  if (isPointed) {
    return (
      edge.strength * GEOMETRY_CONSTANTS.EDGE_THICKNESS_MULTIPLIER +
      GEOMETRY_CONSTANTS.EDGE_THICKNESS_HOVER
    );
  }
  return edge.strength * 0.05 + GEOMETRY_CONSTANTS.EDGE_THICKNESS_BASE;
}

export function calculateEdgeOpacity(edge: GraphEdge3D, isPointed: boolean): number {
  void edge;
  return isPointed ? VISUAL_CONSTANTS.EDGE_OPACITY_HOVER : VISUAL_CONSTANTS.EDGE_OPACITY_BASE;
}
