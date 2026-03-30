/**
 * Port interfaces for the addons application layer.
 */

import type { SourceIndexSnapshot } from '../../sources/domain/model';
import type { SourceLocality } from '../../sources/domain/artifactKind';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { OriginSource } from '../domain/marketplaceOrigin';
import type { AkashiMeta } from '../domain/akashiMeta';
import type { CatalogPlugin } from '../domain/catalogPlugin';
import type { PersistedCustomOrigin, PersistedOriginOverride } from '../domain/marketplaceOrigin';
import type {
  CliAvailableResult,
  CliCommandResult,
  CliInstalledPlugin,
  CliMarketplace,
  CliScope,
} from '../domain/cliTypes';

/** Provides the latest source index snapshot for addon projection. */
export interface SourceSnapshotPort {
  getLastSnapshot(): Promise<SourceIndexSnapshot | null>;
}

/** Fetches marketplace.json from a remote or local source. */
export interface MarketplaceFetcherPort {
  fetch(source: OriginSource): Promise<{ ok: boolean; data: unknown; error?: string }>;
}

/** Persistent storage for addons state (globalState: origins, cache). */
export interface AddonsStorePort {
  getCustomOrigins(): readonly PersistedCustomOrigin[];
  saveCustomOrigins(origins: readonly PersistedCustomOrigin[]): Promise<void>;
  getOriginOverrides(): readonly PersistedOriginOverride[];
  saveOriginOverrides(overrides: readonly PersistedOriginOverride[]): Promise<void>;
  getCachedCatalog(
    originId: string
  ): { originId: string; fetchedAt: string; plugins: readonly CatalogPlugin[] } | null;
  saveCachedCatalog(entry: {
    originId: string;
    fetchedAt: string;
    plugins: readonly CatalogPlugin[];
  }): Promise<void>;
  clearCachedCatalog(originId: string): Promise<void>;
}

/** Per-locality akashi-meta.json reader/writer. */
export interface AkashiMetaPort {
  readMeta(locality: SourceLocality, workspaceRoot: string, userRoot: string): AkashiMeta;
  writeMeta(
    locality: SourceLocality,
    workspaceRoot: string,
    userRoot: string,
    meta: AkashiMeta
  ): Promise<void>;
}

/** Target directories for plugin component installation. */
export interface InstallTargets {
  readonly skills: string;
  readonly commands: string;
  readonly hooks: string;
  readonly root: string;
}

/** Claude CLI subprocess adapter for plugin and marketplace management. */
export interface ClaudeCliPort {
  /** Returns true if the `claude` binary is available and responds. */
  isAvailable(): Promise<boolean>;

  /** `claude plugin list --json` */
  listInstalled(): Promise<readonly CliInstalledPlugin[]>;

  /** `claude plugin list --available --json` */
  listAvailable(): Promise<CliAvailableResult>;

  /** `claude plugin marketplace list --json` */
  listMarketplaces(): Promise<readonly CliMarketplace[]>;

  /** `claude plugin install <id> --scope <scope>` */
  installPlugin(id: string, scope: CliScope, cwd?: string): Promise<CliCommandResult>;

  /** `claude plugin uninstall <id> [--scope <scope>]` */
  uninstallPlugin(id: string, scope?: CliScope, cwd?: string): Promise<CliCommandResult>;

  /** `claude plugin marketplace add <source>` */
  addMarketplace(source: string): Promise<CliCommandResult>;

  /** `claude plugin marketplace remove <name>` */
  removeMarketplace(name: string): Promise<CliCommandResult>;
}

/** Install/uninstall executor. */
export interface AddonInstallerPort {
  /** Download actual content from marketplace and install components to correct locations. */
  installFromMarketplace(
    plugin: CatalogPlugin,
    originSource: OriginSource,
    targets: InstallTargets
  ): Promise<{ ok: boolean; createdPaths: readonly string[]; error?: string }>;

  /** Fallback: create stub via ArtifactCreator infrastructure. */
  installViaCreator(
    creatorId: string,
    pluginName: string,
    description: string,
    workspaceRoot: string,
    roots: ToolUserRoots
  ): Promise<{ ok: boolean; createdPaths: readonly string[]; error?: string }>;

  removeTrackedFiles(paths: readonly string[]): Promise<{ ok: boolean; error?: string }>;

  /** Recursively remove a directory and all its contents. */
  removeDirectory(dirPath: string): Promise<{ ok: boolean; error?: string }>;
}
