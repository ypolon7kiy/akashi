import { statSync } from 'node:fs';
import * as vscode from 'vscode';
import type { GeneralConfigProvider } from '../../shared/config/generalConfigProvider';
import { buildSidebarCategoryColorStyleBlock } from './styling/sidebarCategoryColorStyle';

export function codiconsDistRoot(extensionUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'codicons');
}

/** Bust webview cache when bundle files change (mtime updates on each esbuild). */
function sidebarBundleCacheQuery(extensionUri: vscode.Uri): string {
  try {
    const dir = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar');
    const jsM = statSync(vscode.Uri.joinPath(dir, 'sidebar-main.js').fsPath).mtimeMs;
    const cssM = statSync(vscode.Uri.joinPath(dir, 'sidebar-main.css').fsPath).mtimeMs;
    return `?v=${Math.floor(Math.max(jsM, cssM))}`;
  } catch {
    return '';
  }
}

export function getSidebarWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  generalConfig: GeneralConfigProvider
): string {
  const cacheQ = sidebarBundleCacheQuery(extensionUri);
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.js')
  );
  // esbuild emits CSS as a sibling file; it must be linked — importing CSS in TS only produces sidebar-main.css, it is not inlined into JS.
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'sidebar', 'sidebar-main.css')
  );
  const codiconCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(codiconsDistRoot(extensionUri), 'codicon.css')
  );
  const categoryColorStyle = buildSidebarCategoryColorStyleBlock(generalConfig);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <title>Akashi Sidebar</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}${cacheQ}">
  ${categoryColorStyle}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri.toString()}${cacheQ}"></script>
</body>
</html>`;
}
