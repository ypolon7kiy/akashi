import {
  SIDEBAR_SOURCE_CATEGORY_KEYS,
  type SidebarSourceCategoryKey,
} from '../../../shared/sourceCategoryKeys';
import { sanitizeSidebarCategoryColorValue } from './sidebarFileColorSanitize';

/** Defaults aligned with `akashi.sidebar.fileColors` in package.json. */
export const DEFAULT_SIDEBAR_FILE_COLORS: Readonly<Record<SidebarSourceCategoryKey, string>> = {
  context: '#d18616',
  rule: '#d18616',
  skill: '#b180d7',
  hook: '#f14c4c',
  config: '#cca700',
  mcp: '#3794ff',
  unknown: '#cccccc',
};

/**
 * Merge user `akashi.sidebar.fileColors` with package defaults; only sanitized strings apply.
 */
export function normalizeSidebarFileColors(
  raw: unknown
): Readonly<Record<SidebarSourceCategoryKey, string>> {
  const out: Record<SidebarSourceCategoryKey, string> = { ...DEFAULT_SIDEBAR_FILE_COLORS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return out;
  }
  const record = raw as Record<string, unknown>;
  for (const key of SIDEBAR_SOURCE_CATEGORY_KEYS) {
    const v = record[key];
    if (typeof v !== 'string') {
      continue;
    }
    const safe = sanitizeSidebarCategoryColorValue(v);
    if (safe !== undefined) {
      out[key] = safe;
    }
  }
  return out;
}
