/**
 * Aggregate catalog for the addons panel.
 * Installed addons come directly from the SourceIndexSnapshot — no custom projection.
 * Marketplace plugins come from cached marketplace.json catalogs.
 */

import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { IndexedSourceEntry, SourceIndexSnapshot } from '../../sources/domain/model';
import type { IndexedArtifact } from '../../sources/domain/artifact';
import type { CatalogPlugin } from './catalogPlugin';
import type { MarketplaceOrigin } from './marketplaceOrigin';

/** Full addons catalog for a single preset. */
export interface AddonsCatalog {
  readonly generatedAt: string;
  readonly presetId: SourcePresetId;
  /** Source records filtered to the target preset. */
  readonly records: readonly IndexedSourceEntry[];
  /** Artifact linkage filtered to the target preset. */
  readonly artifacts: readonly IndexedArtifact[];
  /** Available plugins from marketplace catalogs. */
  readonly catalogPlugins: readonly CatalogPlugin[];
  /** Configured marketplace origins. */
  readonly origins: readonly MarketplaceOrigin[];
}
