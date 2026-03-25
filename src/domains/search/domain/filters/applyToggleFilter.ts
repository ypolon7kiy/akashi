import type { SourceFilterStep } from '../filterChain';

/**
 * Creates a filter step that restricts records by category, preset, and locality facet toggles.
 * Uses the `null = all` convention: a null facet passes all records for that dimension.
 */
export function applyToggleFilter(
  categories: ReadonlySet<string> | null,
  presets: ReadonlySet<string> | null,
  localities: ReadonlySet<string> | null,
): SourceFilterStep {
  return (records) => {
    if (categories === null && presets === null && localities === null) {
      return records;
    }
    return records.filter((r) => {
      if (categories !== null && !categories.has(r.category)) return false;
      if (presets !== null && !presets.has(r.preset)) return false;
      if (localities !== null && !localities.has(r.locality)) return false;
      return true;
    });
  };
}
