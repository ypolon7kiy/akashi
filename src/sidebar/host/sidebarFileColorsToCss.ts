import { SIDEBAR_SOURCE_CATEGORY_KEYS } from '../bridge/sourceCategoryKeys';
import { sanitizeSidebarCategoryColorValue } from './sidebarCategoryColorSanitize';

/** Pure: `akashi.sidebar.fileColors` → CSS declaration lines. */
export function fileColorsObjectToCssLines(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [];
  }
  const record = obj as Record<string, unknown>;
  const lines: string[] = [];
  for (const fileKey of SIDEBAR_SOURCE_CATEGORY_KEYS) {
    const cssVar = `--akashi-source-cat-${fileKey}`;
    const raw = record[fileKey];
    if (typeof raw !== 'string') {
      continue;
    }
    const safe = sanitizeSidebarCategoryColorValue(raw);
    if (safe === undefined) {
      continue;
    }
    lines.push(`  ${cssVar}: ${safe};`);
  }
  return lines;
}
