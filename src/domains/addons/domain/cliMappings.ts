/**
 * Pure mapping functions between Claude CLI types and addons domain types.
 * No I/O — safe for unit testing.
 */

import {
  type CatalogPlugin,
  type PluginCategory,
  type PluginSourceRef,
  isValidPluginCategory,
} from './catalogPlugin';
import type { CliAvailablePlugin, CliInstalledPlugin, CliMarketplace, CliScope } from './cliTypes';
import type { MarketplaceOrigin, OriginSource } from './marketplaceOrigin';
import type { SourceLocality } from '../../sources/domain/artifactKind';

/**
 * Addons-specific locality that extends SourceLocality with CLI's 'local' scope.
 *
 * - 'workspace' → CLI 'project' scope (team-shared, git-tracked .claude/settings.json)
 * - 'local'     → CLI 'local' scope   (personal per-project, gitignored .claude/settings.local.json)
 * - 'user'      → CLI 'user' scope    (global, ~/.claude/settings.json)
 */
export type AddonLocality = SourceLocality | 'local';

// ── CLI origin identity ──────────────────────────────────────────────

/** Prefix used to distinguish CLI-managed origins from legacy store-based ones. */
export const CLI_ORIGIN_ID_PREFIX = 'cli:';

/** Returns true if the origin id was assigned by the CLI path. */
export function isCliOrigin(id: string): boolean {
  return id.startsWith(CLI_ORIGIN_ID_PREFIX);
}

/** Strip the CLI prefix to get the raw marketplace name. */
export function stripCliPrefix(id: string): string {
  return id.slice(CLI_ORIGIN_ID_PREFIX.length);
}

/**
 * Map a CLI available plugin entry to a domain CatalogPlugin.
 *
 * CLI output may lack category, tags, and keywords — category defaults
 * to 'plugin', others to empty arrays.
 */
export function mapCliAvailableToCatalog(plugin: CliAvailablePlugin): CatalogPlugin {
  const category: PluginCategory =
    plugin.category && isValidPluginCategory(plugin.category) ? plugin.category : 'plugin';

  return {
    id: plugin.pluginId,
    originId: plugin.marketplaceName,
    name: plugin.name,
    description: plugin.description,
    version: '',
    category,
    tags: [],
    keywords: [],
    source: parseCliSource(plugin.source),
    installStatus: 'available',
    installCount: plugin.installCount,
  };
}

/**
 * Map a CLI marketplace entry to a domain MarketplaceOrigin.
 *
 * CLI marketplaces are always enabled and not editable via the UI
 * (they are managed by the CLI).
 */
export function mapCliMarketplaceToOrigin(mp: CliMarketplace): MarketplaceOrigin {
  const source: OriginSource = mp.repo
    ? buildGithubSource(mp.repo)
    : { kind: 'url', url: mp.installLocation };

  return {
    id: `${CLI_ORIGIN_ID_PREFIX}${mp.name}`,
    label: mp.name,
    source,
    builtIn: false,
    enabled: true,
    lastFetchedAt: null,
    lastError: null,
  };
}

/** Convert akashi AddonLocality to CLI scope. */
export function localityToCliScope(locality: AddonLocality): CliScope {
  switch (locality) {
    case 'workspace':
      return 'project';
    case 'local':
      return 'local';
    case 'user':
      return 'user';
  }
}

/** Check whether a plugin name appears in the CLI installed list. */
export function isCliTracked(
  cliInstalled: readonly CliInstalledPlugin[],
  name: string
): CliInstalledPlugin | undefined {
  return cliInstalled.find((p) => p.id.startsWith(`${name}@`));
}

/**
 * Format an OriginSource for CLI `marketplace add` command.
 *
 * github:{owner}/{repo} → "owner/repo"
 * url:...              → the URL
 * file:...             → the path
 */
export function formatSourceForCli(source: OriginSource): string {
  switch (source.kind) {
    case 'github':
      return `${source.owner}/${source.repo}`;
    case 'url':
      return source.url;
    case 'file':
      return source.path;
  }
}

/** Extract the plugin name (before @) from a CLI plugin id like "name@marketplace". */
export function parseCliPluginName(cliId: string): string {
  const atIdx = cliId.indexOf('@');
  return atIdx > 0 ? cliId.slice(0, atIdx) : cliId;
}

/** Extract the marketplace name (after @) from a CLI plugin id like "name@marketplace". */
export function parseCliPluginMarketplace(cliId: string): string {
  const atIdx = cliId.indexOf('@');
  return atIdx > 0 ? cliId.slice(atIdx + 1) : '';
}

/**
 * Derive a human-readable label from an OriginSource.
 *
 * github: "anthropics/skills" → "anthropics/skills"
 * url:    "https://example.com/marketplace.json" → "example.com"
 * file:   "/home/user/.claude/local.json" → "local.json"
 */
export function labelFromSource(source: OriginSource): string {
  switch (source.kind) {
    case 'github':
      return `${source.owner}/${source.repo}`;
    case 'url': {
      try {
        return new URL(source.url).hostname;
      } catch {
        return source.url;
      }
    }
    case 'file': {
      const parts = source.path.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1] || source.path;
    }
  }
}

// ── Internal helpers ──────────────────────────────────────────────────

/**
 * Parse the CLI's polymorphic `source` field into a domain `PluginSourceRef`.
 *
 * Real CLI output shapes:
 * - String: `"./plugins/agent-sdk-dev"` → relative path within marketplace repo
 * - Object `{ source: "url", url, sha }` → external git repo
 * - Object `{ source: "git-subdir", url, path, ref, sha }` → monorepo subdirectory
 * - Object `{ source: "github", repo, ref, sha }` → GitHub repo
 */
export function parseCliSource(source: string | Record<string, unknown>): PluginSourceRef {
  if (typeof source === 'string') {
    return { kind: 'relative', path: source };
  }

  if (source !== null && typeof source === 'object') {
    const kind = typeof source.source === 'string' ? source.source : '';

    if (kind === 'url' && typeof source.url === 'string') {
      return {
        kind: 'url',
        url: source.url,
        ref: typeof source.ref === 'string' ? source.ref : undefined,
        sha: typeof source.sha === 'string' ? source.sha : undefined,
      };
    }

    if (
      kind === 'git-subdir' &&
      typeof source.url === 'string' &&
      typeof source.path === 'string'
    ) {
      return {
        kind: 'git-subdir',
        url: source.url,
        path: source.path,
        ref: typeof source.ref === 'string' ? source.ref : undefined,
      };
    }

    if (kind === 'github' && typeof source.repo === 'string') {
      return {
        kind: 'github',
        repo: source.repo,
        ref: typeof source.ref === 'string' ? source.ref : undefined,
        sha: typeof source.sha === 'string' ? source.sha : undefined,
      };
    }
  }

  return { kind: 'relative', path: '' };
}

function buildGithubSource(repo: string): OriginSource {
  const slashIdx = repo.indexOf('/');
  if (slashIdx > 0 && slashIdx < repo.length - 1) {
    return { kind: 'github', owner: repo.slice(0, slashIdx), repo: repo.slice(slashIdx + 1) };
  }
  // Fallback: treat as URL if repo format is unexpected
  return { kind: 'url', url: repo };
}
