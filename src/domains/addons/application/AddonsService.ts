/**
 * Addons application service: orchestrates marketplace origins, catalog fetching,
 * installed addon projection, and install/uninstall lifecycle.
 */

import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { SourceLocality } from '../../sources/domain/artifactKind';
import type { AddonsCatalog } from '../domain/addonsCatalog';
import { projectInstalledAddons } from '../domain/addonProjector';
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
  findInLedger,
  removeFromLedger,
  type InstalledAddonRecord,
} from '../domain/installationLedger';
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

  /** Get all marketplace origins (built-in + custom) with their runtime state. */
  getOrigins(): readonly MarketplaceOrigin[] {
    const overrides = this.store.getOriginOverrides();
    const overrideMap = new Map(overrides.map((o) => [o.id, o.enabled]));

    // Built-in origins with enable/disable overrides
    const builtIns: MarketplaceOrigin[] = BUILT_IN_ORIGINS.map((origin) => ({
      ...origin,
      enabled: overrideMap.get(origin.id) ?? origin.enabled,
    }));

    // Custom origins
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

  /** Add a custom marketplace origin. */
  async addOrigin(label: string, source: OriginSource): Promise<MarketplaceOrigin> {
    const id = buildOriginId(source);
    const existing = this.store.getCustomOrigins();

    // Avoid duplicates
    if (existing.some((o) => o.id === id)) {
      const found = existing.find((o) => o.id === id)!;
      return {
        id: found.id,
        label: found.label,
        source: found.source,
        builtIn: false,
        enabled: found.enabled,
        lastFetchedAt: null,
        lastError: null,
      };
    }

    const newOrigin: PersistedCustomOrigin = { id, label, source, enabled: true };
    await this.store.saveCustomOrigins([...existing, newOrigin]);

    return {
      id,
      label,
      source,
      builtIn: false,
      enabled: true,
      lastFetchedAt: null,
      lastError: null,
    };
  }

  /** Remove a custom marketplace origin. */
  async removeOrigin(originId: string): Promise<void> {
    const existing = this.store.getCustomOrigins();
    await this.store.saveCustomOrigins(existing.filter((o) => o.id !== originId));
    await this.store.clearCachedCatalog(originId);
  }

  /** Toggle an origin on or off. */
  async toggleOrigin(originId: string, enabled: boolean): Promise<void> {
    // Check if it's a built-in origin
    const builtIn = BUILT_IN_ORIGINS.find((o) => o.id === originId);
    if (builtIn) {
      const overrides = this.store.getOriginOverrides().filter((o) => o.id !== originId);
      await this.store.saveOriginOverrides([...overrides, { id: originId, enabled }]);
      return;
    }

    // Custom origin
    const customs = this.store.getCustomOrigins();
    await this.store.saveCustomOrigins(
      customs.map((o) => (o.id === originId ? { ...o, enabled } : o))
    );
  }

  // ── Catalog Fetching ──────────────────────────────────────────────

  /** Fetch catalog from a specific origin and cache it. */
  async fetchOriginCatalog(origin: MarketplaceOrigin): Promise<readonly CatalogPlugin[]> {
    const result = await this.fetcher.fetch(origin.source);
    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to fetch marketplace');
    }

    const parsed = parseMarketplace(result.data, origin.id, origin.parcelType);
    await this.store.saveCachedCatalog({
      originId: origin.id,
      fetchedAt: new Date().toISOString(),
      plugins: parsed.plugins,
    });

    return parsed.plugins;
  }

  /** Get cached catalog for an origin, or empty if not fetched yet. */
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
   * Combines installed addons with cached marketplace catalogs.
   */
  async getCatalog(presetId: SourcePresetId): Promise<AddonsCatalog | null> {
    const snapshot = await this.sourceSnapshot.getLastSnapshot();
    if (!snapshot) {
      return null;
    }

    const { addons, categorySummaries } = projectInstalledAddons(snapshot, presetId);
    const origins = this.getOrigins();

    // Collect all cached catalog plugins from enabled origins
    const installedNames = new Set(addons.map((a) => a.name));
    const ledger = this.store.getLedger();
    const ledgerIds = new Set(ledger.records.map((r) => r.id));

    const allPlugins: CatalogPlugin[] = [];
    for (const origin of origins) {
      if (!origin.enabled) continue;
      const cached = this.getCachedPlugins(origin.id);
      for (const plugin of cached) {
        // Mark install status by checking installed addons and ledger
        const isInstalled = installedNames.has(plugin.name) || ledgerIds.has(plugin.id);
        allPlugins.push({
          ...plugin,
          installStatus: isInstalled ? 'installed' : 'available',
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      presetId,
      installedAddons: addons,
      catalogPlugins: allPlugins,
      origins,
      categorySummaries,
    };
  }

  // ── Install / Uninstall ───────────────────────────────────────────

  /**
   * Install a plugin via the existing ArtifactCreator infrastructure.
   * Maps (category, locality) → creator ID, then drives planWithProvidedInput().
   */
  async installPlugin(
    plugin: CatalogPlugin,
    locality: SourceLocality,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; error?: string }> {
    const creatorId = resolveCreatorId('claude', plugin.category, locality);
    if (!creatorId) {
      return { ok: false, error: `No creator for category '${plugin.category}' at ${locality} scope` };
    }

    const result = await this.installer.installViaCreator(
      creatorId,
      plugin.name,
      plugin.description,
      workspaceRoot,
      roots
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Record in ledger for reliable uninstall
    const record: InstalledAddonRecord = {
      id: plugin.id,
      name: plugin.name,
      originId: plugin.originId,
      presetId: 'claude',
      category: plugin.category,
      version: plugin.version,
      installedAt: new Date().toISOString(),
      installedFiles: result.createdPaths,
      installedJsonEntries: [],
    };

    const ledger = this.store.getLedger();
    await this.store.saveLedger(addToLedger(ledger, record));
    return { ok: true };
  }

  /** Uninstall a previously installed plugin by removing its tracked files. */
  async uninstallPlugin(addonId: string): Promise<{ ok: boolean; error?: string }> {
    const ledger = this.store.getLedger();
    const record = findInLedger(ledger, addonId);
    if (!record) {
      return { ok: false, error: `No installation record found for ${addonId}` };
    }

    const result = await this.installer.removeTrackedFiles(record.installedFiles);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    await this.store.saveLedger(removeFromLedger(ledger, addonId));
    return { ok: true };
  }
}

/** Map (presetId, category, locality) → registered ArtifactCreator id. */
function resolveCreatorId(
  presetId: SourcePresetId,
  category: PluginCategory,
  locality: SourceLocality
): string | null {
  // Skills use folder layout (AgentSkills.io: skill-name/SKILL.md)
  // Other categories use their standard creators from claude/creators.ts
  const map: Record<string, Record<string, string>> = {
    skill: { workspace: `${presetId}/skill-folder/workspace`, user: `${presetId}/skill-folder/user` },
    command: { workspace: `${presetId}/command/workspace`, user: `${presetId}/command/user` },
    rule: { workspace: `${presetId}/rule/workspace`, user: `${presetId}/rule/user` },
  };
  return map[category]?.[locality] ?? null;
}
