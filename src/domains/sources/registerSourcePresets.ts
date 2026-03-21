import type { SourceCategory } from './domain/model';
import type {
  HomePathTask,
  SourcePresetDefinition,
  SourcePresetId,
} from './domain/sourcePresetDefinition';
import { antigravityPresetDefinition } from './presets/antigravity/preset';
import { claudePresetDefinition } from './presets/claude/preset';
import { codexPresetDefinition } from './presets/codex/preset';
import { cursorPresetDefinition } from './presets/cursor/preset';

/**
 * Registration order is stable for logging; each preset is independent for discovery.
 */
export const SOURCE_PRESET_DEFINITIONS: readonly SourcePresetDefinition[] = [
  claudePresetDefinition,
  cursorPresetDefinition,
  antigravityPresetDefinition,
  codexPresetDefinition,
];

export const ALL_SOURCE_PRESET_IDS: readonly SourcePresetId[] = SOURCE_PRESET_DEFINITIONS.map(
  (p) => p.id
);

/** One workspace scan row: which preset owns the glob and category for matched files. */
export interface WorkspaceGlobScanRow {
  readonly glob: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
}

function flattenWorkspaceGlobRows(defs: readonly SourcePresetDefinition[]): WorkspaceGlobScanRow[] {
  const out: WorkspaceGlobScanRow[] = [];
  for (const preset of defs) {
    for (const row of preset.workspaceGlobContributions) {
      out.push({
        glob: row.glob,
        presetId: preset.id,
        category: row.category,
      });
    }
  }
  return out;
}

export const WORKSPACE_GLOB_SCAN_ROWS: readonly WorkspaceGlobScanRow[] =
  flattenWorkspaceGlobRows(SOURCE_PRESET_DEFINITIONS);

/**
 * All user-home path discovery work: each preset’s `homePathTasks` only.
 * Executed in parallel by `collectHomeSourcePaths` (`Promise.all`).
 */
export const HOME_PATH_TASKS: readonly HomePathTask[] = SOURCE_PRESET_DEFINITIONS.flatMap((p) => [
  ...p.homePathTasks,
]);
