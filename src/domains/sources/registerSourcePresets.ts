import type { SourceKind } from './domain/model';
import type {
  HomePathTask,
  SourcePresetDefinition,
  SourcePresetId,
} from './domain/sourcePresetDefinition';
import { sharedWorkspaceGlobContributions } from './presets/_shared/workspaceGlobs';
import { sharedCopilotHomeTask, sharedHomeAgentsTeamTasks } from './presets/_shared/homePathTasks';
import { antigravityPresetDefinition } from './presets/antigravity/preset';
import { claudePresetDefinition } from './presets/claude/preset';
import { codexPresetDefinition } from './presets/codex/preset';
import { cursorPresetDefinition } from './presets/cursor/preset';

/**
 * Registration order drives workspace/user classification fall-through for tool-specific paths.
 * User-home scan tasks run concurrently in `collectHomeSourcePaths` (see `HOME_PATH_TASKS`).
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

function mergeGlobContributions(
  defs: readonly SourcePresetDefinition[]
): { glob: string; kinds: readonly SourceKind[] }[] {
  const map = new Map<string, Set<SourceKind>>();
  const order: string[] = [];

  const push = (glob: string, kinds: readonly SourceKind[]): void => {
    let set = map.get(glob);
    if (!set) {
      set = new Set();
      map.set(glob, set);
      order.push(glob);
    }
    for (const k of kinds) {
      set.add(k);
    }
  };

  for (const row of sharedWorkspaceGlobContributions) {
    push(row.glob, row.kinds);
  }
  for (const preset of defs) {
    for (const row of preset.workspaceGlobContributions) {
      push(row.glob, row.kinds);
    }
  }

  return order.map((glob) => ({
    glob,
    kinds: [...(map.get(glob) ?? new Set())],
  }));
}

export const WORKSPACE_GLOB_DEFINITIONS = mergeGlobContributions(SOURCE_PRESET_DEFINITIONS);

/**
 * All user-home path discovery work: each preset’s `homePathTasks`, then shared tasks.
 * Executed in parallel by `collectHomeSourcePaths` (`Promise.all`); paths are deduped via shared
 * `add`. Array order is not significant.
 */
export const HOME_PATH_TASKS: readonly HomePathTask[] = [
  ...SOURCE_PRESET_DEFINITIONS.flatMap((p) => [...p.homePathTasks]),
  sharedCopilotHomeTask,
  ...sharedHomeAgentsTeamTasks,
];
