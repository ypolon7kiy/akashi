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
  readonly installCount?: number;
}

/** Flattened origin source for webview consumption (kind + single value string). */
export interface OriginSourceDescriptor {
  readonly kind: 'github' | 'url' | 'file';
  readonly value: string;
}

export interface MarketplaceOriginDescriptor {
  readonly id: string;
  readonly label: string;
  readonly source: OriginSourceDescriptor;
  readonly builtIn: boolean;
  readonly enabled: boolean;
  readonly lastFetchedAt: string | null;
  readonly lastError: string | null;
  readonly cliManaged?: boolean;
}

/** CLI-installed plugin descriptor for webview consumption. */
export interface CliInstalledDescriptor {
  readonly id: string; // "marketing-skills@claude-code-skills"
  readonly name: string; // "marketing-skills"
  readonly version: string; // "2.1.2" or "unknown"
  readonly scope: 'user' | 'project' | 'local';
  readonly installPath: string;
  readonly installedAt: string;
  readonly marketplace: string; // "claude-code-skills"
  /** Cross-referenced from catalog — absent if plugin not in any marketplace. */
  readonly description?: string;
  /** Cross-referenced from catalog — absent if plugin not in any marketplace. */
  readonly category?: string;
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
  /** CLI-installed plugins (primary source when CLI is available). */
  readonly cliInstalledPlugins?: readonly CliInstalledDescriptor[];
  /** Whether the Claude CLI was available when building this catalog. */
  readonly cliAvailable?: boolean;
}

export function isAddonsCatalogPayload(value: unknown): value is AddonsCatalogPayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
