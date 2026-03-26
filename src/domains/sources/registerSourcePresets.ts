import { ALL_SOURCE_PRESET_IDS, type SourcePresetId } from '../../shared/sourcePresetId';
import type { ArtifactCreatorMenuEntry } from '../../shared/types/artifactCreatorMenuEntry';
import type { SourceCategory } from './domain/model';
import type { HomePathTask, SourcePresetDefinition } from './domain/sourcePresetDefinition';
import type { ArtifactCreator } from './domain/artifactCreator';
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

export const ARTIFACT_CREATORS: readonly ArtifactCreator[] = SOURCE_PRESET_DEFINITIONS.flatMap(
  (p) => p.artifactCreators
);

/**
 * Returns artifact creators for the given preset and locality.
 * Graph nodes use this with `{ presetId, locality }` decoded from node metadata —
 * no sidebar or webview types required.
 */
export function getArtifactCreatorsForContext(
  presetId: SourcePresetId,
  locality: 'workspace' | 'user'
): readonly ArtifactCreator[] {
  return ARTIFACT_CREATORS.filter((c) => c.presetId === presetId && c.locality === locality);
}

/** Look up a creator by exact id — used host-side to validate incoming command payloads. */
export function findArtifactCreatorById(id: string): ArtifactCreator | undefined {
  return ARTIFACT_CREATORS.find((c) => c.id === id);
}

/**
 * Build glob patterns suitable for `vscode.workspace.createFileSystemWatcher`.
 * Returns two patterns derived from all preset workspace globs:
 *   1. Standalone files at any depth (e.g. `CLAUDE.md`, `.mcp.json`)
 *   2. Tool dot-directories at any depth (e.g. `.claude/**`, `.cursor/**`)
 *
 * The patterns intentionally cover ALL presets (not filtered by active presets)
 * so the watcher doesn't need to be recreated when presets change — the re-index
 * callback respects active presets on its own.
 */
export function buildWatcherGlobPatterns(): readonly string[] {
  const standaloneFiles = new Set<string>();
  const dotDirs = new Set<string>();

  for (const row of WORKSPACE_GLOB_SCAN_ROWS) {
    // All workspace globs start with `**/`; strip the prefix.
    const suffix = row.glob.startsWith('**/') ? row.glob.slice(3) : row.glob;

    // If the suffix starts with a dot-segment containing `/`, the first
    // segment is a tool directory (e.g. `.claude/settings.json` → `.claude`).
    const slashIdx = suffix.indexOf('/');
    if (slashIdx > 0 && suffix.startsWith('.')) {
      dotDirs.add(suffix.slice(0, slashIdx));
    } else {
      standaloneFiles.add(suffix);
    }
  }

  const patterns: string[] = [];
  if (standaloneFiles.size > 0) {
    const joined = [...standaloneFiles].join(',');
    patterns.push(standaloneFiles.size === 1 ? `**/${joined}` : `**/{${joined}}`);
  }
  if (dotDirs.size > 0) {
    const joined = [...dotDirs].join(',');
    patterns.push(dotDirs.size === 1 ? `**/${joined}/**` : `**/{${joined}}/**`);
  }
  return patterns;
}

/** Plain entries for graph webview context menu (no vscode / class instances). */
export function buildArtifactCreatorMenuEntries(): readonly ArtifactCreatorMenuEntry[] {
  return ARTIFACT_CREATORS.map((c) => ({
    id: c.id,
    label: c.label,
    presetId: c.presetId,
    locality: c.locality,
    category: c.category,
  }));
}
