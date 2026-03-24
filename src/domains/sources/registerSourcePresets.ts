import { ALL_SOURCE_PRESET_IDS, type SourcePresetId } from '../../shared/sourcePresetId';
import type { ArtifactCreatorMenuEntry } from '../../shared/types/artifactCreatorMenuEntry';
import type { SourceCategory } from './domain/model';
import type { HomePathTask, SourcePresetDefinition } from './domain/sourcePresetDefinition';
import type { ArtifactCreator } from './domain/artifactCreator';
import { antigravityPresetDefinition } from './presets/antigravity/preset';
import { claudePresetDefinition } from './presets/claude/preset';
import { codexPresetDefinition } from './presets/codex/preset';
import { cursorPresetDefinition } from './presets/cursor/preset';
import { claudeArtifactCreators } from './presets/claude/creators';
import { cursorArtifactCreators } from './presets/cursor/creators';
import { codexArtifactCreators } from './presets/codex/creators';
import { antigravityArtifactCreators } from './presets/antigravity/creators';

/**
 * Registration order is stable for logging; each preset is independent for discovery.
 */
export const SOURCE_PRESET_DEFINITIONS: readonly SourcePresetDefinition[] = [
  claudePresetDefinition,
  cursorPresetDefinition,
  antigravityPresetDefinition,
  codexPresetDefinition,
];

const derivedPresetIds = SOURCE_PRESET_DEFINITIONS.map((p) => p.id);
if (
  derivedPresetIds.length !== ALL_SOURCE_PRESET_IDS.length ||
  !derivedPresetIds.every((id, i) => id === ALL_SOURCE_PRESET_IDS[i])
) {
  throw new Error(
    'SOURCE_PRESET_DEFINITIONS ids/order must match shared/sourcePresetId ALL_SOURCE_PRESET_IDS'
  );
}

export { ALL_SOURCE_PRESET_IDS };

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

// ---------------------------------------------------------------------------
// Artifact creation registry
// ---------------------------------------------------------------------------

export const ARTIFACT_CREATORS: readonly ArtifactCreator[] = [
  ...claudeArtifactCreators,
  ...cursorArtifactCreators,
  ...codexArtifactCreators,
  ...antigravityArtifactCreators,
];

/**
 * Returns artifact creators for the given preset and scope.
 * Graph nodes use this with `{ presetId, scope }` decoded from node metadata —
 * no sidebar or webview types required.
 */
export function getArtifactCreatorsForContext(
  presetId: SourcePresetId,
  scope: 'workspace' | 'user'
): readonly ArtifactCreator[] {
  return ARTIFACT_CREATORS.filter((c) => c.presetId === presetId && c.scope === scope);
}

/** Look up a creator by exact id — used host-side to validate incoming command payloads. */
export function findArtifactCreatorById(id: string): ArtifactCreator | undefined {
  return ARTIFACT_CREATORS.find((c) => c.id === id);
}

/** Plain entries for graph webview context menu (no vscode / class instances). */
export function buildArtifactCreatorMenuEntries(): readonly ArtifactCreatorMenuEntry[] {
  return ARTIFACT_CREATORS.map((c) => ({
    id: c.id,
    label: c.label,
    presetId: c.presetId,
    scope: c.scope,
    category: c.category,
  }));
}
