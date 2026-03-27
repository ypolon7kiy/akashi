/**
 * An addon discovered on the local filesystem via the sources domain index.
 * Pure read-side projection — no file content is read, only index metadata.
 */

import type { SourceLocality } from '../../sources/domain/artifactKind';
import type { SourcePresetId } from '../../../shared/sourcePresetId';

/** Addon categories that represent user-installable artifact types. */
export const ADDON_CATEGORIES = ['skill', 'command', 'rule', 'hook', 'mcp'] as const;

export type AddonCategory = (typeof ADDON_CATEGORIES)[number];

export function isAddonCategory(value: string): value is AddonCategory {
  return (ADDON_CATEGORIES as readonly string[]).includes(value);
}

/** One locally installed addon projected from `IndexedArtifact`. */
export interface InstalledAddon {
  readonly id: string;
  readonly name: string;
  readonly category: AddonCategory;
  readonly presetId: SourcePresetId;
  readonly locality: SourceLocality;
  readonly primaryPath: string;
  readonly artifactId: string | null;
}
