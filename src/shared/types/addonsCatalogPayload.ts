/**
 * Serializable DTOs for host -> webview addons panel messaging.
 * String-only types for safe JSON round-tripping across the webview boundary.
 */

export interface InstalledAddonDescriptor {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly presetId: string;
  readonly locality: 'workspace' | 'user';
  readonly primaryPath: string;
  readonly artifactId: string | null;
}

export interface CatalogPluginDescriptor {
  readonly id: string;
  readonly originId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly installStatus: 'available' | 'installed';
}

export interface MarketplaceOriginDescriptor {
  readonly id: string;
  readonly label: string;
  readonly builtIn: boolean;
  readonly enabled: boolean;
  readonly lastFetchedAt: string | null;
  readonly lastError: string | null;
}

export interface AddonCategorySummaryDescriptor {
  readonly category: string;
  readonly count: number;
}

export interface AddonsCatalogPayload {
  readonly generatedAt: string;
  readonly presetId: string;
  readonly installedAddons: readonly InstalledAddonDescriptor[];
  readonly catalogPlugins: readonly CatalogPluginDescriptor[];
  readonly origins: readonly MarketplaceOriginDescriptor[];
  readonly categorySummaries: readonly AddonCategorySummaryDescriptor[];
}

export function isAddonsCatalogPayload(value: unknown): value is AddonsCatalogPayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
