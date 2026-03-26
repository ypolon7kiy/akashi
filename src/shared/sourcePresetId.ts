/**
 * Preset ids for `akashi.presets` and source indexing. Must match registration order in
 * `registerSourcePresets.ts` (`SOURCE_PRESET_DEFINITIONS`) and package.json enum.
 */
export type SourcePresetId = 'claude' | 'cursor' | 'antigravity' | 'codex';

export const ALL_SOURCE_PRESET_IDS: readonly SourcePresetId[] = [
  'claude',
  'cursor',
  'antigravity',
  'codex',
] as const;

export function isSourcePresetId(value: string): value is SourcePresetId {
  return (ALL_SOURCE_PRESET_IDS as readonly string[]).includes(value);
}
