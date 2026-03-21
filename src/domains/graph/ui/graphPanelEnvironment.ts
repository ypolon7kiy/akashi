import type { SourcesSnapshotPayload } from '../../../sidebar/bridge/sourceDescriptor';

export interface GraphPanelEnvironment {
  getGraphPayload: () => Promise<SourcesSnapshotPayload | null>;
}
