/**
 * Aggregate snapshot sent to the addons panel webview.
 * Combines installed addons, marketplace origins, and available catalog plugins.
 */

import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { AddonCategory, InstalledAddon } from './installedAddon';
import type { CatalogPlugin } from './catalogPlugin';
import type { MarketplaceOrigin } from './marketplaceOrigin';

/** Per-category count summary for the panel header. */
export interface AddonCategorySummary {
  readonly category: AddonCategory;
  readonly count: number;
}

/** Full addons catalog for a single preset. */
export interface AddonsCatalog {
  readonly generatedAt: string;
  readonly presetId: SourcePresetId;
  readonly installedAddons: readonly InstalledAddon[];
  readonly catalogPlugins: readonly CatalogPlugin[];
  readonly origins: readonly MarketplaceOrigin[];
  readonly categorySummaries: readonly AddonCategorySummary[];
}
