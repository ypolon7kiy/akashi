import type { SidebarSourceCategoryKey } from '../sourceCategoryKeys';
import type { SourcePresetId } from '../sourcePresetId';

/**
 * Serializable subset of {@link ArtifactCreator} for host → webview (graph context menu).
 * Kept in `shared/` so snapshot payloads and domains can reference one shape.
 */
export interface ArtifactCreatorMenuEntry {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly locality: 'workspace' | 'user';
  readonly category: SidebarSourceCategoryKey;
}
