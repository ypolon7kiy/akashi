import type {
  IndexedSourceEntry,
  SourceIndexSnapshot,
} from '../../../domains/sources/domain/model';
import type { ActiveSourcePresetsGetter } from '../../../shared/config/workspaceConfigTypes';
import type {
  SourceDescriptor,
  SourcesSnapshotPayload,
  WorkspaceFolderInfo,
} from '../../bridge/sourceDescriptor';
import { filterRecordsByPresets } from './sourcesPresetFilter';

export function buildSourcesSnapshotPayload(
  snapshot: SourceIndexSnapshot | null,
  workspaceFolders: WorkspaceFolderInfo[],
  getActiveSourcePresets: ActiveSourcePresetsGetter
): SourcesSnapshotPayload | null {
  if (!snapshot) {
    return null;
  }
  const active = getActiveSourcePresets();
  const filtered = filterRecordsByPresets(snapshot.records, active);
  return {
    generatedAt: snapshot.generatedAt,
    sourceCount: filtered.length,
    records: filtered.map(toSourceDescriptor),
    workspaceFolders,
  };
}

function toSourceDescriptor(record: IndexedSourceEntry): SourceDescriptor {
  return {
    id: record.id,
    path: record.path,
    preset: record.preset,
    category: record.category,
    scope: record.scope,
    origin: record.origin,
    tags: [...record.tags],
    metadata: record.metadata,
  };
}
