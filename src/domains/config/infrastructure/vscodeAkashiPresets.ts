import * as vscode from 'vscode';
import {
  ALL_SOURCE_PRESET_IDS,
  isSourcePresetId,
  type SourcePresetId,
} from '../../../shared/sourcePresetId';

/**
 * Active presets from `akashi.presets`. Invalid entries are dropped.
 * Empty after validation falls back to all presets so the sidebar stays usable.
 */
export function readActiveSourcePresets(): ReadonlySet<SourcePresetId> {
  const raw = vscode.workspace.getConfiguration('akashi').get<unknown>('presets');
  const set = new Set<SourcePresetId>();
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string' && isSourcePresetId(entry)) {
        set.add(entry);
      }
    }
  }
  if (set.size === 0) {
    for (const id of ALL_SOURCE_PRESET_IDS) {
      set.add(id);
    }
  }
  return set;
}
