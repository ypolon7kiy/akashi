/**
 * Port interfaces for the addons application layer.
 */

import type { SourceIndexSnapshot } from '../../sources/domain/model';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { OriginSource } from '../domain/marketplaceOrigin';
import type { InstallationLedger } from '../domain/installationLedger';
import type { CatalogPlugin } from '../domain/catalogPlugin';
import type {
  PersistedCustomOrigin,
  PersistedOriginOverride,
} from '../domain/marketplaceOrigin';

/** Provides the latest source index snapshot for addon projection. */
export interface SourceSnapshotPort {
  getLastSnapshot(): Promise<SourceIndexSnapshot | null>;
}

/** Fetches marketplace.json from a remote or local source. */
export interface MarketplaceFetcherPort {
  fetch(source: OriginSource): Promise<{ ok: boolean; data: unknown; error?: string }>;
}

/** Persistent storage for addons state. */
export interface AddonsStorePort {
  getCustomOrigins(): readonly PersistedCustomOrigin[];
  saveCustomOrigins(origins: readonly PersistedCustomOrigin[]): Promise<void>;
  getOriginOverrides(): readonly PersistedOriginOverride[];
  saveOriginOverrides(overrides: readonly PersistedOriginOverride[]): Promise<void>;
  getLedger(): InstallationLedger;
  saveLedger(ledger: InstallationLedger): Promise<void>;
  getCachedCatalog(originId: string): { originId: string; fetchedAt: string; plugins: readonly CatalogPlugin[] } | null;
  saveCachedCatalog(entry: { originId: string; fetchedAt: string; plugins: readonly CatalogPlugin[] }): Promise<void>;
  clearCachedCatalog(originId: string): Promise<void>;
}

/** Install/uninstall via existing ArtifactCreator infrastructure. */
export interface AddonInstallerPort {
  installViaCreator(
    creatorId: string,
    pluginName: string,
    description: string,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; createdPaths: readonly string[]; error?: string }>;

  removeTrackedFiles(paths: readonly string[]): Promise<{ ok: boolean; error?: string }>;
}
