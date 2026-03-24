import type { SourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';

export interface GraphPanelEnvironment {
  getGraphPayload: () => Promise<SourcesSnapshotPayload | null>;
  /** Interactive `creator.run()` for graph context menu (optional for tests / stubs). */
  runArtifactCreator?: (templateId: string) => Promise<void>;
}
