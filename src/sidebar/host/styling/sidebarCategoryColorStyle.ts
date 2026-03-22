import * as vscode from 'vscode';
import { fileColorsObjectToCssLines } from './sidebarFileColorsToCss';

/** `<style>` block for `<head>` (after bundled sidebar CSS). */
export function buildSidebarCategoryColorStyleBlock(): string {
  const cfg = vscode.workspace.getConfiguration('akashi');
  const lines = fileColorsObjectToCssLines(cfg.get('sidebar.fileColors'));
  if (lines.length === 0) {
    return '';
  }
  return `<style id="akashi-sidebar-category-colors">\n:root {\n${lines.join('\n')}\n}\n</style>`;
}
