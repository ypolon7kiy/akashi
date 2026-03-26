/** Node / edge palette for the 2D canvas (shared with former 3D styling). */

import { GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS } from '../domain/sourceCategoryPalette';
import type { GraphNode3D } from '../domain/graphTypes';

/** Node types whose fill colour is derived from the source-category palette. */
const CATEGORY_COLORABLE_TYPES: ReadonlySet<string> = new Set(['category', 'note', 'folder']);

export const NODE_COLORS = {
  NOTE: '#3B82F6',
  CONCEPT: '#F59E0B',
  TAG: '#10B981',
  PERSON: '#EF4444',
  LOCATION: '#8B5CF6',
  FOLDER: '#EAB308',
  PRESET: '#A855F7',
  LOCALITY_PROJECT: '#EC4899',
  LOCALITY_GLOBAL: '#14B8A6',
  DEFAULT: '#6B7280',
  NOTE_HOVER: '#93C5FD',
  CONCEPT_HOVER: '#FCD34D',
  TAG_HOVER: '#6EE7B7',
  PERSON_HOVER: '#FCA5A5',
  LOCATION_HOVER: '#C4B5FD',
  FOLDER_HOVER: '#FEF3C7',
  PRESET_HOVER: '#D8B4FE',
  LOCALITY_PROJECT_HOVER: '#F9A8D4',
  LOCALITY_GLOBAL_HOVER: '#5EEAD4',
  DEFAULT_HOVER: '#D1D5DB',
} as const;

export const EDGE_COLORS = {
  DEFAULT: '#94A3B8',
  HIGHLIGHTED: '#A78BFA',
} as const;

export function getNodeColor(
  nodeType: string,
  node?: GraphNode3D,
  categoryPalette?: Readonly<Record<string, { fill: string; hover: string }>>
): string {
  if (CATEGORY_COLORABLE_TYPES.has(nodeType) && node?.graphCategoryId) {
    const id = node.graphCategoryId;
    const fromCfg = categoryPalette?.[id];
    if (fromCfg) {
      return fromCfg.fill;
    }
    const fallback =
      GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS[
        id as keyof typeof GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS
      ]?.fill;
    if (fallback) {
      return fallback;
    }
    // Unknown graphCategoryId — fall through to fixed type switch
  }
  if (nodeType === 'locality') {
    return node?.graphLocality === 'global'
      ? NODE_COLORS.LOCALITY_GLOBAL
      : NODE_COLORS.LOCALITY_PROJECT;
  }
  switch (nodeType) {
    case 'note':
      return NODE_COLORS.NOTE;
    case 'concept':
      return NODE_COLORS.CONCEPT;
    case 'tag':
      return NODE_COLORS.TAG;
    case 'person':
      return NODE_COLORS.PERSON;
    case 'location':
      return NODE_COLORS.LOCATION;
    case 'folder':
      return NODE_COLORS.FOLDER;
    case 'preset':
      return NODE_COLORS.PRESET;
    default:
      return NODE_COLORS.DEFAULT;
  }
}

export function getHoverColor(
  nodeType: string,
  node?: GraphNode3D,
  categoryPalette?: Readonly<Record<string, { fill: string; hover: string }>>
): string {
  if (CATEGORY_COLORABLE_TYPES.has(nodeType) && node?.graphCategoryId) {
    const id = node.graphCategoryId;
    const fromCfg = categoryPalette?.[id];
    if (fromCfg) {
      return fromCfg.hover;
    }
    const fallback =
      GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS[
        id as keyof typeof GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS
      ]?.hover;
    if (fallback) {
      return fallback;
    }
    // Unknown graphCategoryId — fall through to fixed type switch
  }
  if (nodeType === 'locality') {
    return node?.graphLocality === 'global'
      ? NODE_COLORS.LOCALITY_GLOBAL_HOVER
      : NODE_COLORS.LOCALITY_PROJECT_HOVER;
  }
  switch (nodeType) {
    case 'note':
      return NODE_COLORS.NOTE_HOVER;
    case 'concept':
      return NODE_COLORS.CONCEPT_HOVER;
    case 'tag':
      return NODE_COLORS.TAG_HOVER;
    case 'person':
      return NODE_COLORS.PERSON_HOVER;
    case 'location':
      return NODE_COLORS.LOCATION_HOVER;
    case 'folder':
      return NODE_COLORS.FOLDER_HOVER;
    case 'preset':
      return NODE_COLORS.PRESET_HOVER;
    default:
      return NODE_COLORS.DEFAULT_HOVER;
  }
}

export function getEdgeColor(isPointed: boolean): string {
  return isPointed ? EDGE_COLORS.HIGHLIGHTED : EDGE_COLORS.DEFAULT;
}
