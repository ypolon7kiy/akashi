/**
 * Compact category badges for the sources tree meta column (category facet `value` strings).
 */

import {
  SIDEBAR_SOURCE_CATEGORY_KEYS,
  type SidebarSourceCategoryKey,
} from '../../bridge/sourceCategoryKeys';

export type SidebarCategoryMetaModifier = SidebarSourceCategoryKey;

/** Whitelisted CSS suffix for `akashi-tree__meta--cat-*` (missing category / kind fallback → `unknown`). */
export function sidebarCategoryMetaModifier(categoryFacetValue: string): SidebarCategoryMetaModifier {
  return (SIDEBAR_SOURCE_CATEGORY_KEYS as readonly string[]).includes(categoryFacetValue)
    ? (categoryFacetValue as SidebarCategoryMetaModifier)
    : 'unknown';
}

const SIDEBAR_CATEGORY_LABEL: Readonly<Record<string, string>> = {
  rule: 'R',
  skill: 'S',
  hook: 'H',
  context: 'ctx',
  config: 'cfg',
  mcp: 'mcp',
  unknown: '?',
};

export function sidebarCategoryLabel(categoryFacetValue: string): string {
  return SIDEBAR_CATEGORY_LABEL[categoryFacetValue] ?? categoryFacetValue;
}
