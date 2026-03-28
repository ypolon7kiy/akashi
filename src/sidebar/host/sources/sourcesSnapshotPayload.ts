import type { IndexedArtifact } from '../../../domains/sources/domain/artifact';
import type {
  IndexedSourceEntry,
  SourceIndexSnapshot,
} from '../../../domains/sources/domain/model';
import type { ActiveSourcePresetsGetter } from '../../../shared/config/workspaceConfigTypes';
import type {
  ArtifactDescriptor,
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
    artifacts: snapshot.artifacts?.filter((a) => active.has(a.presetId)).map(toArtifactDescriptor),
  };
}

function toArtifactDescriptor(a: IndexedArtifact): ArtifactDescriptor {
  return {
    id: a.id,
    presetId: a.presetId,
    category: a.category,
    locality: a.locality,
    shape: a.shape,
    memberRecordIds: a.memberRecordIds,
    primaryPath: a.primaryPath,
    topLevel: a.topLevel,
  };
}

function toSourceDescriptor(record: IndexedSourceEntry): SourceDescriptor {
  return {
    id: record.id,
    path: record.path,
    preset: record.preset,
    category: record.category,
    locality: record.locality,
    tags: [...record.tags],
    metadata: record.metadata,
  };
}
