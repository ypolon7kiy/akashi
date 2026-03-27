import type { IndexedSourceEntry } from '../../../domains/sources/domain/model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';

export function filterRecordsByPresets(
  records: readonly IndexedSourceEntry[],
  active: ReadonlySet<SourcePresetId>
): readonly IndexedSourceEntry[] {
  return records.filter((r) => active.has(r.preset));
}
