/**
 * Human-readable labels for source category ids used in the sources graph tier.
 * Single source of truth for builder UI and graph webview toggles.
 */
export const GRAPH_SOURCE_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  context: 'Context',
  rule: 'Rules',
  skill: 'Skills',
  hook: 'Hooks',
  config: 'Config',
  mcp: 'MCP',
  command: 'Commands',
  unknown: 'Other',
};

export function labelGraphSourceCategory(categoryId: string): string {
  return GRAPH_SOURCE_CATEGORY_LABELS[categoryId] ?? categoryId;
}

/** Category ids for which the graph builder inserts empty category nodes (excludes catch-all `unknown`). */
export const GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES: readonly string[] = Object.keys(
  GRAPH_SOURCE_CATEGORY_LABELS
).filter((k) => k !== 'unknown');
