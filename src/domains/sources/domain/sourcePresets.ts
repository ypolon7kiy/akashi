import { ALL_SOURCE_PRESET_IDS as ALL_SOURCE_PRESET_IDS_FROM_REGISTRY } from '../registerSourcePresets';
import type { SourcePresetId as SourcePresetIdType } from './sourcePresetDefinition';

export type SourcePresetId = SourcePresetIdType;

/**
 * Sidebar / settings preset ids (no `vscode` here). Kept in sync with `SOURCE_PRESET_DEFINITIONS` in `registerSourcePresets.ts`.
 */
export const SourcePresetId = {
  Claude: 'claude',
  Cursor: 'cursor',
  Antigravity: 'antigravity',
  Codex: 'codex',
} as const satisfies Record<string, SourcePresetId>;

/** Injected at the extension composition root (reads VS Code settings). */
export type ActiveSourcePresetsGetter = () => ReadonlySet<SourcePresetId>;

export const ALL_SOURCE_PRESET_IDS: readonly SourcePresetId[] = ALL_SOURCE_PRESET_IDS_FROM_REGISTRY;

export function isSourcePresetId(value: string): value is SourcePresetId {
  return (ALL_SOURCE_PRESET_IDS as readonly string[]).includes(value);
}
