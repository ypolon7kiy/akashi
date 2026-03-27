/**
 * Addons application service: orchestrates marketplace origins, catalog fetching,
 * and install/uninstall lifecycle.
 *
 * Installed addons come directly from the SourceIndexSnapshot — no custom projection.
 */

import { join } from 'node:path';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { SourceLocality } from '../../sources/domain/artifactKind';
import type { AddonsCatalog } from '../domain/addonsCatalog';
import { parseMarketplace } from '../domain/marketplaceParcels';
import {
  BUILT_IN_ORIGINS,
  buildOriginId,
  type MarketplaceOrigin,
  type OriginSource,
  type PersistedCustomOrigin,
} from '../domain/marketplaceOrigin';
import {
  addToLedger,
  findInLedgerByPluginId,
  findInLedgerByPath,
  removeFromLedger,
  type InstalledAddonRecord,
} from '../domain/installationLedger';
import { reconcile } from '../domain/reconcileInstallStatus';
import type { CatalogPlugin, PluginCategory } from '../domain/catalogPlugin';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
} from './ports';

const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AddonsService {
  constructor(
    private readonly sourceSnapshot: SourceSnapshotPort,
    private readonly store: AddonsStorePort,
    private readonly fetcher: MarketplaceFetcherPort,
    private readonly installer: AddonInstallerPort
  ) {}

  // ── Origins Management ────────────────────────────────────────────

  getOrigins(): readonly MarketplaceOrigin[] {
    const overrides = this.store.getOriginOverrides();
    const overrideMap = new Map(overrides.map((o) => [o.id, o.enabled]));

    const builtIns: MarketplaceOrigin[] = BUILT_IN_ORIGINS.map((origin) => ({
      ...origin,
      enabled: overrideMap.get(origin.id) ?? origin.enabled,
    }));

    const customs: MarketplaceOrigin[] = this.store.getCustomOrigins().map((co) => {
      const cached = this.store.getCachedCatalog(co.id);
      return {
        id: co.id,
        label: co.label,
        source: co.source,
        builtIn: false,
        enabled: co.enabled,
        lastFetchedAt: cached?.fetchedAt ?? null,
        lastError: null,
      };
    });

    return [...builtIns, ...customs];
  }

  async addOrigin(label: string, source: OriginSource): Promise<MarketplaceOrigin> {
    const id = buildOriginId(source);
    const existing = this.store.getCustomOrigins();

    if (existing.some((o) => o.id === id)) {
      const found = existing.find((o) => o.id === id)!;
      return {
        id: found.id, label: found.label, source: found.source,
        builtIn: false, enabled: found.enabled, lastFetchedAt: null, lastError: null,
      };
    }

    const newOrigin: PersistedCustomOrigin = { id, label, source, enabled: true };
    await this.store.saveCustomOrigins([...existing, newOrigin]);
    return { id, label, source, builtIn: false, enabled: true, lastFetchedAt: null, lastError: null };
  }

  async removeOrigin(originId: string): Promise<void> {
    const existing = this.store.getCustomOrigins();
    await this.store.saveCustomOrigins(existing.filter((o) => o.id !== originId));
    await this.store.clearCachedCatalog(originId);
  }

  async toggleOrigin(originId: string, enabled: boolean): Promise<void> {
    const builtIn = BUILT_IN_ORIGINS.find((o) => o.id === originId);
    if (builtIn) {
      const overrides = this.store.getOriginOverrides().filter((o) => o.id !== originId);
      await this.store.saveOriginOverrides([...overrides, { id: originId, enabled }]);
      return;
    }
    const customs = this.store.getCustomOrigins();
    await this.store.saveCustomOrigins(
      customs.map((o) => (o.id === originId ? { ...o, enabled } : o))
    );
  }

  // ── Catalog Fetching ──────────────────────────────────────────────

  async fetchOriginCatalog(origin: MarketplaceOrigin): Promise<readonly CatalogPlugin[]> {
    const result = await this.fetcher.fetch(origin.source);
    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to fetch marketplace');
    }

    const parsed = parseMarketplace(result.data, origin.id);
    await this.store.saveCachedCatalog({
      originId: origin.id,
      fetchedAt: new Date().toISOString(),
      plugins: parsed.plugins,
    });

    return parsed.plugins;
  }

  getCachedPlugins(originId: string): readonly CatalogPlugin[] {
    const cached = this.store.getCachedCatalog(originId);
    if (!cached) return [];
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age > CATALOG_CACHE_TTL_MS) return [];
    return cached.plugins;
  }

  // ── Full Catalog Assembly ─────────────────────────────────────────

  /**
   * Build the full addons catalog for the given preset.
   * Installed addons = snapshot records/artifacts filtered by preset.
   * No custom projection — the snapshot IS the source of truth.
   */
  async getCatalog(presetId: SourcePresetId): Promise<AddonsCatalog | null> {
    const snapshot = await this.sourceSnapshot.getLastSnapshot();
    if (!snapshot) {
      return null;
    }

    // Filter snapshot to the target preset — pass through directly
    const records = snapshot.records.filter((r) => r.preset === presetId);
    const artifacts = (snapshot.artifacts ?? []).filter((a) => a.presetId === presetId);
    const origins = this.getOrigins();

    // Collect raw catalog plugins from enabled origins
    const rawPlugins: CatalogPlugin[] = [];
    for (const origin of origins) {
      if (!origin.enabled) continue;
      rawPlugins.push(...this.getCachedPlugins(origin.id));
    }

    // Reconcile: snapshot (truth) + ledger (claims) + catalog (available)
    const ledger = this.store.getLedger();
    const result = reconcile({
      targetPresetId: presetId,
      snapshotRecords: records,
      ledger,
      catalogPlugins: rawPlugins,
    });

    // Eagerly prune stale ledger records
    if (result.staleLedgerRecords.length > 0) {
      await this.store.saveLedger(result.prunedLedger);
    }

    return {
      generatedAt: snapshot.generatedAt,
      presetId,
      records,
      artifacts,
      catalogPlugins: result.plugins,
      origins,
    };
  }

  // ── Install / Uninstall ───────────────────────────────────────────

  async installPlugin(
    plugin: CatalogPlugin,
    locality: SourceLocality,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; error?: string }> {
    // Resolve target directories based on locality
    const base = locality === 'user' ? roots.claudeUserRoot : join(workspaceRoot, '.claude');
    const targets = {
      skills: join(base, 'skills'),
      commands: join(base, 'commands'),
      hooks: join(base, 'hooks'),
      root: base,
    };

    // Find the origin so we can resolve content URLs
    const origin = this.getOrigins().find((o) => o.id === plugin.originId);

    // Primary: download actual content from marketplace
    let result: { ok: boolean; createdPaths: readonly string[]; error?: string };

    if (origin) {
      result = await this.installer.installFromMarketplace(plugin, origin.source, targets);
    } else {
      // Fallback: create stub via creator if origin not found
      const creatorId = resolveCreatorId('claude', plugin.category, locality);
      if (!creatorId) {
        return { ok: false, error: `No creator for category '${plugin.category}' at ${locality} scope` };
      }
      result = await this.installer.installViaCreator(
        creatorId, plugin.name, plugin.description, workspaceRoot, roots
      );
    }

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const record: InstalledAddonRecord = {
      id: `${plugin.id}/${locality}`,
      name: plugin.name,
      originId: plugin.originId,
      presetId: 'claude',
      category: plugin.category,
      locality,
      version: plugin.version,
      installedAt: new Date().toISOString(),
      installedFiles: result.createdPaths,
      installedJsonEntries: [],
    };

    const ledger = this.store.getLedger();
    await this.store.saveLedger(addToLedger(ledger, record));
    return { ok: true };
  }

  async deleteAddon(
    primaryPath?: string,
    pluginId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const ledger = this.store.getLedger();

    // Try to find ledger record by pluginId or by path
    let record: InstalledAddonRecord | undefined;
    if (pluginId) {
      record = findInLedgerByPluginId(ledger, pluginId);
    }
    if (!record && primaryPath) {
      record = findInLedgerByPath(ledger, primaryPath);
    }

    // Resolve the artifact shape from the snapshot — determines HOW to delete
    const effectivePath = primaryPath ?? record?.installedFiles[0];
    let isFolderArtifact = false;
    if (effectivePath) {
      const snapshot = await this.sourceSnapshot.getLastSnapshot();
      const artifact = (snapshot?.artifacts ?? []).find((a) => a.primaryPath === effectivePath);
      isFolderArtifact = artifact?.shape === 'folder-file';
    }

    // Delete files from disk
    let result: { ok: boolean; error?: string };
    if (isFolderArtifact && effectivePath) {
      // Folder-layout: delete the entire parent folder
      const norm = effectivePath.replace(/\\/g, '/');
      const folderPath = norm.slice(0, norm.lastIndexOf('/'));
      result = await this.installer.removeDirectory(folderPath);
    } else if (record) {
      // Ledger-tracked non-folder: delete all tracked files
      result = await this.installer.removeTrackedFiles(record.installedFiles);
    } else if (primaryPath) {
      // Not in ledger, not a folder: delete the single file
      result = await this.installer.removeTrackedFiles([primaryPath]);
    } else {
      return { ok: false, error: 'No addon found to delete' };
    }

    if (!result.ok) {
      return result;
    }

    // Clean up ledger if a record existed
    if (record) {
      await this.store.saveLedger(removeFromLedger(ledger, record.id));
    }

    return { ok: true };
  }
}

function resolveCreatorId(
  presetId: SourcePresetId,
  category: PluginCategory,
  locality: SourceLocality
): string | null {
  const map: Record<string, Record<string, string>> = {
    skill: { workspace: `${presetId}/skill-folder/workspace`, user: `${presetId}/skill-folder/user` },
    command: { workspace: `${presetId}/command/workspace`, user: `${presetId}/command/user` },
    rule: { workspace: `${presetId}/rule/workspace`, user: `${presetId}/rule/user` },
  };
  return map[category]?.[locality] ?? null;
}
