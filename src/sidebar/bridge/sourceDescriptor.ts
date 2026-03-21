/**
 * Re-exports sources snapshot DTOs from `shared/` for the sidebar bridge bundle.
 */

export type {
  SourceDescriptor,
  SourceFacetTagPayload,
  SourcesSnapshotPayload,
  WorkspaceFolderInfo,
} from '../../shared/types/sourcesSnapshotPayload';
export { isSourcesSnapshotPayload } from '../../shared/types/sourcesSnapshotPayload';
