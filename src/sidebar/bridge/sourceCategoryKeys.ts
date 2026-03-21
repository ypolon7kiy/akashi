/**
 * Category facet values for sources tree meta badges and `akashi.sources.sidebar.fileColors`.
 * Keep aligned with `akashi.sources.sidebar.fileColors` in package.json and with
 * `--akashi-source-cat-{key}` / `.akashi-tree__meta--cat-{key}` in sources-tree.css.
 */
export const SIDEBAR_SOURCE_CATEGORY_KEYS = [
  'context',
  'rule',
  'skill',
  'hook',
  'config',
  'mcp',
  'unknown',
] as const;

export type SidebarSourceCategoryKey = (typeof SIDEBAR_SOURCE_CATEGORY_KEYS)[number];
