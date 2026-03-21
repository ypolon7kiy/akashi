import type { IndexedSourceEntry } from '../../domains/sources/domain/model';
import {
  recordMatchesSourceKinds,
  sourceKindsForPresets,
  type SourcePresetId,
} from '../../domains/sources/domain/sourcePresets';

export function filterRecordsByPresets(
  records: IndexedSourceEntry[],
  active: ReadonlySet<SourcePresetId>
): IndexedSourceEntry[] {
  const kinds = sourceKindsForPresets(active);
  return records.filter((r) => recordMatchesSourceKinds(r, kinds));
}
