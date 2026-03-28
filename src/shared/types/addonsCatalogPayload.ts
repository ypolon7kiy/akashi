/**
 * Serializable DTOs for host -> webview addons panel messaging.
 * Reuses SourceDescriptor / ArtifactDescriptor from the sources snapshot
 * — no custom projection or type derivation.
 */

import type { SourceDescriptor, ArtifactDescriptor } from './sourcesSnapshotPayload';

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

export interface AddonsCatalogPayload {
  readonly generatedAt: string;
  readonly presetId: string;
  /** Whether the preset required for add-ons is enabled in `akashi.presets`. */
  readonly presetActive: boolean;
  /** Source records from the snapshot — the single source of truth for installed addons. */
  readonly records: readonly SourceDescriptor[];
  /** Artifact linkage from the snapshot (folder-layout grouping, compound hooks, etc). */
  readonly artifacts: readonly ArtifactDescriptor[];
  /** Available plugins from marketplace catalogs. */
  readonly catalogPlugins: readonly CatalogPluginDescriptor[];
  /** Configured marketplace origins. */
  readonly origins: readonly MarketplaceOriginDescriptor[];
}

export function isAddonsCatalogPayload(value: unknown): value is AddonsCatalogPayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
