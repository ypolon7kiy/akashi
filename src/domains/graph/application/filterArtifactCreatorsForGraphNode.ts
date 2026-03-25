import type { GraphNode3D } from '../domain/graphTypes';
import type { ArtifactCreatorMenuEntry } from '../../../shared/types/artifactCreatorMenuEntry';

/**
 * Which artifact creators to show for a graph node context menu.
 * Uses node metadata only (preset / locality / category); no `domains/sources` import.
 */
export function filterArtifactCreatorsForGraphNode(
  entries: readonly ArtifactCreatorMenuEntry[],
  node: GraphNode3D,
  enabledPresetIds: ReadonlySet<string> | null
): readonly ArtifactCreatorMenuEntry[] {
  const presetId = node.graphPresetId;
  if (!presetId) {
    return [];
  }
  if (enabledPresetIds !== null && !enabledPresetIds.has(presetId)) {
    return [];
  }

  const localityFromGraphLocality = (
    loc: GraphNode3D['graphLocality']
  ): 'workspace' | 'user' | null => {
    if (loc === 'project') {
      return 'workspace';
    }
    if (loc === 'global') {
      return 'user';
    }
    return null;
  };

  const matchCategory = (categoryId: string | undefined): ArtifactCreatorMenuEntry[] => {
    if (!categoryId) {
      return [];
    }
    return entries.filter(
      (e) =>
        e.presetId === presetId &&
        localityFromGraphLocality(node.graphLocality) === e.locality &&
        e.category === categoryId
    );
  };

  switch (node.type) {
    case 'preset':
      return entries.filter((e) => e.presetId === presetId);
    case 'locality': {
      const locality = localityFromGraphLocality(node.graphLocality);
      if (!locality) {
        return [];
      }
      return entries.filter((e) => e.presetId === presetId && e.locality === locality);
    }
    case 'category':
      return matchCategory(node.graphCategoryId);
    case 'folder':
      return matchCategory(node.graphCategoryId);
    default:
      return [];
  }
}
