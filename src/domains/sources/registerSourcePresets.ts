import { ALL_SOURCE_PRESET_IDS, type SourcePresetId } from '../../shared/sourcePresetId';
import type { SourceCategory } from './domain/model';
import type { HomePathTask, SourcePresetDefinition } from './domain/sourcePresetDefinition';
import type { ArtifactTemplate } from './domain/artifactTemplate';
import { antigravityPresetDefinition } from './presets/antigravity/preset';
import { claudePresetDefinition } from './presets/claude/preset';
import { codexPresetDefinition } from './presets/codex/preset';
import { cursorPresetDefinition } from './presets/cursor/preset';
import { claudeArtifactTemplates } from './presets/claude/artifactTemplates';
import { cursorArtifactTemplates } from './presets/cursor/artifactTemplates';
import { codexArtifactTemplates } from './presets/codex/artifactTemplates';
import { antigravityArtifactTemplates } from './presets/antigravity/artifactTemplates';

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

export const ARTIFACT_TEMPLATES: readonly ArtifactTemplate[] = [
  ...claudeArtifactTemplates,
  ...cursorArtifactTemplates,
  ...codexArtifactTemplates,
  ...antigravityArtifactTemplates,
];

/**
 * Returns artifact templates for the given preset and scope.
 * Graph nodes use this with `{ presetId, scope }` decoded from node metadata —
 * no sidebar or webview types required.
 */
export function getArtifactTemplatesForContext(
  presetId: SourcePresetId,
  scope: 'workspace' | 'user'
): readonly ArtifactTemplate[] {
  return ARTIFACT_TEMPLATES.filter((t) => t.presetId === presetId && t.scope === scope);
}

/** Look up a template by exact id — used host-side to validate incoming RPC payloads. */
export function findArtifactTemplateById(id: string): ArtifactTemplate | undefined {
  return ARTIFACT_TEMPLATES.find((t) => t.id === id);
}
