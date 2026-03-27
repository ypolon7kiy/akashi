/**
 * Marketplace Parcel system — pluggable format adapters for marketplace JSON.
 *
 * Each parcel knows how to detect and parse a specific marketplace schema
 * into normalized CatalogPlugin[]. Auto-detection probes parcels in order;
 * an explicit hint skips detection.
 */

import { buildCatalogPluginId, type CatalogPlugin, type PluginSourceRef } from './catalogPlugin';

// ── Shared helpers (used by all parcels) ──────────────────────────────

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

function nameFromPath(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

function buildPluginEntry(
  originId: string,
  name: string,
  fields: {
    description?: string;
    version?: string;
    category?: string;
    tags?: readonly string[];
    keywords?: readonly string[];
    source: PluginSourceRef;
  }
): CatalogPlugin {
  return {
    id: buildCatalogPluginId(originId, name),
    originId,
    name,
    description: fields.description ?? '',
    version: fields.version ?? '',
    category: fields.category ?? 'skill',
    tags: fields.tags ?? [],
    keywords: fields.keywords ?? [],
    source: fields.source,
    installStatus: 'available',
  };
}

// ── Parcel interface ──────────────────────────────────────────────────

export interface MarketplaceParcel {
  readonly type: string;
  canParse(raw: Record<string, unknown>): boolean;
  parse(raw: Record<string, unknown>, originId: string): readonly CatalogPlugin[];
}

// ── Skills Bundle parcel (anthropics/skills format) ───────────────────

/**
 * Detects the skills-bundle format where plugin entries contain a
 * `skills: string[]` array of sub-skill paths to expand.
 */
const skillsBundleParcel: MarketplaceParcel = {
  type: 'skills-bundle',

  canParse(raw) {
    const plugins = Array.isArray(raw.plugins) ? raw.plugins : [];
    return plugins.some(
      (p: unknown) =>
        p !== null && typeof p === 'object' && !Array.isArray(p) && Array.isArray((p as Record<string, unknown>).skills)
    );
  },

  parse(raw, originId) {
    const rawPlugins = Array.isArray(raw.plugins) ? raw.plugins : [];
    const results: CatalogPlugin[] = [];

    for (const entry of rawPlugins) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const p = entry as Record<string, unknown>;

      const category = typeof p.category === 'string' ? p.category : 'skill';
      const description = typeof p.description === 'string' ? p.description : '';
      const version = typeof p.version === 'string' ? p.version : '';
      const tags = parseStringArray(p.tags);
      const keywords = parseStringArray(p.keywords);

      const subSkills = Array.isArray(p.skills) ? p.skills.filter((s): s is string => typeof s === 'string') : [];

      if (subSkills.length > 0) {
        for (const skillPath of subSkills) {
          results.push(
            buildPluginEntry(originId, nameFromPath(skillPath), {
              description,
              version,
              category,
              tags,
              keywords,
              source: { kind: 'relative', path: skillPath },
            })
          );
        }
      } else {
        // Bundle without sub-skills — treat as a single entry
        const name = typeof p.name === 'string' ? p.name.trim() : '';
        if (!name) continue;
        const source = parsePluginSource(p.source);
        if (!source) continue;
        results.push(buildPluginEntry(originId, name, { description, version, category, tags, keywords, source }));
      }
    }

    return results;
  },
};

// ── Plugin Directory parcel (claude-plugins-official format) ──────────

/**
 * Detects the plugin-directory format: flat individual plugin entries
 * with rich source objects and broad categories.
 * Identified by `$schema` field or `homepage` on any entry.
 */
const pluginDirectoryParcel: MarketplaceParcel = {
  type: 'plugin-directory',

  canParse(raw) {
    if (typeof raw.$schema === 'string') return true;
    const plugins = Array.isArray(raw.plugins) ? raw.plugins : [];
    return plugins.some(
      (p: unknown) =>
        p !== null && typeof p === 'object' && !Array.isArray(p) && typeof (p as Record<string, unknown>).homepage === 'string'
    );
  },

  parse(raw, originId) {
    const rawPlugins = Array.isArray(raw.plugins) ? raw.plugins : [];
    const results: CatalogPlugin[] = [];

    for (const entry of rawPlugins) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const p = entry as Record<string, unknown>;

      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!name) continue;

      const source = parsePluginSource(p.source);
      if (!source) continue;

      results.push(
        buildPluginEntry(originId, name, {
          description: typeof p.description === 'string' ? p.description : '',
          version: typeof p.version === 'string' ? p.version : '',
          category: typeof p.category === 'string' ? p.category : 'skill',
          tags: parseStringArray(p.tags),
          keywords: parseStringArray(p.keywords),
          source,
        })
      );
    }

    return results;
  },
};

// ── Generic fallback parcel ───────────────────────────────────────────

/**
 * Handles any `{ plugins[] }` JSON with basic name/source/description.
 * Always matches — used as the last-resort fallback.
 */
const genericParcel: MarketplaceParcel = {
  type: 'generic',

  canParse() {
    return true;
  },

  parse(raw, originId) {
    const rawPlugins = Array.isArray(raw.plugins) ? raw.plugins : [];
    const results: CatalogPlugin[] = [];

    for (const entry of rawPlugins) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const p = entry as Record<string, unknown>;

      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!name) continue;

      const source = parsePluginSource(p.source);
      if (!source) continue;

      results.push(
        buildPluginEntry(originId, name, {
          description: typeof p.description === 'string' ? p.description : '',
          version: typeof p.version === 'string' ? p.version : '',
          category: typeof p.category === 'string' ? p.category : 'skill',
          tags: parseStringArray(p.tags),
          keywords: parseStringArray(p.keywords),
          source,
        })
      );
    }

    return results;
  },
};

// ── Registry & resolution ─────────────────────────────────────────────

/** Ordered list — first match wins during auto-detection. Generic is always last. */
const PARCEL_REGISTRY: readonly MarketplaceParcel[] = [
  skillsBundleParcel,
  pluginDirectoryParcel,
  genericParcel,
];

/** Find a parcel by type hint, or auto-detect from the raw JSON. */
export function resolveParcel(raw: Record<string, unknown>, hintType?: string): MarketplaceParcel {
  if (hintType) {
    const found = PARCEL_REGISTRY.find((p) => p.type === hintType);
    if (found) return found;
  }
  return PARCEL_REGISTRY.find((p) => p.canParse(raw)) ?? genericParcel;
}

// ── Public entry point ────────────────────────────────────────────────

export interface ParseMarketplaceResult {
  readonly marketplaceName: string;
  readonly plugins: readonly CatalogPlugin[];
}

/**
 * Parse a marketplace blob into catalog plugins.
 * Detects the format automatically, or uses hintType if provided.
 */
export function parseMarketplace(
  raw: unknown,
  originId: string,
  hintType?: string
): ParseMarketplaceResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { marketplaceName: '', plugins: [] };
  }

  const obj = raw as Record<string, unknown>;
  const marketplaceName = typeof obj.name === 'string' ? obj.name : '';
  const parcel = resolveParcel(obj, hintType);
  const plugins = parcel.parse(obj, originId);

  return { marketplaceName, plugins };
}
