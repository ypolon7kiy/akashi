/**
 * Compact category badges for the sources tree meta column (category facet `value` strings).
 */
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
