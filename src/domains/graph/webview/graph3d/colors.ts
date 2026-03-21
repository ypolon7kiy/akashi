export const NODE_COLORS = {
  NOTE: '#3B82F6',
  CONCEPT: '#F59E0B',
  TAG: '#10B981',
  PERSON: '#EF4444',
  LOCATION: '#8B5CF6',
  FOLDER: '#EAB308',
  PRESET: '#A855F7',
  LOCALITY: '#EC4899',
  DEFAULT: '#6B7280',
  NOTE_HOVER: '#93C5FD',
  CONCEPT_HOVER: '#FCD34D',
  TAG_HOVER: '#6EE7B7',
  PERSON_HOVER: '#FCA5A5',
  LOCATION_HOVER: '#C4B5FD',
  FOLDER_HOVER: '#FEF3C7',
  PRESET_HOVER: '#D8B4FE',
  LOCALITY_HOVER: '#F9A8D4',
  DEFAULT_HOVER: '#D1D5DB',
} as const;

export const EDGE_COLORS = {
  DEFAULT: '#94A3B8',
  HIGHLIGHTED: '#A78BFA',
} as const;

export const UI_COLORS = {
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#6B7280',
  BACKGROUND_DARK: '#1a1a2e',
  EMISSIVE_DEFAULT: '#000000',
} as const;

export const LIGHTING_COLORS = {
  DIRECTIONAL: '#ffffff',
  POINT_LIGHT_1: '#4f46e5',
  POINT_LIGHT_2: '#ec4899',
} as const;

export function getNodeColor(nodeType: string): string {
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
    case 'locality':
      return NODE_COLORS.LOCALITY;
    default:
      return NODE_COLORS.DEFAULT;
  }
}

export function getHoverColor(nodeType: string): string {
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
    case 'locality':
      return NODE_COLORS.LOCALITY_HOVER;
    default:
      return NODE_COLORS.DEFAULT_HOVER;
  }
}

export function getEdgeColor(isPointed: boolean): string {
  return isPointed ? EDGE_COLORS.HIGHLIGHTED : EDGE_COLORS.DEFAULT;
}
