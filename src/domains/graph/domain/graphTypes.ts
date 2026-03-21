/**
 * 3D graph node/edge shapes (Akashi). Adapted from ioodine graph3d types; ids are path- or tag-based strings.
 */

export type GraphNodeType3D =
  | 'note'
  | 'concept'
  | 'tag'
  | 'person'
  | 'location'
  | 'folder'
  | 'preset'
  | 'locality';

export type GraphLocality = 'project' | 'global';

export interface GraphNode3D {
  id: string;
  label: string;
  formattedTextLines: string[];
  type: GraphNodeType3D;
  position: [number, number, number];
  fixed?: boolean;
  size: number;
  isSelected: boolean;
  isPointed: boolean;
  isVisible: boolean;
  cluster?: string;
  depth?: number;
  /** Y-stack order for grid layout (preset=0, locality=1, folders=2+, …). */
  layoutDepth?: number;
  folderPath?: string;
  parentFolderPath?: string;
  /** Workspace file or directory path (for open/reveal; graph ids may be synthetic). */
  filesystemPath?: string;
  /** Preset id for subgraph / toggles (not set on purely virtual roots if unused). */
  graphPresetId?: string;
  graphLocality?: GraphLocality;
  /** `${presetId}:${locality}` for slice-aware focus; preset nodes use preset id only in logic. */
  graphSliceKey?: string;
  material?: 'standard' | 'phong' | 'basic' | 'toon';
  emissive?: string;
  wireframe?: boolean;
  transparent?: boolean;
}

export type GraphEdgeType3D = 'references' | 'similar' | 'related' | 'contains';

export interface GraphEdge3D {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType3D;
  strength: number;
  opacity: number;
  isPointed: boolean;
  isVisible: boolean;
  curveType?: 'straight' | 'bezier' | 'arc' | 'spring';
  curveHeight?: number;
  animated?: boolean;
  thickness?: number;
  color?: string;
}

/** Diagonal orbit presets only (from above vs from below). */
export type CameraAnglePreset = 'diagonal' | 'diagonal-2';

export interface Camera3DConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export interface Lighting3DConfig {
  ambient: { color: string; intensity: number };
  directional: { color: string; intensity: number; position: [number, number, number] };
  point?: {
    color: string;
    intensity: number;
    position: [number, number, number];
    distance?: number;
  }[];
}
