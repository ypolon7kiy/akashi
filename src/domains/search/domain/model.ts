/**
 * Client-side search query over snapshot records.
 * Facet sets use the `null = all` convention:
 * `null` means every value passes; a non-null `Set` restricts to exactly those values.
 */
export interface SourceSearchQuery {
  readonly text: string;
  readonly categories: ReadonlySet<string> | null;
  readonly presets: ReadonlySet<string> | null;
  readonly localities: ReadonlySet<string> | null;
}

export interface SourceSearchResult {
  readonly matchedRecordIds: ReadonlySet<string>;
  /** Matched file paths — bridges record IDs to tree nodes and graph nodes. */
  readonly matchedPaths: ReadonlySet<string>;
  readonly totalRecords: number;
  readonly matchCount: number;
}

export const EMPTY_SEARCH_QUERY: SourceSearchQuery = {
  text: '',
  categories: null,
  presets: null,
  localities: null,
};

export function isEmptySearchQuery(q: SourceSearchQuery): boolean {
  return q.text === '' && q.categories === null && q.presets === null && q.localities === null;
}

/**
 * JSON-safe representation of {@link SourceSearchQuery} for cross-webview messaging.
 * Uses arrays instead of Sets; `null` still means "all".
 */
export interface SerializedSourceSearchQuery {
  readonly text: string;
  readonly categories: readonly string[] | null;
  readonly presets: readonly string[] | null;
  readonly localities: readonly string[] | null;
}

export function serializeSearchQuery(q: SourceSearchQuery): SerializedSourceSearchQuery {
  return {
    text: q.text,
    categories: q.categories ? [...q.categories] : null,
    presets: q.presets ? [...q.presets] : null,
    localities: q.localities ? [...q.localities] : null,
  };
}

export function deserializeSearchQuery(s: SerializedSourceSearchQuery): SourceSearchQuery {
  return {
    text: s.text,
    categories: s.categories ? new Set(s.categories) : null,
    presets: s.presets ? new Set(s.presets) : null,
    localities: s.localities ? new Set(s.localities) : null,
  };
}
