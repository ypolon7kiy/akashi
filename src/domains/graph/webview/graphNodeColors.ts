/** Node / edge palette for the 2D canvas (shared with former 3D styling). */

import type { GraphNode3D } from '../domain/graphTypes';

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

/** Per-category colors matching sidebar file-color semantics. */
export const CATEGORY_COLORS: Record<string, { fill: string; hover: string }> = {
  context: { fill: '#3B82F6', hover: '#93C5FD' },
  rule: { fill: '#F59E0B', hover: '#FCD34D' },
  skill: { fill: '#10B981', hover: '#6EE7B7' },
  hook: { fill: '#EF4444', hover: '#FCA5A5' },
  config: { fill: '#6B7280', hover: '#D1D5DB' },
  mcp: { fill: '#8B5CF6', hover: '#C4B5FD' },
  unknown: { fill: '#9CA3AF', hover: '#D1D5DB' },
};

export const EDGE_COLORS = {
  DEFAULT: '#94A3B8',
  HIGHLIGHTED: '#A78BFA',
} as const;

export function getNodeColor(nodeType: string, node?: GraphNode3D): string {
  if (nodeType === 'category' && node?.graphCategoryId) {
    return CATEGORY_COLORS[node.graphCategoryId]?.fill ?? NODE_COLORS.DEFAULT;
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

export function getHoverColor(nodeType: string, node?: GraphNode3D): string {
  if (nodeType === 'category' && node?.graphCategoryId) {
    return CATEGORY_COLORS[node.graphCategoryId]?.hover ?? NODE_COLORS.DEFAULT_HOVER;
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
