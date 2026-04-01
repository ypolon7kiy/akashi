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
import {
  toCatalogSnapshot,
  type CatalogPlugin,
  type InstallStatus,
  type PluginCategory,
} from '../domain/catalogPlugin';
import { resolveCreatorId } from '../domain/resolveCreatorId';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
  ClaudeCliPort,
} from './ports';
import type { CliInstalledPlugin, CliScope } from '../domain/cliTypes';
import {
  CLI_ORIGIN_ID_PREFIX,
  isCliOrigin,
  stripCliPrefix,
  mapCliAvailableToCatalog,
  mapCliInstalledToSyntheticCatalog,
  mapCliMarketplaceToOrigin,
  localityToCliScope,
  isCliTracked,
  formatSourceForCli,
  parseCliPluginName,
  labelFromSource,
  type AddonLocality,
} from '../domain/cliMappings';

const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** Grace period: skip stale detection for entries installed within this window. */
const STALE_GRACE_MS = 30_000; // 30 seconds

export class AddonsService {
  private readonly log: (msg: string) => void;

  constructor(
    private readonly sourceSnapshot: SourceSnapshotPort,
    private readonly store: AddonsStorePort,
    private readonly fetcher: MarketplaceFetcherPort,
    private readonly installer: AddonInstallerPort,
    private readonly metaStore: AkashiMetaPort,
    private readonly cli: ClaudeCliPort | null = null,
    log?: (msg: string) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.log = log ?? (() => {});
  }

  // ── Origins Management ────────────────────────────────────────────

  async getOrigins(): Promise<readonly MarketplaceOrigin[]> {
    // CLI-primary: use CLI marketplace list as source of truth
    if (this.cli && (await this.cli.isAvailable())) {
      try {
        const marketplaces = await this.cli.listMarketplaces();
        const origins = marketplaces.map(mapCliMarketplaceToOrigin);
        const overrides = this.store.getOriginOverrides();
        const overrideMap = new Map(overrides.map((o) => [o.id, o.enabled]));
        return origins.map((o) => ({
          ...o,
          enabled: overrideMap.get(o.id) ?? o.enabled,
        }));
      } catch {
        // CLI failed — fall through to legacy path
      }
    }
    return this.getOriginsLegacy();
  }

  /** Legacy origin resolution from globalState (built-in + custom). */
  private getOriginsLegacy(): readonly MarketplaceOrigin[] {
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

  async addOrigin(source: OriginSource): Promise<MarketplaceOrigin> {
    const label = labelFromSource(source);

    // CLI-primary: register marketplace via CLI
    if (this.cli && (await this.cli.isAvailable())) {
      const formatted = formatSourceForCli(source);
      const result = await this.cli.addMarketplace(formatted);
      if (result.ok) {
        // Get canonical identity from CLI — the CLI assigns a short name
        // that may differ from labelFromSource (e.g. "skills" vs "anthropics/skills")
        const marketplaces = await this.cli.listMarketplaces();
        const added = marketplaces.find(
          (m) => m.repo === formatted || m.source === formatted || m.name === label
        );
        if (added) return mapCliMarketplaceToOrigin(added);
        // Fallback: use label if marketplace not found in list
        return {
          id: `${CLI_ORIGIN_ID_PREFIX}${label}`,
          label,
          source,
          builtIn: false,
          enabled: true,
          lastFetchedAt: null,
          lastError: null,
        };
      }
      // CLI failed — fall through to legacy
    }
    return this.addOriginLegacy(label, source);
  }

  private async addOriginLegacy(label: string, source: OriginSource): Promise<MarketplaceOrigin> {
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
    // CLI-primary: remove marketplace via CLI
    if (this.cli && (await this.cli.isAvailable())) {
      const name = isCliOrigin(originId) ? stripCliPrefix(originId) : originId;
      const result = await this.cli.removeMarketplace(name);
      if (result.ok) return;
      // CLI-managed origins only exist in CLI — legacy fallback cannot remove them
      if (isCliOrigin(originId)) {
        throw new Error(result.error ?? 'Failed to remove CLI-managed marketplace');
      }
      // Non-CLI origin: fall through to legacy
    }
    const existing = this.store.getCustomOrigins();
    await this.store.saveCustomOrigins(existing.filter((o) => o.id !== originId));
    await this.store.clearCachedCatalog(originId);
  }

  async editOrigin(originId: string, source: OriginSource): Promise<MarketplaceOrigin> {
    if (isCliOrigin(originId)) {
      throw new Error(
        'CLI-managed origins cannot be edited. Use the Claude CLI to modify this marketplace.'
      );
    }
    const label = labelFromSource(source);
    const existing = this.store.getCustomOrigins();
    const current = existing.find((o) => o.id === originId);
    if (!current) {
      throw new Error(`Custom origin '${originId}' not found`);
    }

    const newId = buildOriginId(source);

    // Prevent collision with a different existing origin
    if (newId !== originId && existing.some((o) => o.id === newId)) {
      throw new Error(`An origin with source '${newId}' already exists`);
    }

    const idChanged = newId !== originId;

    // Replace in-place to preserve list order and enabled state
    const updated = existing.map((o) =>
      o.id === originId ? { id: newId, label, source, enabled: o.enabled } : o
    );
    await this.store.saveCustomOrigins(updated);

    // Source change invalidates the old cache
    if (idChanged) {
      await this.store.clearCachedCatalog(originId);
    }

    return {
      id: newId,
      label,
      source,
      builtIn: false,
      enabled: current.enabled,
      lastFetchedAt: idChanged ? null : (this.store.getCachedCatalog(newId)?.fetchedAt ?? null),
      lastError: null,
    };
  }

  async toggleOrigin(originId: string, enabled: boolean): Promise<void> {
    const builtIn = BUILT_IN_ORIGINS.find((o) => o.id === originId);
    if (builtIn || isCliOrigin(originId)) {
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

  /**
   * Fetch catalog for a single origin.
   *
   * CLI-primary: calls `listAvailable()` once, caches results for ALL
   * marketplaces (avoids repeated 70KB+ calls), then returns the slice
   * matching this origin's marketplace name.
   */
  async fetchOriginCatalog(origin: MarketplaceOrigin): Promise<readonly CatalogPlugin[]> {
    if (this.cli && (await this.cli.isAvailable())) {
      try {
        return await this.fetchOriginCatalogCli(origin);
      } catch {
        // CLI failed — fall through to legacy fetch
      }
    }
    return this.fetchOriginCatalogLegacy(origin);
  }

  private async fetchOriginCatalogCli(
    origin: MarketplaceOrigin
  ): Promise<readonly CatalogPlugin[]> {
    const cliResult = await this.cli!.listAvailable();
    const now = new Date().toISOString();

    // Group all available plugins by marketplace name
    const byMarketplace = new Map<string, CatalogPlugin[]>();
    for (const p of cliResult.available) {
      const mp = p.marketplaceName;
      if (!byMarketplace.has(mp)) byMarketplace.set(mp, []);
      byMarketplace.get(mp)!.push(mapCliAvailableToCatalog(p));
    }

    // Cache each marketplace group under its CLI origin id
    for (const [mpName, plugins] of byMarketplace) {
      await this.store.saveCachedCatalog({
        originId: `${CLI_ORIGIN_ID_PREFIX}${mpName}`,
        fetchedAt: now,
        plugins,
      });
    }

    // Return the slice for the requested origin
    const mpName = isCliOrigin(origin.id) ? stripCliPrefix(origin.id) : origin.label;
    return byMarketplace.get(mpName) ?? [];
  }

  private async fetchOriginCatalogLegacy(
    origin: MarketplaceOrigin
  ): Promise<readonly CatalogPlugin[]> {
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
    const origins = await this.getOrigins();

    // Collect raw catalog plugins from enabled origins.
    // CLI-primary: call listAvailable() live — no catalog cache.
    // Legacy fallback: read from cached catalogs (URL-based marketplace.json).
    const rawPlugins: CatalogPlugin[] = [];
    const enabledOriginNames = new Set(
      origins
        .filter((o) => o.enabled)
        .map((o) => (isCliOrigin(o.id) ? stripCliPrefix(o.id) : o.label))
    );

    if (this.cli && (await this.cli.isAvailable())) {
      try {
        const cliResult = await this.cli.listAvailable();
        for (const p of cliResult.available) {
          if (enabledOriginNames.has(p.marketplaceName)) {
            rawPlugins.push(mapCliAvailableToCatalog(p));
          }
        }
      } catch {
        // CLI failed — fall through to cache-based path
      }
    }

    if (rawPlugins.length === 0) {
      for (const origin of origins) {
        if (!origin.enabled) continue;
        rawPlugins.push(...this.getCachedPlugins(origin.id));
      }
    }

    // Determine installed names — CLI-primary or meta-based fallback
    const resolved = await this.resolveInstalled(presetId, workspaceRoot, roots, records);

    // Assign install status to catalog plugins
    const catalogPlugins: CatalogPlugin[] = rawPlugins.map((plugin) => ({
      ...plugin,
      installStatus: (resolved.names.has(plugin.name) ? 'installed' : 'available') as InstallStatus,
    }));

    // Inject synthetic entries for installed plugins not in any cached catalog.
    // This ensures CLI-installed plugins from unfetched marketplaces still
    // appear in the Available tab with an "installed" badge.
    const catalogNames = new Set(catalogPlugins.map((p) => p.name));
    for (const cliPlugin of resolved.cliPlugins) {
      const name = parseCliPluginName(cliPlugin.id);
      if (!catalogNames.has(name)) {
        catalogPlugins.push(mapCliInstalledToSyntheticCatalog(cliPlugin));
        catalogNames.add(name);
      }
    }

    return {
      generatedAt: snapshot.generatedAt,
      presetId,
      records,
      artifacts,
      catalogPlugins,
      origins,
      cliInstalledPlugins: resolved.cliPlugins,
      cliAvailable: resolved.cliAvailable,
    };
  }

  /**
   * Resolve the set of installed plugin names AND the full CLI installed list.
   * CLI-primary: uses `claude plugin list --json`.
   * Fallback: reads akashi-meta.json with stale detection (cliPlugins empty).
   */
  private async resolveInstalled(
    presetId: SourcePresetId,
    workspaceRoot: string,
    roots: ToolUserRoots,
    records: readonly { path: string }[]
  ): Promise<{
    names: Set<string>;
    cliPlugins: readonly CliInstalledPlugin[];
    cliAvailable: boolean;
  }> {
    // CLI-primary: installed names + full plugin data from CLI list
    if (this.cli && (await this.cli.isAvailable())) {
      try {
        const cliPlugins = await this.cli.listInstalled();
        const names = new Set(cliPlugins.map((p) => parseCliPluginName(p.id)));
        return { names, cliPlugins, cliAvailable: true };
      } catch {
        // CLI failed — fall through to meta-based resolution
      }
    }

    // Legacy: read from akashi-meta.json with stale detection
    const names = await this.resolveInstalledNamesLegacy(presetId, workspaceRoot, roots, records);
    return { names, cliPlugins: [], cliAvailable: false };
  }

  private async resolveInstalledNamesLegacy(
    presetId: SourcePresetId,
    workspaceRoot: string,
    roots: ToolUserRoots,
    records: readonly { path: string }[]
  ): Promise<Set<string>> {
    const wsMeta = this.metaStore.readMeta('workspace', workspaceRoot, roots.claudeUserRoot);
    const userMeta = this.metaStore.readMeta('user', workspaceRoot, roots.claudeUserRoot);

    const wsEntries = getEntries(wsMeta, presetId);
    const userEntries = getEntries(userMeta, presetId);
    const installedNames = new Set([
      ...wsEntries.map((e) => e.name),
      ...userEntries.map((e) => e.name),
    ]);

    // Stale detection: remove meta entries whose files no longer exist in snapshot.
    // Skip entries installed within the grace window to avoid a race condition
    // where sources.refresh hasn't picked up the new files yet.
    const snapshotNames = new Set(records.map((r) => deriveNameFromPath(r.path)));
    const now = Date.now();

    let wsMetaUpdated = wsMeta;
    for (const entry of wsEntries) {
      if (entry.installedAt && now - new Date(entry.installedAt).getTime() < STALE_GRACE_MS) {
        continue;
      }
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
      if (entry.installedAt && now - new Date(entry.installedAt).getTime() < STALE_GRACE_MS) {
        continue;
      }
      if (!snapshotNames.has(entry.name)) {
        userMetaUpdated = removeEntry(userMetaUpdated, presetId, entry.name, entry.category);
        installedNames.delete(entry.name);
      }
    }
    if (userMetaUpdated !== userMeta) {
      await this.metaStore.writeMeta('user', workspaceRoot, roots.claudeUserRoot, userMetaUpdated);
    }

    return installedNames;
  }

  // ── Install / Uninstall ───────────────────────────────────────────

  async installPlugin(
    plugin: CatalogPlugin,
    locality: AddonLocality,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; error?: string }> {
    // CLI-primary: install via Claude CLI (no meta tracking — CLI manages it)
    if (this.cli && (await this.cli.isAvailable())) {
      const scope = localityToCliScope(locality);
      // Build CLI plugin id: "name@marketplace"
      const cliId = plugin.id.includes('@') ? plugin.id : `${plugin.name}@${plugin.originId}`;
      // Pass workspaceRoot as cwd so the CLI resolves the correct project for project/local scopes
      const cwd = scope !== 'user' ? workspaceRoot : undefined;
      const cliResult = await this.cli.installPlugin(cliId, scope, cwd);
      if (cliResult.ok) {
        return { ok: true };
      }
      // CLI failed — fall through to legacy file-based install
    }
    // Legacy fallback: 'local' scope is CLI-only, so fall back to 'workspace'
    const legacyLocality: SourceLocality = locality === 'user' ? 'user' : 'workspace';
    return this.installPluginLegacy(plugin, legacyLocality, workspaceRoot, roots);
  }

  private async installPluginLegacy(
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
    const origin = (await this.getOrigins()).find((o) => o.id === plugin.originId);

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
      installedAt: new Date().toISOString(),
      catalogSnapshot: toCatalogSnapshot(plugin),
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
    // CLI-primary: try to uninstall via Claude CLI
    if (this.cli && (await this.cli.isAvailable())) {
      const cliResult = await this.tryCliUninstall(primaryPath, pluginId, workspaceRoot);
      if (cliResult) return cliResult;
      // CLI didn't match — fall through to legacy
    }

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
      await this.metaStore.writeMeta(
        'workspace',
        workspaceRoot,
        roots.claudeUserRoot,
        updatedWsMeta
      );
    }

    const userMeta = this.metaStore.readMeta('user', workspaceRoot, roots.claudeUserRoot);
    const newEntry: AkashiMetaEntry = {
      name: addonName,
      category,
      originId: existingEntry?.originId ?? '',
      version: existingEntry?.version ?? '',
      installedPaths: installResult.createdPaths,
      installedAt: new Date().toISOString(),
      catalogSnapshot: existingEntry?.catalogSnapshot,
    };
    const updatedUserMeta = addEntry(userMeta, 'claude', newEntry);
    await this.metaStore.writeMeta('user', workspaceRoot, roots.claudeUserRoot, updatedUserMeta);

    return { ok: true, createdPaths: installResult.createdPaths };
  }

  /**
   * Try to uninstall a plugin via the Claude CLI.
   * Returns a result if CLI handled it, or null to fall through to legacy.
   */
  private async tryCliUninstall(
    primaryPath?: string,
    pluginId?: string,
    workspaceRoot?: string
  ): Promise<{ ok: boolean; error?: string } | null> {
    if (!this.cli) return null;

    // Prefer pluginId (exact CLI id like "name@marketplace") over path-based derivation.
    // CLI install paths end with a version segment (e.g. .../marketing-skills/unknown)
    // so deriveNameFromPath returns the wrong value for CLI-managed plugins.
    const name = pluginId
      ? pluginId.replace(/@.*$/, '')
      : primaryPath
        ? deriveNameFromPath(primaryPath)
        : null;
    if (!name) return null;

    try {
      const cliInstalled = await this.cli.listInstalled();
      const match = isCliTracked(cliInstalled, name);
      if (!match) return null; // Not a CLI-managed plugin

      // The CLI's "local" scope is project-directory-relative — the CLI must
      // be invoked from the correct project root (cwd) to resolve it.
      // Prefer projectPath from the plugin metadata over the current workspace.
      const scope = match.scope as CliScope;
      const cwd = match.projectPath ?? workspaceRoot ?? undefined;
      this.log(
        `[Addons] CLI uninstall ${match.id} scope="${scope}" projectPath=${match.projectPath ?? 'none'} cwd=${cwd ?? 'none'}`
      );
      const result = await this.cli.uninstallPlugin(match.id, scope, cwd);
      if (result.ok) return { ok: true };
      // Scope mismatch: retry without --scope, letting the CLI auto-detect
      this.log(
        `[Addons] CLI uninstall ${match.id} scope=${scope} failed, retrying without --scope`
      );
      const retry = await this.cli.uninstallPlugin(match.id, undefined, cwd);
      if (retry.ok) return { ok: true };
      this.log(`[Addons] CLI uninstall failed for ${match.id}: ${retry.error ?? 'unknown'}`);
      return null; // CLI failed, let legacy handle it
    } catch {
      return null;
    }
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
