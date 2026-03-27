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

import type { PluginCategory } from './catalogPlugin';

// ── Types ──────────────────────────────────────────────────────────

export interface AkashiMetaEntry {
  readonly name: string;
  readonly category: PluginCategory;
  readonly originId: string;
  readonly version: string;
  /** Absolute paths of files/folders created during install. */
  readonly installedPaths: readonly string[];
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
export function addEntry(
  meta: AkashiMeta,
  presetId: string,
  entry: AkashiMetaEntry
): AkashiMeta {
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
  const filtered = existing.filter(
    (e) => !(e.name === name && e.category === category)
  );
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
  return (meta.installed[presetId] ?? []).find(
    (e) => e.name === name && e.category === category
  );
}

/** Get all entries for a preset. */
export function getEntries(
  meta: AkashiMeta,
  presetId: string
): readonly AkashiMetaEntry[] {
  return meta.installed[presetId] ?? [];
}

/** Parse a raw JSON blob into AkashiMeta. Returns emptyMeta() on invalid input. */
export function parseAkashiMeta(raw: unknown): AkashiMeta {
  if (
    raw === null ||
    raw === undefined ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
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
        });
      }
    }
    if (valid.length > 0) {
      parsed[presetId] = valid;
    }
  }

  return { version: 1, installed: parsed };
}
