/**
 * Canvas 2D does not resolve `var(--vscode-*)` in strokeStyle/fillStyle.
 * Read computed values from the webview body once per paint.
 */
export interface CanvasThemeColors {
  edge: string;
  edgeHighlight: string;
  label: string;
  nodeStroke: string;
  nodeStrokeHighlight: string;
}

export function readCanvasThemeColors(): CanvasThemeColors {
  let style: CSSStyleDeclaration;
  try {
    style = getComputedStyle(document.body);
  } catch {
    return {
      edge: '#7c8c9d',
      edgeHighlight: '#a78bfa',
      label: '#cccccc',
      nodeStroke: '#555555',
      nodeStrokeHighlight: '#3794ff',
    };
  }
  const pick = (name: string, fallback: string): string => {
    const v = style.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  return {
    edge: pick('--vscode-charts-lines', '#7c8c9d'),
    edgeHighlight: pick('--vscode-charts-purple', '#a78bfa'),
    label: pick('--vscode-editor-foreground', '#cccccc'),
    nodeStroke: pick('--vscode-widget-border', '#555555'),
    nodeStrokeHighlight: pick('--vscode-focusBorder', '#3794ff'),
  };
}
