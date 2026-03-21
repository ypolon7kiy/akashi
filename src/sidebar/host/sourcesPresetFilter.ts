import type { IndexedSourceEntry } from '../../domains/sources/domain/model';
import type { SourcePresetId } from '../../domains/sources/domain/sourcePresets';

export function filterRecordsByPresets(
  records: IndexedSourceEntry[],
  active: ReadonlySet<SourcePresetId>
): IndexedSourceEntry[] {
  return records.filter((r) => active.has(r.preset as SourcePresetId));
}
