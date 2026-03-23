/**
 * Graph node/edge shapes for the sources graph (Akashi). Ids are path- or tag-based strings.
 */

export type GraphNodeType3D =
  | 'note'
  | 'concept'
  | 'tag'
  | 'person'
  | 'location'
  | 'folder'
  | 'preset'
  | 'locality'
  | 'category';

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
  /** Source category id for category-tier nodes (context, rule, skill, hook, config, mcp). */
  graphCategoryId?: string;
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
  color?: string;
}
