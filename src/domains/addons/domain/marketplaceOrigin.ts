/**
 * Marketplace origin: a source of addon catalogs.
 *
 * Built-in origins (official, community) are hardcoded. Custom origins
 * (file, url) are user-configured and persisted in the addons store.
 */

/** How to resolve the marketplace.json catalog. */
export type OriginSource =
  | { readonly kind: 'github'; readonly owner: string; readonly repo: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'file'; readonly path: string };

/** Runtime state of a marketplace origin. */
export interface MarketplaceOrigin {
  readonly id: string;
  readonly label: string;
  readonly source: OriginSource;
  readonly builtIn: boolean;
  readonly enabled: boolean;
  readonly lastFetchedAt: string | null;
  readonly lastError: string | null;
}

/** Deterministic id from an origin source. */
export function buildOriginId(source: OriginSource): string {
  switch (source.kind) {
    case 'github':
      return `github:${source.owner}/${source.repo}`;
    case 'url':
      return `url:${source.url}`;
    case 'file':
      return `file:${source.path}`;
  }
}

/** Built-in official and community marketplace origins. */
export const BUILT_IN_ORIGINS: readonly MarketplaceOrigin[] = [
  {
    id: 'github:anthropics/skills',
    label: 'Anthropic Skills',
    source: { kind: 'github', owner: 'anthropics', repo: 'skills' },
    builtIn: true,
    enabled: true,
    lastFetchedAt: null,
    lastError: null,
  },
  {
    id: 'github:anthropics/claude-plugins-official',
    label: 'Anthropic Official Plugins',
    source: { kind: 'github', owner: 'anthropics', repo: 'claude-plugins-official' },
    builtIn: true,
    enabled: true,
    lastFetchedAt: null,
    lastError: null,
  },
];

/** Minimal shape persisted for custom (non-built-in) origins. */
export interface PersistedCustomOrigin {
  readonly id: string;
  readonly label: string;
  readonly source: OriginSource;
  readonly enabled: boolean;
}

/** Minimal shape persisted for built-in origin overrides (just enabled state). */
export interface PersistedOriginOverride {
  readonly id: string;
  readonly enabled: boolean;
}
