import type { GraphSourceCategoryPalette } from '../../domain/sourceCategoryPalette';

export const Graph2DMessageType = {
  Snapshot: 'graph2d/snapshot',
  ViewSettings: 'graph2d/viewSettings',
  SaveViewSettings: 'graph2d/saveViewSettings',
  WebviewReady: 'graph2d/webviewReady',
  OpenPath: 'graph2d/openPath',
  CopyPath: 'graph2d/copyPath',
  FileColors: 'graph2d/fileColors',
} as const;

/** Host → webview: category node fill/hover (frozen at activation). */
export type Graph2DFileColorsPayload = GraphSourceCategoryPalette;
