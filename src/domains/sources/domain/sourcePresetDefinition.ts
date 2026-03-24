import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { SourceCategory } from './model';

/** VS Code workspace glob and the category for every file matched by this preset's rule. */
export interface WorkspaceGlobContribution {
  readonly glob: string;
  readonly category: SourceCategory;
}

/**
 * Shared context while scanning user-home paths for the source index (`collectHomeSourcePaths`).
 */
export interface HomePathsContext {
  readonly homeDir: string;
  readonly activePresets: ReadonlySet<SourcePresetId>;
  readonly roots: ToolUserRoots;
  readonly add: (filePath: string, presetId: SourcePresetId, category: SourceCategory) => void;
  readonly fileExists: (filePath: string) => Promise<boolean>;
  readonly collectShallowFilesWithSuffix: (dir: string, suffix: string) => Promise<string[]>;
  readonly collectFilesRecursiveUnderDir: (rootDir: string) => Promise<string[]>;
  readonly collectSkillMdRecursiveUnderDir: (rootDir: string) => Promise<string[]>;
}

/** One async unit of user-home path discovery for a single preset. */
export type HomePathTask = (ctx: HomePathsContext) => Promise<void>;

/**
 * One tool preset: workspace globs and user-home scan tasks only.
 * Each rule binds exactly one category; preset id is the owning preset.
 */
export interface SourcePresetDefinition {
  readonly id: SourcePresetId;
  readonly workspaceGlobContributions: readonly WorkspaceGlobContribution[];
  readonly homePathTasks: readonly HomePathTask[];
}
