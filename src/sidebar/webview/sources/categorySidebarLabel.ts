/**
 * Compact category badges for the sources tree meta column (category facet `value` strings).
 */

const SIDEBAR_CATEGORY_META_MODIFIERS = [
  'context',
  'rule',
  'skill',
  'hook',
  'config',
  'mcp',
  'unknown',
] as const;

export type SidebarCategoryMetaModifier =
  | (typeof SIDEBAR_CATEGORY_META_MODIFIERS)[number]
  | 'fallback';

/** Whitelisted CSS suffix for `akashi-tree__meta--cat-*` (unknown / kind fallback → `fallback`). */
export function sidebarCategoryMetaModifier(categoryFacetValue: string): SidebarCategoryMetaModifier {
  return (SIDEBAR_CATEGORY_META_MODIFIERS as readonly string[]).includes(categoryFacetValue)
    ? (categoryFacetValue as (typeof SIDEBAR_CATEGORY_META_MODIFIERS)[number])
    : 'fallback';
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
