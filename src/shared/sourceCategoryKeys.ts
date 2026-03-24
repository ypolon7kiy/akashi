/**
 * Single source of truth for source category facet values (indexed `SourceCategory`, sidebar meta,
 * `akashi.sidebar.fileColors`, graph category nodes). Keep aligned with package.json and with
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
