import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SourceDescriptor } from '../../../shared/types/sourcesSnapshotPayload';
import {
  isEmptySearchQuery,
  type SerializedSourceSearchQuery,
  type SourceSearchQuery,
  type SourceSearchResult,
} from '../domain/model';
import { searchSourceRecords } from '../domain/searchRecords';
import { toggleEnabledId, toggleEnabledIdMinOne } from '../domain/facetToggle';

export interface UseSourceSearchResult {
  readonly query: SourceSearchQuery;
  readonly setQueryText: (text: string) => void;
  readonly toggleCategory: (id: string) => void;
  readonly togglePreset: (id: string) => void;
  readonly toggleLocality: (id: string) => void;
  readonly resetAll: () => void;
  readonly result: SourceSearchResult;
  readonly isActive: boolean;
  readonly availableCategories: readonly string[];
  readonly availablePresets: readonly string[];
  readonly availableLocalities: readonly string[];
}

export function useSourceSearch(
  records: readonly SourceDescriptor[],
  initialState?: SerializedSourceSearchQuery | null
): UseSourceSearchResult {
  const [text, setText] = useState(() => initialState?.text ?? '');
  const [categories, setCategories] = useState<ReadonlySet<string> | null>(() =>
    initialState?.categories ? new Set(initialState.categories) : null
  );
  const firstPresetWithData = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(r.preset);
    const sorted = [...s].sort();
    return sorted.length > 0 ? sorted[0] : null;
  }, [records]);

  const [presets, setPresets] = useState<ReadonlySet<string> | null>(() =>
    initialState?.presets ? new Set(initialState.presets) : null
  );

  // On first load with no saved state, default to only the first preset that has data.
  const appliedDefaultRef = useRef(false);
  useEffect(() => {
    if (appliedDefaultRef.current || initialState?.presets != null) return;
    if (firstPresetWithData !== null) {
      appliedDefaultRef.current = true;
      setPresets(new Set([firstPresetWithData]));
    }
  }, [firstPresetWithData, initialState]);
  const [localities, setLocalities] = useState<ReadonlySet<string> | null>(() =>
    initialState?.localities ? new Set(initialState.localities) : null
  );

  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(r.category);
    return [...s].sort();
  }, [records]);

  const availablePresets = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(r.preset);
    return [...s].sort();
  }, [records]);

  const availableLocalities = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(r.locality);
    return [...s].sort();
  }, [records]);

  const query: SourceSearchQuery = useMemo(
    () => ({ text, categories, presets, localities }),
    [text, categories, presets, localities]
  );

  const result = useMemo(() => searchSourceRecords(records, query), [records, query]);
  const isActive = !isEmptySearchQuery(query);

  const setQueryText = useCallback((t: string) => setText(t), []);

  const toggleCategory = useCallback(
    (id: string) => setCategories((prev) => toggleEnabledId(prev, availableCategories, id)),
    [availableCategories]
  );

  const togglePreset = useCallback(
    (id: string) => setPresets((prev) => toggleEnabledIdMinOne(prev, availablePresets, id)),
    [availablePresets]
  );

  const toggleLocality = useCallback(
    (id: string) => setLocalities((prev) => toggleEnabledId(prev, availableLocalities, id)),
    [availableLocalities]
  );

  const resetAll = useCallback(() => {
    setText('');
    setCategories(null);
    setPresets(null);
    setLocalities(null);
  }, []);

  return {
    query,
    setQueryText,
    toggleCategory,
    togglePreset,
    toggleLocality,
    resetAll,
    result,
    isActive,
    availableCategories,
    availablePresets,
    availableLocalities,
  };
}
