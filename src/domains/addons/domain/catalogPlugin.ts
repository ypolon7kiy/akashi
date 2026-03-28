/**
 * A plugin/skill available from a marketplace catalog.
 * Represents an entry from a parsed marketplace.json.
 */

export type PluginCategory = 'skill' | 'command' | 'hook' | 'mcp' | 'agent' | 'bundle' | 'rule';

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
}

/** Build a deterministic catalog plugin id. */
export function buildCatalogPluginId(originId: string, pluginName: string): string {
  return `${pluginName}@${originId}`;
}
