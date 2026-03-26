import { SIDEBAR_SOURCE_CATEGORY_KEYS } from '../../../shared/sourceCategoryKeys';
import { sanitizeSidebarCategoryColorValue } from './sidebarFileColorSanitize';

/**
 * Only keys the user set to a valid color — matches pre-frozen sidebar `<style>` injection
 * (unset keys keep `sources-tree.css` theme fallbacks).
 */
export function userOverridesSidebarFileColorsToCssLines(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  const record = raw as Record<string, unknown>;
  const lines: string[] = [];
  for (const fileKey of SIDEBAR_SOURCE_CATEGORY_KEYS) {
    const v = record[fileKey];
    if (typeof v !== 'string') {
      continue;
    }
    const safe = sanitizeSidebarCategoryColorValue(v);
    if (safe === undefined) {
      continue;
    }
    lines.push(`  --akashi-source-cat-${fileKey}: ${safe};`);
  }
  return lines;
}
