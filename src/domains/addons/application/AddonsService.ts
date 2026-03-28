/**
 * Addons application service: orchestrates marketplace origins, catalog fetching,
 * and install/uninstall lifecycle.
 *
 * Installed addons are tracked in per-locality akashi-meta.json files.
 * Install status is determined by the meta file — no snapshot/catalog intersection.
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
  addEntry,
  removeEntry,
  getEntries,
  findEntry,
  type AkashiMeta,
  type AkashiMetaEntry,
} from '../domain/akashiMeta';
import { deriveNameFromPath } from '../domain/reconcileInstallStatus';
import type { CatalogPlugin, InstallStatus, PluginCategory } from '../domain/catalogPlugin';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
} from './ports';

const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AddonsService {
  constructor(
    private readonly sourceSnapshot: SourceSnapshotPort,
    private readonly store: AddonsStorePort,
    private readonly fetcher: MarketplaceFetcherPort,
    private readonly installer: AddonInstallerPort,
    private readonly metaStore: AkashiMetaPort
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
   * Install status comes from akashi-meta.json files (workspace + user).
   * Stale entries (meta says installed but files gone) are auto-cleaned.
   */
  async getCatalog(
    presetId: SourcePresetId,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<AddonsCatalog | null> {
    const snapshot = await this.sourceSnapshot.getLastSnapshot();
    if (!snapshot) {
      return null;
    }

    // Filter snapshot to the target preset
    const records = snapshot.records.filter((r) => r.preset === presetId);
    const artifacts = (snapshot.artifacts ?? []).filter((a) => a.presetId === presetId);
    const origins = this.getOrigins();

    // Collect raw catalog plugins from enabled origins
    const rawPlugins: CatalogPlugin[] = [];
    for (const origin of origins) {
      if (!origin.enabled) continue;
      rawPlugins.push(...this.getCachedPlugins(origin.id));
    }

    // Read meta files from both localities
    const wsMeta = this.metaStore.readMeta('workspace', workspaceRoot, roots.claudeUserRoot);
    const userMeta = this.metaStore.readMeta('user', workspaceRoot, roots.claudeUserRoot);

    // Build set of installed names from both meta files
    const wsEntries = getEntries(wsMeta, presetId);
    const userEntries = getEntries(userMeta, presetId);
    const installedNames = new Set([
      ...wsEntries.map((e) => e.name),
      ...userEntries.map((e) => e.name),
    ]);

    // Stale detection: check meta entries against snapshot
    const snapshotNames = new Set(records.map((r) => deriveNameFromPath(r.path)));

    let wsMetaUpdated = wsMeta;
    for (const entry of wsEntries) {
      if (!snapshotNames.has(entry.name)) {
        wsMetaUpdated = removeEntry(wsMetaUpdated, presetId, entry.name, entry.category);
        installedNames.delete(entry.name);
      }
    }
    if (wsMetaUpdated !== wsMeta) {
      await this.metaStore.writeMeta(
        'workspace',
        workspaceRoot,
        roots.claudeUserRoot,
        wsMetaUpdated
      );
    }

    let userMetaUpdated = userMeta;
    for (const entry of userEntries) {
      if (!snapshotNames.has(entry.name)) {
        userMetaUpdated = removeEntry(userMetaUpdated, presetId, entry.name, entry.category);
        installedNames.delete(entry.name);
      }
    }
    if (userMetaUpdated !== userMeta) {
      await this.metaStore.writeMeta('user', workspaceRoot, roots.claudeUserRoot, userMetaUpdated);
    }

    // Assign install status to catalog plugins
    const catalogPlugins: CatalogPlugin[] = rawPlugins.map((plugin) => ({
      ...plugin,
      installStatus: (installedNames.has(plugin.name) ? 'installed' : 'available') as InstallStatus,
    }));

    return {
      generatedAt: snapshot.generatedAt,
      presetId,
      records,
      artifacts,
      catalogPlugins,
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
        return {
          ok: false,
          error: `No creator for category '${plugin.category}' at ${locality} scope`,
        };
      }
      result = await this.installer.installViaCreator(
        creatorId,
        plugin.name,
        plugin.description,
        workspaceRoot,
        roots
      );
    }

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Record in akashi-meta.json
    const meta = this.metaStore.readMeta(locality, workspaceRoot, roots.claudeUserRoot);
    const updated = addEntry(meta, 'claude', {
      name: plugin.name,
      category: plugin.category,
      originId: plugin.originId,
      version: plugin.version,
      installedPaths: result.createdPaths,
    });
    await this.metaStore.writeMeta(locality, workspaceRoot, roots.claudeUserRoot, updated);

    return { ok: true };
  }

  async deleteAddon(
    workspaceRoot: string,
    roots: ToolUserRoots,
    primaryPath?: string,
    pluginId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const snapshot = await this.sourceSnapshot.getLastSnapshot();

    // Try to find the meta entry — it knows exactly what was installed
    const metaMatch = this.findMetaEntry(workspaceRoot, roots, primaryPath, pluginId, snapshot);

    if (metaMatch) {
      // Meta-tracked addon: use installedPaths for precise cleanup
      const result = await this.deleteTrackedPaths(
        metaMatch.entry.installedPaths,
        primaryPath,
        snapshot
      );
      if (!result.ok) {
        return result;
      }
      const updated = removeEntry(
        metaMatch.meta,
        'claude',
        metaMatch.entry.name,
        metaMatch.entry.category
      );
      await this.metaStore.writeMeta(
        metaMatch.locality,
        workspaceRoot,
        roots.claudeUserRoot,
        updated
      );
      return { ok: true };
    }

    // Fallback: not in meta (manually created addon) — use snapshot to resolve
    let effectivePath = primaryPath;
    if (!effectivePath && pluginId && snapshot) {
      const pluginName = pluginId.replace(/@.*$/, '');
      const match = (snapshot.artifacts ?? []).find(
        (a) => deriveNameFromPath(a.primaryPath) === pluginName
      );
      if (match) {
        effectivePath = match.primaryPath;
      }
    }

    if (!effectivePath) {
      return { ok: false, error: 'No addon found to delete' };
    }

    const result = await this.deleteByPath(effectivePath, snapshot);
    return result;
  }

  // ── Move to Global ────────────────────────────────────────────────

  /**
   * Install an addon at global (user) scope and transfer its meta entry
   * from the workspace meta file to the user meta file.
   *
   * The caller is responsible for reading the source content, overwriting the
   * creator stub, deleting the workspace file, and refreshing sources.
   */
  async moveAddonToGlobal(
    addonName: string,
    category: PluginCategory,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; createdPaths: readonly string[]; error?: string }> {
    const creatorId = resolveCreatorId('claude', category, 'user');
    if (!creatorId) {
      return {
        ok: false,
        createdPaths: [],
        error: `No global creator for category '${category}'`,
      };
    }

    const installResult = await this.installer.installViaCreator(
      creatorId,
      addonName,
      '',
      workspaceRoot,
      roots
    );
    if (!installResult.ok) {
      return { ok: false, createdPaths: [], error: installResult.error };
    }

    // Transfer meta: remove workspace entry (if any), add user entry
    const wsMeta = this.metaStore.readMeta('workspace', workspaceRoot, roots.claudeUserRoot);
    const existingEntry = findEntry(wsMeta, 'claude', addonName, category);

    if (existingEntry) {
      const updatedWsMeta = removeEntry(wsMeta, 'claude', addonName, category);
      await this.metaStore.writeMeta('workspace', workspaceRoot, roots.claudeUserRoot, updatedWsMeta);
    }

    const userMeta = this.metaStore.readMeta('user', workspaceRoot, roots.claudeUserRoot);
    const newEntry: AkashiMetaEntry = {
      name: addonName,
      category,
      originId: existingEntry?.originId ?? '',
      version: existingEntry?.version ?? '',
      installedPaths: installResult.createdPaths,
    };
    const updatedUserMeta = addEntry(userMeta, 'claude', newEntry);
    await this.metaStore.writeMeta('user', workspaceRoot, roots.claudeUserRoot, updatedUserMeta);

    return { ok: true, createdPaths: installResult.createdPaths };
  }

  /** Look up a meta entry by primaryPath or pluginId across both localities. */
  private findMetaEntry(
    workspaceRoot: string,
    roots: ToolUserRoots,
    primaryPath?: string,
    pluginId?: string,
    snapshot?: {
      records: readonly { path: string; locality: SourceLocality; category: string }[];
    } | null
  ): { entry: AkashiMetaEntry; meta: AkashiMeta; locality: SourceLocality } | null {
    const addonName = primaryPath
      ? deriveNameFromPath(primaryPath)
      : pluginId
        ? pluginId.replace(/@.*$/, '')
        : null;
    if (!addonName) return null;

    // Determine preferred locality from snapshot record
    const snapshotRecord =
      primaryPath && snapshot ? snapshot.records.find((r) => r.path === primaryPath) : null;
    const preferredLocality: SourceLocality = snapshotRecord?.locality ?? 'workspace';
    const localities: readonly SourceLocality[] = [
      preferredLocality,
      preferredLocality === 'workspace' ? 'user' : 'workspace',
    ];

    for (const loc of localities) {
      const meta = this.metaStore.readMeta(loc, workspaceRoot, roots.claudeUserRoot);
      const entries = getEntries(meta, 'claude');
      const entry = entries.find((e) => e.name === addonName);
      if (entry) {
        return { entry, meta, locality: loc };
      }
    }
    return null;
  }

  /** Delete using tracked installedPaths. For folder-layout, removes the entire folder. */
  private async deleteTrackedPaths(
    installedPaths: readonly string[],
    primaryPath: string | undefined,
    snapshot: { artifacts?: readonly { primaryPath: string; shape: string }[] } | null
  ): Promise<{ ok: boolean; error?: string }> {
    // Check if this is a folder artifact — if so, remove the whole folder
    const refPath = primaryPath ?? installedPaths[0];
    if (refPath && snapshot) {
      const artifact = (snapshot.artifacts ?? []).find((a) => a.primaryPath === refPath);
      if (artifact?.shape === 'folder-file') {
        const norm = refPath.replace(/\\/g, '/');
        const folderPath = norm.slice(0, norm.lastIndexOf('/'));
        return this.installer.removeDirectory(folderPath);
      }
    }

    // Non-folder: delete all tracked files
    if (installedPaths.length > 0) {
      return this.installer.removeTrackedFiles(installedPaths);
    }

    // Fallback: delete single file
    if (primaryPath) {
      return this.installer.removeTrackedFiles([primaryPath]);
    }

    return { ok: false, error: 'No files to delete' };
  }

  /** Fallback deletion for addons not tracked in meta. */
  private async deleteByPath(
    effectivePath: string,
    snapshot: { artifacts?: readonly { primaryPath: string; shape: string }[] } | null
  ): Promise<{ ok: boolean; error?: string }> {
    let isFolderArtifact = false;
    if (snapshot) {
      const artifact = (snapshot.artifacts ?? []).find((a) => a.primaryPath === effectivePath);
      isFolderArtifact = artifact?.shape === 'folder-file';
    }

    if (isFolderArtifact) {
      const norm = effectivePath.replace(/\\/g, '/');
      const folderPath = norm.slice(0, norm.lastIndexOf('/'));
      return this.installer.removeDirectory(folderPath);
    }

    return this.installer.removeTrackedFiles([effectivePath]);
  }
}

function resolveCreatorId(
  presetId: SourcePresetId,
  category: PluginCategory,
  locality: SourceLocality
): string | null {
  const map: Record<string, Record<string, string>> = {
    skill: {
      workspace: `${presetId}/skill-folder/workspace`,
      user: `${presetId}/skill-folder/user`,
    },
    command: { workspace: `${presetId}/command/workspace`, user: `${presetId}/command/user` },
    rule: { workspace: `${presetId}/rule/workspace`, user: `${presetId}/rule/user` },
  };
  return map[category]?.[locality] ?? null;
}
