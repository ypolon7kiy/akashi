/**
 * Parses a marketplace.json blob into `CatalogPlugin[]`.
 *
 * Marketplace.json format (Claude Code convention):
 * ```json
 * {
 *   "name": "marketplace-name",
 *   "plugins": [
 *     {
 *       "name": "plugin-name",
 *       "source": "./plugins/plugin-name" | { "source": "github", "repo": "owner/repo" },
 *       "description": "...",
 *       "version": "1.0.0",
 *       "category": "skill",
 *       "tags": ["tag1"],
 *       "keywords": ["keyword1"]
 *     }
 *   ]
 * }
 * ```
 */

import {
  buildCatalogPluginId,
  type CatalogPlugin,
  type PluginCategory,
  type PluginSourceRef,
} from './catalogPlugin';

const VALID_CATEGORIES = new Set<string>([
  'skill',
  'command',
  'hook',
  'mcp',
  'agent',
  'bundle',
]);

function parsePluginSource(raw: unknown): PluginSourceRef | null {
  if (typeof raw === 'string') {
    return { kind: 'relative', path: raw };
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const source = typeof obj.source === 'string' ? obj.source : '';
    switch (source) {
      case 'github': {
        const repo = typeof obj.repo === 'string' ? obj.repo : '';
        if (!repo) return null;
        return {
          kind: 'github',
          repo,
          ref: typeof obj.ref === 'string' ? obj.ref : undefined,
          sha: typeof obj.sha === 'string' ? obj.sha : undefined,
        };
      }
      case 'npm': {
        const pkg = typeof obj.package === 'string' ? obj.package : '';
        if (!pkg) return null;
        return {
          kind: 'npm',
          package: pkg,
          version: typeof obj.version === 'string' ? obj.version : undefined,
          registry: typeof obj.registry === 'string' ? obj.registry : undefined,
        };
      }
      case 'url': {
        const url = typeof obj.url === 'string' ? obj.url : '';
        if (!url) return null;
        return {
          kind: 'url',
          url,
          ref: typeof obj.ref === 'string' ? obj.ref : undefined,
          sha: typeof obj.sha === 'string' ? obj.sha : undefined,
        };
      }
      case 'git-subdir': {
        const url = typeof obj.url === 'string' ? obj.url : '';
        const path = typeof obj.path === 'string' ? obj.path : '';
        if (!url || !path) return null;
        return { kind: 'git-subdir', url, path, ref: typeof obj.ref === 'string' ? obj.ref : undefined };
      }
    }
  }
  return null;
}

function parseStringArray(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export interface ParseMarketplaceResult {
  readonly marketplaceName: string;
  readonly plugins: readonly CatalogPlugin[];
}

/**
 * Parse a marketplace.json blob into catalog plugins.
 * Tolerant of malformed data — skips invalid entries.
 */
export function parseMarketplaceJson(
  raw: unknown,
  originId: string
): ParseMarketplaceResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { marketplaceName: '', plugins: [] };
  }

  const obj = raw as Record<string, unknown>;
  const marketplaceName = typeof obj.name === 'string' ? obj.name : '';
  const rawPlugins = Array.isArray(obj.plugins) ? obj.plugins : [];

  const plugins: CatalogPlugin[] = [];

  for (const entry of rawPlugins) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const p = entry as Record<string, unknown>;

    const name = typeof p.name === 'string' ? p.name.trim() : '';
    if (!name) continue;

    const source = parsePluginSource(p.source);
    if (!source) continue;

    const rawCategory = typeof p.category === 'string' ? p.category : 'skill';
    const category: PluginCategory = VALID_CATEGORIES.has(rawCategory)
      ? (rawCategory as PluginCategory)
      : 'skill';

    plugins.push({
      id: buildCatalogPluginId(originId, name),
      originId,
      name,
      description: typeof p.description === 'string' ? p.description : '',
      version: typeof p.version === 'string' ? p.version : '',
      category,
      tags: parseStringArray(p.tags),
      keywords: parseStringArray(p.keywords),
      source,
      installStatus: 'available',
    });
  }

  return { marketplaceName, plugins };
}
