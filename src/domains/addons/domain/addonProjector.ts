/**
 * Pure projection: transforms `SourceIndexSnapshot` into addons-domain entities.
 * No I/O — operates entirely on the in-memory index produced by the sources domain.
 */

import type { SourceIndexSnapshot, IndexedSourceEntry } from '../../sources/domain/model';
import type { IndexedArtifact } from '../../sources/domain/artifact';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import {
  ADDON_CATEGORIES,
  isAddonCategory,
  type AddonCategory,
  type InstalledAddon,
} from './installedAddon';
import type { AddonCategorySummary } from './addonsCatalog';

/** Derive a human-readable addon name from the primary file path. */
function deriveAddonName(primaryPath: string, category: AddonCategory): string {
  const norm = primaryPath.replace(/\\/g, '/');

  // For json-only (MCP): use the file name
  if (category === 'mcp') {
    const lastSlash = norm.lastIndexOf('/');
    return lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  }

  // For skills/commands/rules: strip the .md extension, use the basename
  const lastSlash = norm.lastIndexOf('/');
  const basename = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  return basename.replace(/\.md$/i, '');
}

/** Build a deterministic addon id from artifact metadata. */
function buildAddonId(
  presetId: SourcePresetId,
  category: AddonCategory,
  locality: string,
  name: string
): string {
  return `addon:${presetId}:${category}:${locality}:${name}`;
}

/** Result of projecting installed addons from the source index. */
export interface ProjectedAddons {
  readonly addons: readonly InstalledAddon[];
  readonly categorySummaries: readonly AddonCategorySummary[];
}

/**
 * Projects a source index snapshot into installed addon entities for the given preset.
 * Uses artifact linkage when available; falls back to raw entries otherwise.
 */
export function projectInstalledAddons(
  snapshot: SourceIndexSnapshot,
  presetId: SourcePresetId
): ProjectedAddons {
  const addons: InstalledAddon[] = [];

  if (snapshot.artifacts && snapshot.artifacts.length > 0) {
    addons.push(...projectFromArtifacts(snapshot.artifacts, presetId));
  } else {
    addons.push(...projectFromEntries(snapshot.records, presetId));
  }

  addons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return {
    addons,
    categorySummaries: buildCategorySummaries(addons),
  };
}

function projectFromArtifacts(
  artifacts: readonly IndexedArtifact[],
  presetId: SourcePresetId
): InstalledAddon[] {
  const result: InstalledAddon[] = [];

  for (const artifact of artifacts) {
    if (artifact.presetId !== presetId) continue;
    if (!isAddonCategory(artifact.category)) continue;

    const name = deriveAddonName(artifact.primaryPath, artifact.category);
    result.push({
      id: buildAddonId(presetId, artifact.category, artifact.locality, name),
      name,
      category: artifact.category,
      presetId,
      locality: artifact.locality,
      primaryPath: artifact.primaryPath,
      artifactId: artifact.id,
    });
  }

  return result;
}

function projectFromEntries(
  records: readonly IndexedSourceEntry[],
  presetId: SourcePresetId
): InstalledAddon[] {
  const result: InstalledAddon[] = [];

  for (const entry of records) {
    if (entry.preset !== presetId) continue;
    if (!isAddonCategory(entry.category)) continue;

    const name = deriveAddonName(entry.path, entry.category);
    result.push({
      id: buildAddonId(presetId, entry.category, entry.locality, name),
      name,
      category: entry.category,
      presetId,
      locality: entry.locality,
      primaryPath: entry.path,
      artifactId: null,
    });
  }

  return result;
}

function buildCategorySummaries(addons: readonly InstalledAddon[]): AddonCategorySummary[] {
  const counts = new Map<AddonCategory, number>();
  for (const addon of addons) {
    counts.set(addon.category, (counts.get(addon.category) ?? 0) + 1);
  }
  return ADDON_CATEGORIES.filter((cat) => counts.has(cat)).map((cat) => ({
    category: cat,
    count: counts.get(cat) ?? 0,
  }));
}
