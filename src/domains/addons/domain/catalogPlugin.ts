/**
 * A plugin/skill available from a marketplace catalog.
 * Represents an entry from a parsed marketplace.json.
 */

export type PluginCategory =
  | 'skill'
  | 'command'
  | 'hook'
  | 'mcp'
  | 'agent'
  | 'bundle'
  | 'rule'
  | 'plugin';

/** Single source of truth for valid plugin categories. */
export const VALID_PLUGIN_CATEGORIES = new Set<string>([
  'skill',
  'command',
  'hook',
  'mcp',
  'agent',
  'bundle',
  'rule',
  'plugin',
]);

/** Compile-time exhaustiveness check: ensures Set stays in sync with the union. */
const _categoryExhaustiveCheck: Record<PluginCategory, true> = {
  skill: true,
  command: true,
  hook: true,
  mcp: true,
  agent: true,
  bundle: true,
  rule: true,
  plugin: true,
};
void _categoryExhaustiveCheck;

/** Type guard: returns true if the string is a valid PluginCategory. */
export function isValidPluginCategory(value: string): value is PluginCategory {
  return VALID_PLUGIN_CATEGORIES.has(value);
}

export type PluginSourceRef =
  | { readonly kind: 'relative'; readonly path: string }
  | { readonly kind: 'github'; readonly repo: string; readonly ref?: string; readonly sha?: string }
  | {
      readonly kind: 'npm';
      readonly package: string;
      readonly version?: string;
      readonly registry?: string;
    }
  | { readonly kind: 'url'; readonly url: string; readonly ref?: string; readonly sha?: string }
  | {
      readonly kind: 'git-subdir';
      readonly url: string;
      readonly path: string;
      readonly ref?: string;
    };

export type InstallStatus = 'available' | 'installed';

export interface CatalogPlugin {
  readonly id: string;
  readonly originId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly source: PluginSourceRef;
  readonly installStatus: InstallStatus;
  readonly installCount?: number;
}

/** Serializable snapshot of a CatalogPlugin, stored in akashi-meta.json at install time. */
export interface CatalogPluginSnapshot {
  readonly id: string;
  readonly originId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly source: PluginSourceRef;
}

/** Extract a serializable snapshot from a CatalogPlugin (strips transient fields). */
export function toCatalogSnapshot(plugin: CatalogPlugin): CatalogPluginSnapshot {
  return {
    id: plugin.id,
    originId: plugin.originId,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    category: plugin.category,
    tags: [...plugin.tags],
    keywords: [...plugin.keywords],
    source: plugin.source,
  };
}

/** Build a deterministic catalog plugin id. */
export function buildCatalogPluginId(originId: string, pluginName: string): string {
  return `${pluginName}@${originId}`;
}
