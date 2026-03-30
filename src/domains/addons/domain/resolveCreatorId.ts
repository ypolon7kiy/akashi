/**
 * Map a (preset, category, locality) triple to an artifact creator template id.
 * Returns null if no creator exists for the combination.
 */

import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { PluginCategory } from './catalogPlugin';
import type { SourceLocality } from '../../sources/domain/artifactKind';

export function resolveCreatorId(
  presetId: SourcePresetId,
  category: PluginCategory,
  locality: SourceLocality
): string | null {
  const map: Record<string, Record<string, string>> = {
    skill: {
      workspace: `${presetId}/skill-folder/workspace`,
      user: `${presetId}/skill-folder/user`,
    },
    command: { workspace: `${presetId}/command/workspace`, user: `${presetId}/command/user` },
    rule: { workspace: `${presetId}/rule/workspace`, user: `${presetId}/rule/user` },
  };
  return map[category]?.[locality] ?? null;
}
