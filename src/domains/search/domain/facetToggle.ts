/**
 * Pure helpers for facet toggle state (preset, category, locality, etc.).
 * Uses the `null = all` convention: `null` means every id is enabled;
 * a non-null `Set` restricts to exactly those ids.
 */

export function normalizeEnabledOverride(
  enabledIds: ReadonlySet<string>,
  fullSortedIds: readonly string[]
): Set<string> | null {
  const full = new Set(fullSortedIds);
  if (full.size === 0) {
    return null;
  }
  const filtered = new Set([...enabledIds].filter((id) => full.has(id)));
  if (filtered.size === 0) {
    return new Set();
  }
  if (filtered.size === full.size && [...full].every((id) => filtered.has(id))) {
    return null;
  }
  return filtered;
}

export function toggleEnabledId(
  prev: ReadonlySet<string> | null,
  fullSortedIds: readonly string[],
  id: string
): Set<string> | null {
  const full = new Set(fullSortedIds);
  if (!full.has(id)) {
    return prev === null ? null : normalizeEnabledOverride(prev, fullSortedIds);
  }
  if (prev === null) {
    const next = new Set(full);
    next.delete(id);
    return normalizeEnabledOverride(next, fullSortedIds);
  }
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return normalizeEnabledOverride(next, fullSortedIds);
}

export function selectAllEnabledOverride(): null {
  return null;
}

export function selectNoneEnabledOverride(fullSortedIds: readonly string[]): Set<string> | null {
  if (fullSortedIds.length === 0) {
    return null;
  }
  return new Set();
}

export function invertEnabledOverride(
  prev: ReadonlySet<string> | null,
  fullSortedIds: readonly string[]
): Set<string> | null {
  const full = new Set(fullSortedIds);
  if (full.size === 0) {
    return null;
  }
  const next = prev === null ? new Set<string>() : new Set([...full].filter((id) => !prev.has(id)));
  return normalizeEnabledOverride(next, fullSortedIds);
}

export function countEnabledInOverride(
  prev: ReadonlySet<string> | null,
  fullSortedIds: readonly string[]
): { enabled: number; total: number } {
  const total = fullSortedIds.length;
  if (total === 0) {
    return { enabled: 0, total: 0 };
  }
  if (prev === null) {
    return { enabled: total, total };
  }
  return { enabled: prev.size, total };
}
