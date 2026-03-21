export interface GraphLabelColors {
  primary: string;
  secondary: string;
  outline: string;
}

function pickFirst(cs: CSSStyleDeclaration, keys: readonly string[], fallback: string): string {
  for (const key of keys) {
    const v = cs.getPropertyValue(key).trim();
    if (v.length > 0) {
      return v;
    }
  }
  return fallback;
}

/** Map VS Code theme variables to Troika Text colors (no CSS on 3D text). */
export function readGraphLabelColors(): GraphLabelColors {
  const cs = getComputedStyle(document.body);
  const primary = pickFirst(cs, ['--vscode-editor-foreground', '--vscode-foreground'], '#cccccc');
  const secondary = pickFirst(cs, ['--vscode-descriptionForeground'], '#888888');
  const outline = pickFirst(
    cs,
    ['--vscode-editor-background', '--vscode-sideBar-background'],
    '#1e1e1e'
  );
  return { primary, secondary, outline };
}
