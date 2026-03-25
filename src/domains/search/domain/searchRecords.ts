import type { SourceDescriptor } from '../../../shared/types/sourcesSnapshotPayload';
import { isEmptySearchQuery, type SourceSearchQuery, type SourceSearchResult } from './model';
import { applyFilterChain } from './filterChain';
import { applyToggleFilter } from './filters/applyToggleFilter';
import { applyTextFilter } from './filters/applyTextFilter';

/**
 * Searches snapshot records using a composable filter chain:
 * 1. Toggle filter (categories, presets, localities)
 * 2. Text filter (case-insensitive path substring)
 *
 * Each step narrows the result of the previous step.
 * Pure function — no side effects, no async.
 */
export function searchSourceRecords(
  records: readonly SourceDescriptor[],
  query: SourceSearchQuery,
): SourceSearchResult {
  const total = records.length;

  if (isEmptySearchQuery(query)) {
    const allIds = new Set<string>();
    const allPaths = new Set<string>();
    for (const r of records) {
      allIds.add(r.id);
      allPaths.add(r.path);
    }
    return { matchedRecordIds: allIds, matchedPaths: allPaths, totalRecords: total, matchCount: total };
  }

  const filtered = applyFilterChain(records, [
    applyToggleFilter(query.categories, query.presets, query.localities),
    applyTextFilter(query.text),
  ]);

  const matchedIds = new Set<string>();
  const matchedPaths = new Set<string>();
  for (const r of filtered) {
    matchedIds.add(r.id);
    matchedPaths.add(r.path);
  }

  return {
    matchedRecordIds: matchedIds,
    matchedPaths,
    totalRecords: total,
    matchCount: matchedIds.size,
  };
}
