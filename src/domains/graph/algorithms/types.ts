/**
 * `null` = show all source categories (full graph after preset filter).
 * Empty set = hide every node (same UX as all presets off).
 */
export type SourceCategoryVisibilitySelection = ReadonlySet<string> | null;
