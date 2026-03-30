/**
 * Akashi meta file: per-locality record of addons installed via the marketplace.
 *
 * Two files exist — one per locality scope:
 *   - Workspace: `<workspaceRoot>/.claude/akashi-meta.json`
 *   - User:      `~/.claude/akashi-meta.json`
 *
 * Each file tracks installed entries keyed by preset id (e.g. "claude").
 * Unique key within a {preset, category} group is the entry `name`.
 */

import {
  isValidPluginCategory,
  type CatalogPluginSnapshot,
  type PluginCategory,
} from './catalogPlugin';

// ── Types ──────────────────────────────────────────────────────────

export interface AkashiMetaEntry {
  readonly name: string;
  readonly category: PluginCategory;
  readonly originId: string;
  readonly version: string;
  /** Absolute paths of files/folders created during install. */
  readonly installedPaths: readonly string[];
  /** ISO timestamp of when the entry was installed. Used to skip stale detection on fresh entries. */
  readonly installedAt?: string;
  /** Snapshot of the CatalogPlugin at install time — enables full uninstall without re-fetching. */
  readonly catalogSnapshot?: CatalogPluginSnapshot;
}

export interface AkashiMeta {
  readonly version: 1;
  /** Installed entries keyed by preset id. */
  readonly installed: Readonly<Record<string, readonly AkashiMetaEntry[]>>;
}

// ── Pure Helpers ───────────────────────────────────────────────────

export function emptyMeta(): AkashiMeta {
  return { version: 1, installed: {} };
}

/** Upsert an entry — replaces any existing entry with the same name + category. */
export function addEntry(meta: AkashiMeta, presetId: string, entry: AkashiMetaEntry): AkashiMeta {
  const existing = meta.installed[presetId] ?? [];
  const filtered = existing.filter(
    (e) => !(e.name === entry.name && e.category === entry.category)
  );
  return {
    ...meta,
    installed: { ...meta.installed, [presetId]: [...filtered, entry] },
  };
}

/** Remove an entry by name + category. */
export function removeEntry(
  meta: AkashiMeta,
  presetId: string,
  name: string,
  category: PluginCategory
): AkashiMeta {
  const existing = meta.installed[presetId];
  if (!existing) return meta;
  const filtered = existing.filter((e) => !(e.name === name && e.category === category));
  return {
    ...meta,
    installed: { ...meta.installed, [presetId]: filtered },
  };
}

/** Find an entry by name + category. */
export function findEntry(
  meta: AkashiMeta,
  presetId: string,
  name: string,
  category: PluginCategory
): AkashiMetaEntry | undefined {
  return (meta.installed[presetId] ?? []).find((e) => e.name === name && e.category === category);
}

/** Get all entries for a preset. */
export function getEntries(meta: AkashiMeta, presetId: string): readonly AkashiMetaEntry[] {
  return meta.installed[presetId] ?? [];
}

/** Parse a raw JSON blob into AkashiMeta. Returns emptyMeta() on invalid input. */
export function parseAkashiMeta(raw: unknown): AkashiMeta {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyMeta();
  }

  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1 || typeof obj.installed !== 'object' || obj.installed === null) {
    return emptyMeta();
  }

  const installed = obj.installed as Record<string, unknown>;
  const parsed: Record<string, AkashiMetaEntry[]> = {};

  for (const [presetId, entries] of Object.entries(installed)) {
    if (!Array.isArray(entries)) continue;
    const valid: AkashiMetaEntry[] = [];
    for (const entry of entries) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).name === 'string' &&
        typeof (entry as Record<string, unknown>).category === 'string' &&
        typeof (entry as Record<string, unknown>).originId === 'string' &&
        typeof (entry as Record<string, unknown>).version === 'string'
      ) {
        const rec = entry as Record<string, unknown>;
        const rawPaths = Array.isArray(rec.installedPaths)
          ? (rec.installedPaths as unknown[]).filter((p): p is string => typeof p === 'string')
          : [];
        valid.push({
          name: rec.name as string,
          category: rec.category as PluginCategory,
          originId: rec.originId as string,
          version: rec.version as string,
          installedPaths: rawPaths,
          installedAt: typeof rec.installedAt === 'string' ? rec.installedAt : undefined,
          catalogSnapshot: parseCatalogSnapshot(rec.catalogSnapshot),
        });
      }
    }
    if (valid.length > 0) {
      parsed[presetId] = valid;
    }
  }

  return { version: 1, installed: parsed };
}

/** Leniently parse a raw catalog snapshot. Returns undefined if malformed. */
function parseCatalogSnapshot(raw: unknown): CatalogPluginSnapshot | undefined {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.name !== 'string') {
    return undefined;
  }
  return {
    id: obj.id,
    originId: typeof obj.originId === 'string' ? obj.originId : '',
    name: obj.name,
    description: typeof obj.description === 'string' ? obj.description : '',
    version: typeof obj.version === 'string' ? obj.version : '',
    category:
      typeof obj.category === 'string' && isValidPluginCategory(obj.category)
        ? obj.category
        : 'skill',
    tags: Array.isArray(obj.tags)
      ? (obj.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    keywords: Array.isArray(obj.keywords)
      ? (obj.keywords as unknown[]).filter((k): k is string => typeof k === 'string')
      : [],
    source: parseSnapshotSource(obj.source),
  };
}

/** Parse source ref from a persisted snapshot. Falls back to empty relative. */
function parseSnapshotSource(raw: unknown): CatalogPluginSnapshot['source'] {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const kind = typeof obj.kind === 'string' ? obj.kind : '';
    if (kind === 'relative' && typeof obj.path === 'string')
      return { kind: 'relative', path: obj.path };
    if (kind === 'github' && typeof obj.repo === 'string') {
      return {
        kind: 'github',
        repo: obj.repo,
        ref: typeof obj.ref === 'string' ? obj.ref : undefined,
        sha: typeof obj.sha === 'string' ? obj.sha : undefined,
      };
    }
    if (kind === 'url' && typeof obj.url === 'string') {
      return {
        kind: 'url',
        url: obj.url,
        ref: typeof obj.ref === 'string' ? obj.ref : undefined,
        sha: typeof obj.sha === 'string' ? obj.sha : undefined,
      };
    }
    if (kind === 'git-subdir' && typeof obj.url === 'string' && typeof obj.path === 'string') {
      return {
        kind: 'git-subdir',
        url: obj.url,
        path: obj.path,
        ref: typeof obj.ref === 'string' ? obj.ref : undefined,
      };
    }
    if (kind === 'npm' && typeof obj.package === 'string') {
      return {
        kind: 'npm',
        package: obj.package,
        version: typeof obj.version === 'string' ? obj.version : undefined,
        registry: typeof obj.registry === 'string' ? obj.registry : undefined,
      };
    }
  }
  return { kind: 'relative', path: '' };
}
