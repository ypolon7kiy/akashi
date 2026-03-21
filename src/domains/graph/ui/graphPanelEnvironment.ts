import type { SourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';

export interface GraphPanelEnvironment {
  getGraphPayload: () => Promise<SourcesSnapshotPayload | null>;
}
