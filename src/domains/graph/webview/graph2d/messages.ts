import type { GraphSourceCategoryPalette } from '../../domain/sourceCategoryPalette';

export const Graph2DMessageType = {
  Snapshot: 'graph2d/snapshot',
  ViewSettings: 'graph2d/viewSettings',
  SaveViewSettings: 'graph2d/saveViewSettings',
  WebviewReady: 'graph2d/webviewReady',
  OpenPath: 'graph2d/openPath',
  CopyPath: 'graph2d/copyPath',
  FileColors: 'graph2d/fileColors',
  RunArtifactCreator: 'graph2d/runArtifactCreator',
  /** Host → webview: sidebar filter query (relayed from sidebar webview). */
  FilterQuery: 'graph2d/filterQuery',
} as const;

/** Host → webview: category node fill/hover (frozen at activation). */
export type Graph2DFileColorsPayload = GraphSourceCategoryPalette;
