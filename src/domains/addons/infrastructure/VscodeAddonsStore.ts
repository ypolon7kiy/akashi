/**
 * Persistent storage for the addons domain using VS Code globalState.
 * Stores: custom marketplace origins, built-in origin overrides, and catalog cache.
 */

import type * as vscode from 'vscode';
import type {
  PersistedCustomOrigin,
  PersistedOriginOverride,
} from '../domain/marketplaceOrigin';
import type { CatalogPlugin } from '../domain/catalogPlugin';

const CUSTOM_ORIGINS_KEY = 'akashi.addons.customOrigins.v1';
const ORIGIN_OVERRIDES_KEY = 'akashi.addons.originOverrides.v1';
const CATALOG_CACHE_KEY = 'akashi.addons.catalogCache.v1';

interface CatalogCacheEntry {
  readonly originId: string;
  readonly fetchedAt: string;
  readonly plugins: readonly CatalogPlugin[];
}

interface CatalogCache {
  readonly entries: readonly CatalogCacheEntry[];
}

export class VscodeAddonsStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  // ── Custom Origins ────────────────────────────────────────────────

  getCustomOrigins(): readonly PersistedCustomOrigin[] {
    return this.context.globalState.get<readonly PersistedCustomOrigin[]>(
      CUSTOM_ORIGINS_KEY,
      []
    );
  }

  async saveCustomOrigins(origins: readonly PersistedCustomOrigin[]): Promise<void> {
    await this.context.globalState.update(CUSTOM_ORIGINS_KEY, origins);
  }

  // ── Built-in Origin Overrides (enable/disable) ────────────────────

  getOriginOverrides(): readonly PersistedOriginOverride[] {
    return this.context.globalState.get<readonly PersistedOriginOverride[]>(
      ORIGIN_OVERRIDES_KEY,
      []
    );
  }

  async saveOriginOverrides(overrides: readonly PersistedOriginOverride[]): Promise<void> {
    await this.context.globalState.update(ORIGIN_OVERRIDES_KEY, overrides);
  }

  // ── Catalog Cache ─────────────────────────────────────────────────

  getCachedCatalog(originId: string): CatalogCacheEntry | null {
    const cache = this.context.globalState.get<CatalogCache>(CATALOG_CACHE_KEY);
    if (!cache?.entries) return null;
    return cache.entries.find((e) => e.originId === originId) ?? null;
  }

  async saveCachedCatalog(entry: CatalogCacheEntry): Promise<void> {
    const existing = this.context.globalState.get<CatalogCache>(CATALOG_CACHE_KEY) ?? {
      entries: [],
    };
    const filtered = existing.entries.filter((e) => e.originId !== entry.originId);
    await this.context.globalState.update(CATALOG_CACHE_KEY, {
      entries: [...filtered, entry],
    });
  }

  async clearCachedCatalog(originId: string): Promise<void> {
    const existing = this.context.globalState.get<CatalogCache>(CATALOG_CACHE_KEY);
    if (!existing?.entries) return;
    await this.context.globalState.update(CATALOG_CACHE_KEY, {
      entries: existing.entries.filter((e) => e.originId !== originId),
    });
  }
}
